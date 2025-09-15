// Verification Flow Service - Manages verification flows and their persistence
// Handles storage and retrieval of multi-step verification processes

import { db } from '@/db'
import { patients } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { ConversationStateService } from '@/services/conversation-state.service'

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
  metadata: Record<string, unknown>
}

export class VerificationFlowService {
  private conversationService: ConversationStateService

  constructor() {
    this.conversationService = new ConversationStateService()
  }

  /**
   * Create a new verification flow
   */
  async createVerificationFlow(
    patientId: string,
    phoneNumber: string,
    steps: Record<string, VerificationStep>
  ): Promise<VerificationFlow> {
    try {
      // Get patient info
      const patient = await db
        .select({ name: patients.name })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1)

      if (!patient.length) {
        throw new Error(`Patient ${patientId} not found`)
      }

      // Create conversation state
      const conversationState = await this.conversationService.getOrCreateConversationState(
        patientId,
        phoneNumber,
        'verification'
      )

      // Create verification flow
      const flow: VerificationFlow = {
        id: conversationState.id,
        patientId,
        currentStep: 'welcome',
        steps,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        status: 'active',
        metadata: {
          patientName: patient[0].name,
          phoneNumber
        }
      }

      // Store flow data in conversation state
      await this.conversationService.updateConversationState(conversationState.id, {
        stateData: {
          verificationFlow: flow,
          currentStep: 'welcome'
        }
      })

      logger.info('Created verification flow', {
        flowId: flow.id,
        patientId,
        conversationStateId: conversationState.id
      })

      return flow
    } catch (error) {
      logger.error('Failed to create verification flow', error as Error, { patientId })
      throw error
    }
  }

  /**
   * Get verification flow by ID
   */
  async getVerificationFlow(flowId: string): Promise<VerificationFlow | null> {
    try {
      const conversationState = await this.conversationService.findByPhoneNumber('') // TODO: Get phone from context

      if (!conversationState || conversationState.currentContext !== 'verification') {
        return null
      }

      const flowData = conversationState.stateData?.verificationFlow
      if (!flowData) {
        return null
      }

      return flowData as VerificationFlow
    } catch (error) {
      logger.error('Failed to get verification flow', error as Error, { flowId })
      return null
    }
  }

  /**
   * Update verification flow
   */
  async updateVerificationFlow(
    flowId: string,
    updates: Partial<VerificationFlow>
  ): Promise<VerificationFlow | null> {
    try {
      const currentFlow = await this.getVerificationFlow(flowId)
      if (!currentFlow) {
        return null
      }

      const updatedFlow = { ...currentFlow, ...updates }

      // Update conversation state
      await this.conversationService.updateConversationState(flowId, {
        stateData: {
          verificationFlow: updatedFlow,
          currentStep: updatedFlow.currentStep
        }
      })

      logger.info('Updated verification flow', {
        flowId,
        updates: Object.keys(updates)
      })

      return updatedFlow
    } catch (error) {
      logger.error('Failed to update verification flow', error as Error, {
        flowId,
        updates
      })
      throw error
    }
  }

  /**
   * Complete verification flow
   */
  async completeVerificationFlow(flowId: string): Promise<void> {
    try {
      await this.updateVerificationFlow(flowId, {
        status: 'completed',
        completedAt: new Date()
      })

      // Update conversation state to general inquiry
      await this.conversationService.updateConversationState(flowId, {
        currentContext: 'general_inquiry',
        stateData: { verificationCompleted: true }
      })

      logger.info('Completed verification flow', { flowId })
    } catch (error) {
      logger.error('Failed to complete verification flow', error as Error, { flowId })
      throw error
    }
  }

  /**
   * Expire verification flow
   */
  async expireVerificationFlow(flowId: string): Promise<void> {
    try {
      await this.updateVerificationFlow(flowId, {
        status: 'expired'
      })

      // Deactivate conversation state
      await this.conversationService.deactivateConversationState(flowId)

      logger.info('Expired verification flow', { flowId })
    } catch (error) {
      logger.error('Failed to expire verification flow', error as Error, { flowId })
      throw error
    }
  }

  /**
   * Fail verification flow
   */
  async failVerificationFlow(flowId: string, reason?: string): Promise<void> {
    try {
      await this.updateVerificationFlow(flowId, {
        status: 'failed',
        metadata: { failureReason: reason }
      })

      logger.info('Failed verification flow', { flowId, reason })
    } catch (error) {
      logger.error('Failed to mark verification flow as failed', error as Error, {
        flowId,
        reason
      })
      throw error
    }
  }

  /**
   * Get active verification flows for a patient
   */
  async getActiveVerificationFlows(patientId: string): Promise<VerificationFlow[]> {
    try {
      const conversationStates = await this.conversationService.getActiveConversationStates(patientId)

      const flows: VerificationFlow[] = []
      for (const state of conversationStates) {
        if (state.currentContext === 'verification' && state.stateData?.verificationFlow) {
          flows.push(state.stateData.verificationFlow as VerificationFlow)
        }
      }

      return flows
    } catch (error) {
      logger.error('Failed to get active verification flows', error as Error, { patientId })
      throw error
    }
  }

  /**
   * Clean up expired verification flows
   */
  async cleanupExpiredFlows(): Promise<number> {
    try {
      const cleanedCount = await this.conversationService.cleanupExpiredStates()

      logger.info('Cleaned up expired verification flows', { count: cleanedCount })
      return cleanedCount
    } catch (error) {
      logger.error('Failed to cleanup expired verification flows', error as Error)
      throw error
    }
  }
}