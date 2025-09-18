/**
 * Enhanced followup response handler using LLM for intelligent response analysis
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createSuccessResponse, createErrorResponse, createEmergencyResponse } from "../response-handler";
import { db, patients, reminderFollowups } from "@/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { FollowupService } from "../reminder/followup.service";
import { llmService } from "../llm/llm.service";
import { getFollowupResponsePrompt, getResponseGenerationPrompt } from "../llm/prompts";
import { ConversationContext, ProcessedLLMResponse } from "../llm/llm.types";
import { PatientContextService } from "../patient-context.service";
import { safetyFilterService } from "../llm/safety-filter";
import { VolunteerNotificationService } from "../notification/volunteer-notification.service";

interface FollowupAnalysisResult {
  response: "SUDAH" | "BELUM" | "TIDAK_PASTI";
  medication_status: "tepat_waktu" | "terlambat" | "belum" | "tidak_ada";
  health_condition: "baik" | "demam" | "mual" | "nyeri" | "lainnya" | "tidak_ada";
  side_effects: string[];
  issues_reported: string[];
  needs_human_help: boolean;
  urgency: "tinggi" | "sedang" | "rendah";
  followup_required: boolean;
  reason: string;
  suggested_response: string;
  confidence: number;
}

export class FollowupResponseHandler extends StandardResponseHandler {
  private followupService: FollowupService;
  private patientContextService: PatientContextService;
  private volunteerNotificationService: VolunteerNotificationService;

  constructor() {
    super("followup_response", 20); // Lower priority than verification and medication
    this.followupService = new FollowupService();
    this.patientContextService = new PatientContextService();
    this.volunteerNotificationService = new VolunteerNotificationService();
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing enhanced followup response with LLM", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        verificationStatus: context.verificationStatus,
        messageLength: context.message.length,
        operation: "enhanced_followup_response"
      });

      // Check if patient is verified
      if (context.verificationStatus !== "verified") {
        return createErrorResponse(
          "Patient is not verified",
          "Patient must be verified to process followup responses",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "followup_handler",
            action: "not_verified"
          }
        );
      }

      // Get patient details
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, context.patientId))
        .limit(1);

      if (!patient.length) {
        return createErrorResponse(
          "Patient not found",
          "Patient ID does not exist",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "followup_handler",
            action: "patient_not_found"
          }
        );
      }

      const patientData = patient[0];

      // Find active followups for this patient
      const activeFollowups = await db
        .select({
          id: reminderFollowups.id,
          followupType: reminderFollowups.followupType,
          scheduledAt: reminderFollowups.scheduledAt,
          message: reminderFollowups.message
        })
        .from(reminderFollowups)
        .where(
          and(
            eq(reminderFollowups.patientId, context.patientId),
            eq(reminderFollowups.status, "SENT"),
            isNull(reminderFollowups.response),
            gt(reminderFollowups.scheduledAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Within last 24 hours
          )
        )
        .orderBy(reminderFollowups.scheduledAt)
        .limit(1);

      if (activeFollowups.length === 0) {
        return createErrorResponse(
          "No active followups found",
          "No followups require response at this time",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "followup_handler",
            action: "no_followups"
          }
        );
      }

      const followup = activeFollowups[0];

      // Perform safety filtering first
      const safetyResult = await safetyFilterService.analyzePatientMessage(
        context.message,
        {
          patientId: context.patientId,
          phoneNumber: context.phoneNumber,
          conversationId: followup.id.toString()
        }
      );

      // Handle emergency detection from safety filter
      if (safetyResult.emergencyResult.isEmergency) {
        logger.warn("Emergency detected in followup response", {
          patientId: context.patientId,
          followupId: followup.id,
          emergencyIndicators: safetyResult.emergencyResult.indicators,
          operation: "emergency_detection"
        });

        // Update followup with emergency response
        await this.updateFollowupResponse(followup.id, context.message, "EMERGENCY_DETECTED");

        return createEmergencyResponse(
          "Emergency detected in followup response - volunteer notified",
          context.patientId,
          undefined,
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "followup_handler",
            action: "emergency_detected",
            emergencyDetected: true,
            escalated: true,
            emergencyIndicators: safetyResult.emergencyResult.indicators
          }
        );
      }

      // Build enhanced conversation context for LLM analysis
      const llmContext = await this.buildEnhancedFollowupContext(
        context.patientId,
        context.phoneNumber,
        context.message,
        followup
      );

      // Analyze patient response using LLM
      const analysisResult = await this.analyzeFollowupResponseWithLLM(
        llmContext,
        followup.followupType,
        context.message
      );

      // Generate natural response based on analysis
      const generatedResponse = await this.generateFollowupReply(
        llmContext,
        analysisResult,
        followup.followupType
      );

      // Update followup record with analysis results
      await this.updateFollowupWithAnalysis(followup.id, context.message, analysisResult);

      // Handle escalation if needed
      if (analysisResult.needs_human_help || analysisResult.urgency === "tinggi") {
        await this.escalateToVolunteer(
          context.patientId,
          context.message,
          followup.id,
          analysisResult,
          patientData.name
        );
      }

      logger.info("Enhanced followup response processed", {
        patientId: context.patientId,
        followupId: followup.id,
        medicationStatus: analysisResult.medication_status,
        healthCondition: analysisResult.health_condition,
        needsHumanHelp: analysisResult.needs_human_help,
        urgency: analysisResult.urgency,
        confidence: analysisResult.confidence,
        processingTimeMs: Date.now() - startTime,
        operation: "enhanced_followup_completed"
      });

      return createSuccessResponse(
        "Followup response processed successfully with LLM analysis",
        {
          followupId: followup.id,
          followupType: followup.followupType,
          patientName: patientData.name,
          analysisResult,
          generatedResponse,
          processed: true,
          escalated: analysisResult.needs_human_help
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "followup_handler",
          action: analysisResult.needs_human_help ? "escalated" : "followup_responded",
          emergencyDetected: false,
          escalated: analysisResult.needs_human_help,
          medicationStatus: analysisResult.medication_status,
          healthCondition: analysisResult.health_condition
        }
      );

    } catch (error) {
      logger.error("Failed to process enhanced followup response", error instanceof Error ? error : new Error(String(error)), {
        patientId: context.patientId,
        operation: "enhanced_followup_response"
      });

      return createErrorResponse(
        "Failed to process followup response",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "followup_handler",
          action: "processing_error"
        }
      );
    }
  }

  /**
   * Build enhanced conversation context for LLM analysis
   */
  private async buildEnhancedFollowupContext(
    patientId: string,
    phoneNumber: string,
    message: string,
    followup: { id: string; followupType: string; message: string }
  ): Promise<ConversationContext> {
    try {
      const patientContext = await this.patientContextService.getPatientContext(patientId);

      return {
        patientId,
        phoneNumber,
        previousMessages: patientContext.found && patientContext.context ?
          patientContext.context.recentConversationHistory?.map(msg => ({
            role: msg.direction === "inbound" ? "user" : "assistant",
            content: msg.message
          })) || [] : [],
        patientInfo: patientContext.found && patientContext.context ? {
          name: patientContext.context.patient.name,
          verificationStatus: patientContext.context.patient.verificationStatus,
          activeReminders: patientContext.context.activeReminders?.map(r => ({
            medicationName: r.medicationName || r.medicationDetails?.name || 'obat',
            medicationDetails: r.medicationDetails,
            scheduledTime: r.scheduledTime
          })) || []
        } : undefined,
        conversationId: followup.id.toString()
      };
    } catch (error) {
      logger.warn("Failed to build enhanced followup context, using basic context", {
        patientId,
        error: error instanceof Error ? error.message : String(error),
        operation: "build_followup_context"
      });

      return {
        patientId,
        phoneNumber,
        previousMessages: [],
        patientInfo: undefined,
        conversationId: followup.id.toString()
      };
    }
  }

  /**
   * Analyze followup response using LLM
   */
  private async analyzeFollowupResponseWithLLM(
    context: ConversationContext,
    followupType: string,
    patientMessage: string
  ): Promise<FollowupAnalysisResult> {
    try {
      const prompt = getFollowupResponsePrompt(context, followupType);
      const llmResponse = await llmService.generatePatientResponse(
        'followup',
        context,
        followupType
      );

      // Parse LLM response
      const analysis = JSON.parse(llmResponse.content) as FollowupAnalysisResult;

      // Validate and sanitize response
      return {
        response: analysis.response || "TIDAK_PASTI",
        medication_status: analysis.medication_status || "tidak_ada",
        health_condition: analysis.health_condition || "tidak_ada",
        side_effects: Array.isArray(analysis.side_effects) ? analysis.side_effects : [],
        issues_reported: Array.isArray(analysis.issues_reported) ? analysis.issues_reported : [],
        needs_human_help: Boolean(analysis.needs_human_help),
        urgency: analysis.urgency || "rendah",
        followup_required: Boolean(analysis.followup_required),
        reason: analysis.reason || "Analysis completed",
        suggested_response: analysis.suggested_response || "Terima kasih atas informasinya.",
        confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1)
      };

    } catch (error) {
      logger.warn("LLM analysis failed, using fallback", {
        patientId: context.patientId,
        error: error instanceof Error ? error.message : String(error),
        operation: "llm_analysis_fallback"
      });

      // Fallback analysis based on simple keyword matching
      return this.performFallbackAnalysis(patientMessage);
    }
  }

  /**
   * Generate natural followup response based on analysis
   */
  private async generateFollowupReply(
    context: ConversationContext,
    analysis: FollowupAnalysisResult,
    followupType: string
  ): Promise<string> {
    try {
      const intentResult = {
        intent: 'followup_response',
        confidence: analysis.confidence,
        entities: {
          medication_status: analysis.medication_status,
          health_condition: analysis.health_condition,
          needs_escalation: analysis.needs_human_help
        }
      };

      const additionalContext = `Followup Type: ${followupType}
Medication Status: ${analysis.medication_status}
Health Condition: ${analysis.health_condition}
Urgency: ${analysis.urgency}
Issues: ${analysis.issues_reported.join(', ')}

Original Reason: ${analysis.reason}`;

      const prompt = getResponseGenerationPrompt(context, intentResult, additionalContext);
      const llmResponse = await llmService.generatePatientResponse(
        'response',
        context,
        additionalContext
      );

      return llmResponse.content;

    } catch (error) {
      logger.warn("LLM response generation failed, using template", {
        patientId: context.patientId,
        error: error instanceof Error ? error.message : String(error),
        operation: "response_generation_fallback"
      });

      // Fallback to template-based response
      return this.getTemplateResponse(analysis);
    }
  }

  /**
   * Update followup record with analysis results
   */
  private async updateFollowupWithAnalysis(
    followupId: string,
    patientMessage: string,
    analysis: FollowupAnalysisResult
  ): Promise<void> {
    try {
      await db
        .update(reminderFollowups)
        .set({
          response: patientMessage,
          responseAt: new Date(),
          status: analysis.needs_human_help ? "ESCALATED" : "COMPLETED",
          additionalInfo: {
            analysis: {
              medication_status: analysis.medication_status,
              health_condition: analysis.health_condition,
              side_effects: analysis.side_effects,
              issues_reported: analysis.issues_reported,
              urgency: analysis.urgency,
              confidence: analysis.confidence,
              followup_required: analysis.followup_required
            },
            processedAt: new Date().toISOString()
          }
        })
        .where(eq(reminderFollowups.id, followupId));

    } catch (error) {
      logger.error("Failed to update followup with analysis", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "update_followup_analysis"
      });
    }
  }

  /**
   * Update followup with basic response
   */
  private async updateFollowupResponse(followupId: string, message: string, status: string): Promise<void> {
    try {
      await db
        .update(reminderFollowups)
        .set({
          response: message,
          responseAt: new Date(),
          status
        })
        .where(eq(reminderFollowups.id, followupId));
    } catch (error) {
      logger.error("Failed to update followup response", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "update_followup_response"
      });
    }
  }

  /**
   * Escalate to volunteer if needed
   */
  private async escalateToVolunteer(
    patientId: string,
    message: string,
    followupId: string,
    analysis: FollowupAnalysisResult,
    patientName: string
  ): Promise<void> {
    try {
      await this.volunteerNotificationService.createNotification({
        patientId,
        message,
        reason: analysis.urgency === "tinggi" ? "urgent_followup" : "followup_escalation",
        intent: "followup_concern",
        patientContext: {
          followupId,
          medicationStatus: analysis.medication_status,
          healthCondition: analysis.health_condition,
          sideEffects: analysis.side_effects,
          issuesReported: analysis.issues_reported,
          urgency: analysis.urgency,
          confidence: analysis.confidence
        }
      });

      logger.info("Followup escalated to volunteer", {
        patientId,
        followupId,
        urgency: analysis.urgency,
        operation: "followup_escalation"
      });

    } catch (error) {
      logger.error("Failed to escalate followup to volunteer", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        followupId,
        operation: "escalation_failed"
      });
    }
  }

  /**
   * Fallback analysis when LLM fails
   */
  private performFallbackAnalysis(message: string): FollowupAnalysisResult {
    const normalizedMessage = message.toLowerCase();

    // Simple keyword-based analysis
    const confirmationKeywords = ['sudah', 'iya', 'minum', 'habis', 'baru saja'];
    const denialKeywords = ['belum', 'lupa', 'belum sempat', 'tidak'];
    const healthIssueKeywords = ['demam', 'mual', 'pusing', 'nyeri', 'sakit', 'muntah'];
    const sideEffectKeywords = ['pusing', 'mual', 'muntah', 'ruam', 'gatal', 'alergi'];

    const isConfirmed = confirmationKeywords.some(keyword => normalizedMessage.includes(keyword));
    const isDenied = denialKeywords.some(keyword => normalizedMessage.includes(keyword));
    const hasHealthIssues = healthIssueKeywords.some(keyword => normalizedMessage.includes(keyword));
    const hasSideEffects = sideEffectKeywords.some(keyword => normalizedMessage.includes(keyword));

    return {
      response: isConfirmed ? "SUDAH" : isDenied ? "BELUM" : "TIDAK_PASTI",
      medication_status: isConfirmed ? "tepat_waktu" : isDenied ? "belum" : "tidak_ada",
      health_condition: hasHealthIssues ? "lainnya" : "baik",
      side_effects: hasSideEffects ? sideEffectKeywords.filter(keyword => normalizedMessage.includes(keyword)) : [],
      issues_reported: hasHealthIssues ? healthIssueKeywords.filter(keyword => normalizedMessage.includes(keyword)) : [],
      needs_human_help: hasSideEffects || hasHealthIssues,
      urgency: (hasSideEffects || hasHealthIssues) ? "sedang" : "rendah",
      followup_required: hasSideEffects || hasHealthIssues,
      reason: "Fallback analysis due to LLM failure",
      suggested_response: "Terima kasih atas informasinya. Tim kami akan memantau kondisi Anda.",
      confidence: 0.6
    };
  }

  /**
   * Template-based response fallback
   */
  private getTemplateResponse(analysis: FollowupAnalysisResult): string {
    if (analysis.response === "SUDAH") {
      return "Baik, terima kasih sudah mengonfirmasi bahwa Anda sudah minum obat. Jaga kesehatan Anda ya!";
    } else if (analysis.response === "BELUM") {
      return "Baik, segera minum obat sesuai jadwal ya. Jika ada kesulitan, jangan ragu untuk menghubungi tim kami.";
    } else {
      return "Terima kasih atas informasinya. Tim kami akan mencatat respon Anda.";
    }
  }
}