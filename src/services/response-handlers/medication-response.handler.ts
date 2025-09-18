/**
 * Medication reminder response handler for standardized response processing
 * SIMPLIFIED VERSION - Uses unified reminders table
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createSuccessResponse, createErrorResponse } from "../response-handler";
import { db, patients, reminders } from "@/db";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export class MedicationResponseHandler extends StandardResponseHandler {
  constructor() {
    super("medication_reminder", 15); // High priority, after verification
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing medication reminder response", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        verificationStatus: context.verificationStatus,
        operation: "medication_response"
      });

      // Check if patient is verified
      if (context.verificationStatus !== "VERIFIED") {
        return createErrorResponse(
          "Patient is not verified",
          "Patient must be verified to process medication responses",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "medication_handler",
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
            source: "medication_handler",
            action: "patient_not_found"
          }
        );
      }

      const patientData = patient[0];

      // Find active reminders for this patient
      const activeReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, context.patientId),
            eq(reminders.isActive, true)
          )
        )
        .limit(1);

      if (activeReminders.length === 0) {
        return createErrorResponse(
          "No active reminders found",
          "No active reminders found for this patient",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "medication_handler",
            action: "no_reminders"
          }
        );
      }

      const reminder = activeReminders[0];
      const medicationName = reminder.message || "obat";

      // Simple response processing
      const message = context.message.toLowerCase();
      let confirmationStatus: "CONFIRMED" | "MISSED" | "UNKNOWN";
      let responseMessage: string;
      let action: string;

      if (message.includes("sudah") || message.includes("minum") || message.includes("selesai") || message.includes("ya")) {
        confirmationStatus = "CONFIRMED";
        action = "medication_confirmed";
        responseMessage = `💚 *Konfirmasi Berhasil*\n\nBagus sekali ${patientData.name}! Terima kasih sudah mengonfirmasi bahwa Anda telah minum ${medicationName}.\n\nJaga kesehatan Anda dan jangan ragu untuk hubungi kami jika ada yang bisa dibantu.\n\n💙 Tim PRIMA`;
      } else if (message.includes("belum") || message.includes("lupa") || message.includes("nanti") || message.includes("tidak")) {
        confirmationStatus = "MISSED";
        action = "medication_missed";
        responseMessage = `⏰ *Pengingat Diperpanjang*\n\nBaik ${patientData.name}, tidak masalah. Jangan lupa minum ${medicationName} ya!\n\nKami akan mengingatkan lagi nanti. Tetap jaga kesehatan Anda! 💊\n\n💙 Tim PRIMA`;
      } else if (message.includes("tolong") || message.includes("bantuan") || message.includes("sakit") || message.includes("nyeri")) {
        confirmationStatus = "UNKNOWN";
        action = "medication_help_requested";
        responseMessage = `🤝 *Bantuan Diperlukan*\n\nBaik ${patientData.name}, relawan kami akan segera menghubungi Anda untuk membantu.\n\nApakah terkait ${medicationName}? Tunggu sebentar ya! Kami siap membantu Anda.\n\n💙 Tim PRIMA`;
      } else {
        // Unrecognized response
        confirmationStatus = "UNKNOWN";
        action = "medication_unknown_response";
        responseMessage = `❓ *Respons Tidak Dikenali*\n\nMaaf ${patientData.name}, kami tidak mengerti respons Anda.\n\nBalas dengan "SUDAH" jika sudah minum ${medicationName}, atau "BELUM" jika belum.\n\n💙 Tim PRIMA`;
      }

      // Log the response (no database update since we don't have confirmation tracking in simplified version)
      logger.info("Medication response processed", {
        patientId: context.patientId,
        reminderId: reminder.id,
        confirmationStatus,
        action,
        processingTimeMs: Date.now() - startTime,
        operation: "medication_completed"
      });

      return createSuccessResponse(
        "Medication response processed successfully",
        {
          confirmationStatus,
          patientName: patientData.name,
          responseMessage,
          action
        },
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "medication_handler",
          action
        }
      );

    } catch (error) {
      logger.error("Failed to process medication response", error instanceof Error ? error : new Error(String(error)), {
        patientId: context.patientId,
        operation: "medication_response"
      });

      return createErrorResponse(
        "Failed to process medication response",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "medication_handler",
          action: "processing_error"
        }
      );
    }
  }
}
