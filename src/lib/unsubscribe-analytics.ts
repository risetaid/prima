/**
 * Unsubscribe Analytics Service
 * Tracks and analyzes unsubscribe patterns, reasons, and success rates
 */

import { db, patients, verificationLogs } from "@/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";

// TypeScript interfaces for analysis data
interface UnsubscribeAnalysis {
  confidence: number;
  sentiment: string;
  urgency: string;
}

export interface UnsubscribeAnalyticsData {
  totalUnsubscribes: number;
  unsubscribeRate: number;
  averageConfidence: number;
  commonReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  methodDistribution: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  sentimentDistribution: Array<{
    sentiment: string;
    count: number;
    percentage: number;
  }>;
  urgencyDistribution: Array<{
    urgency: string;
    count: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    count: number;
    cumulative: number;
  }>;
  weeklyTrends: Array<{
    week: string;
    count: number;
    averageConfidence: number;
  }>;
}

export interface UnsubscribeFilterOptions {
  startDate?: Date;
  endDate?: Date;
  method?: string;
  urgency?: string;
  sentiment?: string;
}

export class UnsubscribeAnalyticsService {
  /**
   * Get comprehensive unsubscribe analytics
   */
  async getAnalytics(
    options: UnsubscribeFilterOptions = {}
  ): Promise<UnsubscribeAnalyticsData> {
    try {
      const startDate = options.startDate || this.getDefaultStartDate();
      const endDate = options.endDate || getWIBTime();

      const [
        totalUnsubscribes,
        unsubscribeReasons,
        methodDistribution,
        timeSeriesData,
        weeklyTrends,
      ] = await Promise.all([
        this.getTotalUnsubscribes(startDate, endDate, options),
        this.getCommonReasons(startDate, endDate),
        this.getMethodDistribution(startDate, endDate),
        this.getTimeSeriesData(startDate, endDate),
        this.getWeeklyTrends(startDate, endDate),
      ]);

      const totalActivePatients = await this.getTotalActivePatients(startDate);
      const unsubscribeRate =
        totalActivePatients > 0
          ? (totalUnsubscribes / totalActivePatients) * 100
          : 0;
      const averageConfidence = await this.getAverageConfidence(
        startDate,
        endDate
      );
      const sentimentDistribution = await this.getSentimentDistribution(
        startDate,
        endDate
      );
      const urgencyDistribution = await this.getUrgencyDistribution(
        startDate,
        endDate
      );

      logger.info("Unsubscribe analytics retrieved successfully", {
        period: { startDate, endDate },
        totalUnsubscribes,
        unsubscribeRate,
        averageConfidence,
      });

      return {
        totalUnsubscribes,
        unsubscribeRate,
        averageConfidence,
        commonReasons: unsubscribeReasons,
        methodDistribution,
        sentimentDistribution,
        urgencyDistribution,
        timeSeriesData,
        weeklyTrends,
      };
    } catch (error) {
      logger.error(
        "Failed to get unsubscribe analytics",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get total number of unsubscribes in period
   */
  private async getTotalUnsubscribes(
    startDate: Date,
    endDate: Date,
    options: UnsubscribeFilterOptions
  ): Promise<number> {
    const whereConditions = [
      gte(patients.unsubscribedAt, startDate),
      lte(patients.unsubscribedAt, endDate),
      eq(patients.isActive, false),
    ];

    if (options.method) {
      whereConditions.push(
        eq(
          patients.unsubscribeMethod,
          options.method as
            | "manual"
            | "llm_analysis"
            | "keyword_detection"
            | "api"
        )
      );
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(...whereConditions));

    return result[0]?.count || 0;
  }

  /**
   * Get total active patients at start of period
   */
  private async getTotalActivePatients(startDate: Date): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(
        and(lte(patients.createdAt, startDate), eq(patients.isActive, true))
      );

    return result[0]?.count || 0;
  }

  /**
   * Get most common unsubscribe reasons
   */
  private async getCommonReasons(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ reason: string; count: number; percentage: number }>> {
    const baseQuery = db
      .select({
        reason: patients.unsubscribeReason,
        count: sql<number>`count(*)`,
      })
      .from(patients)
      .where(
        and(
          gte(patients.unsubscribedAt, startDate),
          lte(patients.unsubscribedAt, endDate),
          eq(patients.isActive, false),
          sql`${patients.unsubscribeReason} IS NOT NULL`
        )
      )
      .groupBy(patients.unsubscribeReason)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(10);

    const results = await baseQuery;
    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
      reason: item.reason || "Unknown",
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }

  /**
   * Get distribution of unsubscribe methods
   */
  private async getMethodDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ method: string; count: number; percentage: number }>> {
    const baseQuery = db
      .select({
        method: patients.unsubscribeMethod,
        count: sql<number>`count(*)`,
      })
      .from(patients)
      .where(
        and(
          gte(patients.unsubscribedAt, startDate),
          lte(patients.unsubscribedAt, endDate),
          eq(patients.isActive, false)
        )
      )
      .groupBy(patients.unsubscribeMethod);

    const results = await baseQuery;
    const total = results.reduce((sum, item) => sum + item.count, 0);

    return results.map((item) => ({
      method: item.method || "unknown",
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }

  /**
   * Get average confidence score for LLM-based unsubscribes
   */
  private async getAverageConfidence(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Extract confidence from verification logs for LLM-based unsubscribes
    const results = await db
      .select({
        additionalInfo: verificationLogs.additionalInfo,
      })
      .from(verificationLogs)
      .where(
        and(
          gte(verificationLogs.createdAt, startDate),
          lte(verificationLogs.createdAt, endDate),
          eq(verificationLogs.action, "UNSUBSCRIBE")
        )
      );

    const confidenceScores: number[] = [];

    results.forEach((result) => {
      try {
        const additionalInfo = result.additionalInfo as UnsubscribeAnalysis;
        if (additionalInfo?.confidence) {
          confidenceScores.push(additionalInfo.confidence);
        }
      } catch {
        // Skip invalid JSON
      }
    });

    if (confidenceScores.length === 0) return 0;

    const sum = confidenceScores.reduce((acc, score) => acc + score, 0);
    return sum / confidenceScores.length;
  }

  /**
   * Get sentiment distribution from verification logs
   */
  private async getSentimentDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ sentiment: string; count: number; percentage: number }>> {
    const results = await db
      .select({
        additionalInfo: verificationLogs.additionalInfo,
      })
      .from(verificationLogs)
      .where(
        and(
          gte(verificationLogs.createdAt, startDate),
          lte(verificationLogs.createdAt, endDate),
          eq(verificationLogs.action, "UNSUBSCRIBE")
        )
      );

    const sentimentCounts: Record<string, number> = {};

    results.forEach((result) => {
      try {
        const additionalInfo = result.additionalInfo as UnsubscribeAnalysis;
        if (additionalInfo?.sentiment) {
          const sentiment = additionalInfo.sentiment;
          sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
        }
      } catch {
        // Skip invalid JSON
      }
    });

    const total = Object.values(sentimentCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    return Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      sentiment,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Get urgency distribution from verification logs
   */
  private async getUrgencyDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ urgency: string; count: number; percentage: number }>> {
    const results = await db
      .select({
        additionalInfo: verificationLogs.additionalInfo,
      })
      .from(verificationLogs)
      .where(
        and(
          gte(verificationLogs.createdAt, startDate),
          lte(verificationLogs.createdAt, endDate),
          eq(verificationLogs.action, "UNSUBSCRIBE")
        )
      );

    const urgencyCounts: Record<string, number> = {};

    results.forEach((result) => {
      try {
        const additionalInfo = result.additionalInfo as UnsubscribeAnalysis;
        if (additionalInfo?.urgency) {
          const urgency = additionalInfo.urgency;
          urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
        }
      } catch {
        // Skip invalid JSON
      }
    });

    const total = Object.values(urgencyCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    return Object.entries(urgencyCounts).map(([urgency, count]) => ({
      urgency,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Get time series data for unsubscribe trends
   */
  private async getTimeSeriesData(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number; cumulative: number }>> {
    const results = await db
      .select({
        date: sql<string>`DATE(${patients.unsubscribedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(patients)
      .where(
        and(
          gte(patients.unsubscribedAt, startDate),
          lte(patients.unsubscribedAt, endDate),
          eq(patients.isActive, false)
        )
      )
      .groupBy(sql<string>`DATE(${patients.unsubscribedAt})`)
      .orderBy(sql<string>`DATE(${patients.unsubscribedAt})`);

    let cumulative = 0;
    return results.map((result) => {
      cumulative += result.count;
      return {
        date: result.date,
        count: result.count,
        cumulative,
      };
    });
  }

  /**
   * Get weekly trends
   */
  private async getWeeklyTrends(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{ week: string; count: number; averageConfidence: number }>
  > {
    const results = await db
      .select({
        week: sql<string>`DATE_TRUNC('week', ${patients.unsubscribedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(patients)
      .where(
        and(
          gte(patients.unsubscribedAt, startDate),
          lte(patients.unsubscribedAt, endDate),
          eq(patients.isActive, false)
        )
      )
      .groupBy(sql<string>`DATE_TRUNC('week', ${patients.unsubscribedAt})`)
      .orderBy(sql<string>`DATE_TRUNC('week', ${patients.unsubscribedAt})`);

    // TODO: Add confidence calculation per week
    return results.map((result) => ({
      week: result.week,
      count: result.count,
      averageConfidence: 0, // Placeholder for now
    }));
  }

  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }

  /**
   * Record unsubscribe analytics event
   */
  async recordUnsubscribeEvent(
    patientId: string,
    analysis: {
      confidence: number;
      reason?: string;
      urgency: string;
      sentiment: string;
      method: string;
    }
  ): Promise<void> {
    try {
      // This method can be expanded to store detailed analytics events
      logger.info("Recording unsubscribe analytics event", {
        patientId,
        analysis,
      });
    } catch (error) {
      logger.error(
        "Failed to record unsubscribe analytics event",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Export analytics data as CSV
   */
  async exportToCSV(options: UnsubscribeFilterOptions = {}): Promise<string> {
    const analytics = await this.getAnalytics(options);

    const headers = ["Metric", "Value", "Details"];

    const rows = [
      ["Total Unsubscribes", analytics.totalUnsubscribes.toString(), ""],
      [
        "Unsubscribe Rate",
        `${analytics.unsubscribeRate.toFixed(2)}%`,
        "Percentage of active patients",
      ],
      [
        "Average Confidence",
        analytics.averageConfidence.toFixed(3),
        "LLM confidence score",
      ],
      ["", "", ""],
      ["Common Reasons", "", ""],
      ...analytics.commonReasons.map((reason) => [
        "Reason",
        reason.reason,
        `${reason.count} (${reason.percentage.toFixed(1)}%)`,
      ]),
      ["", "", ""],
      ["Method Distribution", "", ""],
      ...analytics.methodDistribution.map((method) => [
        "Method",
        method.method,
        `${method.count} (${method.percentage.toFixed(1)}%)`,
      ]),
    ];

    return [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
  }
}

// Export singleton instance
export const unsubscribeAnalyticsService = new UnsubscribeAnalyticsService();
