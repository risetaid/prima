// AI Intent Classification Service for PRIMA
// Classifies patient messages into intents using Claude AI

import { getAIClient } from './ai-client';
import {
  INTENT_CLASSIFICATION_SYSTEM_PROMPT,
  buildIntentClassificationPrompt
} from './ai-prompts';
import { logger } from '@/lib/logger';
import type {
  AIIntent,
  AIIntentResult,
  AIConfidenceLevel
} from '@/lib/ai-types';

export interface IntentClassificationContext {
  conversationHistory?: string[];
  expectedContext?: 'verification' | 'reminder_confirmation' | 'general';
  recentReminderSent?: boolean;
  patientName?: string;
}

export class AIIntentService {
  private aiClient = getAIClient();
  private enabled: boolean;
  private confidenceThreshold: number;

  constructor() {
    this.enabled = process.env.AI_INTENT_CLASSIFICATION_ENABLED === 'true';
    this.confidenceThreshold = parseInt(
      process.env.AI_CONFIDENCE_THRESHOLD || '70',
      10
    );

    logger.info('AI Intent Service initialized', {
      enabled: this.enabled,
      confidenceThreshold: this.confidenceThreshold,
    });
  }

  /**
   * Classify patient message intent using Claude AI
   */
  async classifyIntent(
    message: string,
    context?: IntentClassificationContext
  ): Promise<AIIntentResult> {
    if (!this.enabled) {
      logger.info('AI intent classification disabled, returning unclear');
      return this.createUnclearResult('AI classification disabled');
    }

    try {
      logger.info('Classifying intent with AI', {
        messageLength: message.length,
        messagePreview: message.substring(0, 50),
        hasContext: Boolean(context),
        expectedContext: context?.expectedContext,
      });

      const startTime = Date.now();

      // Build the classification prompt with context
      const userPrompt = buildIntentClassificationPrompt(message, context);

      // Call Claude API
      const { data, usage } = await this.aiClient.sendStructuredRequest<{
        intent: AIIntent;
        confidence: number;
        reasoning: string;
        extracted_info?: {
          symptoms?: string[];
          medications?: string[];
          urgency?: 'low' | 'medium' | 'high' | 'critical';
          time_reference?: string;
        };
      }>({
        systemPrompt: INTENT_CLASSIFICATION_SYSTEM_PROMPT.system,
        userMessage: userPrompt,
        temperature: 0.3, // Low temperature for consistent classification
      });

      const latencyMs = Date.now() - startTime;

      // Map confidence to level
      const confidenceLevel = this.getConfidenceLevel(data.confidence);

      const result: AIIntentResult = {
        intent: data.intent,
        confidence: data.confidence,
        confidenceLevel,
        reasoning: data.reasoning,
        extractedInfo: data.extracted_info
          ? {
              symptoms: data.extracted_info.symptoms,
              medications: data.extracted_info.medications,
              urgency: data.extracted_info.urgency,
              timeReference: data.extracted_info.time_reference,
            }
          : undefined,
      };

      logger.info('Intent classification complete', {
        intent: result.intent,
        confidence: result.confidence,
        confidenceLevel,
        latencyMs,
        tokensUsed: usage.totalTokens,
        cost: usage.cost.toFixed(6),
        reasoning: result.reasoning.substring(0, 100),
      });

      // Check if confidence meets threshold
      if (result.confidence < this.confidenceThreshold) {
        logger.warn('Intent confidence below threshold', {
          intent: result.intent,
          confidence: result.confidence,
          threshold: this.confidenceThreshold,
        });
        // Return unclear if not confident enough
        return this.createUnclearResult(
          `Low confidence (${result.confidence}%): ${result.reasoning}`
        );
      }

      return result;
    } catch (error) {
      logger.error('Intent classification failed', error as Error, {
        message: message.substring(0, 100),
      });

      // On error, return unclear (will trigger keyword fallback)
      return this.createUnclearResult(
        `Classification error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  /**
   * Classify reminder confirmation (optimized for this specific use case)
   */
  async classifyReminderConfirmation(
    message: string,
    patientName?: string
  ): Promise<AIIntentResult> {
    return this.classifyIntent(message, {
      expectedContext: 'reminder_confirmation',
      patientName,
      recentReminderSent: true,
    });
  }

  /**
   * Classify verification response (optimized for accept/decline)
   */
  async classifyVerificationResponse(
    message: string,
    patientName?: string
  ): Promise<AIIntentResult> {
    return this.classifyIntent(message, {
      expectedContext: 'verification',
      patientName,
    });
  }

  /**
   * Quick check if message indicates emergency
   * Uses keyword detection for speed, can be enhanced with AI later
   */
  isEmergency(message: string): boolean {
    const emergencyKeywords = [
      'darurat',
      'sesak nafas',
      'sesak napas',
      'muntah darah',
      'pusing parah',
      'pingsan',
      'demam tinggi',
      'tolong',
      'emergency',
      'urgent',
      'parah sekali',
      'nyeri dada',
    ];

    const lowerMessage = message.toLowerCase();
    return emergencyKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Get confidence level from numeric confidence score
   */
  private getConfidenceLevel(confidence: number): AIConfidenceLevel {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  /**
   * Create unclear result with reasoning
   */
  private createUnclearResult(reasoning: string): AIIntentResult {
    return {
      intent: 'unclear',
      confidence: 0,
      confidenceLevel: 'low',
      reasoning,
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      confidenceThreshold: this.confidenceThreshold,
      aiClientStats: this.aiClient.getUsageStats(),
    };
  }
}

// Export singleton instance
let aiIntentServiceInstance: AIIntentService | null = null;

export function getAIIntentService(): AIIntentService {
  if (!aiIntentServiceInstance) {
    aiIntentServiceInstance = new AIIntentService();
  }
  return aiIntentServiceInstance;
}

export function resetAIIntentService(): void {
  aiIntentServiceInstance = null;
}
