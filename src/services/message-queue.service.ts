/**
 * Message Queue Service for handling messages during outages
 * Uses Redis for reliable message queuing with priority support
 */

import { redis } from '@/lib/redis'
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
  private readonly PENDING_QUEUE = 'prima:messages:pending'
  private readonly PROCESSING_QUEUE = 'prima:messages:processing'
  private readonly FAILED_QUEUE = 'prima:messages:failed'
  private readonly STATS_KEY = 'prima:messages:stats'
  private readonly MAX_RETRY_DELAY = 3600000 // 1 hour
  private readonly BASE_RETRY_DELAY = 30000  // 30 seconds

  /**
   * Add a message to the queue
   */
  async enqueueMessage(message: Omit<QueuedMessage, 'id' | 'retryCount' | 'createdAt'>): Promise<string> {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: this.generateMessageId(),
      retryCount: 0,
      createdAt: new Date()
    }

    const priority = this.getPriorityScore(message.priority)
    const messageData = JSON.stringify(queuedMessage)

    try {
      // Add to sorted set with priority score
      await redis.zadd(this.PENDING_QUEUE, priority, messageData)

      logger.info('Message queued successfully', {
        messageId: queuedMessage.id,
        patientId: message.patientId,
        priority: message.priority,
        messageType: message.messageType
      })

      return queuedMessage.id
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
      // Get the highest priority message (lowest score)
      const result = await redis.zrange(this.PENDING_QUEUE, 0, 0)

      if (!result || result.length === 0) {
        return null
      }

      const messageData = result[0]
      const message: QueuedMessage = JSON.parse(messageData)

      // Move to processing queue
      await redis.zrem(this.PENDING_QUEUE, messageData)
      await redis.zadd(this.PROCESSING_QUEUE, Date.now(), messageData)

      logger.debug('Message dequeued for processing', {
        messageId: message.id,
        patientId: message.patientId,
        priority: message.priority
      })

      return message
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
      // Remove from processing queue
      const processingMessages = await redis.zrange(this.PROCESSING_QUEUE, 0, -1)

      if (processingMessages) {
        for (const messageData of processingMessages) {
          const message: QueuedMessage = JSON.parse(messageData)
          if (message.id === messageId) {
            await redis.zrem(this.PROCESSING_QUEUE, messageData)

            // Update stats
            await this.updateStats('processed')

            logger.info('Message marked as processed', {
              messageId,
              patientId: message.patientId,
              processingTime: Date.now() - message.createdAt.getTime()
            })
            break
          }
        }
      }
    } catch (error) {
      logger.error('Failed to mark message as processed', error as Error, { messageId })
    }
  }

  /**
   * Mark a message as failed and retry if possible
   */
  async markFailed(messageId: string, error: Error, canRetry: boolean = true): Promise<void> {
    try {
      // Find message in processing queue
      const processingMessages = await redis.zrange(this.PROCESSING_QUEUE, 0, -1)
      let message: QueuedMessage | null = null

      if (processingMessages) {
        for (const messageData of processingMessages) {
          const msg: QueuedMessage = JSON.parse(messageData)
          if (msg.id === messageId) {
            message = msg
            await redis.zrem(this.PROCESSING_QUEUE, messageData)
            break
          }
        }
      }

      if (!message) {
        logger.warn('Message not found in processing queue', { messageId })
        return
      }

      if (canRetry && message.retryCount < message.maxRetries) {
        // Schedule for retry with exponential backoff
        const retryDelay = this.calculateRetryDelay(message.retryCount)
        message.retryCount++
        message.nextRetryAt = new Date(Date.now() + retryDelay)
        message.lastError = error.message

        const messageData = JSON.stringify(message)
        const priority = this.getPriorityScore(message.priority)

        await redis.zadd(this.PENDING_QUEUE, priority, messageData)

        logger.info('Message scheduled for retry', {
          messageId,
          patientId: message.patientId,
          retryCount: message.retryCount,
          nextRetryAt: message.nextRetryAt,
          error: error.message
        })
      } else {
        // Move to failed queue
        message.lastError = error.message
        const messageData = JSON.stringify(message)

        await redis.zadd(this.FAILED_QUEUE, Date.now(), messageData)
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
      const [pending, processing, failed] = await Promise.all([
        redis.zcard(this.PENDING_QUEUE) || 0,
        redis.zcard(this.PROCESSING_QUEUE) || 0,
        redis.zcard(this.FAILED_QUEUE) || 0
      ])

      const stats = await redis.hgetall(this.STATS_KEY)
      const totalProcessed = parseInt(stats?.totalProcessed || '0')
      const averageProcessingTime = parseFloat(stats?.averageProcessingTime || '0')

      return {
        pending,
        processing,
        failed,
        totalProcessed,
        averageProcessingTime
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
      const failedMessages = await redis.zrange(this.FAILED_QUEUE, 0, limit - 1)
      let requeuedCount = 0

      if (failedMessages) {
        for (const messageData of failedMessages) {
          const message: QueuedMessage = JSON.parse(messageData)

          // Reset retry count and requeue
          message.retryCount = 0
          message.lastError = undefined
          message.nextRetryAt = undefined

          const newMessageData = JSON.stringify(message)
          const priority = this.getPriorityScore(message.priority)

          await redis.zadd(this.PENDING_QUEUE, priority, newMessageData)
          await redis.zrem(this.FAILED_QUEUE, messageData)

          requeuedCount++
        }
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
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)
      const failedMessages = await redis.zrangebyscore(this.FAILED_QUEUE, '-inf', cutoffTime)

      let cleanedCount = 0
      if (failedMessages) {
        for (const messageData of failedMessages) {
          await redis.zrem(this.FAILED_QUEUE, messageData)
          cleanedCount++
        }
      }

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
      const allQueues = [this.PENDING_QUEUE, this.PROCESSING_QUEUE, this.FAILED_QUEUE]
      const messages: QueuedMessage[] = []

      for (const queue of allQueues) {
        const queueMessages = await redis.zrange(queue, 0, -1)
        if (queueMessages) {
          for (const messageData of queueMessages) {
            const message: QueuedMessage = JSON.parse(messageData)
            if (message.patientId === patientId) {
              messages.push(message)
            }
          }
        }
      }

      return messages
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
      const allQueues = [this.PENDING_QUEUE, this.PROCESSING_QUEUE, this.FAILED_QUEUE]
      let removedCount = 0

      for (const queue of allQueues) {
        const queueMessages = await redis.zrange(queue, 0, -1)
        if (queueMessages) {
          for (const messageData of queueMessages) {
            const message: QueuedMessage = JSON.parse(messageData)
            if (message.patientId === patientId) {
              await redis.zrem(queue, messageData)
              removedCount++
            }
          }
        }
      }

      logger.info('Removed patient messages', { patientId, removedCount })
      return removedCount
    } catch (error) {
      logger.error('Failed to remove patient messages', error as Error, { patientId })
      return 0
    }
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
  private async updateStats(action: 'processed' | 'failed'): Promise<void> {
    try {
      const stats = await redis.hgetall(this.STATS_KEY) || {}
      const totalProcessed = parseInt(stats.totalProcessed || '0') + 1

      if (action === 'processed') {
        await redis.hset(this.STATS_KEY, 'totalProcessed', totalProcessed.toString())
      } else {
        await redis.hset(this.STATS_KEY, 'totalFailed', (parseInt(stats.totalFailed || '0') + 1).toString())
      }
    } catch (error) {
      logger.error('Failed to update queue stats', error as Error)
    }
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService()