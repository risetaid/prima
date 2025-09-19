/**
 * Tokenizer Service for accurate token counting
 * Supports multiple models including Anthropic and OpenAI models
 */

import { get_encoding } from "tiktoken";
import { logger } from "./logger";

export interface TokenCount {
  tokens: number;
  characters: number;
  model: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
}

export class TokenizerService {
  private static instance: TokenizerService;
  private encodings: Map<string, ReturnType<typeof get_encoding>> = new Map();
  private initializationError: Error | null = null;

  private constructor() {
    // Initialize common encodings lazily
    this.initializeEncodings();
  }

  public static getInstance(): TokenizerService {
    if (!TokenizerService.instance) {
      TokenizerService.instance = new TokenizerService();
    }
    return TokenizerService.instance;
  }

  /**
   * Initialize tokenizer encodings for different models
   */
  private initializeEncodings(): void {
    try {
      // For Anthropic models, we'll use GPT-4 encoding as a close approximation
      // since Claude uses similar tokenization patterns
      this.encodings.set("claude-3.5-haiku", get_encoding("cl100k_base"));
      this.encodings.set("claude-3.5-sonnet", get_encoding("cl100k_base"));
      this.encodings.set("claude-3-opus", get_encoding("cl100k_base"));
      this.encodings.set("claude-3-haiku", get_encoding("cl100k_base"));

      // Fallback encoding for unknown models
      this.encodings.set("default", get_encoding("cl100k_base"));

      logger.info("Tokenizer encodings initialized successfully");
    } catch (error) {
      logger.warn(
        "Failed to initialize tokenizer encodings, will use fallback methods",
        {
          message: (error as Error).message,
        }
      );
      this.initializationError = error as Error;
      // Don't throw - allow the service to continue with fallback methods
    }
  }

  /**
   * Count tokens in a text string
   */
  public countTokens(text: string, model: string = "default"): TokenCount {
    // If initialization failed, use fallback immediately
    if (this.initializationError || this.encodings.size === 0) {
      logger.debug(
        "Using fallback token counting due to initialization error",
        {
          model,
          textLength: text.length,
          error: this.initializationError?.message,
        }
      );

      return {
        tokens: Math.ceil(text.length / 4),
        characters: text.length,
        model: `${model}-fallback`,
      };
    }

    try {
      const encoding =
        this.encodings.get(model) || this.encodings.get("default");
      if (!encoding) {
        throw new Error(`No encoding found for model: ${model}`);
      }

      const tokens = encoding.encode(text).length;

      return {
        tokens,
        characters: text.length,
        model,
      };
    } catch (error) {
      logger.warn(
        "Token counting failed, falling back to character estimation",
        {
          model,
          textLength: text.length,
          error: (error as Error).message,
        }
      );

      // Fallback to rough character-based estimation
      return {
        tokens: Math.ceil(text.length / 4),
        characters: text.length,
        model: `${model}-fallback`,
      };
    }
  }

  /**
   * Count tokens for input and output text
   */
  public countUsage(
    inputText: string,
    outputText: string,
    model: string = "default"
  ): TokenUsage {
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
   * Count tokens for multiple messages (conversations)
   */
  public countConversationTokens(
    messages: Array<{ role: string; content: string }>,
    model: string = "default"
  ): TokenCount {
    try {
      const combinedText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n\n");

      return this.countTokens(combinedText, model);
    } catch (error) {
      logger.warn("Conversation token counting failed", {
        model,
        messageCount: messages.length,
        errorMessage: (error as Error).message,
      });

      // Fallback: sum individual message tokens
      let totalTokens = 0;
      for (const message of messages) {
        const count = this.countTokens(message.content, model);
        totalTokens += count.tokens;
      }

      return {
        tokens: totalTokens,
        characters: messages.reduce((sum, msg) => sum + msg.content.length, 0),
        model: `${model}-conversation-fallback`,
      };
    }
  }

  /**
   * Estimate cost based on token usage with enhanced pricing data
   */
  public estimateCost(
    tokens: number,
    model: string,
    operationType?: string
  ): number {
    // Enhanced Anthropic pricing (per 1K tokens) - updated as of 2024
    const pricing: Record<
      string,
      { input: number; output: number; context?: number }
    > = {
      "claude-3.5-haiku": {
        input: 0.0008, // $0.0008 per 1K input tokens
        output: 0.004, // $0.004 per 1K output tokens
        context: 0.0008, // $0.0008 per 1K context tokens (for long contexts)
      },
      "claude-3.5-sonnet": {
        input: 0.003,
        output: 0.015,
        context: 0.003,
      },
      "claude-3-opus": {
        input: 0.015,
        output: 0.075,
        context: 0.015,
      },
      "claude-3-haiku": {
        input: 0.00025,
        output: 0.00125,
        context: 0.00025,
      },
      // Fallback for unknown models
      default: {
        input: 0.0008,
        output: 0.004,
        context: 0.0008,
      },
    };

    const modelPricing = pricing[model] || pricing["default"];

    // Apply operation-specific multipliers
    const operationMultiplier = this.getOperationCostMultiplier(operationType);

    // For simple estimation, use output pricing as default
    // In practice, you'd want to separate input/output tokens
    const costPerThousand = modelPricing.output * operationMultiplier;

    return (tokens / 1000) * costPerThousand;
  }

  /**
   * Estimate cost with separate input/output token counts
   */
  public estimateCostDetailed(
    inputTokens: number,
    outputTokens: number,
    model: string,
    operationType?: string
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = this.getModelPricing(model);
    const operationMultiplier = this.getOperationCostMultiplier(operationType);

    const inputCost =
      (inputTokens / 1000) * pricing.input * operationMultiplier;
    const outputCost =
      (outputTokens / 1000) * pricing.output * operationMultiplier;
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
  }

  /**
   * Get pricing data for a specific model
   */
  private getModelPricing(model: string): {
    input: number;
    output: number;
    context: number;
  } {
    const pricing: Record<
      string,
      { input: number; output: number; context: number }
    > = {
      "claude-3.5-haiku": {
        input: 0.0008,
        output: 0.004,
        context: 0.0008,
      },
      "claude-3.5-sonnet": { input: 0.003, output: 0.015, context: 0.003 },
      "claude-3-opus": { input: 0.015, output: 0.075, context: 0.015 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125, context: 0.00025 },
      default: { input: 0.0008, output: 0.004, context: 0.0008 },
    };

    return pricing[model] || pricing["default"];
  }

  /**
   * Get operation-specific cost multiplier
   */
  private getOperationCostMultiplier(operationType?: string): number {
    const multipliers: Record<string, number> = {
      intent_detection: 1.0, // Standard rate
      response_generation: 1.0, // Standard rate
      direct_response: 1.0, // Standard rate
      safety_filter: 0.8, // Slightly discounted for safety operations
      caching: 0.1, // Heavily discounted for cached responses
      optimization: 0.9, // Slightly discounted for optimized operations
    };

    return multipliers[operationType || "response_generation"] || 1.0;
  }

  /**
   * Get supported models
   */
  public getSupportedModels(): string[] {
    return Array.from(this.encodings.keys()).filter((key) => key !== "default");
  }

  /**
   * Get cost comparison between models for the same content
   */
  public compareModelCosts(
    inputText: string,
    outputText: string,
    models: string[]
  ): Array<{ model: string; totalCost: number; savings: number }> {
    const inputTokens = this.countTokens(inputText, models[0]).tokens;
    const outputTokens = this.countTokens(outputText, models[0]).tokens;

    const cheapestModel = models.reduce((cheapest, model) => {
      const cost = this.estimateCost(inputTokens + outputTokens, model);
      const cheapestCost = this.estimateCost(
        inputTokens + outputTokens,
        cheapest
      );
      return cost < cheapestCost ? model : cheapest;
    });

    const cheapestCost = this.estimateCost(
      inputTokens + outputTokens,
      cheapestModel
    );

    return models
      .map((model) => {
        const totalCost = this.estimateCost(inputTokens + outputTokens, model);
        return {
          model,
          totalCost,
          savings: cheapestCost - totalCost,
        };
      })
      .sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Estimate cost savings from prompt optimization
   */
  public estimateOptimizationSavings(
    originalPrompt: string,
    optimizedPrompt: string,
    model: string,
    expectedOutputTokens: number = 1000
  ): {
    originalCost: number;
    optimizedCost: number;
    savings: number;
    savingsPercentage: number;
  } {
    const originalInputTokens = this.countTokens(originalPrompt, model).tokens;
    const optimizedInputTokens = this.countTokens(
      optimizedPrompt,
      model
    ).tokens;

    const originalCost = this.estimateCost(
      originalInputTokens + expectedOutputTokens,
      model
    );
    const optimizedCost = this.estimateCost(
      optimizedInputTokens + expectedOutputTokens,
      model
    );

    const savings = originalCost - optimizedCost;
    const savingsPercentage =
      originalCost > 0 ? (savings / originalCost) * 100 : 0;

    return {
      originalCost,
      optimizedCost,
      savings,
      savingsPercentage,
    };
  }

  /**
   * Get cost-effective model recommendations based on usage patterns
   */
  public getCostEffectiveModelRecommendations(
    currentModel: string,
    averageInputTokens: number,
    averageOutputTokens: number,
    monthlyUsage: number
  ): Array<{ model: string; monthlySavings: number; reason: string }> {
    const recommendations: Array<{
      model: string;
      monthlySavings: number;
      reason: string;
    }> = [];

    const currentCostPerRequest = this.estimateCost(
      averageInputTokens + averageOutputTokens,
      currentModel
    );
    const currentMonthlyCost = currentCostPerRequest * monthlyUsage;

    // Compare with more cost-effective models
    const alternativeModels = ["claude-3.5-haiku", "claude-3-haiku"];

    for (const model of alternativeModels) {
      if (model === currentModel) continue;

      const alternativeCostPerRequest = this.estimateCost(
        averageInputTokens + averageOutputTokens,
        model
      );
      const alternativeMonthlyCost = alternativeCostPerRequest * monthlyUsage;
      const monthlySavings = currentMonthlyCost - alternativeMonthlyCost;

      if (monthlySavings > 0) {
        recommendations.push({
          model,
          monthlySavings,
          reason: `Switch to ${model} for ${monthlySavings.toFixed(
            2
          )} monthly savings`,
        });
      }
    }

    return recommendations.sort((a, b) => b.monthlySavings - a.monthlySavings);
  }

  /**
   * Get supported models with pricing information
   */
  public getSupportedModelsWithPricing(): Array<{
    model: string;
    inputCostPerThousand: number;
    outputCostPerThousand: number;
    contextCostPerThousand?: number;
    recommended: boolean;
  }> {
    const models = this.getSupportedModels();

    return models.map((model) => {
      const modelPricing = this.getModelPricing(model);
      return {
        model,
        inputCostPerThousand: modelPricing.input,
        outputCostPerThousand: modelPricing.output,
        contextCostPerThousand: modelPricing.context,
        recommended: model === "claude-3.5-haiku", // Most cost-effective
      };
    });
  }

  /**
   * Estimate conversation cost based on message history
   */
  public estimateConversationCost(
    messages: Array<{ role: string; content: string }>,
    model: string,
    operationType?: string
  ): {
    totalTokens: number;
    estimatedCost: number;
    breakdown: Array<{ message: string; tokens: number; cost: number }>;
  } {
    const breakdown: Array<{ message: string; tokens: number; cost: number }> =
      [];
    let totalTokens = 0;
    let totalCost = 0;

    for (const message of messages) {
      const tokens = this.countTokens(message.content, model).tokens;
      const cost = this.estimateCost(tokens, model, operationType);

      breakdown.push({
        message:
          message.content.substring(0, 50) +
          (message.content.length > 50 ? "..." : ""),
        tokens,
        cost,
      });

      totalTokens += tokens;
      totalCost += cost;
    }

    return {
      totalTokens,
      estimatedCost: totalCost,
      breakdown,
    };
  }

  /**
   * Clean up encodings (call this when shutting down)
   */
  public cleanup(): void {
    for (const encoding of this.encodings.values()) {
      try {
        encoding.free();
      } catch (error) {
        logger.warn("Failed to free encoding", {
          error: (error as Error).message,
        });
      }
    }
    this.encodings.clear();
  }
}

// Export singleton instance
export const tokenizerService = TokenizerService.getInstance();
