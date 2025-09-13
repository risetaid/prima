/**
 * Verification Webhook Service - Simplified patient verification responses from WhatsApp
 *
 * This service handles patient verification responses with a clear, simple flow:
 * 1. Detect response type (unsubscribe > accept > decline > unknown)
 * 2. Process based on patient status
 * 3. Update status and send confirmation
 */

import {
  db,
  patients,
  verificationLogs,
  reminderSchedules,
  reminderLogs,
} from "@/db";
import { eq, and, or, desc } from "drizzle-orm";
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

type ResponseType =
  | "unsubscribe"
  | "accept"
  | "decline"
  | "confirmation_taken"
  | "confirmation_missed"
  | "confirmation_later"
  | "unknown";

export class VerificationWebhookService {
  /**
   * Process a verification webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<VerificationResult> {
    console.log(
      `🔍 WEBHOOK: Processing message from ${payload.sender}: "${payload.message}"`
    );

    try {
      // Validate webhook payload
      const validation = this.validateWebhookPayload(payload);
      if (!validation.valid) {
        console.log(`❌ WEBHOOK: Validation failed - ${validation.error}`);
        return {
          success: false,
          message: validation.error!,
          status: 400,
        };
      }

      // Find patient by phone number
      const patient = await this.findPatientByPhone(payload.sender);
      if (!patient) {
        console.log(`❌ WEBHOOK: No patient found for ${payload.sender}`);
        return {
          success: false,
          message: "No patient found or patient not eligible for this action",
          status: 200,
        };
      }

      console.log(
        `✅ WEBHOOK: Found patient ${patient.name} (status: ${patient.verificationStatus})`
      );

      // Process the verification response
      const result = await this.processVerificationResponse(
        patient,
        payload.message
      );

      console.log(`📋 WEBHOOK: Processing result: ${result}`);
      return {
        success: true,
        message: `Patient response processed successfully`,
        patientId: patient.id,
        result,
        status: 200,
      };
    } catch (error) {
      console.error(`💥 WEBHOOK: Processing error`, error);
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

    const whereClause =
      alternatives.length > 0
        ? or(
            eq(patients.phoneNumber, phone),
            ...alternatives.map((alt) => eq(patients.phoneNumber, alt))
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
   * Process verification response with simplified logic
   */
  private async processVerificationResponse(
    patient: any,
    message: string
  ): Promise<string> {
    console.log(
      `🔍 PROCESSING: "${message}" for ${patient.name} (${patient.verificationStatus})`
    );

    // Detect response type with clear priority
    const responseType = this.detectResponseType(message);
    console.log(`📋 DETECTED: ${responseType}`);

    // Check if this is a confirmation response first
    if (this.isConfirmationResponse(responseType)) {
      console.log(
        `📋 CONFIRMATION: Processing confirmation response for ${patient.name}`
      );
      return await this.handleConfirmationResponse(
        patient,
        message,
        responseType
      );
    }

    // Always log the response
    await this.logResponse(patient, message, responseType);

    // Process based on response type and current patient status
    switch (responseType) {
      case "unsubscribe":
        console.log(
          `🛑 UNSUBSCRIBE: Processing unsubscribe for ${patient.name}`
        );
        return await this.handleUnsubscribe(patient);

      case "accept":
        if (patient.verificationStatus === "pending_verification") {
          console.log(`✅ ACCEPT: Processing acceptance for ${patient.name}`);
          return await this.handleAccept(patient);
        } else {
          console.log(
            `⚠️ ACCEPT: Patient ${patient.name} already ${patient.verificationStatus}`
          );
          return `already_${patient.verificationStatus}`;
        }

      case "decline":
        if (patient.verificationStatus === "pending_verification") {
          console.log(`❌ DECLINE: Processing decline for ${patient.name}`);
          return await this.handleDecline(patient);
        } else {
          console.log(
            `⚠️ DECLINE: Patient ${patient.name} already ${patient.verificationStatus}`
          );
          return `already_${patient.verificationStatus}`;
        }

      default:
        console.log(
          `❓ UNKNOWN: Unknown response "${message}" from ${patient.name}`
        );
        return "unknown_response";
    }
  }

  /**
   * Simple response type detection with clear priority
   */
  private detectResponseType(message: string): ResponseType {
    const normalized = message.toLowerCase().trim();

    // 1. Check for unsubscribe commands (highest priority)
    if (this.isUnsubscribeCommand(normalized)) {
      return "unsubscribe";
    }

    // 2. Check for acceptance (treats "ya/iya/ok" as verification acceptance, not confirmation)
    if (this.isAcceptResponse(normalized)) {
      return "accept";
    }

    // 3. Check for decline
    if (this.isDeclineResponse(normalized)) {
      return "decline";
    }

    // 4. Check for confirmation responses (taken, missed, later)
    if (this.isConfirmationTaken(normalized)) {
      return "confirmation_taken";
    }
    if (this.isConfirmationMissed(normalized)) {
      return "confirmation_missed";
    }
    if (this.isConfirmationLater(normalized)) {
      return "confirmation_later";
    }

    // 5. Unknown
    return "unknown";
  }

  /**
   * Check if message is an unsubscribe command
   */
  private isUnsubscribeCommand(message: string): boolean {
    const unsubscribeWords = [
      "berhenti",
      "stop",
      "cancel",
      "batal",
      "keluar",
      "hapus",
      "unsubscribe",
      "cabut",
      "stop dulu",
      "berhenti dulu",
    ];

    return unsubscribeWords.includes(message);
  }

  /**
   * Check if message indicates acceptance
   */
  private isAcceptResponse(message: string): boolean {
    const acceptWords = [
      "ya",
      "iya",
      "yes",
      "ok",
      "oke",
      "setuju",
      "boleh",
      "baik",
      "siap",
      "mau",
      "ingin",
      "terima",
    ];

    return acceptWords.includes(message);
  }

  /**
   * Check if message indicates decline
   */
  private isDeclineResponse(message: string): boolean {
    const declineWords = [
      "tidak",
      "no",
      "ga",
      "gak",
      "engga",
      "enggak",
      "tolak",
      "nanti",
      "besok",
    ];

    return declineWords.includes(message);
  }

  /**
   * Check if message indicates medication was taken (confirmation)
   */
  private isConfirmationTaken(message: string): boolean {
    const takenWords = [
      "sudah",
      "minum",
      "telah",
      "udh",
      "done",
      "selesai",
    ];

    return takenWords.includes(message);
  }

  /**
   * Check if message indicates medication was missed (confirmation)
   */
  private isConfirmationMissed(message: string): boolean {
    const missedWords = [
      "belum",
      "blm",
      "tidak",
      "no",
      "ga",
      "gak",
      "engga",
      "enggak",
      "lupa",
      "belum minum",
      "skip",
    ];

    return missedWords.includes(message);
  }

  /**
   * Check if message indicates medication will be taken later (confirmation)
   */
  private isConfirmationLater(message: string): boolean {
    const laterWords = [
      "nanti",
      "besok",
      "sebentar",
      "tunggu",
      "later",
      "wait",
      "bentaran",
    ];

    return laterWords.includes(message);
  }

  /**
   * Check if response type is a confirmation response
   */
  private isConfirmationResponse(responseType: ResponseType): boolean {
    return [
      "confirmation_taken",
      "confirmation_missed",
      "confirmation_later",
    ].includes(responseType);
  }

  /**
   * Handle unsubscribe request
   */
  private async handleUnsubscribe(patient: any): Promise<string> {
    console.log(
      `🛑 UNSUBSCRIBE: Starting unsubscribe process for ${patient.name}`
    );

    try {
      // Update patient status to declined + deactivate
      console.log(`🔄 UNSUBSCRIBE: Updating patient status...`);
      await this.updatePatientStatus(patient, "unsubscribed");
      console.log(`✅ UNSUBSCRIBE: Patient status updated`);

      // Deactivate all reminders
      console.log(`🔕 UNSUBSCRIBE: Deactivating reminders...`);
      await this.deactivatePatientReminders(patient);
      console.log(`✅ UNSUBSCRIBE: Reminders deactivated`);

      // Send confirmation message
      console.log(`📤 UNSUBSCRIBE: Sending confirmation message...`);
      await this.sendConfirmationMessage(
        patient,
        "unsubscribed",
        patient.phoneNumber
      );
      console.log(`✅ UNSUBSCRIBE: Confirmation message sent`);

      console.log(`✅ UNSUBSCRIBE: Successfully processed for ${patient.name}`);
      return "unsubscribed";
    } catch (error) {
      console.error(
        `💥 UNSUBSCRIBE: Error processing unsubscribe for ${patient.name}`,
        error
      );
      console.error(`💥 UNSUBSCRIBE: Error details:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        patientId: patient.id,
        patientName: patient.name,
      });
      throw error;
    }
  }

  /**
   * Handle acceptance
   */
  private async handleAccept(patient: any): Promise<string> {
    try {
      // Update patient status to verified
      await this.updatePatientStatus(patient, "verified");

      // Send confirmation message
      await this.sendConfirmationMessage(
        patient,
        "verified",
        patient.phoneNumber
      );

      console.log(`✅ ACCEPT: Successfully processed for ${patient.name}`);
      return "verified";
    } catch (error) {
      console.error(
        `💥 ACCEPT: Error processing acceptance for ${patient.name}`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle decline
   */
  private async handleDecline(patient: any): Promise<string> {
    try {
      // Update patient status to declined
      await this.updatePatientStatus(patient, "declined");

      // Send confirmation message
      await this.sendConfirmationMessage(
        patient,
        "declined",
        patient.phoneNumber
      );

      console.log(`✅ DECLINE: Successfully processed for ${patient.name}`);
      return "declined";
    } catch (error) {
      console.error(
        `💥 DECLINE: Error processing decline for ${patient.name}`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle confirmation response (medication taken/missed/later)
   */
  private async handleConfirmationResponse(
    patient: any,
    message: string,
    responseType: ResponseType
  ): Promise<string> {
    try {
      console.log(
        `📋 CONFIRMATION: Processing ${responseType} for ${patient.name}`
      );

      // Find the most recent pending confirmation for this patient
      const recentConfirmation = await db
        .select()
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patient.id),
            eq(reminderLogs.confirmationStatus, "PENDING")
          )
        )
        .orderBy(desc(reminderLogs.confirmationSentAt))
        .limit(1);

      if (!recentConfirmation.length) {
        console.log(
          `⚠️ CONFIRMATION: No pending confirmation found for ${patient.name}`
        );
        return "no_pending_confirmation";
      }

      const confirmationLog = recentConfirmation[0];
      const confirmationStatus =
        this.mapConfirmationResponseToStatus(responseType);

      // Update the confirmation log
      await db
        .update(reminderLogs)
        .set({
          confirmationStatus,
          confirmationResponse: message,
          confirmationResponseAt: new Date(),
        })
        .where(eq(reminderLogs.id, confirmationLog.id));

      // Send confirmation acknowledgment
      await this.sendConfirmationAcknowledgment(
        patient,
        responseType,
        confirmationLog.confirmationMessage || ""
      );

      console.log(
        `✅ CONFIRMATION: Successfully processed ${responseType} for ${patient.name}`
      );
      return `confirmation_${confirmationStatus.toLowerCase()}`;
    } catch (error) {
      console.error(
        `💥 CONFIRMATION: Error processing confirmation for ${patient.name}`,
        error
      );
      throw error;
    }
  }

  /**
   * Log response to database
   */
  private async logResponse(
    patient: any,
    message: string,
    responseType: ResponseType
  ): Promise<void> {
    const action =
      responseType === "unknown" ? "message_received" : "responded";
    const verificationResult = this.mapResponseTypeToResult(
      responseType,
      patient.verificationStatus
    );

    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action,
      patientResponse: message,
      verificationResult,
    });

    console.log(`📝 LOGGED: ${action} - ${responseType} for ${patient.name}`);
  }

  /**
   * Map response type to verification result
   */
  private mapResponseTypeToResult(
    responseType: ResponseType,
    currentStatus: string
  ): "verified" | "declined" | "pending_verification" {
    switch (responseType) {
      case "unsubscribe":
        return "declined"; // Unsubscribe sets status to declined
      case "accept":
        return "verified";
      case "decline":
        return "declined";
      default:
        return currentStatus as
          | "verified"
          | "declined"
          | "pending_verification";
    }
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
      console.log(`🔄 STATUS: Setting ${patient.name} to declined + inactive`);
    }

    console.log(
      `💾 DB UPDATE: ${patient.name} from ${patient.verificationStatus} to ${updateData.verificationStatus}`
    );

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patient.id));

    // Invalidate cache
    await invalidateAfterPatientOperation(patient.id, "update");

    console.log(`✅ DB UPDATED: ${patient.name} status changed successfully`);
  }

  /**
   * Deactivate all reminders for unsubscribed patient
   */
  private async deactivatePatientReminders(patient: any) {
    console.log(`🔕 REMINDERS: Deactivating reminders for ${patient.name}`);

    try {
      const result = await db
        .update(reminderSchedules)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(reminderSchedules.patientId, patient.id));

      console.log(`✅ REMINDERS: Successfully deactivated for ${patient.name}`);
    } catch (error) {
      console.error(
        `💥 REMINDERS: Error deactivating reminders for ${patient.name}`,
        error
      );
      // Don't throw - reminder deactivation failure shouldn't stop unsubscribe
      console.warn(
        `⚠️ REMINDERS: Continuing unsubscribe despite reminder deactivation error`
      );
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

    console.log(
      `📤 MESSAGE: Sending ${status} confirmation to ${patient.name}`
    );

    try {
      const fonnte_token = process.env.FONNTE_TOKEN;
      if (!fonnte_token) {
        console.warn(
          `⚠️ MESSAGE: FONNTE_TOKEN not configured, skipping message to ${phoneNumber}`
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

      if (!response.ok) {
        console.warn(
          `⚠️ MESSAGE: Failed to send to ${phoneNumber}, status: ${response.status}`
        );
      } else {
        console.log(
          `✅ MESSAGE: Successfully sent ${status} confirmation to ${patient.name}`
        );
      }
    } catch (error) {
      console.error(`💥 MESSAGE: Error sending to ${patient.name}`, error);
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
      return `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑

Semua pengingat obat telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.

Jika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.

Semoga sehat selalu! 🙏💙`;
    }

    return "";
  }

  /**
   * Map confirmation response type to confirmation status
   */
  private mapConfirmationResponseToStatus(
    responseType: ResponseType
  ): "CONFIRMED" | "MISSED" | "UNKNOWN" {
    switch (responseType) {
      case "confirmation_taken":
        return "CONFIRMED";
      case "confirmation_missed":
        return "MISSED";
      case "confirmation_later":
        return "UNKNOWN"; // Will be taken later
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Send confirmation acknowledgment message
   */
  private async sendConfirmationAcknowledgment(
    patient: any,
    responseType: ResponseType,
    originalMessage: string
  ): Promise<void> {
    const acknowledgmentMessage = this.generateConfirmationAcknowledgment(
      patient,
      responseType,
      originalMessage
    );

    if (!acknowledgmentMessage) return;

    console.log(
      `📤 CONFIRMATION ACK: Sending acknowledgment to ${patient.name}`
    );

    try {
      const fonnte_token = process.env.FONNTE_TOKEN;
      if (!fonnte_token) {
        console.warn(
          `⚠️ CONFIRMATION ACK: FONNTE_TOKEN not configured, skipping message to ${patient.phoneNumber}`
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
          target: patient.phoneNumber,
          message: acknowledgmentMessage,
          countryCode: "62",
        }),
      });

      if (!response.ok) {
        console.warn(
          `⚠️ CONFIRMATION ACK: Failed to send to ${patient.phoneNumber}, status: ${response.status}`
        );
      } else {
        console.log(
          `✅ CONFIRMATION ACK: Successfully sent acknowledgment to ${patient.name}`
        );
      }
    } catch (error) {
      console.error(
        `💥 CONFIRMATION ACK: Error sending to ${patient.name}`,
        error
      );
    }
  }

  /**
   * Generate confirmation acknowledgment message
   */
  private generateConfirmationAcknowledgment(
    patient: any,
    responseType: ResponseType,
    originalMessage: string
  ): string {
    const baseMessage = `Terima kasih atas konfirmasinya, ${patient.name}! 🙏`;

    if (responseType === "confirmation_taken") {
      return `${baseMessage}

Bagus! Terus jaga kesehatan ya. 💊❤️`;
    } else if (responseType === "confirmation_missed") {
      return `${baseMessage}

Jangan lupa minum obat berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙`;
    } else if (responseType === "confirmation_later") {
      return `${baseMessage}

Baik, jangan lupa minum obatnya ya. Semoga sehat selalu! 💊`;
    }

    return "";
  }
}
