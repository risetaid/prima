import { KeywordMatcherService } from '@/services/keyword-matcher.service'
import { ConversationStateService } from '@/services/conversation-state.service'
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service'
import { db } from '@/db'
import { patients, reminders } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { Patient } from '@/db/schema'
import type { ConversationStateData } from '@/services/conversation-state.service'

interface VerificationResult {
  processed: boolean
  action: 'verified' | 'declined' | 'clarification_sent'
  message: string
}

interface ConfirmationResult {
  processed: boolean
  action: 'confirmed' | 'not_yet' | 'clarification_sent'
  message: string
}

export class ContextResponseHandlerService {
  constructor(
    private keywordMatcher: KeywordMatcherService,
    private conversationService: ConversationStateService,
    private whatsappService: WhatsAppService
  ) {}

  /**
   * Handle verification response with infinite retry
   */
  async handleVerificationResponse(
    patient: Patient,
    message: string,
    conversationState: ConversationStateData
  ): Promise<VerificationResult> {
    const match = this.keywordMatcher.matchVerification(message)

    // ✅ Valid YA response
    if (match === 'accept') {
      await db.update(patients)
        .set({
          verificationStatus: 'VERIFIED',
          verificationResponseAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(patients.id, patient.id))

      await this.whatsappService.sendAck(
        patient.phoneNumber,
        `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima pengingat dari relawan PRIMA.\n\nUntuk berhenti kapan saja, ketik: *BERHENTI*\n\n💙 Tim PRIMA`
      )

      // Clear context after successful response
      await this.conversationService.clearContext(patient.id)

      return {
        processed: true,
        action: 'verified',
        message: 'Patient verified successfully'
      }
    }

    // ❌ Valid TIDAK response
    if (match === 'decline') {
      await db.update(patients)
        .set({
          verificationStatus: 'DECLINED',
          verificationResponseAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(patients.id, patient.id))

      await this.whatsappService.sendAck(
        patient.phoneNumber,
        `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏\n\n💙 Tim PRIMA`
      )

      // Clear context after successful response
      await this.conversationService.clearContext(patient.id)

      return {
        processed: true,
        action: 'declined',
        message: 'Patient declined verification'
      }
    }

    // ⚠️ Invalid response - Send clarification (infinite retry)
    const attemptCount = await this.conversationService.incrementAttempt(conversationState.id)
    await this.sendVerificationClarification(patient, attemptCount)

    return {
      processed: true,
      action: 'clarification_sent',
      message: `Clarification sent (attempt ${attemptCount})`
    }
  }

  /**
   * Handle reminder confirmation response with infinite retry
   */
  async handleReminderConfirmationResponse(
    patient: Patient,
    message: string,
    conversationState: ConversationStateData
  ): Promise<ConfirmationResult> {
    const match = this.keywordMatcher.matchConfirmation(message)
    const reminderId = conversationState.relatedEntityId

    if (!reminderId) {
      throw new Error('No reminder ID in conversation state')
    }

    // ✅ Valid SUDAH response
    if (match === 'done') {
      await db.update(reminders)
        .set({
          status: 'DELIVERED',
          confirmationStatus: 'CONFIRMED',
          confirmationResponse: message,
          confirmationResponseAt: new Date()
        })
        .where(eq(reminders.id, reminderId))

      await this.whatsappService.sendAck(
        patient.phoneNumber,
        `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n💙 Tim PRIMA`
      )

      // Clear context after successful response
      await this.conversationService.clearContext(patient.id)

      return {
        processed: true,
        action: 'confirmed',
        message: 'Reminder confirmed successfully'
      }
    }

    // ⏰ Valid BELUM response
    if (match === 'not_yet') {
      await db.update(reminders)
        .set({
          confirmationResponse: message,
          confirmationResponseAt: new Date()
        })
        .where(eq(reminders.id, reminderId))

      await this.whatsappService.sendAck(
        patient.phoneNumber,
        `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\nKami akan mengingatkan lagi nanti.\n\n💙 Tim PRIMA`
      )

      // Clear context after successful response
      await this.conversationService.clearContext(patient.id)

      return {
        processed: true,
        action: 'not_yet',
        message: 'Patient will complete reminder later'
      }
    }

    // ⚠️ Invalid response - Send clarification (infinite retry)
    const attemptCount = await this.conversationService.incrementAttempt(conversationState.id)
    await this.sendConfirmationClarification(patient, attemptCount)

    return {
      processed: true,
      action: 'clarification_sent',
      message: `Clarification sent (attempt ${attemptCount})`
    }
  }

  /**
   * Send verification clarification (progressive messaging)
   */
  private async sendVerificationClarification(patient: Patient, attemptNumber: number): Promise<void> {
    let clarificationMessage: string

    // Progressive clarification messages based on attempt count
    if (attemptNumber === 1) {
      clarificationMessage = `Mohon balas dengan *YA* atau *TIDAK* saja. Terima kasih! 💙`
    } else if (attemptNumber === 2) {
      clarificationMessage = `⚠️ Silakan balas dengan:\n*YA* - untuk setuju\n*TIDAK* - untuk tolak\n\n💙 Tim PRIMA`
    } else {
      // After 3+ attempts, use persistent message
      clarificationMessage = `🔔 Mohon balas dengan kata:\n\n✅ *YA* - jika setuju\n❌ *TIDAK* - jika tolak\n\n💙 Tim PRIMA`
    }

    await this.whatsappService.sendAck(patient.phoneNumber, clarificationMessage)

    logger.info('Verification clarification sent', {
      patientId: patient.id,
      attemptNumber,
      message: clarificationMessage
    })
  }

  /**
   * Send reminder confirmation clarification (progressive messaging)
   */
  private async sendConfirmationClarification(patient: Patient, attemptNumber: number): Promise<void> {
    let clarificationMessage: string

    // Progressive clarification messages based on attempt count
    if (attemptNumber === 1) {
      clarificationMessage = `Mohon balas dengan *SUDAH* atau *BELUM* saja. Terima kasih! 💙`
    } else if (attemptNumber === 2) {
      clarificationMessage = `⚠️ Silakan balas dengan:\n*SUDAH* - jika sudah selesai\n*BELUM* - jika belum selesai\n\n💙 Tim PRIMA`
    } else {
      // After 3+ attempts, use persistent message
      clarificationMessage = `🔔 Mohon balas dengan kata:\n\n✅ *SUDAH* - jika sudah\n⏰ *BELUM* - jika belum\n\n💙 Tim PRIMA`
    }

    await this.whatsappService.sendAck(patient.phoneNumber, clarificationMessage)

    logger.info('Confirmation clarification sent', {
      patientId: patient.id,
      attemptNumber,
      message: clarificationMessage
    })
  }
}
