import { db } from '@/db'
import { patients } from '@/db/schema'
import { and, gte, lte, count, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export interface VerificationAnalyticsData {
  totalSent: number
  totalResponses: number
  totalSuccess: number
  responseRate: number
  successRate: number
  period: {
    start: Date
    end: Date
  }
}

export interface VerificationTimeSeriesData {
  date: string
  sent: number
  responses: number
  success: number
}

export class VerificationAnalytics {
  /**
   * Get verification analytics for a specific time period
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<VerificationAnalyticsData> {
    try {
      logger.info('Fetching verification analytics', { startDate, endDate })

      const result = await db
        .select({
          totalSent: count(sql`CASE WHEN ${patients.verificationSentAt} IS NOT NULL THEN 1 END`),
          totalResponses: count(
            sql`CASE WHEN ${patients.verificationResponseAt} IS NOT NULL THEN 1 END`
          ),
          totalSuccess: count(
            sql`CASE WHEN ${patients.verificationStatus} = 'VERIFIED' THEN 1 END`
          ),
        })
        .from(patients)
        .where(
          and(
            gte(patients.createdAt, startDate),
            lte(patients.createdAt, endDate)
          )
        )

      const data = result[0]
      const responseRate = data.totalSent > 0 
        ? (data.totalResponses / data.totalSent) * 100 
        : 0
      const successRate = data.totalResponses > 0 
        ? (data.totalSuccess / data.totalResponses) * 100 
        : 0

      return {
        totalSent: data.totalSent,
        totalResponses: data.totalResponses,
        totalSuccess: data.totalSuccess,
        responseRate: Number(responseRate.toFixed(2)),
        successRate: Number(successRate.toFixed(2)),
        period: {
          start: startDate,
          end: endDate,
        },
      }
    } catch (error) {
      logger.error('Failed to fetch verification analytics', error instanceof Error ? error : new Error(String(error)), { startDate, endDate })
      throw error
    }
  }

  /**
   * Get time series data for verification analytics
   */
  async getTimeSeriesData(
    startDate: Date,
    endDate: Date
  ): Promise<VerificationTimeSeriesData[]> {
    try {
      logger.info('Fetching verification time series data', { startDate, endDate })

      const result = await db
        .select({
          date: sql<string>`DATE(${patients.createdAt})`,
          sent: count(sql`CASE WHEN ${patients.verificationSentAt} IS NOT NULL THEN 1 END`),
          responses: count(
            sql`CASE WHEN ${patients.verificationResponseAt} IS NOT NULL THEN 1 END`
          ),
          success: count(
            sql`CASE WHEN ${patients.verificationStatus} = 'VERIFIED' THEN 1 END`
          ),
        })
        .from(patients)
        .where(
          and(
            gte(patients.createdAt, startDate),
            lte(patients.createdAt, endDate)
          )
        )
        .groupBy(sql`DATE(${patients.createdAt})`)
        .orderBy(sql`DATE(${patients.createdAt})`)

      return result.map(row => ({
        date: row.date,
        sent: row.sent,
        responses: row.responses,
        success: row.success,
      }))
    } catch (error) {
      logger.error('Failed to fetch verification time series data', error instanceof Error ? error : new Error(String(error)), { startDate, endDate })
      throw error
    }
  }

  /**
   * Track verification sent event
   */
  async trackVerificationSent(patientId: string, phoneNumber: string): Promise<void> {
    try {
      logger.info('Tracking verification sent', { patientId, phoneNumber })
      // This is a tracking method - actual logging happens in the verification service
    } catch (error) {
      logger.error('Failed to track verification sent', error instanceof Error ? error : new Error(String(error)), { patientId, phoneNumber })
    }
  }

  /**
   * Track verification response event
   */
  async trackVerificationResponse(
    patientId: string, 
    response: string, 
    success: boolean
  ): Promise<void> {
    try {
      logger.info('Tracking verification response', { patientId, response, success })
      // This is a tracking method - actual logging happens in the verification service
    } catch (error) {
      logger.error('Failed to track verification response', error instanceof Error ? error : new Error(String(error)), { patientId, response, success })
    }
  }

  /**
   * Get verification analytics summary for the last 30 days
   */
  async getLast30DaysSummary(): Promise<VerificationAnalyticsData> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    return this.getAnalytics(startDate, endDate)
  }

  /**
   * Get verification analytics summary for the last 7 days
   */
  async getLast7DaysSummary(): Promise<VerificationAnalyticsData> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    return this.getAnalytics(startDate, endDate)
  }
}

export const verificationAnalytics = new VerificationAnalytics()