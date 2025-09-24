/**
 * Comprehensive Analytics Service for PRIMA system
 * Provides advanced analytics, cohort analysis, and performance monitoring
 */

import { db } from "@/db";
import {
  patients,
  conversationMessages,
  conversationStates,
  reminders,
} from "@/db/schema";
import { and, gte, lte, sql, count, avg, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

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

      const [overview, timeSeries, cohortData, performance, alerts] =
        await Promise.all([
          this.getOverviewData(start, end),
          this.getTimeSeriesData(start, end),
          this.getCohortAnalysisData(start, end),
          this.getPerformanceData(start, end),
          this.getSystemAlerts(start, end),
        ]);

      return {
        overview,
        timeSeries,
        cohortAnalysis: cohortData,
        performance,
        alerts,
      };
    } catch (error) {
      logger.error("Failed to get dashboard data", error as Error);
      throw error;
    }
  }

  /**
   * Get LLM usage analytics
   */
  async getLLMAnalytics(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<LLMUsageStats> {
    try {
      const start =
        dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = dateRange?.end || new Date();

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

      // Get total tokens and cost
      const totalsResult = await db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${conversationMessages.llmTokensUsed}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${conversationMessages.llmCost}), 0)`,
          avgResponseTime: avg(conversationMessages.llmResponseTimeMs),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmModel} IS NOT NULL`
          )
        );

      const totalTokens = Number(totalsResult[0].totalTokens) || 0;
      const totalCost = Number(totalsResult[0].totalCost) || 0;
      const averageResponseTime = Number(totalsResult[0].avgResponseTime) || 0;

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

      // Get cost by model
      const costByModelResult = await db
        .select({
          model: conversationMessages.llmModel,
          totalCost: sql<number>`COALESCE(SUM(${conversationMessages.llmCost}), 0)`,
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

      const costByModel: Record<string, number> = {};
      costByModelResult.forEach((row) => {
        if (row.model) {
          costByModel[row.model] = Number(row.totalCost);
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

      // Get daily usage
      const dailyUsageResult = await db
        .select({
          date: sql<string>`DATE(${conversationMessages.createdAt})`,
          requests: count(),
          tokens: sql<number>`COALESCE(SUM(${conversationMessages.llmTokensUsed}), 0)`,
          cost: sql<number>`COALESCE(SUM(${conversationMessages.llmCost}), 0)`,
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end),
            sql`${conversationMessages.llmModel} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE(${conversationMessages.createdAt})`)
        .orderBy(sql`DATE(${conversationMessages.createdAt})`);

      const dailyUsage = dailyUsageResult.map((row) => ({
        date: row.date,
        requests: Number(row.requests),
        tokens: Number(row.tokens),
        cost: Number(row.cost),
      }));

      return {
        totalRequests,
        totalTokens,
        totalCost,
        averageResponseTime,
        requestsByModel,
        costByModel,
        requestsByIntent,
        dailyUsage,
      };
    } catch (error) {
      logger.error("Failed to get LLM analytics", error as Error);
      throw error;
    }
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
    const [patientGrowth, messageVolume, responseTimes] = await Promise.all([
      // Patient growth over time
      db
        .select({
          date: sql<string>`DATE(${patients.createdAt})`,
          count: count(),
        })
        .from(patients)
        .where(
          and(
            gte(patients.createdAt, start),
            lte(patients.createdAt, end),
            sql`${patients.deletedAt} IS NULL`
          )
        )
        .groupBy(sql`DATE(${patients.createdAt})`)
        .orderBy(sql`DATE(${patients.createdAt})`),

      // Message volume over time
      db
        .select({
          date: sql<string>`DATE(${conversationMessages.createdAt})`,
          count: count(),
        })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end)
          )
        )
        .groupBy(sql`DATE(${conversationMessages.createdAt})`)
        .orderBy(sql`DATE(${conversationMessages.createdAt})`),

      // Response times over time
      db
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
        .orderBy(sql`DATE(${conversationMessages.createdAt})`),
    ]);

    return {
      patientGrowth: patientGrowth.map((p) => ({
        timestamp: p.date,
        value: Number(p.count),
      })),
      messageVolume: messageVolume.map((m) => ({
        timestamp: m.date,
        value: Number(m.count),
      })),
      responseTimes: responseTimes.map((r) => ({
        timestamp: r.date,
        value: Number(r.avgTime) || 0,
      })),
      systemHealth: [], // System health metrics table removed
    };
  }

  /**
   * Get cohort analysis data
   */
  private async getCohortAnalysisData(start: Date, end: Date) {
    // Verification cohort analysis
    const verificationCohort = await this.analyzeCohort(
      "verification",
      start,
      end
    );

    // Reminder cohort analysis
    const reminderCohort = await this.analyzeCohort("reminder", start, end);

    // Engagement cohort analysis
    const engagementCohort = await this.analyzeCohort("engagement", start, end);

    return {
      verificationCohort,
      reminderCohort,
      engagementCohort,
    };
  }

  /**
   * Analyze specific cohort
   */
  private async analyzeCohort(
    cohortType: string,
    start: Date,
    end: Date
  ): Promise<CohortMetrics> {
    try {
      let cohortPatients;

      switch (cohortType) {
        case "verification":
          cohortPatients = await db
            .select({ id: patients.id })
            .from(patients)
            .where(
              and(
                gte(patients.verificationSentAt, start),
                lte(patients.verificationSentAt, end),
                eq(patients.verificationStatus, "VERIFIED")
              )
            );
          break;
        case "reminder":
          cohortPatients = await db
            .selectDistinct({ id: reminders.patientId })
            .from(reminders)
            .where(
              and(
                gte(reminders.createdAt, start),
                lte(reminders.createdAt, end),
                sql`${reminders.deletedAt} IS NULL`
              )
            );
          break;
        case "engagement":
          cohortPatients = await db
            .selectDistinct({ id: conversationStates.patientId })
            .from(conversationMessages)
            .innerJoin(
              conversationStates,
              eq(
                conversationMessages.conversationStateId,
                conversationStates.id
              )
            )
            .where(
              and(
                gte(conversationMessages.createdAt, start),
                lte(conversationMessages.createdAt, end),
                eq(conversationMessages.direction, "inbound")
              )
            );
          break;
        default:
          throw new Error(`Unknown cohort type: ${cohortType}`);
      }

      const cohortSize = cohortPatients.length;

      // Calculate retention, engagement, and conversion metrics
      const retention = await this.calculateRetention(
        cohortPatients.map((p) => p.id),
        start,
        end
      );
      const engagement = await this.calculateEngagement(
        cohortPatients.map((p) => p.id),
        start,
        end
      );
      const conversion = await this.calculateConversion(
        cohortPatients.map((p) => p.id),
        start,
        end
      );
      const averageValue = await this.calculateAverageValue(
        cohortPatients.map((p) => p.id),
        start,
        end
      );

      return {
        cohortSize,
        retention,
        engagement,
        conversion,
        averageValue,
      };
    } catch (error) {
      logger.error(`Failed to analyze ${cohortType} cohort`, error as Error);
      return {
        cohortSize: 0,
        retention: [],
        engagement: [],
        conversion: [],
        averageValue: 0,
      };
    }
  }

  /**
   * Calculate retention metrics
   */
  private async calculateRetention(
    patientIds: string[],
    start: Date,
    end: Date
  ): Promise<number[]> {
    // Simplified retention calculation - in production this would be more sophisticated
    const retentionData = [];
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < Math.min(days, 30); i += 7) {
      const periodStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(
        periodStart.getTime() + 7 * 24 * 60 * 60 * 1000
      );

      const activeCount = await db
        .select({ count: count() })
        .from(conversationMessages)
        .innerJoin(
          conversationStates,
          eq(conversationMessages.conversationStateId, conversationStates.id)
        )
        .where(
          and(
            sql`${conversationStates.patientId} = ANY(${patientIds})`,
            gte(conversationMessages.createdAt, periodStart),
            lte(conversationMessages.createdAt, periodEnd)
          )
        );

      const retentionRate =
        patientIds.length > 0
          ? (Number(activeCount[0].count) / patientIds.length) * 100
          : 0;

      retentionData.push(Number(retentionRate.toFixed(2)));
    }

    return retentionData;
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagement(
    patientIds: string[],
    start: Date,
    end: Date
  ): Promise<number[]> {
    const engagementData = [];
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < Math.min(days, 30); i += 7) {
      const periodStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(
        periodStart.getTime() + 7 * 24 * 60 * 60 * 1000
      );

      const messageCount = await db
        .select({ count: count() })
        .from(conversationMessages)
        .innerJoin(
          conversationStates,
          eq(conversationMessages.conversationStateId, conversationStates.id)
        )
        .where(
          and(
            sql`${conversationStates.patientId} = ANY(${patientIds})`,
            eq(conversationMessages.direction, "inbound"),
            gte(conversationMessages.createdAt, periodStart),
            lte(conversationMessages.createdAt, periodEnd)
          )
        );

      const engagementRate =
        patientIds.length > 0
          ? (Number(messageCount[0].count) / patientIds.length) * 100
          : 0;

      engagementData.push(Number(engagementRate.toFixed(2)));
    }

    return engagementData;
  }

  /**
   * Calculate conversion metrics
   */
  private async calculateConversion(
    patientIds: string[],
    start: Date,
    end: Date
  ): Promise<number[]> {
    const conversionData = [];
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < Math.min(days, 30); i += 7) {
      const periodStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(
        periodStart.getTime() + 7 * 24 * 60 * 60 * 1000
      );

      const verificationCount = await db
        .select({ count: count() })
        .from(patients)
        .where(
          and(
            sql`${patients.id} = ANY(${patientIds})`,
            eq(patients.verificationStatus, "VERIFIED"),
            gte(patients.verificationResponseAt, periodStart),
            lte(patients.verificationResponseAt, periodEnd)
          )
        );

      const conversionRate =
        patientIds.length > 0
          ? (Number(verificationCount[0].count) / patientIds.length) * 100
          : 0;

      conversionData.push(Number(conversionRate.toFixed(2)));
    }

    return conversionData;
  }

  /**
   * Calculate average value metrics
   */
  private async calculateAverageValue(
    patientIds: string[],
    start: Date,
    end: Date
  ): Promise<number> {
    const totalMessages = await db
      .select({ count: count() })
      .from(conversationMessages)
      .innerJoin(
        conversationStates,
        eq(conversationMessages.conversationStateId, conversationStates.id)
      )
      .where(
        and(
          sql`${conversationStates.patientId} = ANY(${patientIds})`,
          gte(conversationMessages.createdAt, start),
          lte(conversationMessages.createdAt, end)
        )
      );

    return patientIds.length > 0
      ? Number(totalMessages[0].count) / patientIds.length
      : 0;
  }

  /**
   * Get performance data
   */
  private async getPerformanceData(start: Date, end: Date) {
    // LLM response times from conversation messages
    const llmResponseTimes = await db
      .select({
        timestamp: sql<string>`DATE(${conversationMessages.createdAt})`,
        avgValue: avg(conversationMessages.llmResponseTimeMs),
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

    // For other performance metrics, return empty arrays since performanceMetrics table was removed
    return {
      apiResponseTimes: [],
      databaseQueryTimes: [],
      llmResponseTimes: llmResponseTimes.map((l) => ({
        timestamp: l.timestamp,
        value: Number(l.avgValue) || 0,
      })),
      errorRates: [],
    };
  }

  /**
   * Get system alerts
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getSystemAlerts(_start: Date, _end: Date) {
    // Performance metrics table removed, return empty alerts
    return [];
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
      } else if (includeMetrics.includes("timeseries")) {
        data = await this.getTimeSeriesData(dateRange.start, dateRange.end);
      } else if (includeMetrics.includes("cohort")) {
        data = await this.getCohortAnalysisData(dateRange.start, dateRange.end);
      } else if (includeMetrics.includes("performance")) {
        data = await this.getPerformanceData(dateRange.start, dateRange.end);
      } else {
        data = await this.getDashboardData(dateRange);
      }

      switch (format) {
        case "json":
          return JSON.stringify(data, null, 2);
        case "csv":
          return this.convertToCSV(data);
        case "xlsx":
          // In production, you would use a library like xlsx
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
    // Simplified CSV conversion - in production this would be more sophisticated
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
    // Analytics events table removed - just log the event
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
    // Performance metrics table removed - just log alerts if threshold exceeded
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
