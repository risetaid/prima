/**
 * LLM Prompt A/B Testing Service
 * Manages A/B testing of different prompt templates with analytics
 */

import { db } from '@/db'
import { 
  llmPromptTests, 
  llmPromptTestVariants, 
  llmPromptTestResults,
  llmPromptMetrics 
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { promptManager } from './prompt-manager.service'
import { 
  LlmPromptTest, 
  LlmPromptTestVariant 
} from '@/db/schema'
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

export class PromptABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(config: TestConfig, createdBy: string): Promise<LlmPromptTest> {
    try {
      logger.info('Creating new A/B test', { 
        name: config.name, 
        category: config.category 
      })

      // Validate variants
      if (config.variants.length < 2) {
        throw new Error('A/B test must have at least 2 variants')
      }

      // Validate traffic split
      const trafficSplit = config.trafficSplit || 50
      if (trafficSplit < 10 || trafficSplit > 90) {
        throw new Error('Traffic split must be between 10 and 90')
      }

      // Create test
      const [test] = await db
        .insert(llmPromptTests)
        .values({
          name: config.name,
          description: config.description,
          category: config.category,
          targetAudience: config.targetAudience,
          sampleSize: config.sampleSize,
          trafficSplit,
          status: 'draft',
          createdBy,
        })
        .returning()

      // Create variants
      for (let i = 0; i < config.variants.length; i++) {
        const variant = config.variants[i]
        const variantLetter = String.fromCharCode(65 + i) as 'A' | 'B' | 'C' | 'D'
        
        // Get template ID
        const template = await promptManager.getTemplate(variant.templateName)
        if (!template) {
          throw new Error(`Template '${variant.templateName}' not found`)
        }

        await db
          .insert(llmPromptTestVariants)
          .values({
            testId: test.id,
            name: variant.name,
            variant: variantLetter,
            promptTemplateId: template.id,
            weight: variant.weight || 1,
          })
      }

      logger.info('A/B test created successfully', { 
        testId: test.id, 
        variantCount: config.variants.length 
      })

      return test
    } catch (error) {
      logger.error('Failed to create A/B test', error as Error, { 
        name: config.name 
      })
      throw error
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    try {
      logger.info('Starting A/B test', { testId })

      const [test] = await db
        .select()
        .from(llmPromptTests)
        .where(eq(llmPromptTests.id, testId))

      if (!test) {
        throw new Error('Test not found')
      }

      if (test.status !== 'draft') {
        throw new Error('Test can only be started from draft status')
      }

      await db
        .update(llmPromptTests)
        .set({
          status: 'active',
          startDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(llmPromptTests.id, testId))

      logger.info('A/B test started successfully', { testId })
    } catch (error) {
      logger.error('Failed to start A/B test', error as Error, { testId })
      throw error
    }
  }

  /**
   * Pause an active A/B test
   */
  async pauseTest(testId: string): Promise<void> {
    try {
      logger.info('Pausing A/B test', { testId })

      await db
        .update(llmPromptTests)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(eq(llmPromptTests.id, testId))

      logger.info('A/B test paused successfully', { testId })
    } catch (error) {
      logger.error('Failed to pause A/B test', error as Error, { testId })
      throw error
    }
  }

  /**
   * Complete an A/B test
   */
  async completeTest(testId: string): Promise<void> {
    try {
      logger.info('Completing A/B test', { testId })

      await db
        .update(llmPromptTests)
        .set({
          status: 'completed',
          endDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(llmPromptTests.id, testId))

      logger.info('A/B test completed successfully', { testId })
    } catch (error) {
      logger.error('Failed to complete A/B test', error as Error, { testId })
      throw error
    }
  }

  /**
   * Get variant for a patient in an active test
   */
  async getVariantForPatient(
    testId: string, 
    patientId: string, 
    context: ConversationContext
  ): Promise<LlmPromptTestVariant | null> {
    try {
      // Check if patient is eligible for test
      const test = await this.getTest(testId)
      if (!test || test.status !== 'active') {
        return null
      }

      if (!this.isPatientEligible(test, patientId, context)) {
        return null
      }

      // Get all variants for the test
      const variants = await db
        .select()
        .from(llmPromptTestVariants)
        .where(eq(llmPromptTestVariants.testId, testId))
        .orderBy(llmPromptTestVariants.variant)

      if (variants.length === 0) {
        return null
      }

      // Simple deterministic selection based on patient ID hash
      const hash = this.hashPatientId(patientId)
      const trafficSplit = test.trafficSplit || 50

      // Select variant based on hash and traffic split
      const selectedVariant = hash < trafficSplit / 100 ? variants[0] : variants[1]

      logger.debug('Selected test variant for patient', {
        testId,
        patientId,
        variant: selectedVariant.variant,
        hash: hash.toFixed(4),
      })

      return selectedVariant
    } catch (error) {
      logger.error('Failed to get variant for patient', error as Error, { 
        testId, 
        patientId 
      })
      return null
    }
  }

  /**
   * Record test result
   */
  async recordResult(result: TestResult): Promise<void> {
    try {
      logger.debug('Recording A/B test result', { 
        testId: result.testId, 
        variantId: result.variantId 
      })

      await db
        .insert(llmPromptTestResults)
        .values({
          testId: result.testId,
          variantId: result.variantId,
          patientId: result.patientId,
          conversationId: result.conversationId,
          request: result.request,
          response: result.response,
          metrics: result.metrics,
          userFeedback: result.userFeedback,
        })

      // Update prompt metrics
      await this.updatePromptMetrics(result)

      logger.debug('A/B test result recorded successfully')
    } catch (error) {
      logger.error('Failed to record A/B test result', error as Error, { 
        testId: result.testId 
      })
      // Don't throw here as this shouldn't break the main flow
    }
  }

  /**
   * Get test analytics
   */
  async getTestAnalytics(testId: string): Promise<TestAnalytics> {
    try {
      logger.info('Getting A/B test analytics', { testId })

      // Get test info
      const test = await this.getTest(testId)
      if (!test) {
        throw new Error('Test not found')
      }

      // Get variants
      const variants = await db
        .select()
        .from(llmPromptTestVariants)
        .where(eq(llmPromptTestVariants.testId, testId))

      // Get results for each variant
      const variantStats = await Promise.all(
        variants.map(async (variant) => {
          const results = await db
            .select()
            .from(llmPromptTestResults)
            .where(eq(llmPromptTestResults.variantId, variant.id))

          const participantCount = results.length
          const successfulResults = results.filter(r => (r.metrics as LlmPromptTestMetrics).success)
          
          const averageResponseTime = participantCount > 0
            ? results.reduce((sum, r) => sum + (r.metrics as LlmPromptTestMetrics).responseTime, 0) / participantCount
            : 0

          const averageTokensUsed = participantCount > 0
            ? results.reduce((sum, r) => sum + (r.metrics as LlmPromptTestMetrics).tokensUsed, 0) / participantCount
            : 0

          const successRate = participantCount > 0
            ? (successfulResults.length / participantCount) * 100
            : 0

          const satisfactionScores = results
            .map(r => (r.userFeedback as UserFeedback | undefined)?.satisfaction)
            .filter(s => s !== undefined) as number[]

          const averageSatisfaction = satisfactionScores.length > 0
            ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length
            : 0

          return {
            variantId: variant.id,
            variantName: variant.name,
            participantCount,
            averageResponseTime: Number(averageResponseTime.toFixed(2)),
            averageTokensUsed: Number(averageTokensUsed.toFixed(2)),
            successRate: Number(successRate.toFixed(2)),
            averageSatisfaction: Number(averageSatisfaction.toFixed(2)),
          }
        })
      )

      // Calculate total participants
      const totalParticipants = variantStats.reduce((sum, stat) => sum + stat.participantCount, 0)

      // Determine winner (simple implementation)
      const winner = this.determineWinner(variantStats)

      // Calculate significance (simplified)
      const significance = this.calculateSignificance(variantStats)

      return {
        testId,
        totalParticipants,
        variantStats,
        winner,
        significance,
      }
    } catch (error) {
      logger.error('Failed to get test analytics', error as Error, { testId })
      throw error
    }
  }

  /**
   * List active tests
   */
  async listActiveTests(): Promise<LlmPromptTest[]> {
    try {
      const tests = await db
        .select()
        .from(llmPromptTests)
        .where(eq(llmPromptTests.status, 'active'))
        .orderBy(desc(llmPromptTests.createdAt))

      return tests
    } catch (error) {
      logger.error('Failed to list active tests', error as Error)
      throw error
    }
  }

  /**
   * Get test by ID
   */
  async getTest(testId: string): Promise<LlmPromptTest | null> {
    try {
      const [test] = await db
        .select()
        .from(llmPromptTests)
        .where(eq(llmPromptTests.id, testId))

      return test || null
    } catch (error) {
      logger.error('Failed to get test', error as Error, { testId })
      throw error
    }
  }

  /**
   * Check if patient is eligible for test
   */
  private isPatientEligible(
    test: LlmPromptTest, 
    patientId: string, 
    context: ConversationContext
  ): boolean {
    const targetAudience = test.targetAudience as Record<string, unknown> || {}

    // Check patient ID whitelist
    if (targetAudience.patientIds && Array.isArray(targetAudience.patientIds)) {
      if (!targetAudience.patientIds.includes(patientId)) {
        return false
      }
    }

    // Check verification status
    if (targetAudience.verificationStatuses && Array.isArray(targetAudience.verificationStatuses)) {
      const verificationStatus = context.patientInfo?.verificationStatus
      if (!verificationStatus || !targetAudience.verificationStatuses.includes(verificationStatus)) {
        return false
      }
    }

    // Check active reminders range
    if (targetAudience.activeRemindersRange && Array.isArray(targetAudience.activeRemindersRange)) {
      const [min, max] = targetAudience.activeRemindersRange as [number, number]
      const reminderCount = context.patientInfo?.activeReminders?.length || 0
      if (reminderCount < min || reminderCount > max) {
        return false
      }
    }

    // Check sample size limit
    if (test.sampleSize) {
      // This would require checking current participant count
      // For now, we'll assume it's handled elsewhere
    }

    return true
  }

  /**
   * Hash patient ID for deterministic selection
   */
  private hashPatientId(patientId: string): number {
    // Simple hash function - in production, use a proper cryptographic hash
    let hash = 0
    for (let i = 0; i < patientId.length; i++) {
      const char = patientId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  /**
   * Update prompt metrics
   */
  private async updatePromptMetrics(result: TestResult): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // Get variant to find template ID
      const [variant] = await db
        .select()
        .from(llmPromptTestVariants)
        .where(eq(llmPromptTestVariants.id, result.variantId))

      if (!variant) return

      // Check if metrics exist for today
      const [existingMetrics] = await db
        .select()
        .from(llmPromptMetrics)
        .where(
          and(
            eq(llmPromptMetrics.promptTemplateId, variant.promptTemplateId),
            eq(llmPromptMetrics.date, today)
          )
        )

      if (existingMetrics) {
        // Update existing metrics
        await db
          .update(llmPromptMetrics)
          .set({
            totalRequests: sql`${llmPromptMetrics.totalRequests} + 1`,
            successfulResponses: sql`${llmPromptMetrics.successfulResponses} + ${result.metrics.success ? 1 : 0}`,
            failedResponses: sql`${llmPromptMetrics.failedResponses} + ${result.metrics.success ? 0 : 1}`,
            totalTokensUsed: sql`${llmPromptMetrics.totalTokensUsed} + ${result.metrics.tokensUsed}`,
            userSatisfaction: result.userFeedback?.satisfaction,
          })
          .where(eq(llmPromptMetrics.id, existingMetrics.id))
      } else {
        // Create new metrics
        await db
          .insert(llmPromptMetrics)
          .values({
            promptTemplateId: variant.promptTemplateId,
            date: today,
            totalRequests: 1,
            successfulResponses: result.metrics.success ? 1 : 0,
            failedResponses: result.metrics.success ? 0 : 1,
            averageResponseTime: result.metrics.responseTime,
            averageTokensUsed: result.metrics.tokensUsed,
            totalTokensUsed: result.metrics.tokensUsed,
            userSatisfaction: result.userFeedback?.satisfaction,
          })
      }
    } catch (error) {
      logger.error('Failed to update prompt metrics', error as Error)
      // Don't throw here as this is not critical
    }
  }

  /**
   * Determine winner from variant stats
   */
  private determineWinner(variantStats: TestAnalytics['variantStats']): TestAnalytics['winner'] {
    if (variantStats.length < 2) {
      return undefined
    }

    // Simple winner determination based on success rate and satisfaction
    const sorted = [...variantStats].sort((a, b) => {
      const scoreA = a.successRate * 0.7 + a.averageSatisfaction * 0.3
      const scoreB = b.successRate * 0.7 + b.averageSatisfaction * 0.3
      return scoreB - scoreA
    })

    const winner = sorted[0]
    const runnerUp = sorted[1]

    if (winner.participantCount < 10) {
      return undefined // Not enough data
    }

    const confidence = Math.min(95, (winner.participantCount / 100) * 100)
    const reason = `Higher success rate (${winner.successRate}% vs ${runnerUp.successRate}%) and satisfaction (${winner.averageSatisfaction.toFixed(1)} vs ${runnerUp.averageSatisfaction.toFixed(1)})`

    return {
      variantId: winner.variantId,
      confidence,
      reason,
    }
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateSignificance(variantStats: TestAnalytics['variantStats']): number {
    if (variantStats.length < 2) {
      return 0
    }

    // Simplified significance calculation
    // In production, use proper statistical tests like chi-square or t-test
    const totalParticipants = variantStats.reduce((sum, stat) => sum + stat.participantCount, 0)
    
    if (totalParticipants < 30) {
      return 0 // Not enough data for significance
    }

    // Basic heuristic based on sample size and performance difference
    const maxParticipants = Math.max(...variantStats.map(s => s.participantCount))
    const significance = Math.min(95, (maxParticipants / totalParticipants) * 100)

    return Number(significance.toFixed(2))
  }
}

// Export singleton instance
export const promptABTestingService = new PromptABTestingService()