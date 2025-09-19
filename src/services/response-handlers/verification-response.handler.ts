/**
 * Verification response handler for standardized response processing
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createSuccessResponse, createErrorResponse, createEmergencyResponse } from "../response-handler";
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { safetyFilterService } from "@/services/llm/safety-filter";

export class VerificationResponseHandler extends StandardResponseHandler {
  constructor() {
    super("verification", 10); // High priority for verification
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing verification response", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        verificationStatus: context.verificationStatus,
        operation: "verification_response"
      });

      // Check if patient is actually pending verification
      if (context.verificationStatus !== "pending_verification") {
        return createErrorResponse(
          "Patient is not pending verification",
          "Invalid verification state",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "verification_handler",
            action: "invalid_state"
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
            source: "verification_handler",
            action: "patient_not_found"
          }
        );
      }

      const patientData = patient[0];

      // Build conversation context for safety analysis
      const conversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: [],
        patientInfo: {
          name: patientData.name,
          verificationStatus: patientData.verificationStatus,
          activeReminders: []
        }
      };

      // Check for emergency content
      const { emergencyResult, safetyResult } = await safetyFilterService.analyzePatientMessage(
        context.message,
        conversationContext
      );

      if (emergencyResult.isEmergency) {
        logger.warn("Emergency detected in verification response", {
          patientId: context.patientId,
          emergencyConfidence: emergencyResult.confidence,
          emergencyIndicators: emergencyResult.indicators,
          operation: "verification_emergency"
        });

        // Emergency is already handled by safety filter (volunteer notification sent)
        return createEmergencyResponse(
          "Emergency detected during verification - volunteer notified",
          context.patientId,
          emergencyResult.indicators,
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "verification_handler",
            action: "emergency_detected",
            emergencyDetected: true,
            escalated: safetyResult.escalationRequired
          }
        );
      }

      // Process verification response
      const message = context.message.toLowerCase();
      let verificationStatus: "VERIFIED" | "DECLINED" | "EXPIRED";
      let responseMessage: string;

      if (message.includes("ya") || message.includes("sudah") || message.includes("benar")) {
        verificationStatus = "VERIFIED";
        responseMessage = `✅ *Verifikasi Berhasil*\n\nTerima kasih ${patientData.name}! Nomor WhatsApp Anda telah berhasil diverifikasi.\n\nSekarang Anda dapat menerima pengingat dan layanan kesehatan lainnya dari PRIMA.\n\n💙 Tim PRIMA`;
      } else if (message.includes("tidak") || message.includes("belum") || message.includes("salah")) {
        verificationStatus = "DECLINED";
        responseMessage = `❌ *Verifikasi Dibatalkan*\n\nMaaf ${patientData.name}, verifikasi dibatalkan sesuai permintaan Anda.\n\nJika ini adalah kesalahan, silakan hubungi relawan kami untuk bantuan.\n\n💙 Tim PRIMA`;
      } else {
        // Unrecognized response
        return createErrorResponse(
          "Unrecognized verification response",
          "Response could not be understood",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "verification_handler",
            action: "unrecognized_response"
          }
        );
      }

      // Update patient verification status
      await db
        .update(patients)
        .set({
          verificationStatus,
          verificationResponseAt: getWIBTime(),
          verificationMessage: context.message,
          updatedAt: getWIBTime()
        })
        .where(eq(patients.id, context.patientId));

      // Verification logs table was removed from schema
      // Log verification response using logger instead
      logger.info("Verification response logged", {
        patientId: context.patientId,
        action: "RESPONSE_RECEIVED",
        verificationResult: verificationStatus,
        processedBy: context.patientId
      });

      logger.info("Verification response processed successfully", {
        patientId: context.patientId,
        verificationStatus,
        processingTimeMs: Date.now() - startTime,
        operation: "verification_completed"
      });

      return createSuccessResponse(
        "Verification response processed successfully",
        {
          verificationStatus,
          patientName: patientData.name,
          responseMessage
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "verification_handler",
          action: "verification_completed"
        }
      );

    } catch (error) {
      logger.error("Failed to process verification response", error instanceof Error ? error : new Error(String(error)), {
        patientId: context.patientId,
        operation: "verification_response"
      });

      return createErrorResponse(
        "Failed to process verification response",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "verification_handler",
          action: "processing_error"
        }
      );
    }
  }
}