/**
 * Safety Filter Service for LLM responses and patient messages
 * Implements content filtering, emergency detection, and escalation
 */

import { logger } from '@/lib/logger'
import { VolunteerNotificationService } from '@/services/notification/volunteer-notification.service'
import { ConversationContext, ProcessedLLMResponse } from './llm.types'

export interface SafetyFilterResult {
  isSafe: boolean
  filteredContent?: string
  violations: SafetyViolation[]
  escalationRequired: boolean
  escalationReason?: string
}

export interface SafetyViolation {
  type: 'medical_advice' | 'diagnosis' | 'emergency' | 'profanity' | 'inappropriate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  matchedText?: string
}

export interface EmergencyDetectionResult {
  isEmergency: boolean
  confidence: number
  indicators: string[]
  recommendedAction: string
}

export class SafetyFilterService {
  private volunteerNotificationService: VolunteerNotificationService

  // Medical advice and diagnosis keywords (Indonesian)
  private readonly medicalAdvicePatterns = [
    /\b(saya sarankan|disarankan|saya rekomendasikan|rekomendasi)\b.*\b(obat|pengobatan|terapi|operasi)\b/i,
    /\b(anda harus|harus|sebaiknya|seharusnya)\b.*\b(minum|konsumsi|gunakan|ambil)\b.*\b(obat|pil|tablet|kapsul)\b/i,
    /\b(diagnosis|diagnosa|penyakit|kondisi)\b.*\b(anda|kamu)\b/i,
    /\b(ini adalah|terdiagnosis|terkena|menderita)\b.*\b(kanker|tumor|penyakit)\b/i,
    /\b(periksa|cek|test|uji)\b.*\b(dokter|rumah sakit|klinik)\b/i,
    /\b(jangan|hindari|stop)\b.*\b(minum|konsumsi)\b.*\b(obat|pil)\b/i
  ]

  // Emergency detection keywords (Indonesian)
  private readonly emergencyPatterns = [
    /\b(darurat|emergency|urgent|mendesak)\b/i,
    /\b(sakit berat|nyeri hebat|sesak napas|susah napas)\b/i,
    /\b(pingsan|pingsan|kehilangan kesadaran|tidak sadar)\b/i,
    /\b(darah|berdarah|banyak darah|pendarahan)\b/i,
    /\b(serangan jantung|stroke|koma|sekarat)\b/i,
    /\b(tolong|bantuan|help|tolong saya)\b.*\b(sekarang|segera|urgent)\b/i,
    /\b(suhu tinggi|demam tinggi|fever)\b.*\b(40|tinggi sekali)\b/i,
    /\b(muntah|muntah darah|diare|dehidrasi)\b.*\b(berat|parah)\b/i
  ]

  // Profanity and inappropriate content (Indonesian)
  private readonly profanityPatterns = [
    /\b(anjing|bangsat|brengsek|jancuk|kontol|memek|ngentot|fuck|shit|bitch|damn|asshole)\b/i,
    /\b(mati|mati saja|bunuh diri|self-harm|suicide)\b/i,
    /\b(teroris|bom|ledak|meledak|ancam|threat)\b/i,
    /\b(narkoba|drugs|meth|heroin|cocaine|marijuana|ganja)\b/i
  ]

  constructor() {
    this.volunteerNotificationService = new VolunteerNotificationService()
  }

  /**
   * Filter LLM response for safety violations
   */
  async filterLLMResponse(
    response: ProcessedLLMResponse,
    context: ConversationContext
  ): Promise<SafetyFilterResult> {
    const violations: SafetyViolation[] = []

    // Check for medical advice
    const medicalViolations = this.detectMedicalAdvice(response.content)
    violations.push(...medicalViolations)

    // Check for inappropriate content
    const profanityViolations = this.detectProfanity(response.content)
    violations.push(...profanityViolations)

    const isSafe = violations.length === 0
    const escalationRequired = violations.some(v => v.severity === 'high' || v.severity === 'critical')

    // Log violations
    if (violations.length > 0) {
      await this.logSafetyViolation({
        type: 'llm_response',
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        content: response.content,
        violations,
        context
      })
    }

    // Escalate if needed
    if (escalationRequired) {
      await this.escalateToVolunteer({
        patientId: context.patientId,
        message: response.content,
        reason: 'llm_response_violation',
        intent: 'safety_violation',
        patientContext: context,
        violations
      })
    }

    return {
      isSafe,
      violations,
      escalationRequired,
      escalationReason: escalationRequired ? 'LLM response contains safety violations' : undefined
    }
  }

  /**
   * Analyze patient message for emergencies and safety concerns
   */
  async analyzePatientMessage(
    message: string,
    context: ConversationContext
  ): Promise<{
    emergencyResult: EmergencyDetectionResult
    safetyResult: SafetyFilterResult
  }> {
    // Detect emergencies
    const emergencyResult = this.detectEmergency(message)

    // Check for inappropriate content
    const violations: SafetyViolation[] = []
    const profanityViolations = this.detectProfanity(message)
    violations.push(...profanityViolations)

    const isSafe = violations.length === 0
    const escalationRequired = emergencyResult.isEmergency ||
                              violations.some(v => v.severity === 'high' || v.severity === 'critical')

    // Log violations
    if (violations.length > 0 || emergencyResult.isEmergency) {
      await this.logSafetyViolation({
        type: 'patient_message',
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        content: message,
        violations,
        emergencyDetected: emergencyResult.isEmergency,
        context
      })
    }

    // Escalate if needed
    if (escalationRequired) {
      const reason = emergencyResult.isEmergency ? 'emergency_detection' : 'inappropriate_content'
      await this.escalateToVolunteer({
        patientId: context.patientId,
        message,
        reason,
        intent: emergencyResult.isEmergency ? 'emergency' : 'inappropriate',
        patientContext: context,
        violations,
        emergencyIndicators: emergencyResult.indicators
      })
    }

    return {
      emergencyResult,
      safetyResult: {
        isSafe,
        violations,
        escalationRequired,
        escalationReason: escalationRequired ?
          (emergencyResult.isEmergency ? 'Emergency detected' : 'Inappropriate content detected') :
          undefined
      }
    }
  }

  /**
   * Detect medical advice or diagnoses in content
   */
  private detectMedicalAdvice(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = []

    for (const pattern of this.medicalAdvicePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        violations.push({
          type: 'medical_advice',
          severity: 'high',
          description: 'LLM response contains medical advice or diagnosis',
          matchedText: matches[0]
        })
      }
    }

    return violations
  }

  /**
   * Detect emergency situations in patient messages
   */
  private detectEmergency(message: string): EmergencyDetectionResult {
    const indicators: string[] = []
    let confidence = 0

    for (const pattern of this.emergencyPatterns) {
      const matches = message.match(pattern)
      if (matches) {
        indicators.push(matches[0])
        confidence += 20 // Each match increases confidence
      }
    }

    // Additional context-based detection
    if (message.toLowerCase().includes('sakit') && message.toLowerCase().includes('sekarang')) {
      indicators.push('sakit sekarang')
      confidence += 15
    }

    if (message.toLowerCase().includes('tolong') && message.length < 50) {
      indicators.push('short urgent message')
      confidence += 25
    }

    const isEmergency = confidence >= 40 // Threshold for emergency

    return {
      isEmergency,
      confidence: Math.min(confidence, 100),
      indicators,
      recommendedAction: isEmergency ?
        'Immediate volunteer notification and potential emergency services contact' :
        'Monitor and respond normally'
    }
  }

  /**
   * Detect profanity and inappropriate content
   */
  private detectProfanity(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = []

    for (const pattern of this.profanityPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        const severity = this.determineProfanitySeverity(matches[0])
        violations.push({
          type: 'profanity',
          severity,
          description: 'Content contains profanity or inappropriate language',
          matchedText: matches[0]
        })
      }
    }

    return violations
  }

  /**
   * Determine severity of profanity
   */
  private determineProfanitySeverity(word: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalWords = ['bunuh diri', 'suicide', 'self-harm', 'teroris', 'bom', 'ancam']
    const highWords = ['ngentot', 'fuck', 'shit', 'bitch', 'asshole', 'memek', 'kontol']
    const mediumWords = ['anjing', 'bangsat', 'brengsek', 'damn']

    const lowerWord = word.toLowerCase()

    if (criticalWords.some(w => lowerWord.includes(w))) return 'critical'
    if (highWords.some(w => lowerWord.includes(w))) return 'high'
    if (mediumWords.some(w => lowerWord.includes(w))) return 'medium'
    return 'low'
  }

  /**
   * Log safety violations for review
   */
  private async logSafetyViolation(data: {
    type: 'llm_response' | 'patient_message'
    patientId: string
    phoneNumber: string
    content: string
    violations: SafetyViolation[]
    emergencyDetected?: boolean
    context: ConversationContext
  }): Promise<void> {
    logger.warn('Safety violation detected', {
      type: data.type,
      patientId: data.patientId,
      phoneNumber: data.phoneNumber,
      violationCount: data.violations.length,
      violations: data.violations.map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description
      })),
      emergencyDetected: data.emergencyDetected,
      contentLength: data.content.length,
      conversationId: data.context.conversationId
    })

    // TODO: Store in database for audit trail
    // This could be added to conversation_messages or a separate safety_log table
  }

  /**
   * Escalate to volunteer notification service
   */
  private async escalateToVolunteer(data: {
    patientId: string
    message: string
    reason: string
    intent?: string
    patientContext: ConversationContext
    violations?: SafetyViolation[]
    emergencyIndicators?: string[]
  }): Promise<void> {
    try {
      await this.volunteerNotificationService.createNotification({
        patientId: data.patientId,
        message: data.message,
        reason: data.reason,
        intent: data.intent,
        patientContext: {
          ...data.patientContext,
          violations: data.violations,
          emergencyIndicators: data.emergencyIndicators
        }
      })

      logger.info('Escalated to volunteer', {
        patientId: data.patientId,
        reason: data.reason,
        intent: data.intent
      })
    } catch (error) {
      logger.error('Failed to escalate to volunteer', error as Error, {
        patientId: data.patientId,
        reason: data.reason
      })
    }
  }

  /**
   * Sanitize content by removing or replacing unsafe elements
   */
  sanitizeContent(content: string, violations: SafetyViolation[]): string {
    let sanitized = content

    for (const violation of violations) {
      if (violation.matchedText) {
        // Replace with placeholder or remove
        const placeholder = `[${violation.type.toUpperCase()} REMOVED]`
        sanitized = sanitized.replace(new RegExp(violation.matchedText, 'gi'), placeholder)
      }
    }

    return sanitized
  }

  /**
   * Get safety statistics for monitoring
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSafetyStats(_timeRange: { start: Date; end: Date }): Promise<{
    totalViolations: number
    emergencyDetections: number
    medicalAdviceViolations: number
    profanityViolations: number
    escalations: number
  }> {
    // TODO: Implement database queries for safety statistics
    // This would query conversation_messages and volunteer_notifications tables

    return {
      totalViolations: 0,
      emergencyDetections: 0,
      medicalAdviceViolations: 0,
      profanityViolations: 0,
      escalations: 0
    }
  }
}

// Export singleton instance
export const safetyFilterService = new SafetyFilterService()