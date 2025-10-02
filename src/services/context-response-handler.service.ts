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
        `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima pengingat dari relawan PRIMA.\n\n💙 Tim PRIMA`
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

    // ⚠️ Invalid response - Send clarification (INFINITE RETRY - NO LIMIT)
    // Will keep sending clarification messages for attempt 1, 2, 3, 4, 5, ... until valid response
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

    // ⚠️ Invalid response - Send clarification (INFINITE RETRY - NO LIMIT)
    // Will keep sending clarification messages for attempt 1, 2, 3, 4, 5, ... until valid response
    const attemptCount = await this.conversationService.incrementAttempt(conversationState.id)
    await this.sendConfirmationClarification(patient, attemptCount)

    return {
      processed: true,
      action: 'clarification_sent',
      message: `Clarification sent (attempt ${attemptCount})`
    }
  }

  /**
   * Send verification clarification (progressive messaging with INFINITE RETRY)
   * - Attempt 1: Gentle reminder
   * - Attempt 2: More explicit instruction
   * - Attempt 3+: Persistent clear instruction (WILL KEEP SENDING - NO LIMIT)
   */
  private async sendVerificationClarification(patient: Patient, attemptNumber: number): Promise<void> {
    let clarificationMessage: string

    // Progressive clarification messages based on attempt count
    if (attemptNumber === 1) {
      clarificationMessage = `⚠️ Mohon balas dengan kata *YA* atau *TIDAK* saja (satu kata, tanpa kata lain)\n\nTerima kasih! 💙 Tim PRIMA`
    } else if (attemptNumber === 2) {
      clarificationMessage = `⚠️ PENTING: Balas hanya dengan SALAH SATU kata ini:\n\n✅ *YA*\n❌ *TIDAK*\n\n(Satu kata saja, tanpa tambahan kata lain)\n\n💙 Tim PRIMA`
    } else {
      // Attempt 3, 4, 5, ... (INFINITE - will keep sending this same message)
      clarificationMessage = `🔔 MOHON BALAS DENGAN TEPAT:\n\n✅ Ketik kata *YA* saja - jika setuju\n❌ Ketik kata *TIDAK* saja - jika tolak\n\n⚠️ Hanya satu kata, tanpa kata lain\n\n💙 Tim PRIMA`
    }

    await this.whatsappService.sendAck(patient.phoneNumber, clarificationMessage)

    logger.info('Verification clarification sent', {
      patientId: patient.id,
      attemptNumber,
      message: clarificationMessage
    })
  }

  /**
   * Send reminder confirmation clarification (progressive messaging with INFINITE RETRY)
   * - Attempt 1: Gentle reminder
   * - Attempt 2: More explicit instruction
   * - Attempt 3+: Persistent clear instruction (WILL KEEP SENDING - NO LIMIT)
   */
  private async sendConfirmationClarification(patient: Patient, attemptNumber: number): Promise<void> {
    let clarificationMessage: string

    // Progressive clarification messages based on attempt count
    if (attemptNumber === 1) {
      clarificationMessage = `⚠️ Mohon balas dengan kata *SUDAH* atau *BELUM* saja (satu kata, tanpa kata lain)\n\nTerima kasih! 💙 Tim PRIMA`
    } else if (attemptNumber === 2) {
      clarificationMessage = `⚠️ PENTING: Balas hanya dengan SALAH SATU kata ini:\n\n✅ *SUDAH*\n⏰ *BELUM*\n\n(Satu kata saja, tanpa tambahan kata lain)\n\n💙 Tim PRIMA`
    } else {
      // Attempt 3, 4, 5, ... (INFINITE - will keep sending this same message)
      clarificationMessage = `🔔 MOHON BALAS DENGAN TEPAT:\n\n✅ Ketik kata *SUDAH* saja - jika sudah selesai\n⏰ Ketik kata *BELUM* saja - jika belum selesai\n\n⚠️ Hanya satu kata, tanpa kata lain\n\n💙 Tim PRIMA`
    }

    await this.whatsappService.sendAck(patient.phoneNumber, clarificationMessage)

    logger.info('Confirmation clarification sent', {
      patientId: patient.id,
      attemptNumber,
      message: clarificationMessage
    })
  }
}
