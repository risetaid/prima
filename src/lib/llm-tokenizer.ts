/**
 * LLM Tokenizer Service
 * Provides accurate token counting using Anthropic's official tokenizer
 * Supports all Claude models with proper tokenization and caching
 */

import { countTokens } from "@anthropic-ai/tokenizer";
import { logger } from "@/lib/logger";

export interface TokenCount {
  tokens: number;
  characters: number;
  model: string;
  cached: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  inputTextLength: number;
  outputTextLength: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

class LLMTokenizerService {
  private static instance: LLMTokenizerService;
  private cache = new Map<string, number>();
  private readonly CACHE_SIZE_LIMIT = 10000;

  private constructor() {
    logger.info("LLM Tokenizer Service initialized with Anthropic tokenizer");
  }

  public static getInstance(): LLMTokenizerService {
    if (!LLMTokenizerService.instance) {
      LLMTokenizerService.instance = new LLMTokenizerService();
    }
    return LLMTokenizerService.instance;
  }

  /**
   * Count tokens for a text string using the official Anthropic tokenizer
   */
  public countTokens(text: string, model: string = "claude-3-5-haiku"): TokenCount {
    try {
      // Create cache key
      const cacheKey = `${model}:${this.hashText(text)}`;

      // Check cache first
      if (this.cache.has(cacheKey)) {
        return {
          tokens: this.cache.get(cacheKey)!,
          characters: text.length,
          model,
          cached: true,
        };
      }

      // Use official tokenizer
      const tokenCount = countTokens(text);

      // Cache the result
      this.addToCache(cacheKey, tokenCount);

      return {
        tokens: tokenCount,
        characters: text.length,
        model,
        cached: false,
      };
    } catch (error) {
      logger.warn("Failed to count tokens with official tokenizer, falling back to estimation", {
        error: error instanceof Error ? error.message : String(error),
        model,
        textLength: text.length,
      });

      // Fallback to character-based estimation
      return {
        tokens: Math.ceil(text.length / 4),
        characters: text.length,
        model,
        cached: false,
      };
    }
  }

  /**
   * Count tokens for input and output text
   */
  public countUsage(
    inputText: string,
    outputText: string,
    model: string = "claude-3-5-haiku"
  ): TokenUsage {
    const inputCount = this.countTokens(inputText, model);
    const outputCount = this.countTokens(outputText, model);

    return {
      inputTokens: inputCount.tokens,
      outputTokens: outputCount.tokens,
      totalTokens: inputCount.tokens + outputCount.tokens,
      model,
      inputTextLength: inputText.length,
      outputTextLength: outputText.length,
    };
  }

  /**
   * Estimate cost based on token usage with model-specific pricing
   */
  public estimateCost(tokens: number, model: string = "claude-3-5-haiku"): number {
    const pricing = this.getModelPricing(model);
    // Use input pricing for simple estimation
    return (tokens / 1000) * pricing.input;
  }

  /**
   * Estimate cost with separate input/output token counts
   */
  public estimateCostDetailed(
    inputTokens: number,
    outputTokens: number,
    model: string = "claude-3-5-haiku"
  ): CostBreakdown {
    const pricing = this.getModelPricing(model);

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
  }

  /**
   * Get current pricing for a specific model
   */
  public getModelPricing(model: string): { input: number; output: number } {
    // Updated pricing as of October 2024 (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      "claude-3-5-haiku": { input: 0.0008, output: 0.004 },
      "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-opus": { input: 0.015, output: 0.075 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
      "claude-3-sonnet": { input: 0.003, output: 0.015 },
      // Default fallback
      "default": { input: 0.0008, output: 0.004 },
    };

    return pricing[model] || pricing["default"];
  }

  /**
   * Get supported models
   */
  public getSupportedModels(): string[] {
    return [
      "claude-3-5-haiku",
      "claude-3-5-sonnet",
      "claude-3-opus",
      "claude-3-haiku",
      "claude-3-sonnet",
    ];
  }

  /**
   * Clear the token cache (useful for memory management)
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info("Token cache cleared");
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_SIZE_LIMIT,
    };
  }

  /**
   * Simple hash function for cache keys
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Add to cache with size limit management
   */
  private addToCache(key: string, value: number): void {
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entries (simple LRU approximation)
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 100);
      keysToDelete.forEach(k => this.cache.delete(k));
    }
    this.cache.set(key, value);
  }
}

// Export singleton instance
export const llmTokenizerService = LLMTokenizerService.getInstance();
