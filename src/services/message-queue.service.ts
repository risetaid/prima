/**
 * Message Queue Service for handling messages during outages
 * Uses PostgreSQL for reliable message queuing with priority support
 */

import { db } from '@/db'
import { messageQueue, messageQueueStats, NewMessageQueue } from '@/db/message-queue-schema'
import { eq, and, isNull, or, lt, desc, asc, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export interface QueuedMessage {
  id: string
  patientId: string
  phoneNumber: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  messageType: 'verification' | 'reminder' | 'confirmation' | 'general' | 'emergency'
  conversationId?: string
  retryCount: number
  maxRetries: number
  createdAt: Date
  nextRetryAt?: Date
  lastError?: string
  metadata?: Record<string, unknown>
}

export interface QueueStats {
  pending: number
  processing: number
  failed: number
  totalProcessed: number
  averageProcessingTime: number
}

export class MessageQueueService {
  private readonly MAX_RETRY_DELAY = 3600000 // 1 hour
  private readonly BASE_RETRY_DELAY = 30000  // 30 seconds

  /**
   * Add a message to the queue
   */
  async enqueueMessage(message: Omit<QueuedMessage, 'id' | 'retryCount' | 'createdAt'>): Promise<string> {
    const priorityScore = this.getPriorityScore(message.priority)

    const newMessage: NewMessageQueue = {
      patientId: message.patientId,
      phoneNumber: message.phoneNumber,
      message: message.message,
      priority: message.priority,
      messageType: message.messageType,
      conversationId: message.conversationId,
      status: 'pending',
      retryCount: 0,
      maxRetries: message.maxRetries || 3,
      priorityScore,
      nextRetryAt: undefined,
      lastError: undefined,
      metadata: message.metadata || {},
    }

    try {
      const [insertedMessage] = await db.insert(messageQueue).values(newMessage).returning()

      logger.info('Message queued successfully', {
        messageId: insertedMessage.id,
        patientId: message.patientId,
        priority: message.priority,
        messageType: message.messageType
      })

      return insertedMessage.id
    } catch (error) {
      logger.error('Failed to enqueue message', error as Error, {
        patientId: message.patientId,
        priority: message.priority
      })
      throw error
    }
  }

  /**
   * Dequeue the highest priority message
   */
  async dequeueMessage(): Promise<QueuedMessage | null> {
    try {
      const now = new Date()

      // Get the highest priority message (lowest score) that is ready for processing
      const [result] = await db
        .select()
        .from(messageQueue)
        .where(
          and(
            eq(messageQueue.status, 'pending'),
            or(
              isNull(messageQueue.nextRetryAt),
              lt(messageQueue.nextRetryAt, now)
            )
          )
        )
        .orderBy(asc(messageQueue.priorityScore), asc(messageQueue.createdAt))
        .limit(1)

      if (!result) {
        return null
      }

      // Mark as processing
      await db
        .update(messageQueue)
        .set({
          status: 'processing',
          processedAt: now,
          updatedAt: now
        })
        .where(eq(messageQueue.id, result.id))

      const queuedMessage: QueuedMessage = {
        id: result.id,
        patientId: result.patientId,
        phoneNumber: result.phoneNumber,
        message: result.message,
        priority: result.priority,
        messageType: result.messageType,
        conversationId: result.conversationId || undefined,
        retryCount: result.retryCount,
        maxRetries: result.maxRetries,
        createdAt: result.createdAt,
        nextRetryAt: result.nextRetryAt || undefined,
        lastError: result.lastError || undefined,
        metadata: result.metadata as Record<string, unknown>
      }

      logger.debug('Message dequeued for processing', {
        messageId: queuedMessage.id,
        patientId: queuedMessage.patientId,
        priority: queuedMessage.priority
      })

      return queuedMessage
    } catch (error) {
      logger.error('Failed to dequeue message', error as Error)
      return null
    }
  }

  /**
   * Mark a message as successfully processed
   */
  async markProcessed(messageId: string): Promise<void> {
    try {
      const now = new Date()

      // Get the message first for logging
      const [message] = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.id, messageId))

      if (!message) {
        logger.warn('Message not found for processing', { messageId })
        return
      }

      // Mark as completed
      await db
        .update(messageQueue)
        .set({
          status: 'completed',
          completedAt: now,
          updatedAt: now
        })
        .where(eq(messageQueue.id, messageId))

      // Update stats
      await this.updateStats('processed', message.createdAt, now)

      logger.info('Message marked as processed', {
        messageId,
        patientId: message.patientId,
        processingTime: now.getTime() - message.createdAt.getTime()
      })
    } catch (error) {
      logger.error('Failed to mark message as processed', error as Error, { messageId })
    }
  }

  /**
   * Mark a message as failed and retry if possible
   */
  async markFailed(messageId: string, error: Error, canRetry: boolean = true): Promise<void> {
    try {
      const now = new Date()

      // Get the message first
      const [message] = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.id, messageId))

      if (!message) {
        logger.warn('Message not found in processing queue', { messageId })
        return
      }

      if (canRetry && message.retryCount < message.maxRetries) {
        // Schedule for retry with exponential backoff
        const retryDelay = this.calculateRetryDelay(message.retryCount)
        const nextRetryAt = new Date(now.getTime() + retryDelay)

        await db
          .update(messageQueue)
          .set({
            status: 'pending',
            retryCount: message.retryCount + 1,
            nextRetryAt,
            lastError: error.message,
            updatedAt: now
          })
          .where(eq(messageQueue.id, messageId))

        logger.info('Message scheduled for retry', {
          messageId,
          patientId: message.patientId,
          retryCount: message.retryCount + 1,
          nextRetryAt,
          error: error.message
        })
      } else {
        // Mark as failed
        await db
          .update(messageQueue)
          .set({
            status: 'failed',
            failedAt: now,
            lastError: error.message,
            updatedAt: now
          })
          .where(eq(messageQueue.id, messageId))

        await this.updateStats('failed')

        logger.warn('Message moved to failed queue', {
          messageId,
          patientId: message.patientId,
          retryCount: message.retryCount,
          maxRetries: message.maxRetries,
          error: error.message
        })
      }
    } catch (err) {
      logger.error('Failed to mark message as failed', err as Error, { messageId })
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [stats] = await Promise.all([
        db.select().from(messageQueueStats).limit(1)
      ])

      const [pendingCount, processingCount, failedCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(messageQueue).where(eq(messageQueue.status, 'pending')),
        db.select({ count: sql<number>`count(*)` }).from(messageQueue).where(eq(messageQueue.status, 'processing')),
        db.select({ count: sql<number>`count(*)` }).from(messageQueue).where(eq(messageQueue.status, 'failed'))
      ])

      const queueStats = stats[0] || {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0
      }

      return {
        pending: Number(pendingCount[0]?.count || 0),
        processing: Number(processingCount[0]?.count || 0),
        failed: Number(failedCount[0]?.count || 0),
        totalProcessed: queueStats.totalProcessed,
        averageProcessingTime: queueStats.averageProcessingTime
      }
    } catch (error) {
      logger.error('Failed to get queue stats', error as Error)
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        totalProcessed: 0,
        averageProcessingTime: 0
      }
    }
  }

  /**
   * Requeue failed messages for retry
   */
  async requeueFailedMessages(limit: number = 10): Promise<number> {
    try {
      const failedMessages = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.status, 'failed'))
        .orderBy(desc(messageQueue.failedAt))
        .limit(limit)

      let requeuedCount = 0

      for (const message of failedMessages) {
        await db
          .update(messageQueue)
          .set({
            status: 'pending',
            retryCount: 0,
            nextRetryAt: null,
            lastError: null,
            failedAt: null,
            updatedAt: new Date()
          })
          .where(eq(messageQueue.id, message.id))

        requeuedCount++
      }

      logger.info('Requeued failed messages', { requeuedCount })
      return requeuedCount
    } catch (error) {
      logger.error('Failed to requeue failed messages', error as Error)
      return 0
    }
  }

  /**
   * Clean up old failed messages
   */
  async cleanupFailedMessages(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000))

      const result = await db
        .delete(messageQueue)
        .where(
          and(
            eq(messageQueue.status, 'failed'),
            lt(messageQueue.failedAt, cutoffTime)
          )
        )
        .returning({ id: messageQueue.id })

      const cleanedCount = result.length

      logger.info('Cleaned up old failed messages', { cleanedCount, olderThanHours })
      return cleanedCount
    } catch (error) {
      logger.error('Failed to cleanup failed messages', error as Error)
      return 0
    }
  }

  /**
   * Get messages by patient ID
   */
  async getMessagesByPatient(patientId: string): Promise<QueuedMessage[]> {
    try {
      const messages = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.patientId, patientId))
        .orderBy(desc(messageQueue.createdAt))

      return messages.map(msg => ({
        id: msg.id,
        patientId: msg.patientId,
        phoneNumber: msg.phoneNumber,
        message: msg.message,
        priority: msg.priority,
        messageType: msg.messageType,
        conversationId: msg.conversationId || undefined,
        retryCount: msg.retryCount,
        maxRetries: msg.maxRetries,
        createdAt: msg.createdAt,
        nextRetryAt: msg.nextRetryAt || undefined,
        lastError: msg.lastError || undefined,
        metadata: msg.metadata as Record<string, unknown>
      }))
    } catch (error) {
      logger.error('Failed to get messages by patient', error as Error, { patientId })
      return []
    }
  }

  /**
   * Remove all messages for a patient (e.g., when patient unsubscribes)
   */
  async removePatientMessages(patientId: string): Promise<number> {
    try {
      const result = await db
        .delete(messageQueue)
        .where(eq(messageQueue.patientId, patientId))
        .returning({ id: messageQueue.id })

      const removedCount = result.length

      logger.info('Removed patient messages', { patientId, removedCount })
      return removedCount
    } catch (error) {
      logger.error('Failed to remove patient messages', error as Error, { patientId })
      return 0
    }
  }

  /**
   * Convert priority to numeric score (lower = higher priority)
   */
  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'urgent': return 1
      case 'high': return 2
      case 'medium': return 3
      case 'low': return 4
      default: return 3
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.BASE_RETRY_DELAY * Math.pow(2, retryCount)
    return Math.min(delay, this.MAX_RETRY_DELAY)
  }

  /**
   * Update queue statistics
   */
  private async updateStats(action: 'processed' | 'failed', createdAt?: Date, completedAt?: Date): Promise<void> {
    try {
      const now = new Date()

      if (action === 'processed' && createdAt && completedAt) {
        const processingTime = completedAt.getTime() - createdAt.getTime()

        // Check if stats row exists
        const [existingStats] = await db
          .select()
          .from(messageQueueStats)
          .limit(1)

        if (existingStats) {
          // Update existing stats with weighted average
          const totalProcessed = existingStats.totalProcessed + 1
          const currentAvg = existingStats.averageProcessingTime
          const newAvg = Math.round((currentAvg * existingStats.totalProcessed + processingTime) / totalProcessed)

          await db
            .update(messageQueueStats)
            .set({
              totalProcessed,
              averageProcessingTime: newAvg,
              updatedAt: now
            })
            .where(eq(messageQueueStats.id, existingStats.id))
        } else {
          // Create new stats
          await db
            .insert(messageQueueStats)
            .values({
              totalProcessed: 1,
              totalFailed: 0,
              averageProcessingTime: processingTime,
              lastResetAt: now,
              updatedAt: now
            })
        }
      } else if (action === 'failed') {
        // Update failed count
        const [existingStats] = await db
          .select()
          .from(messageQueueStats)
          .limit(1)

        if (existingStats) {
          await db
            .update(messageQueueStats)
            .set({
              totalFailed: existingStats.totalFailed + 1,
              updatedAt: now
            })
            .where(eq(messageQueueStats.id, existingStats.id))
        } else {
          await db
            .insert(messageQueueStats)
            .values({
              totalProcessed: 0,
              totalFailed: 1,
              averageProcessingTime: 0,
              lastResetAt: now,
              updatedAt: now
            })
        }
      }
    } catch (error) {
      logger.error('Failed to update queue stats', error as Error)
    }
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService()