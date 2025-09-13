// Linked Confirmation Service - Connects patient responses to specific reminder logs
// Ensures confirmations are properly linked and tracked

import { db } from '@/db'
import { reminderLogs } from '@/db'
import { eq, and, desc, gte } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export interface LinkedConfirmation {
  id: string
  reminderLogId: string
  patientId: string
  response: string | null
  responseType: 'confirmed' | 'missed' | 'later' | 'unknown'
  confidence: number
  linkedAt: Date
  metadata: Record<string, any>
}

export interface ConfirmationLinkResult {
  success: boolean
  linkedConfirmation?: LinkedConfirmation
  message: string
  requiresFollowUp?: boolean
}

export class LinkedConfirmationService {
  constructor() {
    // Service initialization
  }

  /**
   * Link a patient response to the most recent pending reminder
   */
  async linkConfirmationToReminder(
    patientId: string,
    response: string,
    conversationStateId?: string
  ): Promise<ConfirmationLinkResult> {
    try {
      // Find the most recent pending confirmation for this patient
      const recentPendingConfirmation = await db
        .select({
          id: reminderLogs.id,
          reminderScheduleId: reminderLogs.reminderScheduleId,
          sentAt: reminderLogs.sentAt,
          confirmationStatus: reminderLogs.confirmationStatus,
          confirmationMessage: reminderLogs.confirmationMessage
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            eq(reminderLogs.confirmationStatus, 'PENDING')
          )
        )
        .orderBy(desc(reminderLogs.sentAt))
        .limit(1)

      if (!recentPendingConfirmation.length) {
        return {
          success: false,
          message: 'No pending confirmation found for this patient'
        }
      }

      const pendingLog = recentPendingConfirmation[0]

      // Analyze the response to determine confirmation type
      const responseAnalysis = this.analyzeConfirmationResponse(response)

      // Update the reminder log with the confirmation
      await this.updateReminderLogConfirmation(
        pendingLog.id,
        responseAnalysis.responseType,
        response,
        responseAnalysis.confidence
      )

      // Create linked confirmation record
      const linkedConfirmation: LinkedConfirmation = {
        id: `lc_${Date.now()}_${pendingLog.id}`,
        reminderLogId: pendingLog.id,
        patientId,
        response,
        responseType: responseAnalysis.responseType,
        confidence: responseAnalysis.confidence,
        linkedAt: new Date(),
        metadata: {
          conversationStateId,
          analysis: responseAnalysis
        }
      }

      // Log the linked confirmation
      await this.logLinkedConfirmation(linkedConfirmation)

      // Handle follow-up actions based on response type
      const followUpResult = await this.handleConfirmationFollowUp(
        linkedConfirmation,
        pendingLog
      )

      logger.info('Linked confirmation to reminder', {
        patientId,
        reminderLogId: pendingLog.id,
        responseType: responseAnalysis.responseType,
        confidence: responseAnalysis.confidence
      })

      return {
        success: true,
        linkedConfirmation,
        message: `Confirmation linked successfully: ${responseAnalysis.responseType}`,
        requiresFollowUp: followUpResult.requiresFollowUp
      }
    } catch (error) {
      logger.error('Failed to link confirmation to reminder', error as Error, {
        patientId,
        response
      })
      return {
        success: false,
        message: 'Failed to link confirmation'
      }
    }
  }

  /**
   * Find pending confirmations for a patient
   */
  async findPendingConfirmations(patientId: string): Promise<any[]> {
    try {
      const pendingConfirmations = await db
        .select({
          id: reminderLogs.id,
          reminderScheduleId: reminderLogs.reminderScheduleId,
          sentAt: reminderLogs.sentAt,
          confirmationMessage: reminderLogs.confirmationMessage,
          message: reminderLogs.message
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            eq(reminderLogs.confirmationStatus, 'PENDING')
          )
        )
        .orderBy(desc(reminderLogs.sentAt))
        .limit(5) // Get up to 5 most recent pending confirmations

      return pendingConfirmations
    } catch (error) {
      logger.error('Failed to find pending confirmations', error as Error, { patientId })
      return []
    }
  }

  /**
   * Get confirmation history for a patient
   */
  async getConfirmationHistory(
    patientId: string,
    limit: number = 20
  ): Promise<LinkedConfirmation[]> {
    try {
      // This would typically query a confirmation history table
      // For now, we'll derive it from reminder logs
      const confirmationHistory = await db
        .select({
          id: reminderLogs.id,
          reminderScheduleId: reminderLogs.reminderScheduleId,
          sentAt: reminderLogs.sentAt,
          confirmationStatus: reminderLogs.confirmationStatus,
          confirmationResponse: reminderLogs.confirmationResponse,
          confirmationResponseAt: reminderLogs.confirmationResponseAt
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.confirmationResponseAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          )
        )
        .orderBy(desc(reminderLogs.confirmationResponseAt))
        .limit(limit)

      // Convert to LinkedConfirmation format
      return confirmationHistory.map(log => {
        const responseText: string = log.confirmationResponse ? log.confirmationResponse : 'No response recorded'
        return {
          id: `lc_${log.id}`,
          reminderLogId: log.id,
          patientId,
          response: responseText,
          responseType: this.mapStatusToResponseType(log.confirmationStatus || 'UNKNOWN'),
          confidence: 1.0, // Historical data has full confidence
          linkedAt: log.confirmationResponseAt || log.sentAt,
          metadata: {
            historical: true,
            originalStatus: log.confirmationStatus
          }
        }
      })
    } catch (error) {
      logger.error('Failed to get confirmation history', error as Error, { patientId })
      return []
    }
  }

  /**
   * Analyze confirmation response to determine type
   */
  private analyzeConfirmationResponse(response: string): {
    responseType: LinkedConfirmation['responseType']
    confidence: number
    reasoning: string[]
  } {
    const normalizedResponse = response.toLowerCase().trim()

    // Confirmed responses
    if (this.matchesConfirmedPatterns(normalizedResponse)) {
      return {
        responseType: 'confirmed',
        confidence: 0.9,
        reasoning: ['Matches confirmed patterns', 'Positive affirmation detected']
      }
    }

    // Missed responses
    if (this.matchesMissedPatterns(normalizedResponse)) {
      return {
        responseType: 'missed',
        confidence: 0.8,
        reasoning: ['Matches missed patterns', 'Negative or missed indication detected']
      }
    }

    // Later responses
    if (this.matchesLaterPatterns(normalizedResponse)) {
      return {
        responseType: 'later',
        confidence: 0.7,
        reasoning: ['Matches later patterns', 'Deferral indication detected']
      }
    }

    // Unknown responses
    return {
      responseType: 'unknown',
      confidence: 0.3,
      reasoning: ['No clear pattern matched', 'Response unclear or ambiguous']
    }
  }

  /**
   * Check if response matches confirmed patterns
   */
  private matchesConfirmedPatterns(response: string): boolean {
    const confirmedPatterns = [
      'sudah', 'ya', 'iya', 'yes', 'oke', 'baik', 'minum', 'ambil',
      'done', 'selesai', 'sudah minum', 'udh minum', 'sudah ambil'
    ]

    return confirmedPatterns.some(pattern => response.includes(pattern))
  }

  /**
   * Check if response matches missed patterns
   */
  private matchesMissedPatterns(response: string): boolean {
    const missedPatterns = [
      'belum', 'tidak', 'ga', 'gak', 'engga', 'enggak', 'lupa',
      'belum minum', 'blm minum', 'skip', 'lewat'
    ]

    return missedPatterns.some(pattern => response.includes(pattern))
  }

  /**
   * Check if response matches later patterns
   */
  private matchesLaterPatterns(response: string): boolean {
    const laterPatterns = [
      'nanti', 'bentaran', 'sebentar', 'tunggu', 'wait', 'later',
      'nanti dulu', 'belum saatnya'
    ]

    return laterPatterns.some(pattern => response.includes(pattern))
  }

  /**
   * Update reminder log with confirmation details
   */
  private async updateReminderLogConfirmation(
    reminderLogId: string,
    responseType: LinkedConfirmation['responseType'],
    response: string,
    confidence: number
  ): Promise<void> {
    const status = this.mapResponseTypeToStatus(responseType)

    await db
      .update(reminderLogs)
      .set({
        confirmationStatus: status as "PENDING" | "SENT" | "CONFIRMED" | "MISSED" | "UNKNOWN",
        confirmationResponse: response,
        confirmationResponseAt: new Date(),
        // Store confidence in metadata or a new field if available
      })
      .where(eq(reminderLogs.id, reminderLogId))
  }

  /**
   * Map response type to confirmation status
   */
  private mapResponseTypeToStatus(responseType: LinkedConfirmation['responseType']): string {
    switch (responseType) {
      case 'confirmed':
        return 'CONFIRMED'
      case 'missed':
        return 'MISSED'
      case 'later':
        return 'UNKNOWN'
      default:
        return 'UNKNOWN'
    }
  }

  /**
   * Map confirmation status to response type
   */
  private mapStatusToResponseType(status: string): LinkedConfirmation['responseType'] {
    switch (status) {
      case 'CONFIRMED':
        return 'confirmed'
      case 'MISSED':
        return 'missed'
      case 'UNKNOWN':
        return 'later'
      default:
        return 'unknown'
    }
  }

  /**
   * Log linked confirmation (for audit and analytics)
   */
  private async logLinkedConfirmation(confirmation: LinkedConfirmation): Promise<void> {
    // This would typically insert into a confirmation_links table
    // For now, we'll just log it
    logger.info('Logged linked confirmation', {
      confirmationId: confirmation.id,
      reminderLogId: confirmation.reminderLogId,
      patientId: confirmation.patientId,
      responseType: confirmation.responseType,
      confidence: confirmation.confidence
    })
  }

  /**
   * Handle follow-up actions based on confirmation type
   */
  private async handleConfirmationFollowUp(
    confirmation: LinkedConfirmation,
    reminderLog: any
  ): Promise<{ requiresFollowUp: boolean; actions?: string[] }> {
    switch (confirmation.responseType) {
      case 'missed':
        // Schedule follow-up reminder
        return {
          requiresFollowUp: true,
          actions: ['schedule_followup_reminder', 'notify_volunteer']
        }

      case 'later':
        // Schedule gentle reminder after some time
        return {
          requiresFollowUp: true,
          actions: ['schedule_later_reminder']
        }

      case 'confirmed':
        // No follow-up needed
        return {
          requiresFollowUp: false
        }

      default:
        // Unknown response - may need human intervention
        return {
          requiresFollowUp: true,
          actions: ['flag_for_review']
        }
    }
  }

  /**
   * Get confirmation statistics for a patient
   */
  async getConfirmationStats(patientId: string): Promise<{
    totalConfirmations: number
    confirmedRate: number
    missedRate: number
    averageResponseTime: number
    recentTrend: 'improving' | 'stable' | 'declining'
  }> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const stats = await db
        .select({
          total: count(reminderLogs.id),
          confirmed: sql<number>`count(case when ${reminderLogs.confirmationStatus} = 'CONFIRMED' then 1 end)`,
          missed: sql<number>`count(case when ${reminderLogs.confirmationStatus} = 'MISSED' then 1 end)`,
          avgResponseTime: avg(sql<number>`extract(epoch from (${reminderLogs.confirmationResponseAt} - ${reminderLogs.sentAt})) / 60`)
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.sentAt, thirtyDaysAgo)
          )
        )

      const data = stats[0]
      const total = data.total || 0

      return {
        totalConfirmations: total,
        confirmedRate: total > 0 ? (data.confirmed / total) * 100 : 0,
        missedRate: total > 0 ? (data.missed / total) * 100 : 0,
        averageResponseTime: Number(data.avgResponseTime) || 0,
        recentTrend: 'stable' // Would need more complex analysis for trend
      }
    } catch (error) {
      logger.error('Failed to get confirmation stats', error as Error, { patientId })
      return {
        totalConfirmations: 0,
        confirmedRate: 0,
        missedRate: 0,
        averageResponseTime: 0,
        recentTrend: 'stable'
      }
    }
  }
}

// Import sql for raw SQL operations
import { sql, count, avg } from 'drizzle-orm'