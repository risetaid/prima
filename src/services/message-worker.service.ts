/**
 * Background worker service for processing queued messages
 * Handles messages that were queued during LLM outages
 */

import { logger } from '@/lib/logger'
import { messageQueueService, QueuedMessage } from './message-queue.service'
import { llmService } from './llm/llm.service'
import { WhatsAppService } from './whatsapp/whatsapp.service'
import { ConversationStateService } from './conversation-state.service'
import { PatientContextService } from './patient/patient-context.service'

export class MessageWorkerService {
  private isRunning: boolean = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly PROCESSING_INTERVAL_MS = 5000 // Check every 5 seconds
  private readonly MAX_CONCURRENT_PROCESSING = 5

  private whatsAppService: WhatsAppService
  private conversationStateService: ConversationStateService
  private patientContextService: PatientContextService

  constructor() {
    this.whatsAppService = new WhatsAppService()
    this.conversationStateService = new ConversationStateService()
    this.patientContextService = new PatientContextService()
  }

  /**
   * Start the background worker
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Message worker is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting message worker service')

    this.processingInterval = setInterval(async () => {
      await this.processQueuedMessages()
    }, this.PROCESSING_INTERVAL_MS)
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    logger.info('Stopped message worker service')
  }

  /**
   * Process queued messages
   */
  private async processQueuedMessages(): Promise<void> {
    if (!this.isRunning) return

    try {
      const stats = await messageQueueService.getQueueStats()

      if (stats.pending === 0) {
        return // No messages to process
      }

      logger.debug('Processing queued messages', { pending: stats.pending })

      // Process messages concurrently but with limit
      const promises: Promise<void>[] = []

      for (let i = 0; i < Math.min(this.MAX_CONCURRENT_PROCESSING, stats.pending); i++) {
        promises.push(this.processNextMessage())
      }

      await Promise.allSettled(promises)

    } catch (error) {
      logger.error('Error in message processing loop', error as Error)
    }
  }

  /**
   * Process the next message from the queue
   */
  private async processNextMessage(): Promise<void> {
    try {
      const message = await messageQueueService.dequeueMessage()

      if (!message) {
        return // No message available
      }

      logger.info('Processing queued message', {
        messageId: message.id,
        patientId: message.patientId,
        priority: message.priority,
        retryCount: message.retryCount
      })

      await this.processMessage(message)

      // Mark as processed
      await messageQueueService.markProcessed(message.id)

    } catch (error) {
      logger.error('Failed to process queued message', error as Error)

      // The message will remain in processing queue and can be retried later
      // In a production system, you might want to implement dead letter queues
    }
  }

  /**
   * Process a single queued message
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    try {
      // Get patient context
      const patientContext = await this.patientContextService.getPatientContext(message.phoneNumber)

      if (!patientContext.found) {
        logger.warn('Patient not found for queued message', {
          messageId: message.id,
          phoneNumber: message.phoneNumber
        })
        return
      }

      // Get conversation history
      const conversationState = await this.conversationStateService.findByPhoneNumber(message.phoneNumber)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let conversationHistory: any[] = []

      if (conversationState) {
        conversationHistory = await this.conversationStateService.getConversationHistory(
          conversationState.id,
          10
        )
      }

      // Build conversation context for LLM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const llmContext: any = {
        patientId: message.patientId,
        phoneNumber: message.phoneNumber,
        conversationId: conversationState?.id,
        previousMessages: conversationHistory.map((msg) => ({
          role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant' | 'system',
          content: msg.message
        })),
        patientInfo: patientContext.context ? {
          name: patientContext.context.patient.name,
          verificationStatus: patientContext.context.patient.verificationStatus,
          activeReminders: patientContext.context.activeReminders
        } : undefined
      }

      // Detect intent using LLM
      const intentResult = await llmService.detectIntent(message.message, llmContext)

      // Generate response
      const response = await llmService.generatePatientResponse(
        intentResult.intent,
        llmContext,
        `Queued message processed at ${new Date().toISOString()}`
      )

      // Send response via WhatsApp
      await this.whatsAppService.send(message.phoneNumber, response.content)

      // Update conversation state
      if (conversationState) {
        await this.conversationStateService.addMessage(conversationState.id, {
          message: response.content,
          direction: 'outbound',
          messageType: 'general',
          intent: intentResult.intent,
          confidence: Math.round(intentResult.confidence * 100),
          processedAt: new Date()
        })
      }

      logger.info('Queued message processed successfully', {
        messageId: message.id,
        patientId: message.patientId,
        intent: intentResult.intent,
        responseLength: response.content.length
      })

    } catch (error) {
      const err = error as Error

      logger.error('Failed to process queued message', err, {
        messageId: message.id,
        patientId: message.patientId,
        retryCount: message.retryCount
      })

      // Mark as failed - this will retry if possible
      await messageQueueService.markFailed(message.id, err, true)
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean
    processingInterval: number
    maxConcurrent: number
  } {
    return {
      isRunning: this.isRunning,
      processingInterval: this.PROCESSING_INTERVAL_MS,
      maxConcurrent: this.MAX_CONCURRENT_PROCESSING
    }
  }

  /**
   * Manually trigger processing of queued messages
   */
  async processNow(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Message worker is not running')
      return
    }

    logger.info('Manually triggering message processing')
    await this.processQueuedMessages()
  }
}

// Export singleton instance
export const messageWorkerService = new MessageWorkerService()