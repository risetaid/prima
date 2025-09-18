/**
 * Cost Optimization Service
 * Provides automated cost optimization recommendations and implementations
 * for LLM operations with intelligent analysis and optimization strategies
 */

import { db } from "@/db";
import { conversationMessages } from "@/db/schema";
import { and, eq, gte, lte, sql, count, sum, avg, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { tokenizerService } from "@/lib/tokenizer";
import { promptOptimizer } from "@/lib/prompt-optimizer";
import { enhancedCostManager, CostOptimizationRecommendation } from "@/lib/enhanced-cost-manager";

type UsageAnalysisData = {
  totalCost: number;
  totalTokens: number;
  conversationsByIntent: Record<string, number>;
  costByModel: Record<string, number>;
  averageResponseTime: number;
  highCostConversations: Array<{ id: string; cost: number; messageCount: number }>;
  repeatedQueries: Array<{ query: string; frequency: number; totalCost: number }>;
};

export interface OptimizationResult {
  optimizationId: string;
  type: 'prompt_optimization' | 'model_switch' | 'caching' | 'rate_limiting' | 'conversation_limits';
  description: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  confidence: number;
  affectedConversations: number;
  estimatedImplementationTime: number; // in minutes
  applied: boolean;
  appliedAt?: Date;
  results?: {
    actualSavings: number;
    performance: number;
    userImpact: 'positive' | 'neutral' | 'negative';
  };
}

export interface OptimizationReport {
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  totalTokens: number;
  optimizations: OptimizationResult[];
  summary: {
    totalPotentialSavings: number;
    implementedOptimizations: number;
    averageSavingsPercentage: number;
    topOptimizationType: string;
  };
  recommendations: CostOptimizationRecommendation[];
}

export class CostOptimizerService {
  private optimizations: OptimizationResult[] = [];
  private readonly ANALYSIS_WINDOW_DAYS = 7;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;

  /**
   * Analyze usage patterns and generate optimization recommendations
   */
  async analyzeAndOptimize(): Promise<OptimizationReport> {
    const now = new Date();
    const analysisStart = new Date(now.getTime() - this.ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    logger.info("Starting cost optimization analysis", {
      period: `${analysisStart.toISOString()} to ${now.toISOString()}`
    });

    // Get usage data for analysis
    const usageData = await this.getUsageAnalysisData(analysisStart, now);

    // Generate optimization recommendations
    const optimizations = await this.generateOptimizations(usageData);

    // Calculate potential savings
    const totalPotentialSavings = optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);
    const implementedOptimizations = optimizations.filter(opt => opt.applied).length;
    const averageSavingsPercentage = usageData.totalCost > 0
      ? (totalPotentialSavings / usageData.totalCost) * 100
      : 0;

    // Get top optimization type
    const optimizationTypes = optimizations.reduce((acc, opt) => {
      acc[opt.type] = (acc[opt.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topOptimizationType = Object.entries(optimizationTypes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Get enhanced recommendations from cost manager
    const recommendations = await enhancedCostManager.generateOptimizationRecommendations();

    const report: OptimizationReport = {
      period: {
        start: analysisStart,
        end: now
      },
      totalCost: usageData.totalCost,
      totalTokens: usageData.totalTokens,
      optimizations,
      summary: {
        totalPotentialSavings,
        implementedOptimizations,
        averageSavingsPercentage,
        topOptimizationType
      },
      recommendations
    };

    logger.info("Cost optimization analysis completed", {
      totalCost: usageData.totalCost,
      potentialSavings: totalPotentialSavings,
      savingsPercentage: averageSavingsPercentage.toFixed(2) + '%',
      optimizationsCount: optimizations.length
    });

    return report;
  }

  /**
   * Get usage analysis data
   */
  private async getUsageAnalysisData(startDate: Date, endDate: Date): Promise<{
    totalCost: number;
    totalTokens: number;
    conversationsByIntent: Record<string, number>;
    costByModel: Record<string, number>;
    averageResponseTime: number;
    highCostConversations: Array<{ id: string; cost: number; messageCount: number }>;
    repeatedQueries: Array<{ query: string; frequency: number; totalCost: number }>;
  }> {
    // Get basic cost and token data
    const basicStats = await db
      .select({
        totalCost: sum(conversationMessages.llmCost),
        totalTokens: sum(conversationMessages.llmTokensUsed),
        averageResponseTime: avg(conversationMessages.llmResponseTimeMs),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, startDate),
          lte(conversationMessages.createdAt, endDate),
          sql`${conversationMessages.llmCost} IS NOT NULL`
        )
      );

    // Get conversations by intent
    const intentStats = await db
      .select({
        intent: conversationMessages.intent,
        messageCount: count(),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, startDate),
          lte(conversationMessages.createdAt, endDate),
          sql`${conversationMessages.intent} IS NOT NULL`
        )
      )
      .groupBy(conversationMessages.intent);

    // Get cost by model
    const modelStats = await db
      .select({
        model: conversationMessages.llmModel,
        totalCost: sum(conversationMessages.llmCost),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, startDate),
          lte(conversationMessages.createdAt, endDate),
          sql`${conversationMessages.llmModel} IS NOT NULL`,
          sql`${conversationMessages.llmCost} IS NOT NULL`
        )
      )
      .groupBy(conversationMessages.llmModel);

    // Get high-cost conversations
    const highCostConversations = await db
      .select({
        conversationId: conversationMessages.conversationStateId,
        totalCost: sum(conversationMessages.llmCost),
        messageCount: count(),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, startDate),
          lte(conversationMessages.createdAt, endDate),
          sql`${conversationMessages.llmCost} IS NOT NULL`
        )
      )
      .groupBy(conversationMessages.conversationStateId)
      .orderBy(desc(sum(conversationMessages.llmCost)))
      .limit(10);

    // Analyze repeated queries (simplified - looking for similar message patterns)
    const repeatedQueries = await this.analyzeRepeatedQueries(startDate, endDate);

    return {
      totalCost: Number(basicStats[0]?.totalCost) || 0,
      totalTokens: Number(basicStats[0]?.totalTokens) || 0,
      conversationsByIntent: intentStats.reduce((acc, stat) => {
        acc[stat.intent || 'unknown'] = Number(stat.messageCount);
        return acc;
      }, {} as Record<string, number>),
      costByModel: modelStats.reduce((acc, stat) => {
        acc[stat.model || 'unknown'] = Number(stat.totalCost);
        return acc;
      }, {} as Record<string, number>),
      averageResponseTime: Number(basicStats[0]?.averageResponseTime) || 0,
      highCostConversations: highCostConversations.map((conv) => ({
        id: conv.conversationId || '',
        cost: Number(conv.totalCost),
        messageCount: Number(conv.messageCount)
      })),
      repeatedQueries
    };
  }

  /**
   * Analyze repeated queries for caching opportunities
   */
  private async analyzeRepeatedQueries(startDate: Date, endDate: Date): Promise<Array<{ query: string; frequency: number; totalCost: number }>> {
    // Get messages and group by similar content
    const messages = await db
      .select({
        message: conversationMessages.message,
        cost: conversationMessages.llmCost,
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, startDate),
          lte(conversationMessages.createdAt, endDate),
          eq(conversationMessages.direction, 'inbound'),
          sql`${conversationMessages.llmCost} IS NOT NULL`
        )
      );

    // Simple frequency analysis (in production, you'd use more sophisticated similarity matching)
    const queryFrequency: Record<string, { count: number; totalCost: number }> = {};

    for (const msg of messages) {
      // Normalize message for grouping (lowercase, remove punctuation)
      const normalized = msg.message.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .substring(0, 50); // First 50 chars

      if (!queryFrequency[normalized]) {
        queryFrequency[normalized] = { count: 0, totalCost: 0 };
      }

      queryFrequency[normalized].count++;
      queryFrequency[normalized].totalCost += Number(msg.cost);
    }

    // Return queries that appear more than once
    return Object.entries(queryFrequency)
      .filter(([, data]) => data.count > 1)
      .map(([query, data]) => ({
        query,
        frequency: data.count,
        totalCost: data.totalCost
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // 1. Model optimization
    const modelOptimizations = await this.generateModelOptimizations(usageData);
    optimizations.push(...modelOptimizations);

    // 2. Prompt optimization
    const promptOptimizations = await this.generatePromptOptimizations(usageData);
    optimizations.push(...promptOptimizations);

    // 3. Caching optimization
    const cachingOptimizations = await this.generateCachingOptimizations(usageData);
    optimizations.push(...cachingOptimizations);

    // 4. Conversation length optimization
    const conversationOptimizations = await this.generateConversationOptimizations(usageData);
    optimizations.push(...conversationOptimizations);

    // 5. Rate limiting optimization
    const rateLimitOptimizations = await this.generateRateLimitOptimizations(usageData);
    optimizations.push(...rateLimitOptimizations);

    return optimizations;
  }

  /**
   * Generate model switching optimizations
   */
  private async generateModelOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // Compare costs between models
    const modelComparison = tokenizerService.compareModelCosts(
      'Sample input text for comparison',
      'Sample output response for comparison',
      ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro']
    );

    for (const comparison of modelComparison.slice(1)) { // Skip the cheapest (first)
      if (comparison.savings > 0) {
        const affectedConversations = Object.values(usageData.costByModel).reduce((sum: number, cost: unknown) => sum + (cost as number), 0);
        const potentialSavings = (comparison.savings / comparison.totalCost) * usageData.totalCost;

        optimizations.push({
          optimizationId: `model_switch_${comparison.model}_${Date.now()}`,
          type: 'model_switch',
          description: `Switch to ${comparison.model} for $${comparison.savings.toFixed(2)} savings per 1000 tokens`,
          potentialSavings,
          implementationEffort: 'medium',
          confidence: 0.8,
          affectedConversations,
          estimatedImplementationTime: 30, // 30 minutes
          applied: false
        });
      }
    }

    return optimizations;
  }

  /**
   * Generate prompt optimization recommendations
   */
  private async generatePromptOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // Analyze system prompts used in responses
    const systemPrompts = await db
      .select({
        message: conversationMessages.message,
        cost: conversationMessages.llmCost,
        tokens: conversationMessages.llmTokensUsed,
      })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.direction, 'outbound'),
          sql`${conversationMessages.llmCost} IS NOT NULL`,
          sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
        )
      )
      .limit(100); // Sample recent responses

    let totalSavings = 0;
    let promptCount = 0;

    for (const prompt of systemPrompts) {
      if (prompt.message.length > 200) { // Only optimize longer prompts
        const optimization = promptOptimizer.optimizeSystemPrompt(prompt.message);
        if (optimization.optimized.savingsPercentage > 10) {
          totalSavings += optimization.optimized.savings;
          promptCount++;
        }
      }
    }

    if (promptCount > 0) {
      optimizations.push({
        optimizationId: `prompt_opt_${Date.now()}`,
        type: 'prompt_optimization',
        description: `Optimize system prompts to reduce token usage by average ${((totalSavings / promptCount) * 100).toFixed(1)}%`,
        potentialSavings: totalSavings,
        implementationEffort: 'low',
        confidence: 0.7,
        affectedConversations: Math.floor(usageData.totalTokens / 100), // Estimate
        estimatedImplementationTime: 15,
        applied: false
      });
    }

    return optimizations;
  }

  /**
   * Generate caching optimizations
   */
  private async generateCachingOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // Analyze repeated queries
    const repeatedQueries = usageData.repeatedQueries;
    if (repeatedQueries.length > 0) {
      const totalRepeatedCost = repeatedQueries.reduce((sum: number, q: { totalCost: number; frequency: number; query: string }) => sum + q.totalCost, 0);
      const totalRepeatedQueries = repeatedQueries.reduce((sum: number, q: { totalCost: number; frequency: number; query: string }) => sum + q.frequency, 0);

      optimizations.push({
        optimizationId: `caching_${Date.now()}`,
        type: 'caching',
        description: `Implement caching for ${repeatedQueries.length} repeated query patterns to save $${totalRepeatedCost.toFixed(2)}`,
        potentialSavings: totalRepeatedCost * 0.9, // 90% savings from caching
        implementationEffort: 'medium',
        confidence: 0.85,
        affectedConversations: totalRepeatedQueries,
        estimatedImplementationTime: 45,
        applied: false
      });
    }

    return optimizations;
  }

  /**
   * Generate conversation length optimizations
   */
  private async generateConversationOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // Analyze high-cost conversations
    const highCostConversations = usageData.highCostConversations.filter((conv) => conv.cost > 10);

    if (highCostConversations.length > 0) {
      const totalHighCost = highCostConversations.reduce((sum: number, conv) => sum + conv.cost, 0);

      optimizations.push({
        optimizationId: `conversation_limits_${Date.now()}`,
        type: 'conversation_limits',
        description: `Implement conversation length limits for ${highCostConversations.length} high-cost conversations`,
        potentialSavings: totalHighCost * 0.3, // 30% savings from limiting
        implementationEffort: 'low',
        confidence: 0.75,
        affectedConversations: highCostConversations.length,
        estimatedImplementationTime: 20,
        applied: false
      });
    }

    return optimizations;
  }

  /**
   * Generate rate limiting optimizations
   */
  private async generateRateLimitOptimizations(usageData: UsageAnalysisData): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];

    // Analyze usage patterns for rate limiting opportunities
    if (usageData.averageResponseTime > 5000) { // Slow responses
      optimizations.push({
        optimizationId: `rate_limiting_${Date.now()}`,
        type: 'rate_limiting',
        description: 'Implement intelligent rate limiting to reduce load during peak times',
        potentialSavings: usageData.totalCost * 0.15, // 15% savings from reduced load
        implementationEffort: 'high',
        confidence: 0.6,
        affectedConversations: Math.floor(usageData.totalTokens / 200), // Estimate
        estimatedImplementationTime: 60,
        applied: false
      });
    }

    return optimizations;
  }

  /**
   * Apply an optimization
   */
  async applyOptimization(optimizationId: string): Promise<boolean> {
    const optimization = this.optimizations.find(opt => opt.optimizationId === optimizationId);

    if (!optimization) {
      logger.warn("Optimization not found", { optimizationId });
      return false;
    }

    try {
      // Mark as applied
      optimization.applied = true;
      optimization.appliedAt = new Date();

      // In a real implementation, you would apply the actual optimization here
      // For example: update model configurations, implement caching, etc.

      logger.info("Optimization applied", {
        optimizationId,
        type: optimization.type,
        potentialSavings: optimization.potentialSavings
      });

      return true;
    } catch (error) {
      logger.error("Failed to apply optimization", error as Error, { optimizationId });
      return false;
    }
  }

  /**
   * Get optimization history and results
   */
  getOptimizationHistory(): OptimizationResult[] {
    return [...this.optimizations];
  }

  /**
   * Generate automated optimization report
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    return this.analyzeAndOptimize();
  }

  /**
   * Get cost-saving recommendations based on current usage
   */
  async getCostSavingRecommendations(): Promise<CostOptimizationRecommendation[]> {
    const report = await this.analyzeAndOptimize();
    return report.recommendations;
  }
}

// Export singleton instance
export const costOptimizer = new CostOptimizerService();