/**
 * Data Access Validation Service
 * Provides comprehensive security validation for patient data access through LLM interfaces
 */

import { logger } from "@/lib/logger";
import { db, patients } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { ConversationContext } from "@/services/llm/llm.types";

export interface DataAccessRequest {
  patientId: string;
  requestedDataType:
    | "health_notes"
    | "medication_info"
    | "medication_schedule"
    | "medication_compliance"
    | "reminder"
    | "general";
  requestContext:
    | "patient_initiated"
    | "system_initiated"
    | "volunteer_initiated";
  conversationId?: string;
  messageId?: string;
}

export interface DataAccessValidationResult {
  isAuthorized: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  violations: DataAccessViolation[];
  requiresConsent: boolean;
  requiresEscalation: boolean;
  auditLogRequired: boolean;
  reason: string;
  recommendations?: string[];
}

export interface DataAccessViolation {
  type:
    | "unauthorized_patient_access"
    | "data_type_mismatch"
    | "suspicious_request_pattern"
    | "rate_limit_exceeded"
    | "consent_required"
    | "data_sensitivity";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  context?: Record<string, unknown>;
}

export interface PatientDataAccessProfile {
  patientId: string;
  isActive: boolean;
  verificationStatus: string;
  dataAccessPermissions: {
    healthNotes: boolean;
    medicationInfo: boolean;
    medicationSchedule: boolean;
    medicationCompliance: boolean;
    reminders: boolean;
    generalInfo: boolean;
  };
  riskFactors: {
    isHighRiskPatient: boolean;
    hasSensitiveConditions: boolean;
    requiresExtraConsent: boolean;
    dataAccessRestrictions: string[];
  };
  accessHistory: {
    recentRequests: number;
    lastAccessTime?: Date;
    suspiciousPatterns: string[];
  };
}

export class DataAccessValidationService {
  private readonly RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_REQUESTS_PER_WINDOW = 10; // Max requests per window
  private readonly HIGH_RISK_PATTERNS = [
    /data.*pasien.*lain/i, // Other patient's data
    /bocoran.*data/i, // Data leak requests
    /hack.*data/i, // Hacking attempts
    /password.*data/i, // Password-related data requests
  ];

  private readonly SUSPICIOUS_REQUEST_PATTERNS = [
    /semua.*data/i, // All data requests
    /ekspor.*data/i, // Data export requests
    /download.*data/i, // Data download requests
    /bulk.*data/i, // Bulk data requests
  ];

  /**
   * Validate data access request
   */
  async validateDataAccess(
    request: DataAccessRequest,
    conversationContext?: ConversationContext
  ): Promise<DataAccessValidationResult> {
    try {
      logger.info("Validating data access request", {
        patientId: request.patientId,
        requestedDataType: request.requestedDataType,
        requestContext: request.requestContext,
        operation: "data_access_validation",
      });

      // Get patient access profile
      const patientProfile = await this.getPatientAccessProfile(
        request.patientId
      );

      // Perform comprehensive validation
      const violations = await this.performValidationChecks(
        request,
        patientProfile,
        conversationContext
      );

      // Determine authorization result
      const validationResult = this.determineValidationResult(
        violations,
        patientProfile
      );

      // Log access attempt for audit
      if (validationResult.auditLogRequired) {
        await this.logAccessAttempt(request, validationResult, violations);
      }

      logger.info("Data access validation completed", {
        patientId: request.patientId,
        isAuthorized: validationResult.isAuthorized,
        riskLevel: validationResult.riskLevel,
        violationsCount: violations.length,
        operation: "data_access_validation_completed",
      });

      return validationResult;
    } catch (error) {
      logger.error(
        "Failed to validate data access request",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: request.patientId,
          requestedDataType: request.requestedDataType,
        }
      );

      // Fail securely - deny access on validation errors
      return {
        isAuthorized: false,
        riskLevel: "high",
        violations: [
          {
            type: "suspicious_request_pattern",
            severity: "high",
            description: "Data access validation system error",
          },
        ],
        requiresConsent: false,
        requiresEscalation: true,
        auditLogRequired: true,
        reason: "System error during validation",
      };
    }
  }

  /**
   * Get patient access profile with permissions and risk factors
   */
  private async getPatientAccessProfile(
    patientId: string
  ): Promise<PatientDataAccessProfile> {
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

      // Determine base permissions based on verification status
      const isVerified = patientData.verificationStatus === "VERIFIED";
      const isActive = patientData.isActive;

      return {
        patientId,
        isActive,
        verificationStatus: patientData.verificationStatus,
        dataAccessPermissions: {
          healthNotes: isVerified && isActive,
          medicationInfo: isVerified && isActive,
          medicationSchedule: isVerified && isActive,
          medicationCompliance: isVerified && isActive,
          reminders: isActive, // Available for non-verified but active patients
          generalInfo: isActive,
        },
        riskFactors: {
          isHighRiskPatient: false, // Could be determined from patient conditions
          hasSensitiveConditions: false, // Could be determined from medical history
          requiresExtraConsent: false, // Could be based on patient preferences
          dataAccessRestrictions: [], // Could be configured per patient
        },
        accessHistory: {
          recentRequests: 0, // Would track from access logs
          suspiciousPatterns: [],
        },
      };
    } catch (error) {
      logger.error(
        "Failed to get patient access profile",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
        }
      );
      throw error;
    }
  }

  /**
   * Perform comprehensive validation checks
   */
  private async performValidationChecks(
    request: DataAccessRequest,
    patientProfile: PatientDataAccessProfile,
    conversationContext?: ConversationContext
  ): Promise<DataAccessViolation[]> {
    const violations: DataAccessViolation[] = [];

    // Check 1: Patient existence and active status
    if (!patientProfile.isActive) {
      violations.push({
        type: "unauthorized_patient_access",
        severity: "high",
        description: "Patient account is not active",
        context: {
          patientId: request.patientId,
          status: patientProfile.isActive,
        },
      });
    }

    // Check 2: Data type permissions
    const permissionMap = {
      general: "generalInfo",
      health_notes: "healthNotes",
      medication_info: "medicationInfo",
      medication_schedule: "medicationSchedule",
      medication_compliance: "medicationCompliance",
      reminder: "reminders",
    };

    const permissionKey =
      permissionMap[request.requestedDataType] || request.requestedDataType;
    const hasPermission =
      patientProfile.dataAccessPermissions[
        permissionKey as keyof typeof patientProfile.dataAccessPermissions
      ];
    if (!hasPermission) {
      violations.push({
        type: "data_type_mismatch",
        severity: "medium",
        description: `Patient lacks permission for ${request.requestedDataType} access`,
        context: {
          requestedDataType: request.requestedDataType,
          verificationStatus: patientProfile.verificationStatus,
        },
      });
    }

    // Check 3: Verification status requirements
    const requiresVerification = [
      "health_notes",
      "medication_info",
      "medication_schedule",
      "medication_compliance",
    ];
    if (
      requiresVerification.includes(request.requestedDataType) &&
      patientProfile.verificationStatus !== "verified"
    ) {
      violations.push({
        type: "consent_required",
        severity: "medium",
        description: "Data type requires patient verification",
        context: {
          requestedDataType: request.requestedDataType,
          verificationStatus: patientProfile.verificationStatus,
        },
      });
    }

    // Check 4: Suspicious request patterns
    const suspiciousPatterns = this.checkSuspiciousPatterns(
      request,
      conversationContext
    );
    violations.push(...suspiciousPatterns);

    // Check 5: Rate limiting (simplified - would need Redis for proper implementation)
    const rateLimitViolations = await this.checkRateLimiting(request);
    violations.push(...rateLimitViolations);

    // Check 6: Data sensitivity validation
    const sensitivityViolations = this.checkDataSensitivity(
      request,
      patientProfile
    );
    violations.push(...sensitivityViolations);

    return violations;
  }

  /**
   * Check for suspicious request patterns
   */
  private checkSuspiciousPatterns(
    request: DataAccessRequest,
    conversationContext?: ConversationContext
  ): DataAccessViolation[] {
    const violations: DataAccessViolation[] = [];

    // Check high-risk patterns in conversation context
    if (conversationContext?.previousMessages) {
      const recentMessages = conversationContext.previousMessages
        .slice(-5) // Check last 5 messages
        .map((msg) => msg.content.toLowerCase())
        .join(" ");

      for (const pattern of this.HIGH_RISK_PATTERNS) {
        if (pattern.test(recentMessages)) {
          violations.push({
            type: "suspicious_request_pattern",
            severity: "critical",
            description: "High-risk request pattern detected",
            context: { pattern: pattern.toString() },
          });
        }
      }

      for (const pattern of this.SUSPICIOUS_REQUEST_PATTERNS) {
        if (pattern.test(recentMessages)) {
          violations.push({
            type: "suspicious_request_pattern",
            severity: "high",
            description: "Suspicious bulk data request pattern detected",
            context: { pattern: pattern.toString() },
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check rate limiting (simplified implementation)
   */
  private async checkRateLimiting(
    request: DataAccessRequest
  ): Promise<DataAccessViolation[]> {
    const violations: DataAccessViolation[] = [];

    // This is a simplified implementation - in production, you'd use Redis
    // to track request counts across multiple instances

    // For now, we'll implement a basic check that could be enhanced
    const currentTime = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const windowStart = currentTime - this.RATE_LIMIT_WINDOW;

    // Placeholder for actual rate limit checking
    // In a real implementation, you'd check how many requests this patient/conversation has made
    const recentRequestCount = 0; // This would come from your rate limiting store

    if (recentRequestCount >= this.MAX_REQUESTS_PER_WINDOW) {
      violations.push({
        type: "rate_limit_exceeded",
        severity: "medium",
        description: "Rate limit exceeded for data access requests",
        context: {
          recentRequestCount,
          maxAllowed: this.MAX_REQUESTS_PER_WINDOW,
          windowMinutes: this.RATE_LIMIT_WINDOW / (60 * 1000),
          patientId: request.patientId,
        },
      });
    }

    return violations;
  }

  /**
   * Check data sensitivity and consent requirements
   */
  private checkDataSensitivity(
    request: DataAccessRequest,
    patientProfile: PatientDataAccessProfile
  ): DataAccessViolation[] {
    const violations: DataAccessViolation[] = [];

    // Define sensitive data types that require extra consent
    const sensitiveDataTypes = ["health_notes", "medication_compliance"];

    if (sensitiveDataTypes.includes(request.requestedDataType)) {
      if (patientProfile.riskFactors.requiresExtraConsent) {
        violations.push({
          type: "data_sensitivity",
          severity: "medium",
          description: "Sensitive data type requires explicit consent",
          context: {
            requestedDataType: request.requestedDataType,
            requiresExtraConsent:
              patientProfile.riskFactors.requiresExtraConsent,
          },
        });
      }
    }

    return violations;
  }

  /**
   * Determine validation result based on violations
   */
  private determineValidationResult(
    violations: DataAccessViolation[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patientProfile: PatientDataAccessProfile
  ): DataAccessValidationResult {
    // Note: patientProfile is kept for future extensibility but not currently used
    // in the basic validation logic. It could be used for more sophisticated risk assessment.
    if (violations.length === 0) {
      return {
        isAuthorized: true,
        riskLevel: "low",
        violations: [],
        requiresConsent: false,
        requiresEscalation: false,
        auditLogRequired: true,
        reason: "Access request validated successfully",
      };
    }

    // Check for critical violations
    const criticalViolations = violations.filter(
      (v) => v.severity === "critical"
    );
    if (criticalViolations.length > 0) {
      return {
        isAuthorized: false,
        riskLevel: "critical",
        violations,
        requiresConsent: false,
        requiresEscalation: true,
        auditLogRequired: true,
        reason: "Critical security violations detected",
      };
    }

    // Check for high violations
    const highViolations = violations.filter((v) => v.severity === "high");
    if (highViolations.length > 0) {
      return {
        isAuthorized: false,
        riskLevel: "high",
        violations,
        requiresConsent: false,
        requiresEscalation: true,
        auditLogRequired: true,
        reason: "High-risk security violations detected",
      };
    }

    // Check for medium violations
    const mediumViolations = violations.filter((v) => v.severity === "medium");
    if (mediumViolations.length > 0) {
      const consentRequired = mediumViolations.some(
        (v) => v.type === "consent_required" || v.type === "data_sensitivity"
      );

      return {
        isAuthorized: !consentRequired, // Allow access if only consent is required
        riskLevel: "medium",
        violations,
        requiresConsent: consentRequired,
        requiresEscalation: false,
        auditLogRequired: true,
        reason: consentRequired
          ? "Consent required for data access"
          : "Medium-risk violations detected",
      };
    }

    // Only low violations - allow access but log
    return {
      isAuthorized: true,
      riskLevel: "low",
      violations,
      requiresConsent: false,
      requiresEscalation: false,
      auditLogRequired: true,
      reason: "Low-risk violations detected, access granted",
    };
  }

  /**
   * Log access attempt for audit purposes
   */
  private async logAccessAttempt(
    request: DataAccessRequest,
    result: DataAccessValidationResult,
    violations: DataAccessViolation[]
  ): Promise<void> {
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        patientId: request.patientId,
        requestedDataType: request.requestedDataType,
        requestContext: request.requestContext,
        isAuthorized: result.isAuthorized,
        riskLevel: result.riskLevel,
        violationsCount: violations.length,
        violations: violations.map((v) => ({
          type: v.type,
          severity: v.severity,
          description: v.description,
        })),
        requiresEscalation: result.requiresEscalation,
        conversationId: request.conversationId,
        messageId: request.messageId,
      };

      // In a real implementation, you'd save this to your audit log database
      logger.info("Data access audit log", auditLog);

      // If escalation is required, notify security team or volunteers
      if (result.requiresEscalation) {
        await this.escalateSecurityConcern(request, result, violations);
      }
    } catch (error) {
      logger.error(
        "Failed to log access attempt",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: request.patientId,
        }
      );
    }
  }

  /**
   * Escalate security concerns to appropriate teams
   */
  private async escalateSecurityConcern(
    request: DataAccessRequest,
    result: DataAccessValidationResult,
    violations: DataAccessViolation[]
  ): Promise<void> {
    try {
      const escalationDetails = {
        patientId: request.patientId,
        riskLevel: result.riskLevel,
        violationTypes: violations.map((v) => v.type),
        description: `Security concern: ${result.reason}`,
        timestamp: new Date().toISOString(),
        requiresImmediateAttention: result.riskLevel === "critical",
      };

      // In a real implementation, you'd send this to your security monitoring system
      logger.warn("Security escalation required", escalationDetails);

      // Could integrate with existing volunteer notification service
      // if security team uses the same notification system
    } catch (error) {
      logger.error(
        "Failed to escalate security concern",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if patient has specific permission for data type
   */
  async hasPermission(
    patientId: string,
    dataType: string,
    context?: ConversationContext
  ): Promise<boolean> {
    const request: DataAccessRequest = {
      patientId,
      requestedDataType: dataType as
        | "health_notes"
        | "medication_info"
        | "medication_schedule"
        | "medication_compliance"
        | "reminder"
        | "general",
      requestContext: "patient_initiated",
    };

    const result = await this.validateDataAccess(request, context);
    return result.isAuthorized;
  }

  /**
   * Get patient data access permissions summary
   */
  async getPermissionSummary(patientId: string): Promise<{
    patientId: string;
    isActive: boolean;
    verificationStatus: string;
    permissions: Record<string, boolean>;
    riskLevel: "low" | "medium" | "high";
  }> {
    try {
      const profile = await this.getPatientAccessProfile(patientId);

      return {
        patientId,
        isActive: profile.isActive,
        verificationStatus: profile.verificationStatus,
        permissions: profile.dataAccessPermissions,
        riskLevel: profile.riskFactors.isHighRiskPatient
          ? "high"
          : profile.riskFactors.hasSensitiveConditions
          ? "medium"
          : "low",
      };
    } catch (error) {
      logger.error(
        "Failed to get permission summary",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
        }
      );
      throw error;
    }
  }
}

// Export singleton instance
export const dataAccessValidationService = new DataAccessValidationService();
