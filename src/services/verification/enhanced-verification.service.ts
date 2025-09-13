// Enhanced Verification Service - Multi-step verification with guided onboarding
// Supports complex verification flows with state management and timeout handling

import { db } from '@/db'
import { patients, verificationLogs } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { ConversationStateService } from '@/services/conversation-state.service'
import { VerificationFlowService } from '@/services/verification/verification-flow.service'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'

export interface VerificationStep {
  id: string
  name: string
  message: string
  expectedResponse: 'yes_no' | 'text' | 'confirmation'
  timeoutMinutes: number
  nextStep?: string
  onSuccess?: (response: string) => Promise<void>
  onTimeout?: () => Promise<void>
  validation?: (response: string) => boolean
}

export interface VerificationFlow {
  id: string
  patientId: string
  currentStep: string
  steps: Record<string, VerificationStep>
  startedAt: Date
  expiresAt: Date
  completedAt?: Date
  status: 'active' | 'completed' | 'expired' | 'failed'
  metadata: Record<string, any>
}

export interface VerificationResponse {
  success: boolean
  message: string
  nextStep?: string
  completed?: boolean
  requiresAction?: boolean
}

export class EnhancedVerificationService {
  private conversationService: ConversationStateService
  private verificationFlowService: VerificationFlowService

  constructor() {
    this.conversationService = new ConversationStateService()
    this.verificationFlowService = new VerificationFlowService()
  }

  /**
   * Standard verification flow steps
   */
  private readonly STANDARD_VERIFICATION_STEPS: Record<string, VerificationStep> = {
    welcome: {
      id: 'welcome',
      name: 'Welcome',
      message: `🏥 *Selamat Datang di PRIMA*

Halo! Terima kasih telah bergabung dengan sistem monitoring kesehatan PRIMA.

Saya akan membantu Anda menyelesaikan proses verifikasi agar bisa menerima pengingat obat secara otomatis.

Apakah Anda bersedia melanjutkan? (YA/TIDAK)`,
      expectedResponse: 'yes_no',
      timeoutMinutes: 30,
      nextStep: 'confirm_identity',
      validation: (response) => this.isAffirmative(response),
      onSuccess: async () => {
        logger.info('Patient accepted verification')
      },
      onTimeout: async () => {
        await this.handleVerificationTimeout('welcome')
      }
    },

    confirm_identity: {
      id: 'confirm_identity',
      name: 'Identity Confirmation',
      message: `📋 *Konfirmasi Identitas*

Untuk memastikan kami mengirim pesan ke orang yang tepat, mohon konfirmasi:

Apakah nomor WhatsApp ini milik Anda? (YA/TIDAK)`,
      expectedResponse: 'yes_no',
      timeoutMinutes: 15,
      nextStep: 'terms_acceptance',
      validation: (response) => this.isAffirmative(response),
      onTimeout: async () => {
        await this.handleVerificationTimeout('confirm_identity')
      }
    },

    terms_acceptance: {
      id: 'terms_acceptance',
      name: 'Terms Acceptance',
      message: `📜 *Persetujuan Layanan*

Dengan melanjutkan, Anda menyetujui:

✅ Menerima pengingat minum obat
✅ Data kesehatan Anda akan dijaga kerahasiaannya
✅ Dapat berhenti kapan saja dengan ketik "BERHENTI"

Apakah Anda menyetujui persyaratan ini? (YA/TIDAK)`,
      expectedResponse: 'yes_no',
      timeoutMinutes: 20,
      nextStep: 'final_confirmation',
      validation: (response) => this.isAffirmative(response),
      onTimeout: async () => {
        await this.handleVerificationTimeout('terms_acceptance')
      }
    },

    final_confirmation: {
      id: 'final_confirmation',
      name: 'Final Confirmation',
      message: `🎉 *Verifikasi Selesai*

Selamat! Anda telah berhasil diverifikasi.

✅ Anda akan menerima pengingat minum obat
✅ Tim PRIMA akan memantau kesehatan Anda
✅ Hubungi relawan jika ada pertanyaan

Untuk berhenti, ketik: *BERHENTI*

Semoga lekas sembuh! 🙏💙`,
      expectedResponse: 'confirmation',
      timeoutMinutes: 5,
      validation: (response) => true, // Any response is fine here
      onSuccess: async () => {
        await this.completeVerification()
      }
    }
  }

  /**
   * Start verification flow for a patient
   */
  async startVerificationFlow(patientId: string, phoneNumber: string): Promise<VerificationFlow> {
    try {
      // Create verification flow using the flow service
      const flow = await this.verificationFlowService.createVerificationFlow(
        patientId,
        phoneNumber,
        this.STANDARD_VERIFICATION_STEPS
      )

      // Send welcome message
      await this.sendVerificationMessage(flow, 'welcome')

      logger.info('Started verification flow', {
        patientId,
        flowId: flow.id
      })

      return flow
    } catch (error) {
      logger.error('Failed to start verification flow', error as Error, { patientId })
      throw error
    }
  }

  /**
   * Process verification response
   */
  async processVerificationResponse(
    conversationStateId: string,
    message: string
  ): Promise<VerificationResponse> {
    try {
      // Get conversation state
      const conversationState = await this.conversationService.findByPhoneNumber('') // TODO: Get phone from context
      if (!conversationState || conversationState.currentContext !== 'verification') {
        return {
          success: false,
          message: 'No active verification flow found'
        }
      }

      // Get current verification flow
      const flow = await this.verificationFlowService.getVerificationFlow(conversationStateId)
      if (!flow || flow.status !== 'active') {
        return {
          success: false,
          message: 'Verification flow is not active'
        }
      }

      // Check if flow has expired
      if (new Date() > flow.expiresAt) {
        await this.expireVerificationFlow(flow.id)
        return {
          success: false,
          message: 'Verification flow has expired. Please start over.'
        }
      }

      const currentStep = flow.steps[flow.currentStep]
      if (!currentStep) {
        return {
          success: false,
          message: 'Invalid verification step'
        }
      }

      // Validate response
      if (currentStep.validation && !currentStep.validation(message)) {
        // Send clarification message
        await this.sendClarificationMessage(flow, currentStep)
        return {
          success: false,
          message: 'Please respond with YA or TIDAK',
          requiresAction: true
        }
      }

      // Execute step success handler
      if (currentStep.onSuccess) {
        await currentStep.onSuccess(message)
      }

      // Move to next step or complete
      if (currentStep.nextStep) {
        await this.moveToNextStep(flow.id, currentStep.nextStep)
        await this.sendVerificationMessage(flow, currentStep.nextStep)

        return {
          success: true,
          message: 'Moving to next step',
          nextStep: currentStep.nextStep
        }
      } else {
        // Complete verification
        await this.completeVerificationFlow(flow.id)
        return {
          success: true,
          message: 'Verification completed successfully',
          completed: true
        }
      }
    } catch (error) {
      logger.error('Failed to process verification response', error as Error, {
        conversationStateId,
        message
      })
      throw error
    }
  }

  /**
   * Send verification message for a specific step
   */
  private async sendVerificationMessage(flow: VerificationFlow, stepId: string): Promise<void> {
    const step = flow.steps[stepId]
    if (!step) return

    const personalizedMessage = this.personalizeMessage(step.message, flow.metadata)

    try {
      const formattedNumber = formatWhatsAppNumber(flow.metadata.phoneNumber)
      await sendWhatsAppMessage({
        to: formattedNumber,
        body: personalizedMessage
      })

      // Log the message
      await this.conversationService.addMessage(flow.id, {
        message: personalizedMessage,
        direction: 'outbound',
        messageType: 'verification',
        processedAt: new Date()
      })

      logger.info('Sent verification message', {
        flowId: flow.id,
        stepId,
        patientId: flow.patientId
      })
    } catch (error) {
      logger.error('Failed to send verification message', error as Error, {
        flowId: flow.id,
        stepId
      })
      throw error
    }
  }

  /**
   * Personalize message with patient data
   */
  private personalizeMessage(message: string, metadata: Record<string, any>): string {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return metadata[key] || match
    })
  }

  /**
   * Check if response is affirmative
   */
  private isAffirmative(response: string): boolean {
    const affirmativeWords = ['ya', 'iya', 'yes', 'y', 'setuju', 'oke', 'baik', 'mau', 'ingin']
    const normalized = response.toLowerCase().trim()
    return affirmativeWords.some(word => normalized.includes(word))
  }

  /**
   * Send clarification message when response is unclear
   */
  private async sendClarificationMessage(flow: VerificationFlow, step: VerificationStep): Promise<void> {
    await this.sendVerificationMessage(flow, step.id) // Resend original message
  }

  /**
   * Move to next verification step
   */
  private async moveToNextStep(flowId: string, nextStepId: string): Promise<void> {
    await this.conversationService.updateConversationState(flowId, {
      stateData: { currentStep: nextStepId }
    })
  }

  /**
   * Complete verification flow
   */
  private async completeVerificationFlow(flowId: string): Promise<void> {
    // Complete verification flow
    await this.verificationFlowService.completeVerificationFlow(flowId)

    // Get flow to update patient status
    const flow = await this.verificationFlowService.getVerificationFlow(flowId)
    if (flow) {
      await db
        .update(patients)
        .set({
          verificationStatus: 'verified',
          verificationResponseAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(patients.id, flow.patientId))

      // Log verification completion
      await db.insert(verificationLogs).values({
        patientId: flow.patientId,
        action: 'verified',
        verificationResult: 'verified'
      })
    }
  }

  /**
   * Handle verification timeout
   */
  private async handleVerificationTimeout(stepId: string): Promise<void> {
    // TODO: Send timeout message
    logger.info('Verification timeout handled', { stepId })
  }

  /**
   * Expire verification flow
   */
  private async expireVerificationFlow(flowId: string): Promise<void> {
    await this.verificationFlowService.expireVerificationFlow(flowId)
  }

  /**
   * Complete verification (legacy compatibility)
   */
  private async completeVerification(): Promise<void> {
    // This is handled by completeVerificationFlow
    logger.info('Verification completed')
  }


}