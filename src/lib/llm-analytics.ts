/**
 * LLM Analytics Service for cost management and usage tracking
 * Provides analytics, alerts, and usage limits for LLM operations
 */

import { db } from "@/db";
import { conversationMessages } from "@/db/schema";
import { and, gte, lte, sql, count, sum, avg, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { tokenizerService } from "@/lib/tokenizer";

export interface LLMUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  requestsByModel: Record<string, number>;
  costByModel: Record<string, number>;
  requestsByIntent: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

export interface LLMCostAlert {
  type: "budget" | "rate_limit" | "performance";
  message: string;
  threshold: number;
  current: number;
  severity: "low" | "medium" | "high" | "critical";
}

export class LLMAnalyticsService {
  private readonly MONTHLY_TOKEN_LIMIT = parseInt(
    process.env.MONTHLY_TOKEN_LIMIT || "1000000"
  );
  private readonly COST_ALERT_THRESHOLD = parseFloat(
    process.env.COST_ALERT_THRESHOLD || "100"
  );
  private readonly PERFORMANCE_ALERT_THRESHOLD_MS = 5000; // 5 seconds

  /**
   * Get comprehensive LLM usage statistics
   */
  async getUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<LLMUsageStats> {
    try {
      const start =
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get total stats
      const totalStats = await db
        .select({
          totalRequests: count(),
          totalTokens: sum(conversationMessages.llmTokensUsed),
          totalCost: sum(conversationMessages.llmCost),
          averageResponseTime: avg(conversationMessages.llmResponseTimeMs),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        );

      // Get stats by model
      const modelStats = await db
        .select({
          model: conversationMessages.llmModel,
          requests: count(),
          tokens: sum(conversationMessages.llmTokensUsed),
          cost: sum(conversationMessages.llmCost),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmModel} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.llmModel);

      // Get stats by intent
      const intentStats = await db
        .select({
          intent: conversationMessages.intent,
          requests: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.intent} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.intent);

      // Get daily usage
      const dailyStats = await db
        .select({
          date: sql<string>`DATE(${conversationMessages.createdAt})`,
          requests: count(),
          tokens: sum(conversationMessages.llmTokensUsed),
          cost: sum(conversationMessages.llmCost),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE(${conversationMessages.createdAt})`)
        .orderBy(desc(sql`DATE(${conversationMessages.createdAt})`));

      // Process results
      const requestsByModel: Record<string, number> = {};
      const costByModel: Record<string, number> = {};
      const requestsByIntent: Record<string, number> = {};

      modelStats.forEach((stat) => {
        if (stat.model) {
          requestsByModel[stat.model] = Number(stat.requests) || 0;
          costByModel[stat.model] = Number(stat.cost) || 0;
        }
      });

      intentStats.forEach((stat) => {
        if (stat.intent) {
          requestsByIntent[stat.intent] = Number(stat.requests) || 0;
        }
      });

      const total = totalStats[0] || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
      };

      return {
        totalRequests: Number(total.totalRequests) || 0,
        totalTokens: Number(total.totalTokens) || 0,
        totalCost: Number(total.totalCost) || 0,
        averageResponseTime: Number(total.averageResponseTime) || 0,
        requestsByModel,
        costByModel,
        requestsByIntent,
        dailyUsage: dailyStats.map((stat) => ({
          date: stat.date,
          requests: Number(stat.requests) || 0,
          tokens: Number(stat.tokens) || 0,
          cost: Number(stat.cost) || 0,
        })),
      };
    } catch (error) {
      logger.error("Failed to get LLM usage stats", error as Error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        requestsByModel: {},
        costByModel: {},
        requestsByIntent: {},
        dailyUsage: [],
      };
    }
  }

  /**
   * Check for cost and usage alerts
   */
  async checkAlerts(): Promise<LLMCostAlert[]> {
    const alerts: LLMCostAlert[] = [];

    try {
      const stats = await this.getUsageStats();

      // Check monthly token limit
      if (stats.totalTokens > this.MONTHLY_TOKEN_LIMIT * 0.8) {
        const severity =
          stats.totalTokens > this.MONTHLY_TOKEN_LIMIT ? "critical" : "high";
        alerts.push({
          type: "budget",
          message: `Monthly token usage at ${(
            (stats.totalTokens / this.MONTHLY_TOKEN_LIMIT) *
            100
          ).toFixed(1)}% of limit`,
          threshold: this.MONTHLY_TOKEN_LIMIT,
          current: stats.totalTokens,
          severity,
        });
      }

      // Check cost threshold
      if (stats.totalCost > this.COST_ALERT_THRESHOLD * 0.8) {
        const severity =
          stats.totalCost > this.COST_ALERT_THRESHOLD ? "critical" : "high";
        alerts.push({
          type: "budget",
          message: `Monthly cost at $${stats.totalCost.toFixed(2)} exceeds ${(
            this.COST_ALERT_THRESHOLD * 0.8
          ).toFixed(2)} threshold`,
          threshold: this.COST_ALERT_THRESHOLD,
          current: stats.totalCost,
          severity,
        });
      }

      // Check performance
      if (stats.averageResponseTime > this.PERFORMANCE_ALERT_THRESHOLD_MS) {
        alerts.push({
          type: "performance",
          message: `Average response time ${stats.averageResponseTime.toFixed(
            0
          )}ms exceeds ${this.PERFORMANCE_ALERT_THRESHOLD_MS}ms threshold`,
          threshold: this.PERFORMANCE_ALERT_THRESHOLD_MS,
          current: stats.averageResponseTime,
          severity: "medium",
        });
      }

      // Check for high error rates (messages without LLM data)
      const totalMessages = await db
        .select({ count: count() })
        .from(conversationMessages)
        .where(sql`DATE(${conversationMessages.createdAt}) = CURRENT_DATE`);

      const llmMessages = await db
        .select({ count: count() })
        .from(conversationMessages)
        .where(
          and(
            sql`DATE(${conversationMessages.createdAt}) = CURRENT_DATE`,
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        );

      const totalCount = Number(totalMessages[0]?.count) || 0;
      const llmCount = Number(llmMessages[0]?.count) || 0;

      if (totalCount > 0) {
        const errorRate = ((totalCount - llmCount) / totalCount) * 100;
        if (errorRate > 20) {
          // More than 20% messages without LLM data
          alerts.push({
            type: "performance",
            message: `${errorRate.toFixed(
              1
            )}% of messages today lack LLM processing`,
            threshold: 20,
            current: errorRate,
            severity: "medium",
          });
        }
      }
    } catch (error) {
      logger.error("Failed to check LLM alerts", error as Error);
    }

    return alerts;
  }

  /**
   * Calculate cost per token for different models
   * @deprecated Use tokenizerService.estimateCost() instead
   */
  getCostPerToken(model: string): number {
    // Google Gemini pricing (approximate)
    const pricing: Record<string, number> = {
      "gemini-2.0-flash-exp": 0.0005, // $0.0005 per 1K tokens (experimental)
      "gemini-1.5-flash": 0.0005, // $0.0005 per 1K tokens
      "gemini-1.5-pro": 0.00125, // $0.00125 per 1K tokens
      "gemini-1.0-pro": 0.001, // $0.001 per 1K tokens
    };

    return pricing[model] || 0.0005;
  }

  /**
   * Estimate cost for a given number of tokens
   * @deprecated Use tokenizerService.estimateCost() instead
   */
  estimateCost(tokens: number, model: string): number {
    return tokenizerService.estimateCost(tokens, model);
  }

  /**
   * Get cost optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const stats = await this.getUsageStats();

    // Check for high token usage intents
    const highUsageIntents = Object.entries(stats.requestsByIntent)
      .filter(([, count]) => count > 100)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (highUsageIntents.length > 0) {
      recommendations.push(
        `Consider caching responses for high-usage intents: ${highUsageIntents
          .map(([intent]) => intent)
          .join(", ")}`
      );
    }

    // Check for slow responses
    if (stats.averageResponseTime > 3000) {
      recommendations.push(
        "Average response time is high. Consider optimizing prompts or using faster models."
      );
    }

    // Check cost distribution
    const totalCost = Object.values(stats.costByModel).reduce(
      (sum, cost) => sum + cost,
      0
    );
    const expensiveModels = Object.entries(stats.costByModel)
      .filter(([, cost]) => cost > totalCost * 0.5)
      .map(([model]) => model);

    if (expensiveModels.length > 0) {
      recommendations.push(
        `Consider switching from expensive models: ${expensiveModels.join(
          ", "
        )}`
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const llmAnalytics = new LLMAnalyticsService();
