/**
 * Simple Tokenizer Service
 * Provides basic token counting and cost estimation for LLM operations
 * Uses character-based estimation (approximately 4 characters = 1 token)
 */

import { logger } from "./logger";

export interface TokenCount {
  tokens: number;
  characters: number;
  model: string;
}

export class SimpleTokenizerService {
  private static instance: SimpleTokenizerService;

  private constructor() {
    // No initialization needed for character-based estimation
    logger.info("Simple tokenizer service initialized (character-based estimation)");
  }

  public static getInstance(): SimpleTokenizerService {
    if (!SimpleTokenizerService.instance) {
      SimpleTokenizerService.instance = new SimpleTokenizerService();
    }
    return SimpleTokenizerService.instance;
  }

  /**
   * Count tokens in a text string using character-based estimation
   * Uses approximately 4 characters = 1 token
   */
  public countTokens(text: string, model: string = "claude-3.5-haiku"): TokenCount {
    const tokens = Math.ceil(text.length / 4);

    return {
      tokens,
      characters: text.length,
      model,
    };
  }

  /**
   * Count tokens for input and output text
   */
  public countUsage(
    inputText: string,
    outputText: string,
    model: string = "claude-3.5-haiku"
  ): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  } {
    const inputCount = this.countTokens(inputText, model);
    const outputCount = this.countTokens(outputText, model);

    return {
      inputTokens: inputCount.tokens,
      outputTokens: outputCount.tokens,
      totalTokens: inputCount.tokens + outputCount.tokens,
      model,
    };
  }

  /**
   * Estimate cost based on token usage
   * Uses simplified Anthropic pricing (per 1K tokens)
   */
  public estimateCost(tokens: number, model: string = "claude-3.5-haiku"): number {
    // Simplified pricing (per 1K tokens)
    const pricing: Record<string, number> = {
      "claude-3.5-haiku": 0.0008,   // $0.0008 per 1K tokens
      "claude-3.5-sonnet": 0.003,   // $0.003 per 1K tokens
      "claude-3-opus": 0.015,       // $0.015 per 1K tokens
      "claude-3-haiku": 0.00025,    // $0.00025 per 1K tokens
      "default": 0.0008,            // Fallback pricing
    };

    const costPerThousand = pricing[model] || pricing["default"];
    return (tokens / 1000) * costPerThousand;
  }

  /**
   * Estimate cost with separate input/output token counts
   */
  public estimateCostDetailed(
    inputTokens: number,
    outputTokens: number,
    model: string = "claude-3.5-haiku"
  ): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // Simplified pricing with input/output separation
    const pricing: Record<string, { input: number; output: number }> = {
      "claude-3.5-haiku": { input: 0.0008, output: 0.004 },
      "claude-3.5-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-opus": { input: 0.015, output: 0.075 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
      "default": { input: 0.0008, output: 0.004 },
    };

    const modelPricing = pricing[model] || pricing["default"];

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
  }
}

// Export singleton instance
export const tokenizerService = SimpleTokenizerService.getInstance();