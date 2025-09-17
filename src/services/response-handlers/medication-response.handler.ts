/**
 * Medication reminder response handler for standardized response processing
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createSuccessResponse, createErrorResponse, createEmergencyResponse } from "../response-handler";
import { db, patients, reminderLogs, reminderSchedules } from "@/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { safetyFilterService } from "@/services/llm/safety-filter";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { MedicationParser } from "@/lib/medication-parser";
import { generateFromTemplate, createMedicationContext } from "@/services/llm/response-templates";
import { resolveMedicationNameWithFallback } from "@/lib/medication-fallback";

export class MedicationResponseHandler extends StandardResponseHandler {
  private whatsappService: WhatsAppService;

  constructor() {
    super("medication_reminder", 15); // High priority, after verification
    this.whatsappService = new WhatsAppService();
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
      if (context.verificationStatus !== "verified") {
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

      // Find recent reminder logs that need confirmation
      const recentReminders = await db
        .select({
          id: reminderLogs.id,
          reminderScheduleId: reminderLogs.reminderScheduleId,
          message: reminderLogs.message,
          sentAt: reminderLogs.sentAt,
          status: reminderLogs.status,
          scheduledTime: reminderSchedules.scheduledTime,
          medicationName: reminderSchedules.customMessage
        })
        .from(reminderLogs)
        .leftJoin(reminderSchedules, eq(reminderLogs.reminderScheduleId, reminderSchedules.id))
        .where(
          and(
            eq(reminderLogs.patientId, context.patientId),
            eq(reminderLogs.status, "SENT"),
            isNull(reminderLogs.confirmationResponse),
            gt(reminderLogs.sentAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Within last 24 hours
          )
        )
        .orderBy(reminderLogs.sentAt)
        .limit(1);

      if (recentReminders.length === 0) {
        return createErrorResponse(
          "No active reminders found",
          "No recent reminders require confirmation",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "medication_handler",
            action: "no_reminders"
          }
        );
      }

      const reminder = recentReminders[0];

      // Build conversation context for safety analysis
      const safetyContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: [],
        patientInfo: {
          name: patientData.name,
          verificationStatus: patientData.verificationStatus,
          activeReminders: [{
            // Parse structured medication data for safety analysis
            medicationDetails: MedicationParser.parseFromReminder(
              reminder.medicationName || undefined,
              undefined
            ),
            medicationName: reminder.medicationName || "obat",
            scheduledTime: reminder.scheduledTime
          }]
        }
      };

      // Check for emergency content
      const { emergencyResult, safetyResult } = await safetyFilterService.analyzePatientMessage(
        context.message,
        safetyContext
      );

      if (emergencyResult.isEmergency) {
        logger.warn("Emergency detected in medication response", {
          patientId: context.patientId,
          emergencyConfidence: emergencyResult.confidence,
          emergencyIndicators: emergencyResult.indicators,
          operation: "medication_emergency"
        });

        // Emergency is already handled by safety filter (volunteer notification sent)
        return createEmergencyResponse(
          "Emergency detected in medication response - volunteer notified",
          context.patientId,
          emergencyResult.indicators,
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "medication_handler",
            action: "emergency_detected",
            emergencyDetected: true,
            escalated: safetyResult.escalationRequired
          }
        );
      }

      // Parse medication details with intelligent fallback
      const parsedMedicationDetails = MedicationParser.parseFromReminder(
        reminder.medicationName || undefined,
        reminder.medicationName || undefined
      );

      // Enhanced medication name resolution with fallback
      const medicationResolution = resolveMedicationNameWithFallback(
        context.patientId,
        parsedMedicationDetails.name || reminder.medicationName || 'obat',
        [parsedMedicationDetails],
        [],
        [],
        parsedMedicationDetails
      );

      // Use resolved medication name with confidence-based fallback
      const medicationName = medicationResolution.success ?
        medicationResolution.medicationName : parsedMedicationDetails.name || 'obat';

      // Build medication context for enhanced template generation
      const medicationContext = createMedicationContext(parsedMedicationDetails);

      // Process medication response using enhanced templates
      const message = context.message.toLowerCase();
      let confirmationStatus: "CONFIRMED" | "MISSED" | "UNKNOWN";
      let responseMessage: string;
      let action: string;
      let templateIntent: string;

      if (message.includes("sudah") || message.includes("minum") || message.includes("selesai") || message.includes("ya")) {
        confirmationStatus = "CONFIRMED";
        templateIntent = "medication_confirmation";
        action = "medication_confirmed";
      } else if (message.includes("belum") || message.includes("lupa") || message.includes("nanti") || message.includes("tidak")) {
        confirmationStatus = "MISSED";
        templateIntent = "medication_missed";
        action = "medication_extended";
      } else if (message.includes("tolong") || message.includes("bantuan") || message.includes("sakit") || message.includes("nyeri")) {
        confirmationStatus = "UNKNOWN";
        templateIntent = "medication_help";
        action = "medication_help_requested";
      } else {
        // Unrecognized response
        confirmationStatus = "UNKNOWN";
        templateIntent = "general_inquiry";
        action = "medication_unknown_response";
      }

      // Generate response using enhanced template system
      const templateConversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: [],
        patientInfo: {
          name: patientData.name,
          verificationStatus: patientData.verificationStatus,
        },
        message: context.message,
      };

      const templateContextData = {
        patientName: patientData.name,
        intent: templateIntent,
        confidence: 1.0,
        conversationHistory: 0,
        hasActiveReminders: true,
        verificationStatus: patientData.verificationStatus,
        medicationContext,
        medicationDetails: parsedMedicationDetails,
      };

      // Generate personalized response using template
      const templateResponse = generateFromTemplate(templateIntent, templateConversationContext, templateContextData);

      // Use template response if available, otherwise fallback to original logic
      if (templateResponse) {
        responseMessage = templateResponse;
      } else {
        // Fallback to original response generation
        if (confirmationStatus === "CONFIRMED") {
          responseMessage = `💚 *Konfirmasi Berhasil*\n\nBagus sekali ${patientData.name}! Terima kasih sudah mengonfirmasi bahwa Anda telah minum ${medicationName}.\n\nJaga kesehatan Anda dan jangan ragu untuk hubungi kami jika ada yang bisa dibantu.\n\n💙 Tim PRIMA`;
        } else if (confirmationStatus === "MISSED") {
          responseMessage = `⏰ *Pengingat Diperpanjang*\n\nBaik ${patientData.name}, tidak masalah. Jangan lupa minum ${medicationName} ya!\n\nKami akan mengingatkan lagi nanti. Tetap jaga kesehatan Anda! 💊\n\n💙 Tim PRIMA`;
        } else if (confirmationStatus === "UNKNOWN" && action === "medication_help_requested") {
          responseMessage = `🤝 *Bantuan Diperlukan*\n\nBaik ${patientData.name}, relawan kami akan segera menghubungi Anda untuk membantu.\n\nApakah terkait ${medicationName}? Tunggu sebentar ya! Kami siap membantu Anda.\n\n💙 Tim PRIMA`;
        } else {
          responseMessage = `❓ *Respons Tidak Dikenali*\n\nMaaf ${patientData.name}, kami tidak mengerti respons Anda.\n\nBalas dengan "SUDAH" jika sudah minum ${medicationName}, atau "BELUM" jika belum.\n\n💙 Tim PRIMA`;
        }
      }

      // Update reminder log
      await db
        .update(reminderLogs)
        .set({
          confirmationStatus,
          confirmationResponse: context.message,
          confirmationResponseAt: getWIBTime(),
          confirmationMessage: responseMessage
        })
        .where(eq(reminderLogs.id, reminder.id));

      logger.info("Medication response processed successfully", {
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