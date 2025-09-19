/**
 * Simplified Safety Filter Service for LLM responses and patient messages
 * Focuses on essential safety: emergency detection and medical advice prevention
 */

import { logger } from "@/lib/logger";
import { VolunteerNotificationService } from "@/services/notification/volunteer-notification.service";
import { ConversationContext, ProcessedLLMResponse } from "./llm.types";

export interface SafetyFilterResult {
  isSafe: boolean;
  violations: SafetyViolation[];
  escalationRequired: boolean;
  escalationReason?: string;
}

export interface SafetyViolation {
  type: "medical_advice" | "emergency" | "profanity";
  severity: "medium" | "high" | "critical";
  description: string;
  matchedText?: string;
}

export interface EmergencyDetectionResult {
  isEmergency: boolean;
  confidence: number;
  indicators: string[];
  recommendedAction: string;
}

export class SafetyFilterService {
  private volunteerNotificationService: VolunteerNotificationService;

  // Simple emergency keywords (Indonesian)
  private readonly emergencyKeywords = [
    "darurat", "emergency", "urgent", "mendesak",
    "sakit berat", "nyeri hebat", "sesak napas", "susah napas",
    "pingsan", "kehilangan kesadaran", "tidak sadar",
    "berdarah", "banyak darah", "pendarahan",
    "serangan jantung", "stroke", "koma", "sekarat",
    "tolong sekarang", "bantuan segera", "tolong saya",
    "demam tinggi", "suhu tinggi", "muntah darah",
    "diare berat", "dehidrasi berat"
  ];

  // Simple medical advice keywords (Indonesian)
  private readonly medicalAdviceKeywords = [
    "saya sarankan", "disarankan", "anda harus", "harus",
    "sebaiknya", "seharusnya", "saya rekomendasikan", "rekomendasi",
    "minum obat", "konsumsi obat", "ambil obat",
    "operasi", "pembedahan", "kemoterapi", "radioterapi",
    "jangan minum", "hindari minum", "stop minum", "berhenti minum",
    "anda menderita", "kamu terkena", "diagnosa", "diagnosis",
    "periksa darah", "test darah", "uji darah", "usg", "ct scan", "mri"
  ];

  // Simple profanity keywords (Indonesian and English)
  private readonly profanityKeywords = [
    "anjing", "bangsat", "brengsek", "jancuk", "kontol", "memek", "ngentot",
    "fuck", "shit", "bitch", "damn", "asshole",
    "bunuh diri", "self-harm", "suicide",
    "teroris", "bom", "ledak", "meledak", "ancam",
    "narkoba", "drugs", "meth", "heroin", "cocaine", "marijuana", "ganja"
  ];

  constructor() {
    this.volunteerNotificationService = new VolunteerNotificationService();
  }

  /**
   * Filter LLM response for safety violations
   */
  async filterLLMResponse(
    response: ProcessedLLMResponse,
    context: ConversationContext
  ): Promise<SafetyFilterResult> {
    const violations: SafetyViolation[] = [];

    // Check for medical advice
    const medicalViolations = this.detectMedicalAdvice(response.content);
    violations.push(...medicalViolations);

    // Check for profanity
    const profanityViolations = this.detectProfanity(response.content);
    violations.push(...profanityViolations);

    const isSafe = violations.length === 0;
    const escalationRequired = violations.some((v) => v.severity === "high" || v.severity === "critical");

    // Log violations
    if (violations.length > 0) {
      await this.logSafetyViolation({
        type: "llm_response",
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        content: response.content,
        violations,
        context,
      });

      // Escalate if needed
      if (escalationRequired) {
        await this.escalateToVolunteer({
          patientId: context.patientId,
          message: response.content,
          reason: "llm_response_violation",
          intent: "safety_violation",
          patientContext: context,
          violations,
        });
      }
    }

    return {
      isSafe,
      violations,
      escalationRequired,
      escalationReason: escalationRequired ? "LLM response contains safety violations" : undefined,
    };
  }

  /**
   * Analyze patient message for emergencies and safety concerns
   */
  async analyzePatientMessage(
    message: string,
    context: ConversationContext
  ): Promise<{
    emergencyResult: EmergencyDetectionResult;
    safetyResult: SafetyFilterResult;
  }> {
    // Detect emergencies
    const emergencyResult = this.detectEmergency(message);

    // Check for profanity
    const violations: SafetyViolation[] = [];
    const profanityViolations = this.detectProfanity(message);
    violations.push(...profanityViolations);

    const isSafe = violations.length === 0;
    const escalationRequired = emergencyResult.isEmergency || violations.some(
      (v) => v.severity === "high" || v.severity === "critical"
    );

    // Log violations
    if (violations.length > 0 || emergencyResult.isEmergency) {
      await this.logSafetyViolation({
        type: "patient_message",
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        content: message,
        violations,
        emergencyDetected: emergencyResult.isEmergency,
        context,
      });

      // Escalate if needed
      if (escalationRequired) {
        const reason = emergencyResult.isEmergency ? "emergency_detection" : "inappropriate_content";
        await this.escalateToVolunteer({
          patientId: context.patientId,
          message,
          reason,
          intent: emergencyResult.isEmergency ? "emergency" : "inappropriate",
          patientContext: context,
          violations,
          emergencyIndicators: emergencyResult.indicators,
        });
      }
    }

    return {
      emergencyResult,
      safetyResult: {
        isSafe,
        violations,
        escalationRequired,
        escalationReason: escalationRequired
          ? emergencyResult.isEmergency
            ? "Emergency detected"
            : "Inappropriate content detected"
          : undefined,
      },
    };
  }

  /**
   * Simple medical advice detection using keyword matching
   */
  private detectMedicalAdvice(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of this.medicalAdviceKeywords) {
      if (lowerContent.includes(keyword)) {
        violations.push({
          type: "medical_advice",
          severity: "high",
          description: "Content contains medical advice",
          matchedText: keyword,
        });
      }
    }

    return violations;
  }

  /**
   * Simple emergency detection using keyword matching
   */
  private detectEmergency(message: string): EmergencyDetectionResult {
    const indicators: string[] = [];
    const lowerMessage = message.toLowerCase();

    for (const keyword of this.emergencyKeywords) {
      if (lowerMessage.includes(keyword)) {
        indicators.push(keyword);
      }
    }

    // Additional context for short urgent messages
    if (lowerMessage.includes("tolong") && message.length < 30) {
      indicators.push("short urgent message");
    }

    // Simple confidence calculation
    const confidence = Math.min(indicators.length * 25, 100);
    const isEmergency = confidence >= 25; // Lower threshold for safety

    return {
      isEmergency,
      confidence,
      indicators,
      recommendedAction: isEmergency
        ? "Immediate volunteer notification"
        : "Monitor and respond normally",
    };
  }

  /**
   * Simple profanity detection using keyword matching
   */
  private detectProfanity(content: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of this.profanityKeywords) {
      if (lowerContent.includes(keyword)) {
        const severity = this.getProfanitySeverity(keyword);
        violations.push({
          type: "profanity",
          severity,
          description: "Content contains inappropriate language",
          matchedText: keyword,
        });
      }
    }

    return violations;
  }

  /**
   * Simple profanity severity determination
   */
  private getProfanitySeverity(keyword: string): "medium" | "high" | "critical" {
    const criticalKeywords = ["bunuh diri", "suicide", "self-harm", "teroris", "bom", "ancam"];
    const highKeywords = ["ngentot", "fuck", "shit", "bitch", "asshole", "memek", "kontol"];

    if (criticalKeywords.some(k => keyword.includes(k))) return "critical";
    if (highKeywords.some(k => keyword.includes(k))) return "high";
    return "medium";
  }

  /**
   * Log safety violations for review
   */
  private async logSafetyViolation(data: {
    type: "llm_response" | "patient_message";
    patientId: string;
    phoneNumber: string;
    content: string;
    violations: SafetyViolation[];
    emergencyDetected?: boolean;
    context: ConversationContext;
  }): Promise<void> {
    logger.warn("Safety violation detected", {
      type: data.type,
      patientId: data.patientId,
      phoneNumber: data.phoneNumber,
      violationCount: data.violations.length,
      violations: data.violations.map((v) => ({
        type: v.type,
        severity: v.severity,
        description: v.description,
      })),
      emergencyDetected: data.emergencyDetected,
      contentLength: data.content.length,
      conversationId: data.context.conversationId,
    });
  }

  /**
   * Escalate to volunteer notification service
   */
  private async escalateToVolunteer(data: {
    patientId: string;
    message: string;
    reason: string;
    intent?: string;
    patientContext: ConversationContext;
    violations?: SafetyViolation[];
    emergencyIndicators?: string[];
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
          emergencyIndicators: data.emergencyIndicators,
        },
      });

      logger.info("Escalated to volunteer", {
        patientId: data.patientId,
        reason: data.reason,
        intent: data.intent,
      });
    } catch (error) {
      logger.error("Failed to escalate to volunteer", error as Error, {
        patientId: data.patientId,
        reason: data.reason,
      });
    }
  }

  /**
   * Simple content sanitization by removing unsafe elements
   */
  sanitizeContent(content: string, violations: SafetyViolation[]): string {
    let sanitized = content;

    for (const violation of violations) {
      if (violation.matchedText) {
        const placeholder = `[${violation.type.toUpperCase()} REMOVED]`;
        sanitized = sanitized.replace(
          new RegExp(violation.matchedText, "gi"),
          placeholder
        );
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const safetyFilterService = new SafetyFilterService();
