// Anthropic Claude AI Client for PRIMA
// Handles communication with Claude API for intent classification and conversation

import Anthropic from '@anthropic-ai/sdk';
import { countTokens } from '@anthropic-ai/tokenizer';
import { logger } from '@/lib/logger';
import type {
  AIClientConfig,
  AIUsageMetrics,
} from '@/lib/ai-types';
import {
  AIServiceError,
  AIRateLimitError,
  AITimeoutError,
} from '@/lib/ai-types';

// Pricing per 1M tokens (as of claude-haiku-4-5-20251001)
const HAIKU_INPUT_COST_PER_1M = 1.0;  // $1.00 per 1M input tokens
const HAIKU_OUTPUT_COST_PER_1M = 5.0; // $5.00 per 1M output tokens

export class AIClient {
  private client: Anthropic;
  private config: AIClientConfig;
  private requestCount = 0;
  private totalCost = 0;

  constructor(config?: Partial<AIClientConfig>) {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for AI client');
    }

    this.config = {
      apiKey,
      model: config?.model || process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
      maxTokens: config?.maxTokens || parseInt(process.env.AI_MAX_TOKENS || '1024'),
      temperature: config?.temperature || parseFloat(process.env.AI_TEMPERATURE || '0.3'),
      timeout: config?.timeout || 30000, // 30 seconds
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });

    logger.info('AI Client initialized', {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(params: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    usage: AIUsageMetrics;
  }> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      logger.info('Sending message to Claude', {
        model: this.config.model,
        requestNumber: this.requestCount,
        userMessageLength: params.userMessage.length,
      });

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: params.maxTokens || this.config.maxTokens,
        temperature: params.temperature ?? this.config.temperature,
        system: params.systemPrompt,
        messages: [
          {
            role: 'user',
            content: params.userMessage,
          },
        ],
      });

      const latencyMs = Date.now() - startTime;

      // Extract text content
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n');

      // Calculate usage metrics
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;

      // Calculate cost
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.totalCost += cost;

      const usage: AIUsageMetrics = {
        requestId: response.id,
        model: this.config.model,
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        latencyMs,
        timestamp: new Date(),
      };

      logger.info('Claude response received', {
        requestId: response.id,
        latencyMs,
        inputTokens,
        outputTokens,
        cost: cost.toFixed(4),
        totalCostSoFar: this.totalCost.toFixed(4),
      });

      return { content, usage };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Handle specific error types
      // Check if it's an Anthropic API error (has status property)
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message: string; headers?: Record<string, string> };

        logger.error('Claude API error', error instanceof Error ? error : new Error(String(apiError.message)), {
          status: apiError.status,
          requestNumber: this.requestCount,
          latencyMs,
        });

        // Rate limit error
        if (apiError.status === 429) {
          const retryAfter = this.extractRetryAfter(apiError);
          throw new AIRateLimitError(
            `Claude API rate limit exceeded. Retry after ${retryAfter}s`,
            retryAfter
          );
        }

        // Timeout error
        if (apiError.status === 408 || apiError.message.includes('timeout')) {
          throw new AITimeoutError('Claude API request timed out');
        }

        // Generic API error
        throw new AIServiceError(
          `Claude API error: ${apiError.message}`,
          'API_ERROR',
          error
        );
      }

      // Unknown error
      logger.error('Unknown AI client error', error as Error, {
        requestNumber: this.requestCount,
        latencyMs,
      });

      throw new AIServiceError(
        `Unknown AI error: ${error instanceof Error ? error.message : 'Unknown'}`,
        'API_ERROR',
        error
      );
    }
  }

  /**
   * Send a structured JSON request and parse response
   */
  async sendStructuredRequest<T>(params: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
  }): Promise<{
    data: T;
    usage: AIUsageMetrics;
  }> {
    const { content, usage } = await this.sendMessage(params);

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(jsonStr) as T;

      logger.info('Structured response parsed successfully', {
        requestId: usage.requestId,
        dataKeys: Object.keys(data as object),
      });

      return { data, usage };
    } catch (error) {
      logger.error('Failed to parse structured response', error as Error, {
        requestId: usage.requestId,
        rawContent: content.substring(0, 200),
      });

      throw new AIServiceError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown'}`,
        'INVALID_RESPONSE',
        error
      );
    }
  }

  /**
   * Count tokens in a message (for cost estimation)
   */
  countTokens(text: string): number {
    try {
      return countTokens(text);
    } catch (error) {
      logger.warn('Failed to count tokens, using approximation', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      // Fallback: approximate 4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_1M;
    return inputCost + outputCost;
  }

  /**
   * Extract retry-after header from rate limit error
   */
  private extractRetryAfter(error: unknown): number {
    try {
      if (error && typeof error === 'object' && 'headers' in error) {
        const headers = error.headers as Record<string, unknown>;
        const retryAfterHeader = headers?.['retry-after'];
        if (retryAfterHeader) {
          return parseInt(String(retryAfterHeader), 10);
        }
      }
    } catch (parseError) {
      // Log parse failures for debugging
      logger.warn('Failed to parse retry-after header', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        originalError: error instanceof Error ? error.message : 'unknown',
      });
    }
    return 60; // Default 60 seconds
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    requestCount: number;
    totalCost: number;
    averageCostPerRequest: number;
  } {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
    };
  }

  /**
   * Reset usage statistics (for testing)
   */
  resetStats(): void {
    this.requestCount = 0;
    this.totalCost = 0;
  }
}

// Singleton instance
let aiClientInstance: AIClient | null = null;

/**
 * Get or create AI client singleton
 */
export function getAIClient(config?: Partial<AIClientConfig>): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient(config);
  }
  return aiClientInstance;
}

/**
 * Reset AI client singleton (for testing)
 */
export function resetAIClient(): void {
  aiClientInstance = null;
}
