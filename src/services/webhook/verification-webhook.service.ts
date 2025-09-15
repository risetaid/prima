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
  Patient,
} from "@/db";
import { eq, and, or, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

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
  private responseDetector: ResponseDetector;
  private messageHandler: MessageHandler;
  private databaseHandler: DatabaseHandler;

  constructor() {
    this.responseDetector = new ResponseDetector();
    this.messageHandler = new MessageHandler();
    this.databaseHandler = new DatabaseHandler();
  }

  /**
   * Process a verification webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<VerificationResult> {
    logger.info(
      `🔍 WEBHOOK: Processing message from ${payload.sender}: "${payload.message}"`
    );

    try {
      // Step 1: Validate payload
      const validationResult = this.validateWebhookPayload(payload);
      if (!validationResult.valid) {
        return this.createErrorResult(validationResult.error!, 400);
      }

      // Step 2: Find patient
      const patient = await this.databaseHandler.findPatientByPhone(payload.sender);
      if (!patient) {
        logger.info(`❌ WEBHOOK: No patient found for ${payload.sender}`);
        return this.createErrorResult(
          "No patient found or patient not eligible for this action",
          200
        );
      }

      logger.info(
        `✅ WEBHOOK: Found patient ${patient.name} (status: ${patient.verificationStatus})`
      );

      // Step 3: Process response
      const result = await this.processVerificationResponse(patient, payload.message);

      logger.info(`📋 WEBHOOK: Processing result: ${result}`);
      return {
        success: true,
        message: "Patient response processed successfully",
        patientId: patient.id,
        result,
        status: 200,
      };
    } catch (error) {
      return this.handleProcessingError(error, payload.sender);
    }
  }

  private createErrorResult(message: string, status: number): VerificationResult {
    logger.info(`❌ WEBHOOK: ${message}`);
    return { success: false, message, status };
  }

  private handleProcessingError(error: unknown, sender: string): VerificationResult {
    console.error(`💥 WEBHOOK: Processing error`, error);
    logger.error(
      "Verification webhook processing error",
      error instanceof Error ? error : new Error(String(error)),
      {
        api: true,
        webhooks: true,
        verification: true,
        operation: "webhook_processing",
        sender,
      }
    );
    return { success: false, message: "Internal server error", status: 500 };
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
   * Process verification response with simplified logic
   */
  private async processVerificationResponse(
    patient: Patient,
    message: string
  ): Promise<string> {
    console.log(
      `🔍 PROCESSING: "${message}" for ${patient.name} (${patient.verificationStatus})`
    );

    // Detect response type
    const responseType = this.responseDetector.detectResponseType(message);
    console.log(`📋 DETECTED: ${responseType}`);

    // Handle confirmation responses separately
    if (this.responseDetector.isConfirmationResponse(responseType)) {
      console.log(
        `📋 CONFIRMATION: Processing confirmation response for ${patient.name}`
      );
      return await this.handleConfirmationResponse(patient, message, responseType);
    }

    // Always log the response
    await this.databaseHandler.logResponse(patient, message, responseType);

    // Process based on response type and current patient status
    return await this.processNonConfirmationResponse(patient, responseType);
  }

  private async processNonConfirmationResponse(
    patient: Patient,
    responseType: ResponseType
  ): Promise<string> {
    switch (responseType) {
      case "unsubscribe":
        console.log(`🛑 UNSUBSCRIBE: Processing unsubscribe for ${patient.name}`);
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
          `❓ UNKNOWN: Unknown response from ${patient.name}`
        );
        return "unknown_response";
    }
  }

  private async handleUnsubscribe(patient: Patient): Promise<string> {
    console.log(`🛑 UNSUBSCRIBE: Starting unsubscribe process for ${patient.name}`);

    try {
      await this.databaseHandler.updatePatientStatus(patient, "unsubscribed");
      await this.databaseHandler.deactivatePatientReminders(patient);
      await this.messageHandler.sendConfirmationMessage(patient, "unsubscribed");

      console.log(`✅ UNSUBSCRIBE: Successfully processed for ${patient.name}`);
      return "unsubscribed";
    } catch (error) {
      console.error(`💥 UNSUBSCRIBE: Error processing unsubscribe for ${patient.name}`, error);
      throw error;
    }
  }

  private async handleAccept(patient: Patient): Promise<string> {
    try {
      await this.databaseHandler.updatePatientStatus(patient, "verified");
      await this.messageHandler.sendConfirmationMessage(patient, "verified");

      console.log(`✅ ACCEPT: Successfully processed for ${patient.name}`);
      return "verified";
    } catch (error) {
      console.error(`💥 ACCEPT: Error processing acceptance for ${patient.name}`, error);
      throw error;
    }
  }

  private async handleDecline(patient: Patient): Promise<string> {
    try {
      await this.databaseHandler.updatePatientStatus(patient, "declined");
      await this.messageHandler.sendConfirmationMessage(patient, "declined");

      console.log(`✅ DECLINE: Successfully processed for ${patient.name}`);
      return "declined";
    } catch (error) {
      console.error(`💥 DECLINE: Error processing decline for ${patient.name}`, error);
      throw error;
    }
  }

  private async handleConfirmationResponse(
    patient: Patient,
    message: string,
    responseType: ResponseType
  ): Promise<string> {
    try {
      console.log(`📋 CONFIRMATION: Processing ${responseType} for ${patient.name}`);

      const recentConfirmation = await this.databaseHandler.findRecentPendingConfirmation(patient.id);
      if (!recentConfirmation) {
        console.log(`⚠️ CONFIRMATION: No pending confirmation found for ${patient.name}`);
        return "no_pending_confirmation";
      }

      const confirmationStatus = this.responseDetector.mapConfirmationResponseToStatus(responseType);

      await this.databaseHandler.updateConfirmationLog(recentConfirmation.id, {
        confirmationStatus: confirmationStatus,
        confirmationResponse: message,
        confirmationResponseAt: new Date(),
      });

      await this.messageHandler.sendConfirmationAcknowledgment(
        patient,
        responseType
      );

      console.log(`✅ CONFIRMATION: Successfully processed ${responseType} for ${patient.name}`);
      return `confirmation_${confirmationStatus.toLowerCase()}`;
    } catch (error) {
      console.error(`💥 CONFIRMATION: Error processing confirmation for ${patient.name}`, error);
      throw error;
    }
  }
}

/**
 * Response Detector - Handles response type detection logic
 */
class ResponseDetector {
  detectResponseType(message: string): ResponseType {
    const normalized = message.toLowerCase().trim();

    // 1. Check for unsubscribe commands (highest priority)
    if (this.isUnsubscribeCommand(normalized)) {
      return "unsubscribe";
    }

    // 2. Check for acceptance
    if (this.isAcceptResponse(normalized)) {
      return "accept";
    }

    // 3. Check for decline
    if (this.isDeclineResponse(normalized)) {
      return "decline";
    }

    // 4. Check for confirmation responses
    if (this.isConfirmationTaken(normalized)) {
      return "confirmation_taken";
    }
    if (this.isConfirmationMissed(normalized)) {
      return "confirmation_missed";
    }
    if (this.isConfirmationLater(normalized)) {
      return "confirmation_later";
    }

    return "unknown";
  }

  isConfirmationResponse(responseType: ResponseType): boolean {
    return [
      "confirmation_taken",
      "confirmation_missed",
      "confirmation_later",
    ].includes(responseType);
  }

  mapConfirmationResponseToStatus(
    responseType: ResponseType
  ): "CONFIRMED" | "MISSED" | "UNKNOWN" {
    switch (responseType) {
      case "confirmation_taken":
        return "CONFIRMED";
      case "confirmation_missed":
        return "MISSED";
      case "confirmation_later":
        return "UNKNOWN";
      default:
        return "UNKNOWN";
    }
  }

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
}

/**
 * Message Handler - Handles all WhatsApp message sending logic
 */
class MessageHandler {
  async sendConfirmationMessage(patient: Patient, status: string): Promise<void> {
    const message = this.generateConfirmationMessage(patient, status);
    if (!message) return;

    console.log(
      `📤 MESSAGE: Sending ${status} confirmation to ${patient.name}`
    );

    await this.sendMessage(patient.phoneNumber, message, patient.name);
  }

  async sendConfirmationAcknowledgment(
    patient: Patient,
    responseType: ResponseType
  ): Promise<void> {
    const acknowledgmentMessage = this.generateConfirmationAcknowledgment(
      patient,
      responseType
    );

    if (!acknowledgmentMessage) return;

    console.log(
      `📤 CONFIRMATION ACK: Sending acknowledgment to ${patient.name}`
    );

    await this.sendMessage(patient.phoneNumber, acknowledgmentMessage, patient.name);
  }

  private async sendMessage(phoneNumber: string, message: string, patientName: string): Promise<void> {
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
          `✅ MESSAGE: Successfully sent message to ${patientName}`
        );
      }
    } catch (error) {
      console.error(`💥 MESSAGE: Error sending to ${patientName}`, error);
    }
  }

  private generateConfirmationMessage(patient: Patient, status: string): string {
    if (status === "verified") {
      return `Terima kasih ${patient.name}! ✅

Anda akan menerima reminder dari relawan PRIMA.

Untuk berhenti, ketik: BERHENTI`;
    } else if (status === "declined") {
      return `Baik ${patient.name}, terima kasih atas responsnya.

Semoga sehat selalu! 🙏`;
    } else if (status === "unsubscribed") {
      return `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑

Semua pengingat kesehatan telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.

Jika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.

Semoga sehat selalu! 🙏💙`;
    }

    return "";
  }

  private generateConfirmationAcknowledgment(
    patient: Patient,
    responseType: ResponseType
  ): string {
    const baseMessage = `Terima kasih atas konfirmasinya, ${patient.name}! 🙏`;

    if (responseType === "confirmation_taken") {
      return `${baseMessage}

Bagus! Terus jaga kesehatan ya. 💚❤️`;
    } else if (responseType === "confirmation_missed") {
      return `${baseMessage}

Jangan lupa rutinitas kesehatan berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙`;
    } else if (responseType === "confirmation_later") {
      return `${baseMessage}

Baik, jangan lupa rutinitas kesehatan ya. Semoga sehat selalu! 💚`;
    }

    return "";
  }
}

/**
 * Database Handler - Handles all database operations
 */
class DatabaseHandler {
  async findPatientByPhone(phone: string): Promise<Patient | null> {
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

  async logResponse(
    patient: Patient,
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

  async updatePatientStatus(patient: Patient, verificationResult: string): Promise<void> {
    const updateData: Partial<Patient> = {
      verificationStatus: verificationResult as Patient['verificationStatus'],
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

  async deactivatePatientReminders(patient: Patient): Promise<void> {
    console.log(`🔕 REMINDERS: Deactivating reminders for ${patient.name}`);

    try {
      await db
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

  async findRecentPendingConfirmation(patientId: string) {
    const recentConfirmation = await db
      .select()
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.confirmationStatus, "PENDING")
        )
      )
      .orderBy(desc(reminderLogs.confirmationSentAt))
      .limit(1);

    return recentConfirmation[0] || null;
  }

  async updateConfirmationLog(
    confirmationId: string,
    updates: {
      confirmationStatus: "CONFIRMED" | "MISSED" | "UNKNOWN";
      confirmationResponse: string;
      confirmationResponseAt: Date;
    }
  ): Promise<void> {
    await db
      .update(reminderLogs)
      .set(updates)
      .where(eq(reminderLogs.id, confirmationId));
  }

  private mapResponseTypeToResult(
    responseType: ResponseType,
    currentStatus: string
  ): "verified" | "declined" | "pending_verification" {
    switch (responseType) {
      case "unsubscribe":
        return "declined";
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
}