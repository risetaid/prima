/**
 * Unsubscribe response handler for LLM-powered unsubscribe intent recognition and processing
 */

import {
  StandardResponseHandler,
  ResponseContext,
  StandardResponse,
  createSuccessResponse,
  createErrorResponse,
  createEmergencyResponse,
} from "../response-handler";
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { safetyFilterService } from "@/services/llm/safety-filter";
import { llmService } from "@/services/llm/llm.service";
import { getUnsubscribePrompt } from "@/services/llm/prompts";
import { ConversationContext } from "@/services/llm/llm.types";

export interface UnsubscribeAnalysisResult {
  intent: "BERHENTI" | "LANJUTKAN" | "TIDAK_PASTI";
  confidence: number;
  reason?: string;
  urgency: "tinggi" | "sedang" | "rendah";
  needsHumanHelp: boolean;
  confirmationRequired: boolean;
  sentiment: "positif" | "netral" | "negatif";
}

export class UnsubscribeResponseHandler extends StandardResponseHandler {
  constructor() {
    super("unsubscribe", 15); // High priority for unsubscribe requests
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing unsubscribe request with LLM analysis", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        message: context.message,
        operation: "unsubscribe_analysis",
      });

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
            source: "unsubscribe_handler",
            action: "patient_not_found",
          }
        );
      }

      const patientData = patient[0];

      // Build conversation context for LLM analysis
      const conversationContext: ConversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: [],
        patientInfo: {
          name: patientData.name,
          verificationStatus: patientData.verificationStatus,
          activeReminders: [],
        },
        conversationId: `unsubscribe_${Date.now()}`,
      };

      // Check for emergency content first
      const { emergencyResult, safetyResult } =
        await safetyFilterService.analyzePatientMessage(
          context.message,
          conversationContext
        );

      if (emergencyResult.isEmergency) {
        logger.warn("Emergency detected in unsubscribe request", {
          patientId: context.patientId,
          emergencyConfidence: emergencyResult.confidence,
          emergencyIndicators: emergencyResult.indicators,
          operation: "unsubscribe_emergency",
        });

        return createEmergencyResponse(
          "Emergency detected during unsubscribe request - volunteer notified",
          context.patientId,
          emergencyResult.indicators,
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "unsubscribe_handler",
            action: "emergency_detected",
            emergencyDetected: true,
            escalated: safetyResult.escalationRequired,
          }
        );
      }

      // Perform LLM analysis for unsubscribe intent
      const unsubscribeAnalysis = await this.performLLMUnsubscribeAnalysis(
        context.message,
        conversationContext
      );

      logger.info("LLM unsubscribe analysis completed", {
        patientId: context.patientId,
        analysisResult: unsubscribeAnalysis,
        processingTimeMs: Date.now() - startTime,
        operation: "llm_analysis_completed",
      });

      // Process based on LLM analysis
      if (unsubscribeAnalysis.intent === "BERHENTI") {
        return await this.processUnsubscribeRequest(
          context,
          patientData,
          unsubscribeAnalysis,
          startTime
        );
      } else if (unsubscribeAnalysis.intent === "LANJUTKAN") {
        return await this.processContinueRequest(
          context,
          patientData,
          unsubscribeAnalysis,
          startTime
        );
      } else {
        // TIDAK_PASTI - needs clarification
        return await this.processUnclearRequest(
          context,
          patientData,
          unsubscribeAnalysis,
          startTime
        );
      }
    } catch (error) {
      logger.error(
        "Failed to process unsubscribe request",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: context.patientId,
          operation: "unsubscribe_analysis",
        }
      );

      return createErrorResponse(
        "Failed to process unsubscribe request",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "unsubscribe_handler",
          action: "processing_error",
        }
      );
    }
  }

  /**
   * Perform LLM analysis for unsubscribe intent
   */
  private async performLLMUnsubscribeAnalysis(
    message: string,
    context: ConversationContext
  ): Promise<UnsubscribeAnalysisResult> {
    try {
      const prompt = getUnsubscribePrompt(context);
      const llmRequest = {
        messages: [
          { role: "system" as const, content: prompt.systemPrompt },
          { role: "user" as const, content: message },
        ],
        maxTokens: prompt.maxTokens,
        temperature: prompt.temperature,
      };

      const response = await llmService.generateResponse(llmRequest);
      const parsedResponse = JSON.parse(response.content);

      return {
        intent: parsedResponse.response || "TIDAK_PASTI",
        confidence: parsedResponse.confidence || 0.5,
        reason: parsedResponse.reason || undefined,
        urgency: parsedResponse.urgency || "sedang",
        needsHumanHelp: parsedResponse.needs_human_help || false,
        confirmationRequired: parsedResponse.confirmation_required || false,
        sentiment: parsedResponse.sentiment || "netral",
      };
    } catch (error) {
      logger.error(
        "LLM unsubscribe analysis failed",
        error instanceof Error ? error : new Error(String(error))
      );

      // Fallback analysis
      return this.performFallbackAnalysis(message);
    }
  }

  /**
   * Fallback analysis when LLM fails
   */
  private performFallbackAnalysis(message: string): UnsubscribeAnalysisResult {
    const normalizedMessage = message.toLowerCase();

    // Simple keyword-based fallback
    const strongUnsubscribeIndicators = [
      "berhenti",
      "stop",
      "matikan",
      "hentikan",
      "tidak mau lagi",
    ];
    const softUnsubscribeIndicators = [
      "sudah sembuh",
      "tidak sakit lagi",
      "cukup",
      "keluar",
    ];

    const hasStrongIndicator = strongUnsubscribeIndicators.some((indicator) =>
      normalizedMessage.includes(indicator)
    );

    const hasSoftIndicator = softUnsubscribeIndicators.some((indicator) =>
      normalizedMessage.includes(indicator)
    );

    if (hasStrongIndicator) {
      return {
        intent: "BERHENTI",
        confidence: 0.8,
        reason: "Strong unsubscribe indicator detected",
        urgency: "sedang",
        needsHumanHelp: false,
        confirmationRequired: true,
        sentiment: "negatif",
      };
    } else if (hasSoftIndicator) {
      return {
        intent: "BERHENTI",
        confidence: 0.6,
        reason: "Soft unsubscribe indicator detected",
        urgency: "rendah",
        needsHumanHelp: false,
        confirmationRequired: true,
        sentiment: "netral",
      };
    } else {
      return {
        intent: "TIDAK_PASTI",
        confidence: 0.5,
        reason: "Unclear intent detected",
        urgency: "rendah",
        needsHumanHelp: false,
        confirmationRequired: false,
        sentiment: "netral",
      };
    }
  }

  /**
   * Process unsubscribe request
   */
  private async processUnsubscribeRequest(
    context: ResponseContext,
    patientData: {
      name: string;
      isActive: boolean;
      verificationStatus: string;
    },
    analysis: UnsubscribeAnalysisResult,
    startTime: number
  ): Promise<StandardResponse> {
    // If confirmation required, send confirmation request
    if (analysis.confirmationRequired && analysis.confidence < 0.9) {
      return createSuccessResponse(
        "Confirmation required for unsubscribe request",
        {
          requiresConfirmation: true,
          confirmationMessage: `🤔 *Konfirmasi Penghentian Layanan*\n\nHalo ${
            patientData.name
          }, kami ingin memastikan bahwa Anda ingin berhenti dari layanan PRIMA.\n\nAlasan: ${
            analysis.reason || "Tidak disebutkan"
          }\n\nJika Anda yakin ingin berhenti, balas dengan "YA, BERHENTI".\n\nJika ingin melanjutkan layanan, balas "LANJUTKAN".\n\n💙 Tim PRIMA`,
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "unsubscribe_handler",
          action: "confirmation_required",
          analysisResult: analysis,
        }
      );
    }

    // Process unsubscribe
    await db
      .update(patients)
      .set({
        isActive: false,
        verificationStatus: "DECLINED",
        unsubscribedAt: getWIBTime(),
        unsubscribeReason: analysis.reason,
        updatedAt: getWIBTime(),
      })
      .where(eq(patients.id, context.patientId));

    // Verification logs table was removed from schema
    // Log unsubscribe event using logger instead
    logger.info("Unsubscribe event logged", {
      patientId: context.patientId,
      action: "UNSUBSCRIBE",
      verificationResult: "declined",
      processedBy: "llm_analysis",
      analysis: analysis,
      method: "llm_powered"
    });

    logger.info("Patient unsubscribed successfully via LLM analysis", {
      patientId: context.patientId,
      analysis,
      processingTimeMs: Date.now() - startTime,
      operation: "unsubscribe_completed",
    });

    return createSuccessResponse(
      "Unsubscribe request processed successfully",
      {
        unsubscribed: true,
        responseMessage: `🛑 *Berhenti dari Layanan PRIMA*\n\nTerima kasih ${
          patientData.name
        } atas kepercayaan Anda selama ini.\n\nKami menghormati keputusan Anda untuk berhenti dari layanan pengingat dan dukungan kesehatan PRIMA.\n\n${
          analysis.reason ? `Alasan: ${analysis.reason}\n\n` : ""
        }Jika suatu saat nanti Anda atau orang terdekat membutuhkan dukungan kesehatan, PRIMA akan selalu siap membantu.\n\nJangan ragu untuk menghubungi kami kembali kapan saja.\n\nSemoga Anda selalu sehat dan berbahagia! 🙏💙\n\n---\nPRIMA - Palliative Remote Integrated Monitoring and Assistance`,
      },
      {
        patientId: context.patientId,
        processingTimeMs: Date.now() - startTime,
        source: "unsubscribe_handler",
        action: "unsubscribe_completed",
        analysisResult: analysis,
      }
    );
  }

  /**
   * Process continue request (patient wants to keep using service)
   */
  private async processContinueRequest(
    context: ResponseContext,
    patientData: {
      name: string;
      isActive: boolean;
      verificationStatus: string;
    },
    analysis: UnsubscribeAnalysisResult,
    startTime: number
  ): Promise<StandardResponse> {
    logger.info("Patient chose to continue service", {
      patientId: context.patientId,
      analysis,
      operation: "continue_service",
    });

    return createSuccessResponse(
      "Continue request processed successfully",
      {
        unsubscribed: false,
        responseMessage: `✅ *Layanan PRIMA Dilanjutkan*\n\nTerima kasih ${patientData.name}! Kami senang Anda masih ingin melanjutkan layanan PRIMA.\n\nAnda akan terus menerima pengingat dan dukungan kesehatan dari kami.\n\nJika ada pertanyaan atau butuh bantuan, jangan ragu untuk menghubungi kami.\n\n💙 Tim PRIMA`,
      },
      {
        patientId: context.patientId,
        processingTimeMs: Date.now() - startTime,
        source: "unsubscribe_handler",
        action: "continue_service",
        analysisResult: analysis,
      }
    );
  }

  /**
   * Process unclear request - needs clarification
   */
  private async processUnclearRequest(
    context: ResponseContext,
    patientData: {
      name: string;
      isActive: boolean;
      verificationStatus: string;
    },
    analysis: UnsubscribeAnalysisResult,
    startTime: number
  ): Promise<StandardResponse> {
    logger.info("Unclear unsubscribe request detected", {
      patientId: context.patientId,
      analysis,
      operation: "unclear_request",
    });

    // If needs human help, escalate
    if (analysis.needsHumanHelp) {
      return createSuccessResponse(
        "Human intervention required for unclear unsubscribe request",
        {
          requiresHumanHelp: true,
          responseMessage: `❓ *Butuh Bantuan*\n\nHalo ${patientData.name}, kami kurang yakin dengan permintaan Anda.\n\nTim kami akan segera menghubungi Anda untuk membantu memahami kebutuhan Anda.\n\nMohon ditunggu ya! 🙏💙\n\n---\nPRIMA - Palliative Remote Integrated Monitoring and Assistance`,
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "unsubscribe_handler",
          action: "human_intervention_required",
          analysisResult: analysis,
        }
      );
    }

    // Otherwise, ask for clarification
    return createSuccessResponse(
      "Clarification needed for unsubscribe request",
      {
        requiresClarification: true,
        responseMessage: `❓ *Mohon Konfirmasi*\n\nHalo ${patientData.name}, mohon maaf kami kurang yakin dengan pesan Anda.\n\nApakah Anda ingin:\n1. BERHENTI dari layanan PRIMA\n2. MELANJUTKAN layanan PRIMA\n\nSilakan balas dengan angka 1 atau 2, atau jelaskan lebih detail kebutuhan Anda.\n\n💙 Tim PRIMA`,
      },
      {
        patientId: context.patientId,
        processingTimeMs: Date.now() - startTime,
        source: "unsubscribe_handler",
        action: "clarification_needed",
        analysisResult: analysis,
      }
    );
  }
}
