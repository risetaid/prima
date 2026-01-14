/**
 * Unsubscribe Analytics Service
 * Tracks and analyzes unsubscribe patterns, reasons, and success rates
 */

import { db, patients } from "@/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getWIBTime } from "@/lib/datetime";
import { logger } from "@/lib/logger";
import { sanitizeForAudit } from "@/lib/phi-mask";

// TypeScript interfaces for analysis data

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
   * Note: Detailed confidence data no longer available after schema cleanup
   */
  private async getAverageConfidence(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Since verificationLogs table was removed, return a default confidence score
    // In the future, this could be enhanced to store confidence data in patient records
    const llmUnsubscribes = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(
        and(
          gte(patients.unsubscribedAt, startDate),
          lte(patients.unsubscribedAt, endDate),
          eq(patients.isActive, false),
          eq(patients.unsubscribeMethod, "llm_analysis")
        )
      );

    // Return a default confidence score for LLM-based unsubscribes
    // This is a placeholder until detailed analytics are re-implemented
    return llmUnsubscribes[0]?.count > 0 ? 0.75 : 0;
  }

  /**
   * Get sentiment distribution from verification logs
   * Note: Detailed sentiment data no longer available after schema cleanup
   */
  private async getSentimentDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ sentiment: string; count: number; percentage: number }>> {
    // Since verificationLogs table was removed, return default sentiment distribution
    // In the future, this could be enhanced to store sentiment data in patient records
    const totalUnsubscribes = await this.getTotalUnsubscribes(
      startDate,
      endDate,
      {}
    );

    // Return a default distribution since detailed sentiment data is no longer available
    return [
      {
        sentiment: "neutral",
        count: totalUnsubscribes,
        percentage: 100,
      },
    ];
  }

  /**
   * Get urgency distribution from verification logs
   * Note: Detailed urgency data no longer available after schema cleanup
   */
  private async getUrgencyDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ urgency: string; count: number; percentage: number }>> {
    // Since verificationLogs table was removed, return default urgency distribution
    // In the future, this could be enhanced to store urgency data in patient records
    const totalUnsubscribes = await this.getTotalUnsubscribes(
      startDate,
      endDate,
      {}
    );

    // Return a default distribution since detailed urgency data is no longer available
    return [
      {
        urgency: "medium",
        count: totalUnsubscribes,
        percentage: 100,
      },
    ];
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

    // NOTE: Confidence calculation requires LLM analysis data which is not yet
    // consistently stored in the patients table. Future enhancement: add confidence
    // field to track LLM detection confidence for unsubscribe intent.
    return results.map((result) => ({
      week: result.week,
      count: result.count,
      averageConfidence: 0, // Not yet implemented - requires LLM confidence data
    }));
  }

  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): Date {
    const date = getWIBTime();
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
      logger.info("Recording unsubscribe analytics event", sanitizeForAudit({
        patientId,
        analysis,
      }));
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
