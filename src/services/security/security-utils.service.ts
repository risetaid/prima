/**
 * Security Utilities Service
 * Provides common security validation utilities for patient data access
 */

import { logger, LogValue } from "@/lib/logger";
import { db, patients } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { ConversationContext } from "@/services/llm/llm.types";

export interface SecurityContext {
  patientId: string;
  phoneNumber: string;
  verificationStatus?: string;
  requestSource: "whatsapp" | "web" | "api";
  sessionToken?: string;
}

export interface ValidationResult {
  isValid: boolean;
  riskScore: number; // 0-100
  confidence: number; // 0-1
  reasons: string[];
  recommendations?: string[];
}

export interface PatientSecurityProfile {
  patientId: string;
  isActive: boolean;
  verificationStatus: string;
  securityLevel: "standard" | "enhanced" | "restricted";
  dataSensitivity: "low" | "medium" | "high";
  riskFactors: {
    isHighRisk: boolean;
    hasSensitiveConditions: boolean;
    recentSuspiciousActivity: boolean;
    dataBreachRisk: boolean;
  };
  permissions: {
    canAccessHealthNotes: boolean;
    canAccessMedicationInfo: boolean;
    canAccessScheduleInfo: boolean;
    canAccessComplianceData: boolean;
    canShareData: boolean;
  };
}

export class SecurityUtilsService {
  private readonly HIGH_RISK_KEYWORDS = [
    "bocor",
    "leak",
    "hack",
    "crack",
    "password",
    "pin",
    "token",
    "data lain",
    "pasien lain",
    "orang lain",
    "semua pasien",
    "ekspor",
    "export",
    "download",
    "bulk",
    "massal",
  ];

  private readonly SENSITIVE_DATA_PATTERNS = [
    /no\.?rek/i,
    /no.?rekening/i,
    /rekening/i,
    /nik/i,
    /ktp/i,
    /passport/i,
    /alamat.*rumah/i,
    /no.?hp.*lain/i,
    /kartu.*kredit/i,
    /cvv/i,
    /kode.*pos/i,
  ];

  /**
   * Validate patient authentication and authorization
   */
  async validatePatientAccess(
    securityContext: SecurityContext
  ): Promise<ValidationResult> {
    try {
      const reasons: string[] = [];
      let riskScore = 0;
      let confidence = 0.8; // Base confidence

      // Check patient existence and status
      const patient = await db
        .select({
          id: patients.id,
          isActive: patients.isActive,
          verificationStatus: patients.verificationStatus,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(
          and(
            eq(patients.id, securityContext.patientId),
            eq(patients.phoneNumber, securityContext.phoneNumber),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (!patient.length) {
        reasons.push("Patient not found or phone number mismatch");
        riskScore += 80;
        confidence = 0.95;
        return {
          isValid: false,
          riskScore,
          confidence,
          reasons,
          recommendations: ["Verify patient identity and contact information"],
        };
      }

      const patientData = patient[0];

      // Check if patient is active
      if (!patientData.isActive) {
        reasons.push("Patient account is not active");
        riskScore += 60;
      }

      // Check verification status
      const isVerified = patientData.verificationStatus === "VERIFIED";
      if (!isVerified) {
        reasons.push("Patient is not verified");
        riskScore += 30;
        confidence = 0.9;
      }

      // Adjust risk score based on request source
      if (securityContext.requestSource === "api") {
        riskScore += 20; // API requests are higher risk
        reasons.push("API access request");
      }

      // Calculate final validation
      const isValid = patientData.isActive && riskScore < 50;

      if (!isValid) {
        reasons.push("Access validation failed");
      }

      return {
        isValid,
        riskScore: Math.min(riskScore, 100),
        confidence,
        reasons,
        recommendations: this.getSecurityRecommendations(riskScore, isVerified),
      };
    } catch (error) {
      logger.error(
        "Failed to validate patient access",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: securityContext.patientId,
        }
      );

      return {
        isValid: false,
        riskScore: 90,
        confidence: 0.7,
        reasons: ["System error during validation"],
        recommendations: ["Contact system administrator"],
      };
    }
  }

  /**
   * Get comprehensive patient security profile
   */
  async getPatientSecurityProfile(
    patientId: string
  ): Promise<PatientSecurityProfile> {
    try {
      const patient = await db
        .select({
          id: patients.id,
          isActive: patients.isActive,
          verificationStatus: patients.verificationStatus,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
        .limit(1);

      if (!patient.length) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      const patientData = patient[0];
      const isVerified = patientData.verificationStatus === "VERIFIED";

      // Determine security level based on verification and activity status
      let securityLevel: "standard" | "enhanced" | "restricted" = "standard";
      let dataSensitivity: "low" | "medium" | "high" = "low";

      if (!patientData.isActive) {
        securityLevel = "restricted";
        dataSensitivity = "high";
      } else if (!isVerified) {
        securityLevel = "enhanced";
        dataSensitivity = "medium";
      }

      // Calculate permissions based on verification status
      const permissions = {
        canAccessHealthNotes: isVerified,
        canAccessMedicationInfo: isVerified,
        canAccessScheduleInfo: isVerified,
        canAccessComplianceData: isVerified,
        canShareData: false, // Never allow data sharing by default
      };

      return {
        patientId,
        isActive: patientData.isActive,
        verificationStatus: patientData.verificationStatus,
        securityLevel,
        dataSensitivity,
        riskFactors: {
          isHighRisk: false, // Could be enhanced with patient condition data
          hasSensitiveConditions: false, // Could be determined from medical history
          recentSuspiciousActivity: false, // Would track from security logs
          dataBreachRisk: dataSensitivity === "high",
        },
        permissions,
      };
    } catch (error) {
      logger.error(
        "Failed to get patient security profile",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
        }
      );
      throw error;
    }
  }

  /**
   * Analyze message content for security risks
   */
  analyzeMessageSecurity(
    message: string,
    context?: ConversationContext
  ): ValidationResult {
    const reasons: string[] = [];
    let riskScore = 0;
    const normalizedMessage = message.toLowerCase();

    // Check for high-risk keywords
    for (const keyword of this.HIGH_RISK_KEYWORDS) {
      if (normalizedMessage.includes(keyword)) {
        reasons.push(`High-risk keyword detected: ${keyword}`);
        riskScore += 25;
      }
    }

    // Check for sensitive data patterns
    for (const pattern of this.SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        reasons.push(`Sensitive data pattern detected: ${pattern}`);
        riskScore += 40;
      }
    }

    // Check message length (very long messages might be data extraction attempts)
    if (message.length > 500) {
      reasons.push("Unusually long message");
      riskScore += 15;
    }

    // Check for repeated requests (if context available)
    if (context?.previousMessages) {
      const recentMessages = context.previousMessages.slice(-3);
      const similarRequests = recentMessages.filter((msg) =>
        msg.content.toLowerCase().includes(normalizedMessage.substring(0, 50))
      );

      if (similarRequests.length > 1) {
        reasons.push("Repeated similar requests detected");
        riskScore += 20;
      }
    }

    // Calculate final risk score
    const finalRiskScore = Math.min(riskScore, 100);
    const isValid = finalRiskScore < 50;

    return {
      isValid,
      riskScore: finalRiskScore,
      confidence: 0.85,
      reasons,
      recommendations: this.getMessageSecurityRecommendations(finalRiskScore),
    };
  }

  /**
   * Validate data type access permissions
   */
  validateDataTypeAccess(
    securityProfile: PatientSecurityProfile,
    requestedDataType: string
  ): ValidationResult {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check if patient is active
    if (!securityProfile.isActive) {
      reasons.push("Patient account is not active");
      riskScore += 70;
      return {
        isValid: false,
        riskScore,
        confidence: 0.95,
        reasons,
        recommendations: ["Contact healthcare provider to activate account"],
      };
    }

    // Check specific permissions
    let hasPermission = false;
    let dataTypeName = "";

    switch (requestedDataType) {
      case "health_notes":
        hasPermission = securityProfile.permissions.canAccessHealthNotes;
        dataTypeName = "catatan kesehatan";
        break;
      case "medication_info":
        hasPermission = securityProfile.permissions.canAccessMedicationInfo;
        dataTypeName = "informasi obat";
        break;
      case "medication_schedule":
        hasPermission = securityProfile.permissions.canAccessScheduleInfo;
        dataTypeName = "jadwal obat";
        break;
      case "medication_compliance":
        hasPermission = securityProfile.permissions.canAccessComplianceData;
        dataTypeName = "data kepatuhan";
        break;
      case "reminder":
        // Basic reminder info available to all active patients
        hasPermission = true;
        dataTypeName = "pengingat";
        break;
      default:
        reasons.push(`Unknown data type: ${requestedDataType}`);
        riskScore += 50;
        break;
    }

    if (!hasPermission) {
      reasons.push(`No permission for ${dataTypeName}`);
      riskScore += 60;
    }

    // Adjust risk based on data sensitivity
    if (securityProfile.dataSensitivity === "high") {
      riskScore += 20;
    } else if (securityProfile.dataSensitivity === "medium") {
      riskScore += 10;
    }

    const isValid = hasPermission && riskScore < 50;

    if (!isValid && !reasons.includes("No permission for " + dataTypeName)) {
      reasons.push("Data type access validation failed");
    }

    return {
      isValid,
      riskScore: Math.min(riskScore, 100),
      confidence: 0.9,
      reasons,
      recommendations: this.getDataAccessRecommendations(
        requestedDataType,
        securityProfile.verificationStatus
      ),
    };
  }

  /**
   * Generate security recommendations based on risk score
   */
  private getSecurityRecommendations(
    riskScore: number,
    isVerified: boolean
  ): string[] {
    if (riskScore >= 70) {
      return [
        "Immediate verification required",
        "Contact healthcare provider",
        "Review account security settings",
      ];
    } else if (riskScore >= 50) {
      return [
        isVerified
          ? "Additional verification recommended"
          : "Complete account verification",
        "Review recent account activity",
      ];
    } else if (riskScore >= 30) {
      return [
        "Monitor account activity",
        "Enable additional security features if available",
      ];
    } else {
      return [
        "Standard security practices maintained",
        "Regular account review recommended",
      ];
    }
  }

  /**
   * Generate message security recommendations
   */
  private getMessageSecurityRecommendations(riskScore: number): string[] {
    if (riskScore >= 60) {
      return [
        "Message flagged for security review",
        "Avoid sharing sensitive information",
        "Contact support if you believe this is an error",
      ];
    } else if (riskScore >= 30) {
      return [
        "Be cautious with sensitive information",
        "Verify recipient before sharing personal data",
      ];
    } else {
      return ["Standard communication security maintained"];
    }
  }

  /**
   * Generate data access recommendations
   */
  private getDataAccessRecommendations(
    dataType: string,
    verificationStatus: string
  ): string[] {
    const isVerified = verificationStatus === "VERIFIED";

    if (!isVerified) {
      return [
        "Complete account verification to access this information",
        "Contact healthcare provider for verification assistance",
      ];
    }

    switch (dataType) {
      case "health_notes":
      case "medication_info":
      case "medication_compliance":
        return [
          "This information is sensitive and protected",
          "Ensure you are in a private environment when viewing",
          "Do not share this information with unauthorized parties",
        ];
      case "medication_schedule":
        return [
          "Keep your medication schedule private",
          "Only share with authorized caregivers",
        ];
      default:
        return [
          "Follow standard data protection practices",
          "Report any suspicious account activity",
        ];
    }
  }

  /**
   * Check if patient can perform sensitive operations
   */
  async canPerformSensitiveOperation(
    patientId: string,
    operation: string
  ): Promise<boolean> {
    try {
      const securityProfile = await this.getPatientSecurityProfile(patientId);

      // Only verified patients can perform sensitive operations
      if (securityProfile.verificationStatus !== "VERIFIED") {
        return false;
      }

      // Check if patient is active
      if (!securityProfile.isActive) {
        return false;
      }

      // Check operation-specific permissions
      const sensitiveOperations = [
        "data_export",
        "data_sharing",
        "account_changes",
        "consent_withdrawal",
      ];

      if (sensitiveOperations.includes(operation)) {
        return securityProfile.securityLevel === "standard";
      }

      return true;
    } catch (error) {
      logger.error(
        "Failed to check sensitive operation permission",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
          operation,
        }
      );
      return false;
    }
  }

  /**
   * Create security audit log entry
   */
  async logSecurityEvent(
    eventType:
      | "access_attempt"
      | "permission_denied"
      | "suspicious_activity"
      | "data_access",
    patientId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        eventType,
        patientId,
        details,
        riskScore: details.riskScore || 0,
        ipAddress: details.ipAddress || "unknown",
        userAgent: details.userAgent || "unknown",
      };

      // In production, this would be saved to a security audit log database
      logger.info("Security audit event", auditEntry);

      // Could trigger real-time alerts for high-risk events
      if (typeof details.riskScore === "number" && details.riskScore > 70) {
        await this.triggerSecurityAlert(auditEntry);
      }
    } catch (error) {
      logger.error(
        "Failed to log security event",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
          eventType,
        }
      );
    }
  }

  /**
   * Trigger security alert for high-risk events
   */
  private async triggerSecurityAlert(auditEntry: {
    patientId: string;
    eventType: string;
    riskScore: number | unknown;
    timestamp: string;
  }): Promise<void> {
    try {
      // In production, this would integrate with your security monitoring system
      logger.warn("Security alert triggered", {
        alertType: "high_risk_security_event",
        patientId: auditEntry.patientId,
        eventType: auditEntry.eventType,
        riskScore: auditEntry.riskScore as LogValue,
        timestamp: auditEntry.timestamp,
      });

      // Could send notifications to security team
      // Could implement automatic account restrictions
    } catch (error) {
      logger.error(
        "Failed to trigger security alert",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Export singleton instance
export const securityUtilsService = new SecurityUtilsService();
