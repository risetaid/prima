import { VolunteerNotificationService, EscalationData } from '@/services/notification/volunteer-notification.service';
import { logger } from '@/lib/logger';

export interface MessageAnalysis {
  intent: string;
  confidence: number;
  isEmergency: boolean;
  isComplex: boolean;
  requiresHuman: boolean;
}

export class EscalationService {
  private notificationService: VolunteerNotificationService;

  constructor() {
    this.notificationService = new VolunteerNotificationService();
  }

  /**
   * Analyze message and determine if escalation is needed
   */
  async analyzeMessage(
    patientId: string,
    message: string,
    analysis: MessageAnalysis
  ): Promise<void> {
    const escalationReasons = this.determineEscalationReasons(analysis);

    for (const reason of escalationReasons) {
      await this.escalateMessage({
        patientId,
        message,
        reason,
        confidence: analysis.confidence,
        intent: analysis.intent,
        patientContext: {
          intent: analysis.intent,
          confidence: analysis.confidence,
          isEmergency: analysis.isEmergency,
          isComplex: analysis.isComplex,
          requiresHuman: analysis.requiresHuman
        },
      });
    }
  }

  /**
   * Determine escalation reasons based on message analysis
   */
  private determineEscalationReasons(analysis: MessageAnalysis): string[] {
    const reasons: string[] = [];

    // Emergency detection
    if (analysis.isEmergency) {
      reasons.push('emergency_detection');
    }

    // Low confidence responses
    if (analysis.confidence < 60) {
      reasons.push('low_confidence');
    }

    // Complex inquiries
    if (analysis.isComplex || analysis.requiresHuman) {
      reasons.push('complex_inquiry');
    }

    return reasons;
  }

  /**
   * Escalate message to volunteer notification system
   */
  private async escalateMessage(data: EscalationData): Promise<void> {
    try {
      await this.notificationService.createNotification(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create volunteer notification', err, {
        escalation: true,
        patientId: data.patientId,
        reason: data.reason,
      });
      // Re-throw to allow caller to handle critical escalation failures
      throw err;
    }
  }

  /**
   * Check for emergency keywords in message
   */
  static detectEmergencyKeywords(message: string): boolean {
    const emergencyKeywords = [
      'darurat', 'emergency', 'sakit parah', 'sesak napas', 'jantung',
      'stroke', 'pendarahan', 'kecelakaan', 'tolong', 'bantuan segera',
      'nyeri dada', 'pingsan', 'kejang', 'alergi parah', 'overdosis'
    ];

    const lowerMessage = message.toLowerCase();
    return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if message is complex inquiry
   */
  static isComplexInquiry(message: string, intent?: string): boolean {
    // Complex intents that require human intervention
    const complexIntents = [
      'medical_advice', 'prescription_request', 'symptom_analysis',
      'treatment_question', 'side_effects', 'drug_interaction',
      'appointment_request', 'complaint', 'feedback'
    ];

    if (intent && complexIntents.includes(intent)) {
      return true;
    }

    // Check message length and complexity
    const words = message.split(' ').length;
    const hasMedicalTerms = /\b(dokter|obat|penyakit|gejala|diagnosis|pengobatan)\b/i.test(message);

    return words > 20 || hasMedicalTerms;
  }

  /**
   * Analyze message content for escalation triggers
   */
  static analyzeMessageContent(message: string): MessageAnalysis {
    const isEmergency = this.detectEmergencyKeywords(message);
    const isComplex = this.isComplexInquiry(message);

    // Simple confidence calculation based on message characteristics
    let confidence = 80; // Default confidence

    if (isEmergency) confidence -= 20;
    if (isComplex) confidence -= 15;
    if (message.length < 10) confidence -= 10;
    if (message.includes('?')) confidence += 5; // Questions might be clearer

    return {
      intent: 'unknown', // Would be determined by LLM
      confidence: Math.max(0, Math.min(100, confidence)),
      isEmergency,
      isComplex,
      requiresHuman: isEmergency || isComplex || confidence < 50,
    };
  }
}