/**
 * Followup response handler for standardized response processing
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createSuccessResponse, createErrorResponse, createEmergencyResponse } from "../response-handler";
import { db, patients, reminderFollowups } from "@/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { safetyFilterService } from "@/services/llm/safety-filter";
import { FollowupService } from "../reminder/followup.service";

export class FollowupResponseHandler extends StandardResponseHandler {
  private followupService: FollowupService;

  constructor() {
    super("followup_response", 20); // Lower priority than verification and medication
    this.followupService = new FollowupService();
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing followup response", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        verificationStatus: context.verificationStatus,
        operation: "followup_response"
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

      // Process the followup response with emergency detection using the existing service
      const result = await this.followupService.processFollowupResponse(
        context.patientId,
        context.phoneNumber,
        context.message,
        followup.id
      );

      logger.info("Followup response processed", {
        patientId: context.patientId,
        followupId: followup.id,
        emergencyDetected: result.emergencyDetected,
        escalated: result.escalated,
        processed: result.processed,
        processingTimeMs: Date.now() - startTime,
        operation: "followup_completed"
      });

      // Return appropriate response based on processing result
      if (result.emergencyDetected) {
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
            escalated: result.escalated
          }
        );
      }

      return createSuccessResponse(
        "Followup response processed successfully",
        {
          followupId: followup.id,
          followupType: followup.followupType,
          patientName: patientData.name,
          response: result.response,
          processed: result.processed,
          escalated: result.escalated
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "followup_handler",
          action: result.emergencyDetected ? "emergency_detected" : "followup_responded",
          emergencyDetected: result.emergencyDetected,
          escalated: result.escalated
        }
      );

    } catch (error) {
      logger.error("Failed to process followup response", error instanceof Error ? error : new Error(String(error)), {
        patientId: context.patientId,
        operation: "followup_response"
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
}