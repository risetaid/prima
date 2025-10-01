/**
 * Comprehensive Analytics Service for PRIMA system
 * Provides advanced analytics, cohort analysis, and performance monitoring
 */

import { db } from "@/db";
import {
  patients,
  conversationMessages,
} from "@/db/schema";
import { and, gte, lte, sql, count, avg, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { llmUsageService } from "@/services/llm-usage.service";

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface CohortMetrics {
  cohortSize: number;
  retention: number[];
  engagement: number[];
  conversion: number[];
  averageValue: number;
}

export interface AnalyticsDashboardData {
  overview: {
    totalPatients: number;
    activePatients: number;
    totalMessages: number;
    responseRate: number;
    averageResponseTime: number;
  };
  timeSeries: {
    patientGrowth: TimeSeriesData[];
    messageVolume: TimeSeriesData[];
    responseTimes: TimeSeriesData[];
    systemHealth: TimeSeriesData[];
  };
  cohortAnalysis: {
    verificationCohort: CohortMetrics;
    reminderCohort: CohortMetrics;
    engagementCohort: CohortMetrics;
  };
  performance: {
    apiResponseTimes: TimeSeriesData[];
    databaseQueryTimes: TimeSeriesData[];
    llmResponseTimes: TimeSeriesData[];
    errorRates: TimeSeriesData[];
  };
  alerts: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: string;
  }>;
}

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

export interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  includeMetrics?: string[];
}

export class AnalyticsService {
  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<AnalyticsDashboardData> {
    try {
      const start =
        dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = dateRange?.end || new Date();

      // For now, return simplified data to avoid complex analytics
      // The main LLM cost management is handled by the new file-based system
      const overview = await this.getOverviewData(start, end);
      const timeSeries = await this.getTimeSeriesData(start, end);

      return {
        overview,
        timeSeries,
        cohortAnalysis: {
          verificationCohort: { cohortSize: 0, retention: [], engagement: [], conversion: [], averageValue: 0 },
          reminderCohort: { cohortSize: 0, retention: [], engagement: [], conversion: [], averageValue: 0 },
          engagementCohort: { cohortSize: 0, retention: [], engagement: [], conversion: [], averageValue: 0 },
        },
        performance: {
          apiResponseTimes: [],
          databaseQueryTimes: [],
          llmResponseTimes: timeSeries.responseTimes,
          errorRates: [],
        },
        alerts: [],
      };
    } catch (error) {
      logger.error("Failed to get dashboard data", error as Error);
      throw error;
    }
  }

  /**
   * Get LLM usage analytics - now uses the new file-based storage system
   */
  async getLLMAnalytics(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<LLMUsageStats> {
    try {
      const start =
        dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = dateRange?.end || new Date();

      // Get data from file-based storage
      const usageStats = await llmUsageService.getUsageStats();
      const usageData = await llmUsageService.getUsageData();

      // Get database data for additional metrics
      const dbStats = await this.getLLMStatsFromDatabase(start, end);

      // Combine file-based and database data
      const costByModel: Record<string, number> = {};
      Object.entries(usageData.models).forEach(([model, modelData]) => {
        costByModel[model] = modelData.cost;
      });

      return {
        totalRequests: dbStats.totalRequests,
        totalTokens: usageStats.dailyTokens + usageStats.monthlyTokens,
        totalCost: usageStats.dailyCost + usageStats.monthlyCost,
        averageResponseTime: dbStats.averageResponseTime,
        requestsByModel: dbStats.requestsByModel,
        costByModel,
        requestsByIntent: dbStats.requestsByIntent,
        dailyUsage: [{
          date: usageData.daily.date,
          requests: Math.floor(dbStats.totalRequests / 30), // Rough estimate
          tokens: usageData.daily.tokens,
          cost: usageData.daily.cost,
        }],
      };
    } catch (error) {
      logger.error("Failed to get LLM analytics", error as Error);
      throw error;
    }
  }

  /**
   * Get LLM stats from database (for data not stored in JSON files)
   */
  private async getLLMStatsFromDatabase(start: Date, end: Date): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    requestsByModel: Record<string, number>;
    requestsByIntent: Record<string, number>;
  }> {
    // Get total requests (messages with LLM responses)
    const totalRequestsResult = await db
      .select({ count: count() })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, start),
          lte(conversationMessages.createdAt, end),
          sql`${conversationMessages.llmModel} IS NOT NULL`
        )
      );

    const totalRequests = Number(totalRequestsResult[0].count) || 0;

    // Get average response time
    const responseTimeResult = await db
      .select({
        avgResponseTime: avg(conversationMessages.llmResponseTimeMs),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, start),
          lte(conversationMessages.createdAt, end),
          sql`${conversationMessages.llmResponseTimeMs} IS NOT NULL`
        )
      );

    const averageResponseTime = Number(responseTimeResult[0].avgResponseTime) || 0;

    // Get requests by model
    const requestsByModelResult = await db
      .select({
        model: conversationMessages.llmModel,
        count: count(),
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

    const requestsByModel: Record<string, number> = {};
    requestsByModelResult.forEach((row) => {
      if (row.model) {
        requestsByModel[row.model] = Number(row.count);
      }
    });

    // Get requests by intent
    const requestsByIntentResult = await db
      .select({
        intent: conversationMessages.intent,
        count: count(),
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

    const requestsByIntent: Record<string, number> = {};
    requestsByIntentResult.forEach((row) => {
      if (row.intent) {
        requestsByIntent[row.intent] = Number(row.count);
      }
    });

    return {
      totalRequests,
      averageResponseTime,
      requestsByModel,
      requestsByIntent,
    };
  }

  /**
   * Get overview statistics
   */
  private async getOverviewData(start: Date, end: Date) {
    const [totalPatients, activePatients, totalMessages, responseStats] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(patients)
          .where(
            and(
              gte(patients.createdAt, start),
              lte(patients.createdAt, end),
              sql`${patients.deletedAt} IS NULL`
            )
          ),
        db
          .select({ count: count() })
          .from(patients)
          .where(
            and(
              gte(patients.createdAt, start),
              lte(patients.createdAt, end),
              eq(patients.isActive, true),
              sql`${patients.deletedAt} IS NULL`
            )
          ),
        db
          .select({ count: count() })
          .from(conversationMessages)
          .where(
            and(
              gte(conversationMessages.createdAt, start),
              lte(conversationMessages.createdAt, end)
            )
          ),
        db
          .select({
            avgResponseTime: avg(conversationMessages.llmResponseTimeMs),
            totalResponses: count(),
          })
          .from(conversationMessages)
          .where(
            and(
              gte(conversationMessages.createdAt, start),
              lte(conversationMessages.createdAt, end),
              sql`${conversationMessages.llmResponseTimeMs} IS NOT NULL`
            )
          ),
      ]);

    const responseRate =
      totalMessages[0].count > 0
        ? (responseStats[0].totalResponses / totalMessages[0].count) * 100
        : 0;

    return {
      totalPatients: Number(totalPatients[0].count) || 0,
      activePatients: Number(activePatients[0].count) || 0,
      totalMessages: Number(totalMessages[0].count) || 0,
      responseRate: Number(responseRate.toFixed(2)),
      averageResponseTime: Number(responseStats[0].avgResponseTime) || 0,
    };
  }

  /**
   * Get time series data
   */
  private async getTimeSeriesData(start: Date, end: Date) {
    const responseTimes = await db
      .select({
        date: sql<string>`DATE(${conversationMessages.createdAt})`,
        avgTime: avg(conversationMessages.llmResponseTimeMs),
      })
      .from(conversationMessages)
      .where(
        and(
          gte(conversationMessages.createdAt, start),
          lte(conversationMessages.createdAt, end),
          sql`${conversationMessages.llmResponseTimeMs} IS NOT NULL`
        )
      )
      .groupBy(sql`DATE(${conversationMessages.createdAt})`)
      .orderBy(sql`DATE(${conversationMessages.createdAt})`);

    return {
      patientGrowth: [],
      messageVolume: [],
      responseTimes: responseTimes.map((r) => ({
        timestamp: r.date,
        value: Number(r.avgTime) || 0,
      })),
      systemHealth: [],
    };
  }

  /**
   * Export analytics data
   */
  async exportData(options: ExportOptions): Promise<string> {
    try {
      const { format, dateRange, includeMetrics = [] } = options;

      let data;

      if (includeMetrics.length === 0 || includeMetrics.includes("overview")) {
        data = await this.getOverviewData(dateRange.start, dateRange.end);
      } else if (includeMetrics.includes("llm")) {
        data = await this.getLLMAnalytics(dateRange);
      } else {
        data = await this.getDashboardData(dateRange);
      }

      switch (format) {
        case "json":
          return JSON.stringify(data, null, 2);
        case "csv":
          return this.convertToCSV(data);
        case "xlsx":
          return JSON.stringify(data, null, 2); // Fallback to JSON
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error("Failed to export analytics data", error as Error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: unknown): string {
    const jsonData = JSON.parse(JSON.stringify(data));
    const flatten = (obj: unknown, prefix = ""): Record<string, unknown> => {
      const result: Record<string, unknown> = {};

      if (typeof obj !== "object" || obj === null) {
        return { [prefix]: obj };
      }

      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          Object.assign(result, flatten(value, newKey));
        } else {
          result[newKey] = value;
        }
      }

      return result;
    };

    const flattened = flatten(jsonData);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);

    return [headers.join(","), values.map((v) => `"${v}"`).join(",")].join(
      "\n"
    );
  }

  /**
   * Track analytics event
   */
  async trackEvent(event: {
    eventType: string;
    eventName: string;
    userId?: string;
    patientId?: string;
    sessionId: string;
    eventData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    logger.debug(`Analytics event tracked: ${event.eventName}`, {
      eventType: event.eventType,
      userId: event.userId,
      patientId: event.patientId,
    });
  }

  /**
   * Record performance metric
   */
  async recordMetric(metric: {
    metricType: string;
    metricName: string;
    value: number;
    unit: string;
    tags?: Record<string, unknown>;
    threshold?: number;
  }): Promise<void> {
    const isAlert = metric.threshold ? metric.value > metric.threshold : false;

    if (isAlert) {
      logger.warn(
        `Performance alert: ${metric.metricName} = ${metric.value} ${metric.unit}`,
        {
          metricType: metric.metricType,
          threshold: metric.threshold,
        }
      );
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
