// Context-Aware Confirmations Service - Intelligent confirmation requests based on context
// Adapts confirmation messages and timing based on patient history and current situation

import { db } from '@/db'
import { reminderLogs, patients, reminderSchedules } from '@/db'
import { eq, and, gte, desc } from 'drizzle-orm'

import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { SmartReminderService } from '@/services/reminder/smart-reminder.service'
import { LinkedConfirmationService } from '@/services/reminder/linked-confirmation.service'

export interface ConfirmationContext {
  patientId: string
  reminderLogId: string
  scheduledTime: string
  timeSinceSent: number // minutes
  previousConfirmations: number
  adherenceStreak: number
  lastResponseType?: 'confirmed' | 'missed' | 'later'
  emergencyMode: boolean
}

export interface AdaptiveConfirmation {
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  followUpDelay: number // minutes
  escalationLevel: number
  personalizedElements: string[]
}

type ConfirmationAnalysis = {
  personalizationElements: string[]
  urgencyLevel: number
  encouragementNeeded: boolean
  reminderType: 'gentle' | 'standard' | 'urgent' | 'celebration'
}

export class ContextAwareConfirmationsService {
  private smartReminderService: SmartReminderService
  private linkedConfirmationService: LinkedConfirmationService

  constructor() {
    this.smartReminderService = new SmartReminderService()
    this.linkedConfirmationService = new LinkedConfirmationService()
  }

  /**
   * Generate context-aware confirmation message
   */
  async generateAdaptiveConfirmation(
    reminderLogId: string
  ): Promise<AdaptiveConfirmation> {
    try {
      // Get confirmation context
      const context = await this.buildConfirmationContext(reminderLogId)

      // Analyze context to determine message strategy
      const analysis = await this.analyzeConfirmationContext(context)

      // Generate personalized message
      const message = this.buildPersonalizedMessage(context, analysis)

      // Determine priority and timing
      const priority = this.calculatePriority(context, analysis)
      const followUpDelay = this.calculateFollowUpDelay(context, analysis)
      const escalationLevel = this.calculateEscalationLevel(context, analysis)

      return {
        message,
        priority,
        followUpDelay,
        escalationLevel,
        personalizedElements: analysis.personalizationElements
      }
     } catch {
       // Return default confirmation
       return this.getDefaultConfirmation()
     }
  }

  /**
   * Send context-aware confirmation
   */
  async sendAdaptiveConfirmation(reminderLogId: string): Promise<boolean> {
    try {
      const adaptiveConfirmation = await this.generateAdaptiveConfirmation(reminderLogId)

      // Get patient phone number
      const reminderLog = await db
        .select({
          patientId: patients.id,
          phoneNumber: patients.phoneNumber
        })
        .from(reminderLogs)
        .leftJoin(patients, eq(reminderLogs.patientId, patients.id))
        .where(eq(reminderLogs.id, reminderLogId))
        .limit(1)

      if (!reminderLog.length || !reminderLog[0].phoneNumber) {
        // logger.error('No phone number found for reminder log', { logId: reminderLogId })
        return false
      }

      const { phoneNumber } = reminderLog[0]

      // Send the confirmation message
      const formattedNumber = formatWhatsAppNumber(phoneNumber)
      const result = await sendWhatsAppMessage({
        to: formattedNumber,
        body: adaptiveConfirmation.message
      })

      if (result.success) {
        // Update reminder log with confirmation details
        await db
          .update(reminderLogs)
          .set({
            confirmationMessage: adaptiveConfirmation.message,
            confirmationSentAt: new Date(),
            confirmationStatus: 'SENT'
          })
          .where(eq(reminderLogs.id, reminderLogId))

        // logger.info('Sent adaptive confirmation', {
        //   reminderLogId,
        //   priority: adaptiveConfirmation.priority,
        //   followUpDelay: adaptiveConfirmation.followUpDelay
        // })
      }

       return result.success
      } catch {
        return false
      }
  }

  /**
   * Build confirmation context from reminder log
   */
  private async buildConfirmationContext(reminderLogId: string): Promise<ConfirmationContext> {
    const reminderLog = await db
      .select({
        id: reminderLogs.id,
        patientId: reminderLogs.patientId,
        sentAt: reminderLogs.sentAt,
        reminderScheduleId: reminderLogs.reminderScheduleId
      })
      .from(reminderLogs)
      .where(eq(reminderLogs.id, reminderLogId))
      .limit(1)

    if (!reminderLog.length) {
      throw new Error(`Reminder log ${reminderLogId} not found`)
    }

    const log = reminderLog[0]

    // Get medication info
    const schedule = await db
      .select({
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .where(log.reminderScheduleId ? eq(reminderSchedules.id, log.reminderScheduleId) : undefined)
      .limit(1)

    const scheduledTime = schedule.length > 0 ? schedule[0].scheduledTime : 'unknown'

    // Calculate time since sent
    const timeSinceSent = Math.floor((Date.now() - log.sentAt.getTime()) / (1000 * 60))

    // Get confirmation history
    const confirmationStats = await this.linkedConfirmationService.getConfirmationStats(log.patientId)

    // Get adherence streak
    const adherenceStreak = await this.calculateAdherenceStreak(log.patientId)

    // Check for emergency mode
    const emergencyMode = await this.checkEmergencyMode(log.patientId)

    return {
      patientId: log.patientId,
      reminderLogId: log.id,
      scheduledTime,
      timeSinceSent,
      previousConfirmations: confirmationStats.totalConfirmations,
      adherenceStreak,
      emergencyMode
    }
  }

  /**
   * Analyze confirmation context for personalization
   */
  private async analyzeConfirmationContext(context: ConfirmationContext): Promise<ConfirmationAnalysis> {
    const elements: string[] = []

    // Time-based personalization
    if (context.timeSinceSent > 120) { // 2+ hours late
      elements.push('overdue_reminder')
    } else if (context.timeSinceSent > 60) { // 1+ hour late
      elements.push('delayed_reminder')
    }

    // Adherence-based personalization
    if (context.adherenceStreak >= 7) {
      elements.push('streak_celebration')
    } else if (context.adherenceStreak === 0 && context.previousConfirmations > 5) {
      elements.push('encouragement_needed')
    }

    // No medication-specific elements needed

    // Emergency mode
    if (context.emergencyMode) {
      elements.push('emergency_mode')
    }

    // Determine reminder type
    let reminderType: 'gentle' | 'standard' | 'urgent' | 'celebration' = 'standard'
    let urgencyLevel = 1

    if (context.emergencyMode) {
      reminderType = 'urgent'
      urgencyLevel = 5
    } else if (context.adherenceStreak >= 7) {
      reminderType = 'celebration'
      urgencyLevel = 1
    } else if (context.timeSinceSent > 120) {
      reminderType = 'urgent'
      urgencyLevel = 4
    } else if (context.adherenceStreak === 0) {
      reminderType = 'gentle'
      urgencyLevel = 2
    }

    return {
      personalizationElements: elements,
      urgencyLevel,
      encouragementNeeded: context.adherenceStreak === 0 && context.previousConfirmations > 3,
      reminderType
    }
  }

  /**
   * Build personalized confirmation message
   */
  private buildPersonalizedMessage(
    context: ConfirmationContext,
    analysis: ConfirmationAnalysis
  ): string {
    const baseMessage = `Halo! Sudah menyelesaikan rutinitas kesehatan yang dijadwalkan pukul ${context.scheduledTime}?`

    let personalizedMessage = baseMessage

    // Add time context
    if (context.timeSinceSent > 60) {
      const hoursLate = Math.floor(context.timeSinceSent / 60)
      personalizedMessage += `\n\nSudah ${hoursLate} jam sejak pengingat dikirim ya.`
    }

    // Add encouragement or celebration
    if (analysis.reminderType === 'celebration') {
      personalizedMessage += `\n\n🎉 Hebat! Sudah ${context.adherenceStreak} hari berturut-turut konsisten dengan rutinitas kesehatan!`
    } else if (analysis.encouragementNeeded) {
      personalizedMessage += `\n\n💙 Kami di sini untuk mendukung perjalanan kesehatan Anda.`
    }

    // Add response options
    personalizedMessage += `\n\nBalas:`
    personalizedMessage += `\n✅ SUDAH - jika sudah selesai`
    personalizedMessage += `\n❌ BELUM - jika belum sempat`
    personalizedMessage += `\n⏰ NANTI - jika akan selesai sebentar lagi`

    // Add emergency contact if needed
    if (analysis.reminderType === 'urgent') {
      personalizedMessage += `\n\n🚨 Jika ada kendala, segera hubungi relawan atau rumah sakit.`
    }

    personalizedMessage += `\n\n_Terima kasih atas kerja sama Anda! 🙏_`

    return personalizedMessage
  }

  /**
   * Calculate confirmation priority
   */
  private calculatePriority(
    context: ConfirmationContext,
    analysis: ConfirmationAnalysis
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (context.emergencyMode) return 'urgent'
    if (context.timeSinceSent > 120) return 'high'
    if (analysis.urgencyLevel >= 4) return 'high'
    if (analysis.urgencyLevel >= 2) return 'medium'
    return 'low'
  }

  /**
   * Calculate follow-up delay
   */
  private calculateFollowUpDelay(
    context: ConfirmationContext,
    analysis: ConfirmationAnalysis
  ): number {
    // Base delay of 15 minutes
    let delay = 15

    // Adjust based on urgency
    if (analysis.urgencyLevel >= 4) {
      delay = 5 // Urgent: follow up in 5 minutes
    } else if (analysis.urgencyLevel >= 2) {
      delay = 10 // Medium: follow up in 10 minutes
    }

    // Adjust based on patient history
    if (context.adherenceStreak === 0) {
      delay = Math.max(5, delay - 5) // Reduce delay for struggling patients
    }

    return delay
  }

  /**
   * Calculate escalation level
   */
  private calculateEscalationLevel(
    context: ConfirmationContext,
    analysis: ConfirmationAnalysis
  ): number {
    let level = 1

    if (context.emergencyMode) level = 5
    else if (context.timeSinceSent > 180) level = 4 // 3+ hours
    else if (context.timeSinceSent > 120) level = 3 // 2+ hours
    else if (analysis.urgencyLevel >= 3) level = 2

    return level
  }

  /**
   * Calculate adherence streak
   */
  private async calculateAdherenceStreak(patientId: string): Promise<number> {
    try {
      // Get recent confirmations (last 10)
      const recentConfirmations = await db
        .select({
          confirmationStatus: reminderLogs.confirmationStatus,
          sentAt: reminderLogs.sentAt
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.sentAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          )
        )
        .orderBy(desc(reminderLogs.sentAt))
        .limit(10)

      let streak = 0
      for (const confirmation of recentConfirmations) {
        if (confirmation.confirmationStatus === 'CONFIRMED') {
          streak++
        } else {
          break // Streak broken
        }
      }

      return streak
     } catch {
       return 0
     }
  }

  /**
   * Check if patient is in emergency mode
   */
  private async checkEmergencyMode(patientId: string): Promise<boolean> {
    try {
      // Check for recent emergency keywords in responses
      const recentLogs = await db
        .select({
          confirmationResponse: reminderLogs.confirmationResponse
        })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            gte(reminderLogs.sentAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          )
        )
        .limit(5)

      const emergencyKeywords = ['sakit', 'darurat', 'emergency', 'nyeri', 'mual', 'demam']
      const hasEmergency = recentLogs.some(log =>
        log.confirmationResponse &&
        emergencyKeywords.some(keyword =>
          log.confirmationResponse!.toLowerCase().includes(keyword)
        )
      )

       return hasEmergency
      } catch {
        return false
      }
  }

  /**
   * Get default confirmation for fallback
   */
  private getDefaultConfirmation(): AdaptiveConfirmation {
    return {
      message: `Halo! Sudah menyelesaikan rutinitas kesehatan yang dijadwalkan?\n\nBalas:\n✅ SUDAH\n❌ BELUM\n⏰ NANTI`,
      priority: 'medium',
      followUpDelay: 15,
      escalationLevel: 1,
      personalizedElements: []
    }
  }
}