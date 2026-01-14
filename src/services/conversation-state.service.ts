// Conversation State Service - Manages conversation context and state
// Provides persistence layer for conversation state management

import { db } from '@/db'
import { conversationStates, conversationMessages } from '@/db'
import { eq, and, desc, gte, lt, sql, or } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { generatePhoneAlternatives } from '@/lib/phone-utils'
import { sanitizeForAudit } from '@/lib/phi-mask'

type ConversationStateRow = typeof conversationStates.$inferSelect
type ConversationMessageRow = typeof conversationMessages.$inferSelect

export interface ConversationStateData {
  id: string
  patientId: string
  phoneNumber: string
  currentContext: 'verification' | 'reminder_confirmation' | 'general_inquiry' | 'emergency'
  expectedResponseType?: 'yes_no' | 'confirmation' | 'text' | 'number'
  relatedEntityId?: string
  relatedEntityType?: 'reminder' | 'reminder_log' | 'verification' | 'general'
  stateData?: Record<string, unknown>
  lastMessage?: string
  lastMessageAt?: Date
  messageCount: number
  isActive: boolean
  attemptCount?: number
  contextSetAt?: Date
  lastClarificationSentAt?: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMessageData {
  id: string
  conversationStateId: string
  message: string
  direction: 'inbound' | 'outbound'
  messageType: 'verification' | 'reminder' | 'confirmation' | 'general'
  intent?: string
  confidence?: number
  processedAt?: Date
  createdAt: Date
}

export class ConversationStateService {
  /**
   * Get or create conversation state for a patient
   */
  async getOrCreateConversationState(
    patientId: string,
    phoneNumber: string,
    context: ConversationStateData['currentContext'] = 'general_inquiry'
  ): Promise<ConversationStateData> {
    try {
      // Try to find existing active conversation state
      const existingState = await db
        .select()
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.patientId, patientId),
            eq(conversationStates.isActive, true),
            gte(conversationStates.expiresAt, new Date())
          )
        )
        .orderBy(desc(conversationStates.updatedAt))
        .limit(1)

      if (existingState.length > 0) {
        return this.mapConversationState(existingState[0])
      }

      // Create new conversation state - simplified to 2 hours expiry
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 2) // 2 hours expiry

      const newState = await db
        .insert(conversationStates)
        .values({
          patientId,
          phoneNumber,
          currentContext: context,
          messageCount: 0,
          isActive: true,
          expiresAt,
        })
        .returning()

      logger.info('Created new conversation state', sanitizeForAudit({
        patientId,
        phoneNumber,
        context,
        conversationStateId: newState[0].id
      }))

      return this.mapConversationState(newState[0])
    } catch (error) {
      logger.error('Failed to get/create conversation state', error as Error, sanitizeForAudit({
        patientId,
        phoneNumber
      }))
      throw error
    }
  }

  /**
   * Update conversation state
   */
  async updateConversationState(
    conversationStateId: string,
    updates: Partial<ConversationStateData>
  ): Promise<ConversationStateData> {
    try {
      const updateData: Partial<ConversationStateData> & { updatedAt: Date } = {
        updatedAt: new Date(),
        ...updates
      }

      // Remove undefined values
      const cleanedUpdateData: Record<string, unknown> = {}
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanedUpdateData[key] = value
        }
      })

      const updated = await db
        .update(conversationStates)
        .set(cleanedUpdateData)
        .where(eq(conversationStates.id, conversationStateId))
        .returning()

      if (updated.length === 0) {
        throw new Error(`Conversation state ${conversationStateId} not found`)
      }

      logger.info('Updated conversation state', {
        conversationStateId,
        updates: Object.keys(cleanedUpdateData)
      })

      return this.mapConversationState(updated[0])
    } catch (error) {
      logger.error('Failed to update conversation state', error as Error, {
        conversationStateId,
        updates
      })
      throw error
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationStateId: string,
    message: Omit<ConversationMessageData, 'id' | 'conversationStateId' | 'createdAt'> & {
      llmResponseId?: string;
      llmModel?: string;
      llmTokensUsed?: number;
      llmResponseTimeMs?: number;
      llmCost?: number;
    }
  ): Promise<ConversationMessageData> {
    try {
      // Prepare the insert data with proper type conversions
      const insertData: {
        conversationStateId: string;
        message: string;
        direction: 'inbound' | 'outbound';
        messageType: 'verification' | 'reminder' | 'confirmation' | 'general';
        intent?: string;
        confidence?: number;
        processedAt?: Date;
        llmResponseId?: string;
        llmModel?: string;
        llmTokensUsed?: number;
        llmResponseTimeMs?: number;
        llmCost?: string;
      } = {
        conversationStateId,
        message: message.message,
        direction: message.direction,
        messageType: message.messageType,
        intent: message.intent,
        confidence: message.confidence,
        processedAt: message.processedAt,
        llmResponseId: message.llmResponseId,
        llmModel: message.llmModel,
        llmTokensUsed: message.llmTokensUsed,
        llmResponseTimeMs: message.llmResponseTimeMs,
      }

      // Convert llmCost to string for decimal storage
      if (message.llmCost !== undefined) {
        insertData.llmCost = message.llmCost.toFixed(6);
      }

      const newMessage = await db
        .insert(conversationMessages)
        .values(insertData)
        .returning()

      // Update conversation state message count and last message
      await db
        .update(conversationStates)
        .set({
          messageCount: sql`${conversationStates.messageCount} + 1`,
          lastMessage: message.message,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversationStates.id, conversationStateId))

      logger.info('Added message to conversation', {
        conversationStateId,
        direction: message.direction,
        messageType: message.messageType,
        intent: message.intent
      })

      return this.mapConversationMessage(newMessage[0])
    } catch (error) {
      logger.error('Failed to add message to conversation', error as Error, {
        conversationStateId,
        messageType: message.messageType
      })
      throw error
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationStateId: string,
    limit: number = 50
  ): Promise<ConversationMessageData[]> {
    try {
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationStateId, conversationStateId))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(limit)

      return messages.map(msg => this.mapConversationMessage(msg)).reverse()
    } catch (error) {
      logger.error('Failed to get conversation history', error as Error, {
        conversationStateId
      })
      throw error
    }
  }

  /**
   * Deactivate conversation state
   */
  async deactivateConversationState(conversationStateId: string): Promise<void> {
    try {
      await db
        .update(conversationStates)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(conversationStates.id, conversationStateId))

      logger.info('Deactivated conversation state', { conversationStateId })
    } catch (error) {
      logger.error('Failed to deactivate conversation state', error as Error, {
        conversationStateId
      })
      throw error
    }
  }

  /**
   * Clean up expired conversation states
   */
  async cleanupExpiredStates(): Promise<number> {
    try {
      const result = await db
        .update(conversationStates)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversationStates.isActive, true),
            lt(conversationStates.expiresAt, new Date())
          )
        )
        .returning()

      const cleanedCount = result.length

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired conversation states', { count: cleanedCount })
      }

      return cleanedCount
    } catch (error) {
      logger.error('Failed to cleanup expired conversation states', error as Error)
      throw error
    }
  }

  /**
   * Switch conversation context
   */
  async switchContext(
    conversationStateId: string,
    newContext: ConversationStateData['currentContext'],
    relatedEntityId?: string,
    relatedEntityType?: ConversationStateData['relatedEntityType'],
    stateData?: Record<string, unknown>
  ): Promise<ConversationStateData> {
    try {
      const updates: Partial<ConversationStateData> = {
        currentContext: newContext,
        relatedEntityId,
        relatedEntityType,
        stateData,
        updatedAt: new Date(),
      }

      // Simplified: all contexts expect text responses
      updates.expectedResponseType = 'text';

      // Set new expiration time based on context
      const newExpiresAt = this.calculateExpirationTime()
      updates.expiresAt = newExpiresAt

      const updated = await this.updateConversationState(conversationStateId, updates)

      logger.info('Switched conversation context', {
        conversationStateId,
        oldContext: updated.currentContext,
        newContext,
        relatedEntityId,
        relatedEntityType
      })

      return updated
    } catch (error) {
      logger.error('Failed to switch conversation context', error as Error, {
        conversationStateId,
        newContext
      })
      throw error
    }
  }

  /**
   * Extend conversation timeout
   */
  async extendTimeout(
    conversationStateId: string,
    additionalMinutes: number = 30
  ): Promise<ConversationStateData> {
    try {
      const currentState = await this.getConversationStateById(conversationStateId)
      if (!currentState) {
        throw new Error(`Conversation state ${conversationStateId} not found`)
      }

      const newExpiresAt = new Date(currentState.expiresAt.getTime() + additionalMinutes * 60 * 1000)

      const updated = await this.updateConversationState(conversationStateId, {
        expiresAt: newExpiresAt
      })

      logger.info('Extended conversation timeout', {
        conversationStateId,
        additionalMinutes,
        newExpiresAt
      })

      return updated
    } catch (error) {
      logger.error('Failed to extend conversation timeout', error as Error, {
        conversationStateId,
        additionalMinutes
      })
      throw error
    }
  }

  /**
   * Get conversation state by ID
   */
  async getConversationStateById(conversationStateId: string): Promise<ConversationStateData | null> {
    try {
      const states = await db
        .select()
        .from(conversationStates)
        .where(eq(conversationStates.id, conversationStateId))
        .limit(1)

      if (states.length === 0) {
        return null
      }

      return this.mapConversationState(states[0])
    } catch (error) {
      logger.error('Failed to get conversation state by ID', error as Error, {
        conversationStateId
      })
      throw error
    }
  }

  /**
   * Calculate expiration time - simplified to 2 hours for all contexts
   */
  private calculateExpirationTime(): Date {
    const now = new Date()
    // All conversations expire in 2 hours for consistency
    return new Date(now.getTime() + 2 * 60 * 60 * 1000)
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(patientId: string): Promise<{
    totalConversations: number
    activeConversations: number
    averageMessageCount: number
    totalMessages: number
    contextDistribution: Record<string, number>
  }> {
    try {
      const allStates = await db
        .select()
        .from(conversationStates)
        .where(eq(conversationStates.patientId, patientId))

      const activeStates = allStates.filter(state => state.isActive && state.expiresAt > new Date())

      const contextDistribution: Record<string, number> = {}
      let totalMessages = 0

      for (const state of allStates) {
        const context = state.currentContext || 'unknown'
        contextDistribution[context] = (contextDistribution[context] || 0) + 1
        totalMessages += state.messageCount
      }

      const averageMessageCount = allStates.length > 0 ? totalMessages / allStates.length : 0

      return {
        totalConversations: allStates.length,
        activeConversations: activeStates.length,
        averageMessageCount,
        totalMessages,
        contextDistribution
      }
    } catch (error) {
      logger.error('Failed to get conversation stats', error as Error, sanitizeForAudit({
        patientId
      }))
      throw error
    }
  }

  /**
   * Get active conversation states for a patient
   */
  async getActiveConversationStates(patientId: string): Promise<ConversationStateData[]> {
    try {
      const states = await db
        .select()
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.patientId, patientId),
            eq(conversationStates.isActive, true),
            gte(conversationStates.expiresAt, new Date())
          )
        )
        .orderBy(desc(conversationStates.updatedAt))

      return states.map(state => this.mapConversationState(state))
    } catch (error) {
      logger.error('Failed to get active conversation states', error as Error, sanitizeForAudit({
        patientId
      }))
      throw error
    }
  }

  /**
   * Find conversation state by phone number with normalization
   * Handles Indonesian phone number variations (08xxxxxxxx vs 628xxxxxxxx)
   */
  async findByPhoneNumber(phoneNumber: string): Promise<ConversationStateData | null> {
    try {
      // Generate alternative phone number formats for matching
      const phoneAlternatives = generatePhoneAlternatives(phoneNumber)
      const allPhoneNumbers = [phoneNumber, ...phoneAlternatives]

      logger.debug('Finding conversation state by phone', sanitizeForAudit({
        originalPhone: phoneNumber,
        alternatives: phoneAlternatives,
        totalVariations: allPhoneNumbers.length
      }))

      // Create OR clause for all phone number variations
      const phoneClause = or(
        ...allPhoneNumbers.map(phone => eq(conversationStates.phoneNumber, phone))
      )

      const states = await db
        .select()
        .from(conversationStates)
        .where(
          and(
            phoneClause,
            eq(conversationStates.isActive, true),
            gte(conversationStates.expiresAt, new Date())
          )
        )
        .orderBy(desc(conversationStates.updatedAt))
        .limit(1)

      if (states.length === 0) {
        logger.debug('No conversation state found for phone variations', sanitizeForAudit({
          phoneNumber,
          alternatives: phoneAlternatives
        }))
        return null
      }

      const foundState = this.mapConversationState(states[0])

      logger.info('Conversation state found by phone', sanitizeForAudit({
        phoneNumber,
        matchedPhone: foundState.phoneNumber,
        stateId: foundState.id,
        context: foundState.currentContext
      }))

      return foundState
    } catch (error) {
      logger.error('Failed to find conversation state by phone number', error as Error, sanitizeForAudit({
        phoneNumber
      }))
      throw error
    }
  }

  /**
   * Get recent reminders context for a patient (for medication response detection)
   */
  async getRecentRemindersContext(
    patientId: string,
    hoursBack: number = 24
  ): Promise<{
    hasRecentReminders: boolean;
    recentReminderCount: number;
    lastReminderTime?: Date;
    lastReminderMessage?: string;
  }> {
    try {
      const { reminders } = await import('@/db')
      const { eq, and, gte, desc } = await import('drizzle-orm')

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

      const recentReminders = await db
        .select({
          id: reminders.id,
          message: reminders.message,
          sentAt: reminders.sentAt,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            gte(reminders.sentAt, cutoffTime)
          )
        )
        .orderBy(desc(reminders.sentAt))
        .limit(5)

      const hasRecentReminders = recentReminders.length > 0
      const lastReminder = recentReminders[0]

      return {
        hasRecentReminders,
        recentReminderCount: recentReminders.length,
        lastReminderTime: lastReminder?.sentAt || undefined,
        lastReminderMessage: lastReminder?.message
      }
    } catch (error) {
      logger.error('Failed to get recent reminders context', error as Error, sanitizeForAudit({
        patientId,
        hoursBack
      }))

      // Return default context on error
      return {
        hasRecentReminders: false,
        recentReminderCount: 0
      }
    }
  }

  /**
   * Update conversation state with reminder context
   * This helps understand the medication reminder context
   */
  async updateWithReminderContext(
    conversationStateId: string,
    reminderContext: {
      reminderId?: string
      reminderMessage?: string
      reminderTime?: Date
      isPendingConfirmation?: boolean
    }
  ): Promise<ConversationStateData> {
    try {
      const updates: Partial<ConversationStateData> = {
        stateData: {
          ...reminderContext,
          lastReminderUpdate: new Date().toISOString()
        },
        updatedAt: new Date()
      }

      // Switch to reminder confirmation context if there's a pending reminder
      if (reminderContext.isPendingConfirmation) {
        updates.currentContext = 'reminder_confirmation'
        updates.expectedResponseType = 'confirmation'
        updates.relatedEntityType = 'reminder_log'
        updates.relatedEntityId = reminderContext.reminderId
      }

      const updated = await this.updateConversationState(
        conversationStateId,
        updates
      )

      logger.info('Updated conversation state with reminder context', {
        conversationStateId,
        reminderContext,
        newContext: updates.currentContext
      })

      return updated
    } catch (error) {
      logger.error('Failed to update conversation state with reminder context', error as Error, {
        conversationStateId,
        reminderContext
      })
      throw error
    }
  }

  /**
   * Set verification context when sending verification message
   */
  async setVerificationContext(
    patientId: string,
    phoneNumber: string,
    verificationMessageId: string
  ): Promise<ConversationStateData> {
    const state = await this.getOrCreateConversationState(patientId, phoneNumber, 'verification')

    // Simplified: all contexts expire in 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    return await this.updateConversationState(state.id, {
      currentContext: 'verification',
      expectedResponseType: 'yes_no',
      relatedEntityType: 'verification',
      relatedEntityId: verificationMessageId,
      stateData: {
        verificationMessageId,
        contextSetAt: new Date().toISOString(),
        attemptCount: 0
      },
      contextSetAt: new Date(),
      attemptCount: 0,
      expiresAt
    })
  }

  /**
   * Set reminder confirmation context when sending reminder
   */
  async setReminderConfirmationContext(
    patientId: string,
    phoneNumber: string,
    reminderId: string,
    reminderMessageId: string
  ): Promise<ConversationStateData> {
    const state = await this.getOrCreateConversationState(patientId, phoneNumber, 'reminder_confirmation')

    // Simplified: all contexts expire in 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    return await this.updateConversationState(state.id, {
      currentContext: 'reminder_confirmation',
      expectedResponseType: 'confirmation',
      relatedEntityType: 'reminder',
      relatedEntityId: reminderId,
      stateData: {
        reminderId,
        reminderMessageId,
        contextSetAt: new Date().toISOString(),
        attemptCount: 0
      },
      contextSetAt: new Date(),
      attemptCount: 0,
      expiresAt
    })
  }

  /**
   * Clear context after successful keyword match
   */
  async clearContext(patientId: string): Promise<void> {
    const states = await this.getActiveConversationStates(patientId)

    for (const state of states) {
      await this.updateConversationState(state.id, {
        currentContext: 'general_inquiry',
        expectedResponseType: 'text',
        relatedEntityId: undefined,
        relatedEntityType: undefined,
        stateData: {},
        attemptCount: 0,
        contextSetAt: undefined,
        lastClarificationSentAt: undefined
      })
    }

    logger.info('Context cleared for patient', sanitizeForAudit({ patientId }))
  }

  /**
   * Increment attempt count (for metrics only - no limit enforcement)
   */
  async incrementAttempt(conversationStateId: string): Promise<number> {
    const state = await this.getConversationStateById(conversationStateId)
    if (!state) throw new Error('Conversation state not found')

    const newAttemptCount = (state.attemptCount || 0) + 1

    await this.updateConversationState(conversationStateId, {
      attemptCount: newAttemptCount,
      lastClarificationSentAt: new Date()
    })

    return newAttemptCount
  }

  /**
   * Get active context type for a patient
   */
  async getActiveContext(patientId: string): Promise<'verification' | 'reminder_confirmation' | null> {
    const states = await this.getActiveConversationStates(patientId)

    for (const state of states) {
      if (state.currentContext === 'verification' || state.currentContext === 'reminder_confirmation') {
        return state.currentContext
      }
    }

    return null
  }

  /**
   * Map database row to ConversationStateData
   */
  private mapConversationState(row: ConversationStateRow): ConversationStateData {
    return {
      id: row.id,
      patientId: row.patientId,
      phoneNumber: row.phoneNumber,
      currentContext: row.currentContext as ConversationStateData['currentContext'],
      expectedResponseType: row.expectedResponseType as ConversationStateData['expectedResponseType'] || undefined,
      relatedEntityId: row.relatedEntityId || undefined,
      relatedEntityType: row.relatedEntityType as ConversationStateData['relatedEntityType'] || undefined,
      stateData: row.stateData as Record<string, unknown> || undefined,
      lastMessage: row.lastMessage || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
      messageCount: row.messageCount,
      isActive: row.isActive,
      attemptCount: row.attemptCount || undefined,
      contextSetAt: row.contextSetAt || undefined,
      lastClarificationSentAt: row.lastClarificationSentAt || undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  /**
   * Map database row to ConversationMessageData
   */
  private mapConversationMessage(row: ConversationMessageRow): ConversationMessageData {
    return {
      id: row.id,
      conversationStateId: row.conversationStateId,
      message: row.message,
      direction: row.direction as ConversationMessageData['direction'],
      messageType: row.messageType as ConversationMessageData['messageType'],
      intent: row.intent || undefined,
      confidence: row.confidence || undefined,
      processedAt: row.processedAt || undefined,
      createdAt: row.createdAt,
    }
  }
}

