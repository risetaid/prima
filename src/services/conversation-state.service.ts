// Conversation State Service - Manages conversation context and state
// Provides persistence layer for conversation state management

import { db } from '@/db'
import { conversationStates, conversationMessages } from '@/db'
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

type ConversationStateRow = typeof conversationStates.$inferSelect
type ConversationMessageRow = typeof conversationMessages.$inferSelect

export interface ConversationStateData {
  id: string
  patientId: string
  phoneNumber: string
  currentContext: 'verification' | 'reminder_confirmation' | 'general_inquiry' | 'emergency'
  expectedResponseType?: 'yes_no' | 'confirmation' | 'text' | 'number'
  relatedEntityId?: string
  relatedEntityType?: 'reminder_log' | 'verification' | 'general'
   stateData?: Record<string, unknown>
  lastMessage?: string
  lastMessageAt?: Date
  messageCount: number
  isActive: boolean
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

      // Create new conversation state
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

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

      logger.info('Created new conversation state', {
        patientId,
        phoneNumber,
        context,
        conversationStateId: newState[0].id
      })

      return this.mapConversationState(newState[0])
    } catch (error) {
      logger.error('Failed to get/create conversation state', error as Error, {
        patientId,
        phoneNumber
      })
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
    message: Omit<ConversationMessageData, 'id' | 'conversationStateId' | 'createdAt'>
  ): Promise<ConversationMessageData> {
    try {
      const newMessage = await db
        .insert(conversationMessages)
        .values({
          conversationStateId,
          ...message,
        })
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
      logger.error('Failed to get active conversation states', error as Error, {
        patientId
      })
      throw error
    }
  }

  /**
   * Find conversation state by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<ConversationStateData | null> {
    try {
      const states = await db
        .select()
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.phoneNumber, phoneNumber),
            eq(conversationStates.isActive, true),
            gte(conversationStates.expiresAt, new Date())
          )
        )
        .orderBy(desc(conversationStates.updatedAt))
        .limit(1)

      if (states.length === 0) {
        return null
      }

      return this.mapConversationState(states[0])
    } catch (error) {
      logger.error('Failed to find conversation state by phone number', error as Error, {
        phoneNumber
      })
      throw error
    }
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

