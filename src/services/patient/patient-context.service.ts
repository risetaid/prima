// Patient Context Service - Comprehensive patient data aggregation with caching
// Provides unified access to patient information, active reminders, and conversation history

import { db } from '@/db'
import { reminderSchedules, conversationMessages } from '@/db'
import { eq, and, gte, desc, isNull, or, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { PatientLookupService } from './patient-lookup.service'
import { ConversationStateService } from '@/services/conversation-state.service'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL, invalidateCache } from '@/lib/cache'
import { generatePhoneAlternatives } from '@/lib/phone-utils'

export interface PatientContext {
  patient: {
    id: string
    name: string
    phoneNumber: string
    verificationStatus: string
    isActive: boolean
    assignedVolunteerId?: string
    cancerStage?: string
    diagnosisDate?: Date
    doctorName?: string
    hospitalName?: string
  }
  activeReminders: Array<{
    id: string
    scheduledTime: string
    frequency: string
    startDate: Date
    endDate?: Date
    customMessage?: string
    createdAt: Date
  }>
  recentConversationHistory: Array<{
    id: string
    message: string
    direction: 'inbound' | 'outbound'
    messageType: string
    createdAt: Date
  }>
  conversationState?: {
    id: string
    currentContext: string
    expectedResponseType?: string
    lastMessage?: string
    lastMessageAt?: Date
    messageCount: number
  }
}

export interface PatientContextResult {
  found: boolean
  context?: PatientContext
  error?: string
  cacheHit?: boolean
}

/**
 * Patient Context Service
 * Aggregates patient data, active reminders, and conversation history with caching
 */
export class PatientContextService {
  private patientLookupService: PatientLookupService
  private conversationStateService: ConversationStateService

  constructor() {
    this.patientLookupService = new PatientLookupService()
    this.conversationStateService = new ConversationStateService()
  }

  /**
   * Get comprehensive patient context by phone number
   * Includes patient info, active reminders, and recent conversation history
   */
  async getPatientContext(phoneNumber: string): Promise<PatientContextResult> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.patient(phoneNumber)
      const cachedContext = await getCachedData<PatientContext>(cacheKey)

      if (cachedContext) {
        logger.info('Patient context cache hit', { phoneNumber })
        return {
          found: true,
          context: cachedContext,
          cacheHit: true
        }
      }

      // Find patient by phone number
      const patientLookup = await this.patientLookupService.findPatientByPhone(phoneNumber)

      if (!patientLookup.found || !patientLookup.patient) {
        logger.info('Patient not found for context lookup', { phoneNumber })
        return {
          found: false
        }
      }

      const patientId = patientLookup.patient.id

      // Get active reminders
      const activeReminders = await this.getActiveReminders(patientId)

      // Get recent conversation history
      const recentHistory = await this.getRecentConversationHistory(patientId)

      // Get current conversation state
      const conversationState = await this.getCurrentConversationState(phoneNumber)

      const context: PatientContext = {
        patient: {
          id: patientLookup.patient.id,
          name: patientLookup.patient.name,
          phoneNumber: patientLookup.patient.phoneNumber,
          verificationStatus: patientLookup.patient.verificationStatus,
          isActive: patientLookup.patient.isActive
        },
        activeReminders,
        recentConversationHistory: recentHistory,
        conversationState
      }

      // Cache the context for future requests
      await setCachedData(cacheKey, context, CACHE_TTL.PATIENT)

      logger.info('Patient context retrieved and cached', {
        patientId,
        phoneNumber,
        activeRemindersCount: activeReminders.length,
        conversationHistoryCount: recentHistory.length
      })

      return {
        found: true,
        context,
        cacheHit: false
      }
    } catch (error) {
      logger.error('Failed to get patient context', error as Error, { phoneNumber })
      return {
        found: false,
        error: 'Database lookup failed'
      }
    }
  }

  /**
   * Get active reminders for a patient
   */
  private async getActiveReminders(patientId: string) {
    try {
      const now = new Date()

      const reminders = await db
        .select({
          id: reminderSchedules.id,
          scheduledTime: reminderSchedules.scheduledTime,
          frequency: reminderSchedules.frequency,
          startDate: reminderSchedules.startDate,
          endDate: reminderSchedules.endDate,
          customMessage: reminderSchedules.customMessage,
          createdAt: reminderSchedules.createdAt
        })
        .from(reminderSchedules)
        .where(
          and(
            eq(reminderSchedules.patientId, patientId),
            eq(reminderSchedules.isActive, true),
            isNull(reminderSchedules.deletedAt),
            gte(reminderSchedules.startDate, now), // Only future or current reminders
            // endDate is null OR endDate >= now
            or(
              isNull(reminderSchedules.endDate),
              gte(reminderSchedules.endDate, now)
            )
          )
        )
        .orderBy(desc(reminderSchedules.createdAt))
        .limit(10) // Limit to prevent excessive data

      // Map to handle null values properly
      return reminders.map(reminder => ({
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        frequency: reminder.frequency,
        startDate: reminder.startDate,
        endDate: reminder.endDate || undefined,
        customMessage: reminder.customMessage || undefined,
        createdAt: reminder.createdAt
      }))
    } catch (error) {
      logger.error('Failed to get active reminders', error as Error, { patientId })
      return []
    }
  }

  /**
   * Get recent conversation history for a patient
   */
  private async getRecentConversationHistory(patientId: string) {
    try {
      // Import conversationStates here to avoid naming conflict
      const { conversationStates } = await import('@/db')

      // Get conversation states for this patient
      const patientConversationStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(eq(conversationStates.patientId, patientId))
        .orderBy(desc(conversationStates.updatedAt))
        .limit(5) // Get last 5 conversation states

      if (patientConversationStates.length === 0) {
        return []
      }

      const stateIds = patientConversationStates.map((state: { id: string }) => state.id)

      // Get recent messages from these conversation states
      const messages = await db
        .select({
          id: conversationMessages.id,
          message: conversationMessages.message,
          direction: conversationMessages.direction,
          messageType: conversationMessages.messageType,
          createdAt: conversationMessages.createdAt
        })
        .from(conversationMessages)
        .where(inArray(conversationMessages.conversationStateId, stateIds))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(20) // Get last 20 messages

      // Map to ensure proper types
      return messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        direction: msg.direction as 'inbound' | 'outbound',
        messageType: msg.messageType,
        createdAt: msg.createdAt
      }))
    } catch (error) {
      logger.error('Failed to get conversation history', error as Error, { patientId })
      return []
    }
  }

  /**
   * Get current conversation state for a phone number
   */
  private async getCurrentConversationState(phoneNumber: string) {
    try {
      const state = await this.conversationStateService.findByPhoneNumber(phoneNumber)

      if (!state) {
        return undefined
      }

      return {
        id: state.id,
        currentContext: state.currentContext,
        expectedResponseType: state.expectedResponseType,
        lastMessage: state.lastMessage,
        lastMessageAt: state.lastMessageAt,
        messageCount: state.messageCount
      }
    } catch (error) {
      logger.error('Failed to get conversation state', error as Error, { phoneNumber })
      return undefined
    }
  }

  /**
   * Invalidate patient context cache
   * Call this when patient data, reminders, or conversations are updated
   */
  async invalidatePatientContext(phoneNumber: string): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.patient(phoneNumber)
      await invalidateCache(cacheKey)

      logger.info('Patient context cache invalidated', { phoneNumber })
    } catch (error) {
      logger.error('Failed to invalidate patient context cache', error as Error, { phoneNumber })
    }
  }

  /**
   * Get patient context with fallback phone number variations
   * Useful when exact phone number match fails
   */
  async getPatientContextWithFallback(phoneNumber: string): Promise<PatientContextResult> {
    // Try exact match first
    const exactResult = await this.getPatientContext(phoneNumber)
    if (exactResult.found) {
      return exactResult
    }

    // Try alternative phone number formats
    const alternatives = generatePhoneAlternatives(phoneNumber)

    for (const altPhone of alternatives) {
      const altResult = await this.getPatientContext(altPhone)
      if (altResult.found) {
        logger.info('Patient context found with alternative phone format', {
          originalPhone: phoneNumber,
          matchedPhone: altPhone
        })
        return altResult
      }
    }

    return {
      found: false
    }
  }

  /**
   * Refresh patient context cache
   * Forces a fresh lookup and updates the cache
   */
  async refreshPatientContext(phoneNumber: string): Promise<PatientContextResult> {
    // Invalidate existing cache
    await this.invalidatePatientContext(phoneNumber)

    // Get fresh context
    return await this.getPatientContext(phoneNumber)
  }
}