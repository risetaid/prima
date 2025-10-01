/**
 * Simple LLM Cost Service
 * Provides essential cost tracking and usage limits for LLM operations
 * Focused on preventing cost overruns with minimal complexity
 */

import { logger } from "@/lib/logger";
import { llmTokenizerService } from "@/lib/llm-tokenizer";
import { llmUsageService } from "@/services/llm-usage.service";
import { llmBudgetService } from "@/services/llm-budget.service";

export interface UsageLimits {
  dailyTokens: number;
  monthlyTokens: number;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface SimpleCostAlert {
  message: string;
  severity: "warning" | "critical";
}

class SimpleLLMCostService {
  private readonly DAILY_TOKEN_LIMIT = parseInt(process.env.DAILY_TOKEN_LIMIT || "50000");
  private readonly MONTHLY_TOKEN_LIMIT = parseInt(process.env.MONTHLY_TOKEN_LIMIT || "1000000");

  /**
   * Calculate cost for LLM request/response
   */
  async calculateCost(inputText: string, outputText: string, model: string): Promise<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  }> {
    const inputTokenCount = llmTokenizerService.countTokens(inputText, model);
    const outputTokenCount = llmTokenizerService.countTokens(outputText, model);

    const inputCost = llmTokenizerService.estimateCost(inputTokenCount.tokens, model);
    const outputCost = llmTokenizerService.estimateCost(outputTokenCount.tokens, model);

    return {
      inputTokens: inputTokenCount.tokens,
      outputTokens: outputTokenCount.tokens,
      totalTokens: inputTokenCount.tokens + outputTokenCount.tokens,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Check if request is allowed within limits
   */
  async checkLimits(): Promise<{
    allowed: boolean;
    limits: UsageLimits;
    alerts: SimpleCostAlert[];
  }> {
    const stats = await llmUsageService.getUsageStats();
    const alerts: SimpleCostAlert[] = [];
    let allowed = true;

    // Check daily limit
    if (stats.dailyTokens >= this.DAILY_TOKEN_LIMIT) {
      allowed = false;
      alerts.push({
        message: `Daily token limit exceeded: ${stats.dailyTokens}/${this.DAILY_TOKEN_LIMIT}`,
        severity: "critical",
      });
    } else if (stats.dailyTokens >= this.DAILY_TOKEN_LIMIT * 0.8) {
      alerts.push({
        message: `Daily token limit approaching: ${stats.dailyTokens}/${this.DAILY_TOKEN_LIMIT}`,
        severity: "warning",
      });
    }

    // Check monthly limit
    if (stats.monthlyTokens >= this.MONTHLY_TOKEN_LIMIT) {
      allowed = false;
      alerts.push({
        message: `Monthly token limit exceeded: ${stats.monthlyTokens}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: "critical",
      });
    } else if (stats.monthlyTokens >= this.MONTHLY_TOKEN_LIMIT * 0.9) {
      alerts.push({
        message: `Monthly token limit approaching: ${stats.monthlyTokens}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: "warning",
      });
    }

    const limits: UsageLimits = {
      dailyTokens: stats.dailyTokens,
      monthlyTokens: stats.monthlyTokens,
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      monthlyLimit: this.MONTHLY_TOKEN_LIMIT,
    };

    return { allowed, limits, alerts };
  }

  /**
   * Track usage for a request
   */
  async trackUsage(): Promise<void> {
    // This method is now deprecated - use trackMessageCost instead for proper cost tracking
    logger.warn("trackUsage is deprecated, use trackMessageCost for accurate tracking");
  }

  /**
   * Track cost for a conversation message (simplified)
   */
  async trackMessageCost(
    conversationId: string,
    inputText: string,
    outputText: string,
    model: string,
    responseTime: number
  ): Promise<void> {
    try {
      const cost = await this.calculateCost(inputText, outputText, model);
      await llmUsageService.trackUsage(cost.inputTokens, cost.outputTokens, cost.totalCost, model);

      // Check budget limits after tracking usage
      const usageStats = await llmUsageService.getUsageStats();
      await llmBudgetService.checkBudgetLimits(
        usageStats.dailyTokens,
        usageStats.monthlyTokens,
        usageStats.models
      );

      logger.debug("Tracking LLM message cost", {
        conversationId,
        tokens: cost.totalTokens,
        cost: cost.totalCost,
        responseTime,
        model,
      });
    } catch (error) {
      logger.error("Failed to track message cost", error as Error, { conversationId });
    }
  }

  /**
   * Get basic usage stats (simplified)
   */
  async getUsageStats(): Promise<{
    dailyTokens: number;
    monthlyTokens: number;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    const stats = await llmUsageService.getUsageStats();

    return {
      dailyTokens: stats.dailyTokens,
      monthlyTokens: stats.monthlyTokens,
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      monthlyLimit: this.MONTHLY_TOKEN_LIMIT,
    };
  }

}

// Export singleton instance
export const llmCostService = new SimpleLLMCostService();