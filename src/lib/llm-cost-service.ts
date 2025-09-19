/**
 * Simple LLM Cost Service
 * Provides essential cost tracking and usage limits for LLM operations
 * Focused on preventing cost overruns with minimal complexity
 */

import { logger } from "@/lib/logger";
import { tokenizerService } from "@/lib/simple-tokenizer";

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

  // Simple in-memory tracking (resets on server restart)
  private dailyTokens = 0;
  private monthlyTokens = 0;
  private lastDailyReset = new Date();
  private lastMonthlyReset = new Date();

  /**
   * Calculate cost for LLM request/response
   */
  async calculateCost(inputText: string, outputText: string, model: string): Promise<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  }> {
    const inputTokenCount = tokenizerService.countTokens(inputText, model);
    const outputTokenCount = tokenizerService.countTokens(outputText, model);

    const inputCost = tokenizerService.estimateCost(inputTokenCount.tokens, model);
    const outputCost = tokenizerService.estimateCost(outputTokenCount.tokens, model);

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
    this.resetCountersIfNeeded();

    const alerts: SimpleCostAlert[] = [];
    let allowed = true;

    // Check daily limit
    if (this.dailyTokens >= this.DAILY_TOKEN_LIMIT) {
      allowed = false;
      alerts.push({
        message: `Daily token limit exceeded: ${this.dailyTokens}/${this.DAILY_TOKEN_LIMIT}`,
        severity: "critical",
      });
    } else if (this.dailyTokens >= this.DAILY_TOKEN_LIMIT * 0.8) {
      alerts.push({
        message: `Daily token limit approaching: ${this.dailyTokens}/${this.DAILY_TOKEN_LIMIT}`,
        severity: "warning",
      });
    }

    // Check monthly limit
    if (this.monthlyTokens >= this.MONTHLY_TOKEN_LIMIT) {
      allowed = false;
      alerts.push({
        message: `Monthly token limit exceeded: ${this.monthlyTokens}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: "critical",
      });
    } else if (this.monthlyTokens >= this.MONTHLY_TOKEN_LIMIT * 0.9) {
      alerts.push({
        message: `Monthly token limit approaching: ${this.monthlyTokens}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: "warning",
      });
    }

    const limits: UsageLimits = {
      dailyTokens: this.dailyTokens,
      monthlyTokens: this.monthlyTokens,
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      monthlyLimit: this.MONTHLY_TOKEN_LIMIT,
    };

    return { allowed, limits, alerts };
  }

  /**
   * Track usage for a request
   */
  async trackUsage(tokens: number): Promise<void> {
    this.resetCountersIfNeeded();

    this.dailyTokens += tokens;
    this.monthlyTokens += tokens;

    logger.debug("LLM usage tracked", {
      tokens,
      dailyTotal: this.dailyTokens,
      monthlyTotal: this.monthlyTokens,
    });
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
      await this.trackUsage(cost.totalTokens);

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
    this.resetCountersIfNeeded();

    return {
      dailyTokens: this.dailyTokens,
      monthlyTokens: this.monthlyTokens,
      dailyLimit: this.DAILY_TOKEN_LIMIT,
      monthlyLimit: this.MONTHLY_TOKEN_LIMIT,
    };
  }

  /**
   * Reset counters if needed (based on date)
   */
  private resetCountersIfNeeded(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reset daily counter if it's a new day
    if (this.lastDailyReset < today) {
      this.dailyTokens = 0;
      this.lastDailyReset = today;
      logger.info("Daily token counter reset");
    }

    // Reset monthly counter if it's a new month
    if (this.lastMonthlyReset < thisMonth) {
      this.monthlyTokens = 0;
      this.lastMonthlyReset = thisMonth;
      logger.info("Monthly token counter reset");
    }
  }
}

// Export singleton instance
export const llmCostService = new SimpleLLMCostService();