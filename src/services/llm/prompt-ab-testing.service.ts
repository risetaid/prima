/**
 * LLM Prompt A/B Testing Service
 * Manages A/B testing of different prompt templates with analytics
 *
 * NOTE: This service is currently disabled as the required database tables
 * (llmPromptTests, llmPromptTestVariants, llmPromptTestResults, llmPromptMetrics)
 * are not present in the current schema. This is a placeholder for future implementation.
 */

import { logger } from '@/lib/logger'
import { ConversationContext } from './llm.types'

export interface TestConfig {
  name: string
  description?: string
  category: string
  targetAudience?: {
    patientIds?: string[]
    verificationStatuses?: string[]
    activeRemindersRange?: [number, number]
  }
  sampleSize?: number
  trafficSplit?: number // Percentage for variant A (50 = 50/50 split)
  variants: {
    name: string
    templateName: string
    weight?: number
  }[]
}

export interface TestResult {
  testId: string
  variantId: string
  patientId: string
  conversationId?: string
  request: Record<string, unknown>
  response: Record<string, unknown>
  metrics: {
    responseTime: number
    tokensUsed: number
    success: boolean
    confidence?: number
  }
  userFeedback?: {
    satisfaction?: number // 1-5 scale
    helpful?: boolean
    comments?: string
  }
}

// Interface for LLM prompt test result metrics
export interface LlmPromptTestMetrics {
  responseTime: number
  tokensUsed: number
  success: boolean
  confidence?: number
}

// Interface for user feedback
export interface UserFeedback {
  satisfaction?: number // 1-5 scale
  helpful?: boolean
  comments?: string
}

export interface TestAnalytics {
  testId: string
  totalParticipants: number
  variantStats: Array<{
    variantId: string
    variantName: string
    participantCount: number
    averageResponseTime: number
    averageTokensUsed: number
    successRate: number
    averageSatisfaction: number
    conversionRate?: number
  }>
  winner?: {
    variantId: string
    confidence: number
    reason: string
  }
  significance: number
}

// Stub types for disabled functionality
export interface LlmPromptTest {
  id: string
  name: string
  description?: string
  category: string
  targetAudience?: Record<string, unknown>
  sampleSize?: number
  trafficSplit?: number
  status: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  startDate?: Date
  endDate?: Date
}

export interface LlmPromptTestVariant {
  id: string
  testId: string
  name: string
  variant: string
  promptTemplateId: string
  weight: number
}

// Stub implementation - A/B testing functionality disabled
/* eslint-disable @typescript-eslint/no-unused-vars */
export class PromptABTestingService {
  /**
   * Create a new A/B test - DISABLED
   */
  async createTest(_config: TestConfig, _createdBy: string): Promise<never> {
    throw new Error('A/B testing functionality is currently disabled - required database tables not available')
  }

  /**
   * Start an A/B test - DISABLED
   */
  async startTest(_testId: string): Promise<void> {
    throw new Error('A/B testing functionality is currently disabled - required database tables not available')
  }

  /**
   * Pause an A/B test - DISABLED
   */
  async pauseTest(_testId: string): Promise<void> {
    throw new Error('A/B testing functionality is currently disabled - required database tables not available')
  }

  /**
   * Complete an A/B test - DISABLED
   */
  async completeTest(_testId: string): Promise<void> {
    throw new Error('A/B testing functionality is currently disabled - required database tables not available')
  }

  /**
   * Get variant for a patient - DISABLED
   */
  async getVariantForPatient(
    _testId: string,
    _patientId: string,
    _context: ConversationContext
  ): Promise<null> {
    logger.warn('A/B testing functionality is currently disabled - returning null')
    return null
  }

  /**
   * Record test result - DISABLED
   */
  async recordResult(_result: TestResult): Promise<void> {
    logger.warn('A/B testing functionality is currently disabled - result not recorded')
  }

  /**
   * Get test analytics - DISABLED
   */
  async getTestAnalytics(_testId: string): Promise<never> {
    throw new Error('A/B testing functionality is currently disabled - required database tables not available')
  }

  /**
   * List active tests - DISABLED
   */
  async listActiveTests(): Promise<never[]> {
    logger.warn('A/B testing functionality is currently disabled - returning empty array')
    return []
  }

  /**
   * Get test by ID - DISABLED
   */
  async getTest(_testId: string): Promise<null> {
    logger.warn('A/B testing functionality is currently disabled - returning null')
    return null
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Export singleton instance
export const promptABTestingService = new PromptABTestingService()
