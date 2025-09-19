/**
 * Enhanced Cost Management Service
 * Provides comprehensive cost calculation, tracking, monitoring, and optimization
 * for LLM operations with per-conversation, per-user, and per-operation breakdowns
 */

import { db } from "@/db";
import { conversationMessages, conversationStates } from "@/db/schema";
import { and, eq, gte, lte, sql, count, sum, desc, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { tokenizerService } from "@/lib/tokenizer";

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  operationType: 'intent_detection' | 'response_generation' | 'direct_response' | 'safety_filter';
}

export interface ConversationCostSummary {
  conversationId: string;
  patientId: string;
  totalCost: number;
  totalTokens: number;
  messageCount: number;
  averageCostPerMessage: number;
  costBreakdown: CostBreakdown[];
  startTime: Date;
  endTime: Date;
}

export interface UserCostSummary {
  userId: string;
  totalCost: number;
  totalTokens: number;
  conversationCount: number;
  averageCostPerConversation: number;
  costByOperation: Record<string, number>;
  costByModel: Record<string, number>;
  periodStart: Date;
  periodEnd: Date;
}

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'spike_detected' | 'efficiency_drop' | 'unusual_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  current: number;
  userId?: string;
  conversationId?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface CostOptimizationRecommendation {
  type: 'model_switch' | 'prompt_optimization' | 'caching_increase' | 'rate_limiting' | 'conversation_limits';
  priority: 'low' | 'medium' | 'high';
  description: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  affectedUsers?: string[];
}

export interface CostPrediction {
  predictedCost: number;
  confidence: number;
  basedOnDays: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendations: CostOptimizationRecommendation[];
}

export class EnhancedCostManager {
  private readonly DEFAULT_BUDGET_THRESHOLDS = {
    daily: 50,
    weekly: 300,
    monthly: 1000,
    perUserDaily: 10,
    perUserMonthly: 100,
  };

  private readonly EFFICIENCY_THRESHOLDS = {
    costPerToken: 0.001, // Max acceptable cost per token
    responseTime: 5000, // Max acceptable response time in ms
    tokenEfficiency: 0.7, // Min acceptable token utilization
  };

  private alerts: CostAlert[] = [];
  private lastAnalysisTime = new Date();

  /**
   * Calculate enhanced cost breakdown for a message
   */
  async calculateEnhancedCost(
    inputText: string,
    outputText: string,
    model: string,
    operationType: CostBreakdown['operationType']
  ): Promise<CostBreakdown> {
    const inputTokenCount = tokenizerService.countTokens(inputText, model);
    const outputTokenCount = tokenizerService.countTokens(outputText, model);

    const inputCost = tokenizerService.estimateCost(inputTokenCount.tokens, model);
    const outputCost = tokenizerService.estimateCost(outputTokenCount.tokens, model);

    // Apply operation-specific multipliers (some operations may have different pricing)
    const operationMultiplier = this.getOperationMultiplier(operationType);
    const totalCost = (inputCost + outputCost) * operationMultiplier;

    return {
      inputTokens: inputTokenCount.tokens,
      outputTokens: outputTokenCount.tokens,
      totalTokens: inputTokenCount.tokens + outputTokenCount.tokens,
      inputCost: inputCost * operationMultiplier,
      outputCost: outputCost * operationMultiplier,
      totalCost,
      model,
      operationType,
    };
  }

  /**
   * Get operation-specific cost multiplier
   */
  private getOperationMultiplier(operationType: CostBreakdown['operationType']): number {
    const multipliers: Record<CostBreakdown['operationType'], number> = {
      intent_detection: 1.0, // Base rate
      response_generation: 1.0,
      direct_response: 1.0,
      safety_filter: 0.5, // Safety operations may have different pricing
    };
    return multipliers[operationType] || 1.0;
  }

  /**
   * Get comprehensive conversation cost summary
   */
  async getConversationCostSummary(
    conversationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversationCostSummary | null> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      // Get conversation messages with cost data
      const messages = await db
        .select({
          id: conversationMessages.id,
          message: conversationMessages.message,
          direction: conversationMessages.direction,
          llmModel: conversationMessages.llmModel,
          llmTokensUsed: conversationMessages.llmTokensUsed,
          llmCost: conversationMessages.llmCost,
          intent: conversationMessages.intent,
          createdAt: conversationMessages.createdAt,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.conversationStateId, conversationId),
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .orderBy(asc(conversationMessages.createdAt));

      if (messages.length === 0) return null;

      // Get conversation state for patient info
      const conversationState = await db
        .select({
          patientId: conversationStates.patientId,
        })
        .from(conversationStates)
        .where(eq(conversationStates.id, conversationId))
        .limit(1);

      const patientId = conversationState[0]?.patientId || 'unknown';

      // Calculate cost breakdown by operation type
      const costBreakdown: CostBreakdown[] = [];
      let totalCost = 0;
      let totalTokens = 0;

      for (const message of messages) {
        if (message.llmCost && message.llmTokensUsed) {
          const operationType = this.inferOperationType(message.intent, message.message);
          const breakdown = await this.calculateEnhancedCost(
            message.direction === 'inbound' ? message.message : '',
            message.direction === 'outbound' ? message.message : '',
            message.llmModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku',
            operationType
          );

          costBreakdown.push(breakdown);
          totalCost += Number(message.llmCost);
          totalTokens += Number(message.llmTokensUsed);
        }
      }

      return {
        conversationId,
        patientId,
        totalCost,
        totalTokens,
        messageCount: messages.length,
        averageCostPerMessage: totalCost / messages.length,
        costBreakdown,
        startTime: messages[0]?.createdAt || start,
        endTime: messages[messages.length - 1]?.createdAt || end,
      };
    } catch (error) {
      logger.error("Failed to get conversation cost summary", error as Error, {
        conversationId,
      });
      return null;
    }
  }

  /**
   * Get user cost summary with detailed breakdowns
   */
  async getUserCostSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserCostSummary | null> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      // Get all conversations for this user
      const conversations = await db
        .select({
          id: conversationStates.id,
        })
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.patientId, userId),
            gte(conversationStates.createdAt, start),
            lte(conversationStates.createdAt, end)
          )
        );

      if (conversations.length === 0) return null;

      const conversationIds = conversations.map(c => c.id);

      // Get cost data for all conversations
      const costData = await db
        .select({
          conversationId: conversationMessages.conversationStateId,
          llmModel: conversationMessages.llmModel,
          llmCost: conversationMessages.llmCost,
          llmTokensUsed: conversationMessages.llmTokensUsed,
          intent: conversationMessages.intent,
        })
        .from(conversationMessages)
        .where(
          and(
            sql`${conversationMessages.conversationStateId} IN ${conversationIds}`,
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      // Aggregate cost data
      let totalCost = 0;
      let totalTokens = 0;
      const costByOperation: Record<string, number> = {};
      const costByModel: Record<string, number> = {};

      for (const data of costData) {
        const cost = Number(data.llmCost);
        const tokens = Number(data.llmTokensUsed);

        totalCost += cost;
        totalTokens += tokens;

        // Track by operation
        const operation = this.inferOperationType(data.intent, '');
        costByOperation[operation] = (costByOperation[operation] || 0) + cost;

        // Track by model
        const model = data.llmModel || 'unknown';
        costByModel[model] = (costByModel[model] || 0) + cost;
      }

      return {
        userId,
        totalCost,
        totalTokens,
        conversationCount: conversations.length,
        averageCostPerConversation: totalCost / conversations.length,
        costByOperation,
        costByModel,
        periodStart: start,
        periodEnd: end,
      };
    } catch (error) {
      logger.error("Failed to get user cost summary", error as Error, {
        userId,
      });
      return null;
    }
  }

  /**
   * Infer operation type from message data
   */
  private inferOperationType(intent: string | null, message: string): CostBreakdown['operationType'] {
    if (!intent) {
      // Try to infer from message content
      if (message.length < 50) return 'intent_detection';
      return 'direct_response';
    }

    switch (intent.toLowerCase()) {
      case 'verification_response':
      case 'medication_confirmation':
      case 'unsubscribe':
      case 'emergency':
      case 'general_inquiry':
        return 'intent_detection';
      default:
        return 'response_generation';
    }
  }

  /**
   * Generate cost alerts based on usage patterns
   */
  async generateCostAlerts(): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];

    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Check daily budget
      const dailyCost = await this.getTotalCostInPeriod(last24h, now);
      if (dailyCost > this.DEFAULT_BUDGET_THRESHOLDS.daily * 0.8) {
        alerts.push({
          id: `daily_budget_${Date.now()}`,
          type: 'budget_exceeded',
          severity: dailyCost > this.DEFAULT_BUDGET_THRESHOLDS.daily ? 'high' : 'medium',
          message: `Daily cost at $${dailyCost.toFixed(2)} (${((dailyCost / this.DEFAULT_BUDGET_THRESHOLDS.daily) * 100).toFixed(1)}% of budget)`,
          threshold: this.DEFAULT_BUDGET_THRESHOLDS.daily,
          current: dailyCost,
          createdAt: now,
        });
      }

      // Check for cost spikes (sudden increases)
      const weeklyCost = await this.getTotalCostInPeriod(last7d, now);
      const dailyAverage = weeklyCost / 7;

      if (dailyCost > dailyAverage * 2) {
        alerts.push({
          id: `cost_spike_${Date.now()}`,
          type: 'spike_detected',
          severity: dailyCost > dailyAverage * 3 ? 'high' : 'medium',
          message: `Cost spike detected: $${dailyCost.toFixed(2)} today vs $${dailyAverage.toFixed(2)} daily average`,
          threshold: dailyAverage,
          current: dailyCost,
          createdAt: now,
        });
      }

      // Check efficiency metrics
      const efficiencyMetrics = await this.getEfficiencyMetrics(last24h, now);
      if (efficiencyMetrics.averageCostPerToken > this.EFFICIENCY_THRESHOLDS.costPerToken) {
        alerts.push({
          id: `efficiency_drop_${Date.now()}`,
          type: 'efficiency_drop',
          severity: 'medium',
          message: `Cost efficiency dropped: $${efficiencyMetrics.averageCostPerToken.toFixed(6)} per token (target: $${this.EFFICIENCY_THRESHOLDS.costPerToken.toFixed(6)})`,
          threshold: this.EFFICIENCY_THRESHOLDS.costPerToken,
          current: efficiencyMetrics.averageCostPerToken,
          createdAt: now,
        });
      }

      // Check for unusual usage patterns
      const usagePattern = await this.detectUnusualUsage(last24h, now);
      if (usagePattern.isUnusual) {
        alerts.push({
          id: `unusual_usage_${Date.now()}`,
          type: 'unusual_usage',
          severity: 'low',
          message: usagePattern.message,
          threshold: usagePattern.expectedValue,
          current: usagePattern.actualValue,
          createdAt: now,
        });
      }

    } catch (error) {
      logger.error("Failed to generate cost alerts", error as Error);
    }

    return alerts;
  }

  /**
   * Get total cost in a specific period
   */
  private async getTotalCostInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db
        .select({ total: sum(conversationMessages.llmCost) })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      return Number(result[0]?.total) || 0;
    } catch (error) {
      logger.error("Failed to get total cost in period", error as Error);
      return 0;
    }
  }

  /**
   * Get efficiency metrics
   */
  private async getEfficiencyMetrics(startDate: Date, endDate: Date): Promise<{
    averageCostPerToken: number;
    averageResponseTime: number;
    tokenUtilization: number;
  }> {
    try {
      const result = await db
        .select({
          totalCost: sum(conversationMessages.llmCost),
          totalTokens: sum(conversationMessages.llmTokensUsed),
          totalResponseTime: sum(conversationMessages.llmResponseTimeMs),
          messageCount: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmCost} IS NOT NULL`,
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        );

      const data = result[0];
      const totalCost = Number(data?.totalCost) || 0;
      const totalTokens = Number(data?.totalTokens) || 0;
      const totalResponseTime = Number(data?.totalResponseTime) || 0;
      const messageCount = Number(data?.messageCount) || 1;

      return {
        averageCostPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
        averageResponseTime: totalResponseTime / messageCount,
        tokenUtilization: totalTokens > 0 ? (totalTokens / (totalTokens * 1.1)) : 0, // Rough estimate
      };
    } catch (error) {
      logger.error("Failed to get efficiency metrics", error as Error);
      return {
        averageCostPerToken: 0,
        averageResponseTime: 0,
        tokenUtilization: 0,
      };
    }
  }

  /**
   * Detect unusual usage patterns
   */
  private async detectUnusualUsage(startDate: Date, endDate: Date): Promise<{
    isUnusual: boolean;
    message: string;
    expectedValue: number;
    actualValue: number;
  }> {
    try {
      // Compare current period with previous period
      const currentPeriodCost = await this.getTotalCostInPeriod(startDate, endDate);
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const previousPeriodCost = await this.getTotalCostInPeriod(previousPeriodStart, startDate);

      const increase = ((currentPeriodCost - previousPeriodCost) / (previousPeriodCost || 1)) * 100;

      if (increase > 50) { // 50% increase
        return {
          isUnusual: true,
          message: `Unusual cost increase: ${increase.toFixed(1)}% compared to previous period`,
          expectedValue: previousPeriodCost,
          actualValue: currentPeriodCost,
        };
      }

      return {
        isUnusual: false,
        message: '',
        expectedValue: previousPeriodCost,
        actualValue: currentPeriodCost,
      };
    } catch (error) {
      logger.error("Failed to detect unusual usage", error as Error);
      return {
        isUnusual: false,
        message: '',
        expectedValue: 0,
        actualValue: 0,
      };
    }
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateOptimizationRecommendations(): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    try {
      const now = new Date();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Analyze model usage and costs
      const modelUsage = await db
        .select({
          model: conversationMessages.llmModel,
          totalCost: sum(conversationMessages.llmCost),
          totalTokens: sum(conversationMessages.llmTokensUsed),
          count: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last7d),
            sql`${conversationMessages.llmModel} IS NOT NULL`,
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.llmModel)
        .orderBy(desc(sum(conversationMessages.llmCost)));

      // Recommend model switching if expensive models are heavily used
      const expensiveModels = modelUsage.filter(m =>
        Number(m.totalCost) > 100 && m.model?.includes('pro')
      );

      if (expensiveModels.length > 0) {
        recommendations.push({
          type: 'model_switch',
          priority: 'high',
          description: `Switch from expensive models (${expensiveModels.map(m => m.model).join(', ')}) to cost-effective alternatives`,
          potentialSavings: expensiveModels.reduce((sum, m) => sum + Number(m.totalCost) * 0.5, 0),
          implementationEffort: 'medium',
        });
      }

      // Analyze intent patterns for caching opportunities
      const intentUsage = await db
        .select({
          intent: conversationMessages.intent,
          count: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last7d),
            sql`${conversationMessages.intent} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.intent)
        .orderBy(desc(count()));

      const highFrequencyIntents = intentUsage.filter(i => Number(i.count) > 50);
      if (highFrequencyIntents.length > 0) {
        recommendations.push({
          type: 'caching_increase',
          priority: 'medium',
          description: `Implement caching for high-frequency intents: ${highFrequencyIntents.slice(0, 3).map(i => i.intent).join(', ')}`,
          potentialSavings: highFrequencyIntents.reduce((sum, i) => sum + Number(i.count) * 0.1, 0), // Estimate 10% savings per cached response
          implementationEffort: 'low',
        });
      }

      // Check for long conversations that might need optimization
      const longConversations = await db
        .select({
          conversationId: conversationMessages.conversationStateId,
          messageCount: count(),
          totalCost: sum(conversationMessages.llmCost),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last7d),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.conversationStateId)
        .having(sql`${count()} > 10`)
        .orderBy(desc(sum(conversationMessages.llmCost)))
        .limit(5);

      if (longConversations.length > 0) {
        recommendations.push({
          type: 'conversation_limits',
          priority: 'low',
          description: 'Implement conversation length limits to prevent cost overruns in extended conversations',
          potentialSavings: longConversations.reduce((sum, c) => sum + Number(c.totalCost) * 0.2, 0),
          implementationEffort: 'low',
        });
      }

    } catch (error) {
      logger.error("Failed to generate optimization recommendations", error as Error);
    }

    return recommendations;
  }

  /**
   * Predict future costs based on usage patterns
   */
  async predictCosts(daysAhead: number = 30): Promise<CostPrediction> {
    try {
      const now = new Date();
      const pastPeriod = new Date(now.getTime() - daysAhead * 24 * 60 * 60 * 1000);

      // Get historical cost data
      const historicalData = await db
        .select({
          date: sql<string>`DATE(${conversationMessages.createdAt})`,
          totalCost: sum(conversationMessages.llmCost),
          totalTokens: sum(conversationMessages.llmTokensUsed),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, pastPeriod),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE(${conversationMessages.createdAt})`)
        .orderBy(asc(sql`DATE(${conversationMessages.createdAt})`));

      if (historicalData.length < 7) {
        return {
          predictedCost: 0,
          confidence: 0,
          basedOnDays: historicalData.length,
          trend: 'stable',
          recommendations: [],
        };
      }

      // Calculate trend
      const costs = historicalData.map(d => Number(d.totalCost));
      const recentCosts = costs.slice(-7);
      const earlierCosts = costs.slice(-14, -7);

      const recentAverage = recentCosts.reduce((sum, cost) => sum + cost, 0) / recentCosts.length;
      const earlierAverage = earlierCosts.reduce((sum, cost) => sum + cost, 0) / earlierCosts.length;

      const trend: CostPrediction['trend'] =
        recentAverage > earlierAverage * 1.1 ? 'increasing' :
        recentAverage < earlierAverage * 0.9 ? 'decreasing' : 'stable';

      // Simple linear prediction
      const dailyIncrease = (recentAverage - earlierAverage) / 7;
      const predictedCost = recentAverage + (dailyIncrease * daysAhead);

      // Calculate confidence based on data consistency
      const variance = this.calculateVariance(costs);
      const confidence = Math.max(0, Math.min(1, 1 - (variance / recentAverage)));

      // Generate recommendations based on prediction
      const recommendations = await this.generateOptimizationRecommendations();

      return {
        predictedCost: Math.max(0, predictedCost),
        confidence,
        basedOnDays: historicalData.length,
        trend,
        recommendations,
      };
    } catch (error) {
      logger.error("Failed to predict costs", error as Error);
      return {
        predictedCost: 0,
        confidence: 0,
        basedOnDays: 0,
        trend: 'stable',
        recommendations: [],
      };
    }
  }

  /**
   * Calculate variance for confidence estimation
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Get comprehensive cost dashboard data
   */
  async getCostDashboard(): Promise<{
    totalCost: number;
    totalTokens: number;
    activeAlerts: CostAlert[];
    topCostConversations: ConversationCostSummary[];
    costByModel: Record<string, number>;
    costByOperation: Record<string, number>;
    predictions: CostPrediction;
    recommendations: CostOptimizationRecommendation[];
  }> {
    try {
      const now = new Date();
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get basic metrics
      const basicStats = await db
        .select({
          totalCost: sum(conversationMessages.llmCost),
          totalTokens: sum(conversationMessages.llmTokensUsed),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last30d),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      // Get cost by model
      const modelStats = await db
        .select({
          model: conversationMessages.llmModel,
          cost: sum(conversationMessages.llmCost),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last30d),
            sql`${conversationMessages.llmModel} IS NOT NULL`,
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.llmModel);

      // Get cost by operation (inferred from intent)
      const operationStats = await db
        .select({
          intent: conversationMessages.intent,
          cost: sum(conversationMessages.llmCost),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last30d),
            sql`${conversationMessages.intent} IS NOT NULL`,
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.intent);

      // Get top cost conversations
      const topConversations = await db
        .select({
          conversationId: conversationMessages.conversationStateId,
          totalCost: sum(conversationMessages.llmCost),
          messageCount: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, last30d),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )
        .groupBy(conversationMessages.conversationStateId)
        .orderBy(desc(sum(conversationMessages.llmCost)))
        .limit(10);

      // Get conversation summaries for top cost conversations
      const topCostConversations: ConversationCostSummary[] = [];
      for (const conv of topConversations) {
        const summary = await this.getConversationCostSummary(conv.conversationId, last30d, now);
        if (summary) {
          topCostConversations.push(summary);
        }
      }

      // Process cost by operation
      const costByOperation: Record<string, number> = {};
      for (const stat of operationStats) {
        const operation = this.inferOperationType(stat.intent, '');
        costByOperation[operation] = (costByOperation[operation] || 0) + Number(stat.cost);
      }

      // Process cost by model
      const costByModel: Record<string, number> = {};
      for (const stat of modelStats) {
        costByModel[stat.model || 'unknown'] = Number(stat.cost);
      }

      // Get alerts, predictions, and recommendations
      const activeAlerts = await this.generateCostAlerts();
      const predictions = await this.predictCosts();
      const recommendations = await this.generateOptimizationRecommendations();

      return {
        totalCost: Number(basicStats[0]?.totalCost) || 0,
        totalTokens: Number(basicStats[0]?.totalTokens) || 0,
        activeAlerts,
        topCostConversations,
        costByModel,
        costByOperation,
        predictions,
        recommendations,
      };
    } catch (error) {
      logger.error("Failed to get cost dashboard", error as Error);
      return {
        totalCost: 0,
        totalTokens: 0,
        activeAlerts: [],
        topCostConversations: [],
        costByModel: {},
        costByOperation: {},
        predictions: {
          predictedCost: 0,
          confidence: 0,
          basedOnDays: 0,
          trend: 'stable',
          recommendations: [],
        },
        recommendations: [],
      };
    }
  }
}

// Export singleton instance
export const enhancedCostManager = new EnhancedCostManager();