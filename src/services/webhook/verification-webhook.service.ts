/**
 * Verification Webhook Service - Handles patient verification responses from WhatsApp
 *
 * This service centralizes all logic for processing patient verification responses
 * received via WhatsApp webhooks, making the webhook handler much cleaner and testable.
 */

import { db, patients, verificationLogs, reminderSchedules } from "@/db";
import { eq, and, or } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendWhatsAppMessage } from "@/lib/fonnte";
import { invalidateAfterPatientOperation } from "@/lib/cache-invalidation";
import { generatePhoneAlternatives } from "@/lib/phone-utils";

export interface WebhookPayload {
  device: string;
  sender: string;
  message: string;
  name?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  patientId?: string;
  result?: string;
  status?: number;
}

export class VerificationWebhookService {
  /**
   * Process a verification webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<VerificationResult> {
    try {
      // Validate webhook payload
      const validation = this.validateWebhookPayload(payload);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error!,
          status: 400,
        };
      }

      // Find patient by phone number
      const patient = await this.findPatientByPhone(payload.sender);
      if (!patient) {
        return {
          success: false,
          message: "No patient found or patient not eligible for this action",
          status: 200,
        };
      }

      // Process the verification response
      const result = await this.processVerificationResponse(
        patient,
        payload.message
      );

      return {
        success: true,
        message: `Verification ${result} processed`,
        patientId: patient.id,
        result,
        status: 200,
      };
    } catch (error) {
      logger.error(
        "Verification webhook processing error",
        error instanceof Error ? error : new Error(String(error)),
        {
          api: true,
          webhooks: true,
          verification: true,
          operation: "webhook_processing",
          sender: payload.sender,
        }
      );

      return {
        success: false,
        message: "Internal server error",
        status: 500,
      };
    }
  }

  /**
   * Validate webhook payload structure
   */
  private validateWebhookPayload(payload: WebhookPayload): {
    valid: boolean;
    error?: string;
  } {
    if (!payload.sender || !payload.message) {
      logger.warn("Missing required fields in verification webhook", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "validate_webhook_fields",
        hasSender: !!payload.sender,
        hasMessage: !!payload.message,
      });
      return { valid: false, error: "Missing sender or message" };
    }

    return { valid: true };
  }

  /**
   * Find patient by phone number with fallback formats
   */
  private async findPatientByPhone(phone: string) {
    // Use centralized phone utility to get alternative formats
    const alternatives = generatePhoneAlternatives(phone);

    const whereClause = alternatives.length > 0
      ? or(
          eq(patients.phoneNumber, phone),
          ...alternatives.map(alt => eq(patients.phoneNumber, alt))
        )
      : eq(patients.phoneNumber, phone);

    const patientResult = await db
      .select()
      .from(patients)
      .where(and(whereClause, eq(patients.isActive, true)))
      .limit(1);

    return patientResult[0] || null;
  }

  /**
   * Process verification response for a patient
   */
  private async processVerificationResponse(
    patient: any,
    message: string
  ): Promise<string> {
    const response = message.toLowerCase().trim();
    const verificationResult = this.parseVerificationResponse(response);

    logger.info("Processing verification response", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "process_response",
      patientName: patient.name,
      currentStatus: patient.verificationStatus,
      response,
      verificationResult,
    });

    // Handle special cases for already verified/unsubscribed patients
    if (patient.verificationStatus === "verified") {
      await this.logMessageOnly(patient, message, "verified");
      return "verified";
    }

    if (patient.verificationStatus === "unsubscribed") {
      await this.logMessageOnly(patient, message, "unsubscribed");
      return "unsubscribed";
    }

    // Only process if patient is in pending_verification status
    if (patient.verificationStatus !== "pending_verification") {
      await this.logMessageOnly(patient, message, patient.verificationStatus);
      return patient.verificationStatus;
    }

    // Handle unknown responses
    if (!verificationResult) {
      await this.logUnknownResponse(patient, message, response);
      return "pending_verification";
    }

    // Update patient status
    await this.updatePatientStatus(patient, verificationResult);

    // Handle unsubscribe special case
    if (verificationResult === "unsubscribed") {
      await this.deactivatePatientReminders(patient);
    }

    // Send confirmation message
    await this.sendConfirmationMessage(
      patient,
      verificationResult,
      patient.phoneNumber
    );

    return verificationResult;
  }

  /**
   * Parse verification response from message text
   */
  private parseVerificationResponse(message: string): string | null {
    const response = message.toLowerCase().trim();

    // Positive responses
    if (
      ["ya", "iya", "yes", "ok", "setuju", "saya setuju", "oke"].includes(
        response
      )
    ) {
      return "verified";
    }

    // Negative responses
    if (
      ["tidak", "no", "nope", "tolak", "menolak", "ga", "gak"].includes(
        response
      )
    ) {
      return "declined";
    }

    // Stop/cancel responses (unsubscribe)
    if (
      ["berhenti", "stop", "cancel", "batal", "keluar", "hapus"].includes(
        response
      )
    ) {
      return "unsubscribed";
    }

    return null; // Unknown response
  }

  /**
   * Log message without changing patient status
   */
  private async logMessageOnly(
    patient: any,
    message: string,
    currentStatus: string
  ) {
    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: "message_received",
      patientResponse: message,
      verificationResult: currentStatus as
        | "verified"
        | "declined"
        | "pending_verification"
        | "unsubscribed",
    });
  }

  /**
   * Log unknown response
   */
  private async logUnknownResponse(
    patient: any,
    message: string,
    response: string
  ) {
    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: "responded",
      patientResponse: message,
      verificationResult: "pending_verification",
    });

    logger.info("Unknown verification response received", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "unknown_response",
      response,
      patientName: patient.name,
    });
  }

  /**
   * Update patient verification status
   */
  private async updatePatientStatus(patient: any, verificationResult: string) {
    const updateData: any = {
      verificationStatus: verificationResult,
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    };

    // Special handling for unsubscribe
    if (verificationResult === "unsubscribed") {
      updateData.verificationStatus = "declined";
      updateData.isActive = false;
    }

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patient.id));

    // Invalidate cache using systematic approach
    await invalidateAfterPatientOperation(patient.id, "update");

    logger.info("Patient verification status updated", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "status_updated",
      patientName: patient.name,
      fromStatus: patient.verificationStatus,
      toStatus: updateData.verificationStatus,
    });
  }

  /**
   * Deactivate all reminders for unsubscribed patient
   */
  private async deactivatePatientReminders(patient: any) {
    try {
      await db
        .update(reminderSchedules)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(reminderSchedules.patientId, patient.id));
    } catch (error) {
      logger.warn("Failed to deactivate reminders during unsubscribe", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "deactivate_reminders",
        patientId: patient.id,
        patientName: patient.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send confirmation message to patient
   */
  private async sendConfirmationMessage(
    patient: any,
    status: string,
    phoneNumber: string
  ) {
    const message = this.generateConfirmationMessage(patient, status);
    if (!message) return;

    try {
      const fonnte_token = process.env.FONNTE_TOKEN;
      if (!fonnte_token) {
        logger.warn(
          "FONNTE_TOKEN not configured, skipping confirmation message",
          {
            api: true,
            webhooks: true,
            verification: true,
            operation: "send_confirmation",
            phoneNumber,
          }
        );
        return;
      }

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnte_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phoneNumber,
          message: message,
          countryCode: "62",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        logger.warn("Failed to send confirmation message via Fonnte", {
          api: true,
          webhooks: true,
          verification: true,
          operation: "send_confirmation",
          phoneNumber,
          responseStatus: response.status,
          fonnteResult: result,
        });
      }
    } catch (error) {
      logger.warn("Error sending confirmation message", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "send_confirmation",
        phoneNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate confirmation message based on verification result
   */
  private generateConfirmationMessage(patient: any, status: string): string {
    if (status === "verified") {
      return `Terima kasih ${patient.name}! ✅

Anda akan menerima reminder dari relawan PRIMA.

Untuk berhenti, ketik: BERHENTI`;
    } else if (status === "declined") {
      return `Baik ${patient.name}, terima kasih atas responsnya.

Semoga sehat selalu! 🙏`;
    } else if (status === "unsubscribed") {
      return `${patient.name}, Anda telah berhasil berhenti dari layanan PRIMA. 🛑

Semua reminder telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.

Jika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.

Semoga sehat selalu! 🙏💙`;
    }

    return "";
  }
}

