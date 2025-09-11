import { db, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, count, sql } from 'drizzle-orm'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { logger } from '@/lib/logger'

export interface ComplianceData {
  deliveredCount: number
  confirmedCount: number
  complianceRate: number
  lastCalculated: Date
}

export interface ComplianceStats {
  totalReminders: number
  deliveredReminders: number
  confirmedReminders: number
  pendingConfirmations: number
  complianceRate: number
  averageResponseTime?: number
}

/**
 * Optimized compliance calculation service
 * Provides efficient queries and caching for patient compliance data
 */
export class ComplianceService {
  /**
   * Calculate compliance rate for a specific patient
   * Uses optimized queries with proper caching
   */
  static async calculatePatientCompliance(patientId: string): Promise<ComplianceData> {
    const startTime = Date.now()

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.reminderStats(patientId)
      const cachedData = await getCachedData<ComplianceData>(cacheKey)

      if (cachedData) {
        logger.cache(`Retrieved cached compliance data for patient ${patientId}`)
        return cachedData
      }

      // Execute optimized queries in parallel
      const [deliveredResult, confirmedResult] = await Promise.all([
        // Count delivered reminders
        db
          .select({ count: count() })
          .from(reminderLogs)
          .where(
            and(
              eq(reminderLogs.patientId, patientId),
              eq(reminderLogs.status, 'DELIVERED')
            )
          ),

        // Count manual confirmations
        db
          .select({ count: count() })
          .from(manualConfirmations)
          .where(eq(manualConfirmations.patientId, patientId))
      ])

      const deliveredCount = Number(deliveredResult[0]?.count || 0)
      const confirmedCount = Number(confirmedResult[0]?.count || 0)
      const complianceRate = deliveredCount > 0
        ? Math.round((confirmedCount / deliveredCount) * 100)
        : 0

      const result: ComplianceData = {
        deliveredCount,
        confirmedCount,
        complianceRate,
        lastCalculated: new Date()
      }

      // Cache the result
      await setCachedData(cacheKey, result, CACHE_TTL.REMINDER_STATS)

      const duration = Date.now() - startTime
      logger.performance('calculatePatientCompliance', duration, { patientId })

      return result
    } catch (error) {
      logger.error('Failed to calculate patient compliance', error instanceof Error ? error : new Error(String(error)), { patientId })
      throw error
    }
  }

  /**
   * Get detailed compliance statistics for a patient
   * Includes response times and pending confirmations
   */
  static async getPatientComplianceStats(patientId: string): Promise<ComplianceStats> {
    const startTime = Date.now()

    try {
      // Get basic compliance data
      const compliance = await this.calculatePatientCompliance(patientId)

      // Get additional statistics in parallel
      const [totalResult, pendingResult, responseTimeResult] = await Promise.all([
        // Total reminders (all statuses)
        db
          .select({ count: count() })
          .from(reminderLogs)
          .where(eq(reminderLogs.patientId, patientId)),

        // Pending confirmations (delivered but not confirmed)
        db
          .select({ count: count() })
          .from(reminderLogs)
          .leftJoin(manualConfirmations,
            and(
              eq(manualConfirmations.patientId, patientId),
              eq(manualConfirmations.reminderLogId, reminderLogs.id)
            )
          )
          .where(
            and(
              eq(reminderLogs.patientId, patientId),
              eq(reminderLogs.status, 'DELIVERED'),
              sql`${manualConfirmations.id} IS NULL`
            )
          ),

        // Average response time (time between delivery and confirmation)
        db
          .select({
            avgResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${manualConfirmations.confirmedAt} - ${reminderLogs.sentAt})))`
          })
          .from(reminderLogs)
          .innerJoin(manualConfirmations,
            and(
              eq(manualConfirmations.patientId, patientId),
              eq(manualConfirmations.reminderLogId, reminderLogs.id)
            )
          )
          .where(eq(reminderLogs.patientId, patientId))
      ])

      const totalReminders = Number(totalResult[0]?.count || 0)
      const pendingConfirmations = Number(pendingResult[0]?.count || 0)
      const avgResponseTimeSeconds = Number(responseTimeResult[0]?.avgResponseTime || 0)

      const stats: ComplianceStats = {
        totalReminders,
        deliveredReminders: compliance.deliveredCount,
        confirmedReminders: compliance.confirmedCount,
        pendingConfirmations,
        complianceRate: compliance.complianceRate,
        averageResponseTime: avgResponseTimeSeconds > 0 ? avgResponseTimeSeconds : undefined
      }

      const duration = Date.now() - startTime
      logger.performance('getPatientComplianceStats', duration, { patientId })

      return stats
    } catch (error) {
      logger.error('Failed to get patient compliance stats', error instanceof Error ? error : new Error(String(error)), { patientId })
      throw error
    }
  }

  /**
   * Calculate compliance rates for multiple patients efficiently
   * Uses batch queries to minimize database round trips
   */
  static async calculateBulkCompliance(patientIds: string[]): Promise<Record<string, ComplianceData>> {
    const startTime = Date.now()

    try {
      if (patientIds.length === 0) {
        return {}
      }

      // Check cache for all patients first
      const cacheKeys = patientIds.map(id => CACHE_KEYS.reminderStats(id))
      const cachedResults = await Promise.all(
        cacheKeys.map(key => getCachedData<ComplianceData>(key))
      )

      // Separate cached and uncached patients
      const uncachedPatientIds: string[] = []
      const results: Record<string, ComplianceData> = {}

      patientIds.forEach((patientId, index) => {
        if (cachedResults[index]) {
          results[patientId] = cachedResults[index]!
        } else {
          uncachedPatientIds.push(patientId)
        }
      })

      // Calculate compliance for uncached patients individually (simpler approach)
      if (uncachedPatientIds.length > 0) {
        const uncachedResults = await Promise.all(
          uncachedPatientIds.map(patientId => this.calculatePatientCompliance(patientId))
        )

        // Combine results
        uncachedPatientIds.forEach((patientId, index) => {
          results[patientId] = uncachedResults[index]
        })
      }

      const duration = Date.now() - startTime
      logger.performance('calculateBulkCompliance', duration, {
        patientCount: patientIds.length,
        cachedCount: patientIds.length - uncachedPatientIds.length
      })

      return results
    } catch (error) {
      logger.error('Failed to calculate bulk compliance', error instanceof Error ? error : new Error(String(error)), { patientIds })
      throw error
    }
  }

  /**
   * Invalidate compliance cache for a patient
   * Should be called when patient data changes
   */
  static async invalidatePatientCompliance(patientId: string): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.reminderStats(patientId)
      await setCachedData(cacheKey, null, 0) // Expire immediately
      logger.cache(`Invalidated compliance cache for patient ${patientId}`)
    } catch (error) {
      logger.error('Failed to invalidate patient compliance cache', error instanceof Error ? error : new Error(String(error)), { patientId })
    }
  }

  /**
   * Get compliance trends over time for a patient
   * Useful for analytics and reporting
   */
  static async getComplianceTrends(
    patientId: string,
    days: number = 30
  ): Promise<Array<{ date: string; complianceRate: number; deliveredCount: number; confirmedCount: number }>> {
    const startTime = Date.now()

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get all reminder logs for the period
      const reminderLogsData = await db
        .select({
          sentAt: reminderLogs.sentAt,
          id: reminderLogs.id
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            eq(reminderLogs.status, 'DELIVERED'),
            sql`${reminderLogs.sentAt} >= ${startDate}`
          )
        )
        .orderBy(reminderLogs.sentAt)

      // Get all confirmations for the period
      const confirmationsData = await db
        .select({
          reminderLogId: manualConfirmations.reminderLogId,
          confirmedAt: manualConfirmations.confirmedAt
        })
        .from(manualConfirmations)
        .where(
          and(
            eq(manualConfirmations.patientId, patientId),
            sql`${manualConfirmations.confirmedAt} >= ${startDate}`
          )
        )

      // Group by date and calculate compliance
      const trendsMap = new Map<string, { delivered: number; confirmed: number }>()

      // Initialize with delivered reminders
      reminderLogsData.forEach(log => {
        const date = log.sentAt.toISOString().split('T')[0]
        if (!trendsMap.has(date)) {
          trendsMap.set(date, { delivered: 0, confirmed: 0 })
        }
        trendsMap.get(date)!.delivered++
      })

      // Add confirmations
      confirmationsData.forEach(confirmation => {
        if (confirmation.reminderLogId) {
          // Find the corresponding reminder log date
          const reminderLog = reminderLogsData.find(log => log.id === confirmation.reminderLogId)
          if (reminderLog) {
            const date = reminderLog.sentAt.toISOString().split('T')[0]
            if (trendsMap.has(date)) {
              trendsMap.get(date)!.confirmed++
            }
          }
        }
      })

      // Convert to array and calculate rates
      const trends = Array.from(trendsMap.entries())
        .map(([date, counts]) => ({
          date,
          complianceRate: counts.delivered > 0 ? Math.round((counts.confirmed / counts.delivered) * 100) : 0,
          deliveredCount: counts.delivered,
          confirmedCount: counts.confirmed
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const duration = Date.now() - startTime
      logger.performance('getComplianceTrends', duration, { patientId, days })

      return trends
    } catch (error) {
      logger.error('Failed to get compliance trends', error instanceof Error ? error : new Error(String(error)), { patientId, days })
      throw error
    }
  }
}