// Smart Reminder Service - Intelligent scheduling and adaptive timing
// Analyzes patient patterns to optimize reminder delivery times and frequencies

import { db } from '@/db'
import { reminderSchedules, reminderLogs } from '@/db'
import { eq, and, gte, desc, count, avg, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { getWIBTime } from '@/lib/timezone'

export interface PatientReminderPattern {
  patientId: string
  averageResponseTime: number // minutes
  preferredTimeSlots: string[] // HH:mm format
  responseRate: number // percentage
  commonMissedTimes: string[]
  bestDayOfWeek: number // 0-6, Sunday = 0
  adherenceScore: number // 0-100
}

export interface SmartReminderSchedule {
  reminderScheduleId: string
  patientId: string
  scheduledTime: string
  adjustedTime?: string
  confidence: number
  reasoning: string[]
  alternativeTimes: string[]
}

export interface ReminderAnalytics {
  totalSent: number
  totalConfirmed: number
  totalMissed: number
  averageResponseTime: number
  bestPerformingTimes: string[]
  adherenceTrend: 'improving' | 'stable' | 'declining'
  recommendations: string[]
}

interface ReminderLogEntry {
  sentAt: Date
  confirmationStatus: string | null
  confirmationResponseAt: Date | null
  scheduledTime: string | null
}

interface AnalyticsData {
  totalSent: number
  totalConfirmed: number
  totalMissed: number
  avgResponseTime: string | null
}

interface TimePerformanceEntry {
  scheduledTime: string | null
  confirmationStatus: string | null
}

export class SmartReminderService {
  /**
   * Analyze patient reminder patterns
   */
  async analyzePatientPattern(patientId: string): Promise<PatientReminderPattern> {
    try {
      // Get reminder logs for the past 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const reminderLogsData = await db
        .select({
          sentAt: reminderLogs.sentAt,
          confirmationStatus: reminderLogs.confirmationStatus,
          confirmationResponseAt: reminderLogs.confirmationResponseAt,
          scheduledTime: reminderSchedules.scheduledTime
        })
        .from(reminderLogs)
        .leftJoin(reminderSchedules, eq(reminderLogs.reminderScheduleId, reminderSchedules.id))
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.sentAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(reminderLogs.sentAt))

      if (reminderLogsData.length === 0) {
        return this.getDefaultPattern(patientId)
      }

      // Analyze response patterns
      const confirmedLogs = reminderLogsData.filter(log => log.confirmationStatus === 'CONFIRMED')
      const missedLogs = reminderLogsData.filter(log => log.confirmationStatus === 'MISSED')

      // Calculate average response time
      const responseTimes = confirmedLogs
        .filter(log => log.confirmationResponseAt)
        .map(log => {
          const sentTime = new Date(log.sentAt)
          const responseTime = new Date(log.confirmationResponseAt!)
          return (responseTime.getTime() - sentTime.getTime()) / (1000 * 60) // minutes
        })

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 30 // default 30 minutes

      // Analyze preferred time slots
      const timeSlots = reminderLogsData
        .map(log => log.scheduledTime)
        .filter((time): time is string => time !== null)
      const timeSlotCounts = this.countTimeSlots(timeSlots)
      const preferredTimeSlots = Object.entries(timeSlotCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([time]) => time)

      // Calculate response rate
      const responseRate = (confirmedLogs.length / reminderLogsData.length) * 100

      // Find best day of week
      const dayPerformance = this.analyzeDayPerformance(reminderLogsData)
      const bestDayEntry = Object.entries(dayPerformance)
        .sort(([,a], [,b]) => b - a)[0]
      const bestDayOfWeek = (bestDayEntry ? parseInt(String(bestDayEntry[0]), 10) : 1) as number

      // Calculate adherence score
      const adherenceScore = this.calculateAdherenceScore(
        confirmedLogs.length,
        missedLogs.length,
        averageResponseTime
      )

      return {
        patientId,
        averageResponseTime,
        preferredTimeSlots,
        responseRate,
        commonMissedTimes: this.findCommonMissedTimes(missedLogs),
        bestDayOfWeek,
        adherenceScore
      }
    } catch (error) {
      logger.error('Failed to analyze patient pattern', error as Error, { patientId })
      return this.getDefaultPattern(patientId)
    }
  }

  /**
   * Generate smart reminder schedule
   */
  async generateSmartSchedule(
    reminderScheduleId: string,
    patientId: string
  ): Promise<SmartReminderSchedule> {
    try {
      // Get patient pattern
      const pattern = await this.analyzePatientPattern(patientId)

      // Get current reminder schedule
      const schedule = await db
        .select()
        .from(reminderSchedules)
        .where(eq(reminderSchedules.id, reminderScheduleId))
        .limit(1)

      if (!schedule.length) {
        throw new Error(`Reminder schedule ${reminderScheduleId} not found`)
      }

      const currentSchedule = schedule[0]
      const scheduledTime = currentSchedule.scheduledTime

      // Generate recommendations
      const recommendations = this.generateTimeRecommendations(pattern, scheduledTime)

      // Select best time
      const bestRecommendation = recommendations[0]
      const adjustedTime = bestRecommendation?.time !== scheduledTime
        ? bestRecommendation.time
        : undefined

      return {
        reminderScheduleId,
        patientId,
        scheduledTime,
        adjustedTime,
        confidence: bestRecommendation?.confidence || 0.5,
        reasoning: bestRecommendation?.reasoning || ['Using original schedule time'],
        alternativeTimes: recommendations.slice(1, 4).map(r => r.time)
      }
    } catch (error) {
      logger.error('Failed to generate smart schedule', error as Error, {
        reminderScheduleId,
        patientId
      })
      throw error
    }
  }

  /**
   * Get reminder analytics for a patient
   */
  async getReminderAnalytics(patientId: string): Promise<ReminderAnalytics> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const analytics = await db
        .select({
          totalSent: count(reminderLogs.id),
          totalConfirmed: sql<number>`count(case when ${reminderLogs.confirmationStatus} = 'CONFIRMED' then 1 end)`,
          totalMissed: sql<number>`count(case when ${reminderLogs.confirmationStatus} = 'MISSED' then 1 end)`,
          avgResponseTime: avg(sql<number>`extract(epoch from (${reminderLogs.confirmationResponseAt} - ${reminderLogs.sentAt})) / 60`)
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.sentAt, thirtyDaysAgo)
          )
        )

      const data = analytics[0]

      // Analyze time performance
      const timePerformance = await this.analyzeTimePerformance(patientId)
      const bestPerformingTimes = Object.entries(timePerformance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([time]) => time)

      // Determine adherence trend (simplified)
      const adherenceTrend = data.totalConfirmed > data.totalMissed ? 'improving' : 'stable'

      return {
        totalSent: data.totalSent || 0,
        totalConfirmed: data.totalConfirmed || 0,
        totalMissed: data.totalMissed || 0,
        averageResponseTime: Number(data.avgResponseTime) || 0,
        bestPerformingTimes,
        adherenceTrend,
        recommendations: this.generateAnalyticsRecommendations(data, bestPerformingTimes)
      }
    } catch (error) {
      logger.error('Failed to get reminder analytics', error as Error, { patientId })
      throw error
    }
  }

  /**
   * Adjust reminder time based on patient pattern
   */
  async adjustReminderTime(
    reminderScheduleId: string,
    newTime: string,
    reason: string
  ): Promise<boolean> {
    try {
      try {
        await db
          .update(reminderSchedules)
          .set({
            scheduledTime: newTime,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderSchedules.id, reminderScheduleId))

        logger.info('Adjusted reminder time', {
          reminderScheduleId,
          newTime,
          reason
        })
        return true
      } catch (error) {
        logger.error('Failed to adjust reminder time', error as Error, {
          reminderScheduleId,
          newTime
        })
        return false
      }
    } catch (error) {
      logger.error('Failed to adjust reminder time', error as Error, {
        reminderScheduleId,
        newTime
      })
      return false
    }
  }

  // Private helper methods

  private getDefaultPattern(patientId: string): PatientReminderPattern {
    return {
      patientId,
      averageResponseTime: 30,
      preferredTimeSlots: ['08:00', '12:00', '18:00'],
      responseRate: 70,
      commonMissedTimes: [],
      bestDayOfWeek: 1, // Monday
      adherenceScore: 70
    }
  }

  private countTimeSlots(times: string[]): Record<string, number> {
    return times.reduce((acc, time) => {
      acc[time] = (acc[time] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private analyzeDayPerformance(logs: ReminderLogEntry[]): Record<string, number> {
    const dayStats: Record<string, { total: number; confirmed: number }> = {}

    logs.forEach(log => {
      const day = new Date(log.sentAt).getDay().toString()
      if (!dayStats[day]) {
        dayStats[day] = { total: 0, confirmed: 0 }
      }
      dayStats[day].total++
      if (log.confirmationStatus === 'CONFIRMED') {
        dayStats[day].confirmed++
      }
    })

    return Object.entries(dayStats).reduce((acc, [day, stats]) => {
      acc[day] = stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0
      return acc
    }, {} as Record<string, number>)
  }

  private calculateAdherenceScore(confirmed: number, missed: number, avgResponseTime: number): number {
    const total = confirmed + missed
    if (total === 0) return 70 // default

    const responseRate = (confirmed / total) * 100
    const timeBonus = Math.max(0, 30 - avgResponseTime) / 30 * 20 // up to 20 points for quick responses

    return Math.min(100, responseRate + timeBonus)
  }

  private findCommonMissedTimes(missedLogs: ReminderLogEntry[]): string[] {
    const missedTimes = missedLogs.map(log => log.scheduledTime).filter((time): time is string => time !== null)
    const timeCounts = this.countTimeSlots(missedTimes)

    return Object.entries(timeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([time]) => time)
  }

  private generateTimeRecommendations(
    pattern: PatientReminderPattern,
    currentTime: string
  ): Array<{ time: string; confidence: number; reasoning: string[] }> {
    const recommendations: Array<{ time: string; confidence: number; reasoning: string[] }> = []

    // Add current time as baseline
    recommendations.push({
      time: currentTime,
      confidence: 0.5,
      reasoning: ['Current scheduled time']
    })

    // Add preferred time slots
    pattern.preferredTimeSlots.forEach((time, index) => {
      if (time !== currentTime) {
        const confidence = Math.max(0.3, 0.8 - (index * 0.1))
        recommendations.push({
          time,
          confidence,
          reasoning: [
            `Patient's ${index + 1}${this.getOrdinalSuffix(index + 1)} preferred time`,
            `Based on ${Math.round(pattern.responseRate)}% response rate at this time`
          ]
        })
      }
    })

    // Add time adjustments based on response patterns
    if (pattern.averageResponseTime > 45) {
      // If patient takes long to respond, try earlier times
      const [hours, minutes] = currentTime.split(':').map(Number)
      const earlierTime = `${String(Math.max(6, hours - 1)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      if (!recommendations.find(r => r.time === earlierTime)) {
        recommendations.push({
          time: earlierTime,
          confidence: 0.6,
          reasoning: [
            'Earlier time suggested due to slow response pattern',
            `Patient typically responds in ${Math.round(pattern.averageResponseTime)} minutes`
          ]
        })
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  private async analyzeTimePerformance(patientId: string): Promise<Record<string, number>> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const timeData: TimePerformanceEntry[] = await db
      .select({
        scheduledTime: reminderSchedules.scheduledTime,
        confirmationStatus: reminderLogs.confirmationStatus
      })
      .from(reminderLogs)
      .leftJoin(reminderSchedules, eq(reminderLogs.reminderScheduleId, reminderSchedules.id))
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          gte(reminderLogs.sentAt, thirtyDaysAgo)
        )
      )

    const timeStats: Record<string, { total: number; confirmed: number }> = {}

    timeData.forEach(row => {
      const time = row.scheduledTime
      if (time) {
        if (!timeStats[time]) {
          timeStats[time] = { total: 0, confirmed: 0 }
        }
        timeStats[time].total++
        if (row.confirmationStatus === 'CONFIRMED') {
          timeStats[time].confirmed++
        }
      }
    })

    return Object.entries(timeStats).reduce((acc, [time, stats]) => {
      acc[time] = stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0
      return acc
    }, {} as Record<string, number>)
  }

  private generateAnalyticsRecommendations(
    data: AnalyticsData,
    bestTimes: string[]
  ): string[] {
    const recommendations: string[] = []

    if (data.totalConfirmed < data.totalMissed) {
      recommendations.push('Consider adjusting reminder times to improve response rate')
    }

    if (bestTimes.length > 0) {
      recommendations.push(`Best performing times: ${bestTimes.join(', ')}`)
    }

    if (data.avgResponseTime && Number(data.avgResponseTime) > 60) {
      recommendations.push('Consider sending reminders earlier to allow more response time')
    }

    return recommendations
  }

  private getOrdinalSuffix(num: number): string {
    if (num === 1) return 'st'
    if (num === 2) return 'nd'
    if (num === 3) return 'rd'
    return 'th'
  }
}