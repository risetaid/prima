// Simple Message Processor - Keyword-based processing for verification and reminders
// No LLM dependencies, fast and reliable

import { logger } from "@/lib/logger";
import { db, patients, reminders } from "@/db";
import { eq, and } from "drizzle-orm";
import { PatientContextService } from "@/services/patient/patient-context.service";

export interface SimpleMessageContext {
  patientId: string;
  phoneNumber: string;
  message: string;
  timestamp: Date;
  verificationStatus?: string;
}

export interface SimpleProcessingResult {
  processed: boolean;
  type: "verification" | "reminder_confirmation" | "unknown";
  action: "verified" | "declined" | "confirmed" | "missed" | "none";
  message: string;
}

export class SimpleMessageProcessorService {
  // Verification keywords
  private readonly VERIFICATION_ACCEPT_KEYWORDS = [
    "ya", "iya", "yes", "y", "ok", "oke", "baik", "setuju", "mau", "ingin", "terima", "siap", "bisa", "boleh"
  ];

  private readonly VERIFICATION_DECLINE_KEYWORDS = [
    "tidak", "no", "n", "ga", "gak", "engga", "enggak", "tolak", "nanti", "besok", "belum"
  ];

  // Reminder confirmation keywords
  private readonly REMINDER_CONFIRMED_KEYWORDS = [
    "sudah", "udh", "selesai", "sudah selesai", "udh selesai", "sudah lakukan", "udh lakukan", "done", "selesai"
  ];

  private readonly REMINDER_MISSED_KEYWORDS = [
    "belum", "blm", "belum selesai", "blm selesai", "belum lakukan", "lupa", "lupa lakukan", "skip", "lewat"
  ];

  /**
   * Process a simple message for verification or reminder confirmation
   */
  async processMessage(context: SimpleMessageContext): Promise<SimpleProcessingResult> {
    const normalizedMessage = this.normalizeMessage(context.message);

    logger.info("Processing simple message", {
      patientId: context.patientId,
      messageLength: context.message.length,
      normalizedLength: normalizedMessage.length,
      verificationStatus: context.verificationStatus
    });

    // Check for verification response first
    const verificationResult = await this.handleVerificationResponse(normalizedMessage, context);
    if (verificationResult.processed) {
      return verificationResult;
    }

    // Check for reminder confirmation
    const reminderResult = await this.handleReminderConfirmation(normalizedMessage, context);
    if (reminderResult.processed) {
      return reminderResult;
    }

    // No matching keywords found
    return {
      processed: false,
      type: "unknown",
      action: "none",
      message: "Message not recognized for automated processing"
    };
  }

  /**
   * Handle verification responses (YA/TIDAK)
   */
  private async handleVerificationResponse(
    message: string,
    context: SimpleMessageContext
  ): Promise<SimpleProcessingResult> {
    // Only process if patient is in PENDING status
    if (context.verificationStatus !== "PENDING") {
      return { processed: false, type: "verification", action: "none", message: "Patient not pending verification" };
    }

    const isAccept = this.VERIFICATION_ACCEPT_KEYWORDS.some(keyword =>
      message.includes(keyword)
    );

    const isDecline = this.VERIFICATION_DECLINE_KEYWORDS.some(keyword =>
      message.includes(keyword)
    );

    if (!isAccept && !isDecline) {
      return { processed: false, type: "verification", action: "none", message: "No verification keywords found" };
    }

    try {
      const newStatus = isAccept ? "VERIFIED" : "DECLINED";

      // Update patient status
       await db
         .update(patients)
         .set({
           verificationStatus: newStatus,
           verificationResponseAt: new Date(),
           updatedAt: new Date(),
         })
         .where(eq(patients.id, context.patientId));

       // Invalidate patient context cache
       const patientContextService = new PatientContextService();
       await patientContextService.invalidatePatientContext(context.phoneNumber);

      logger.info("Patient verification status updated", {
        patientId: context.patientId,
        oldStatus: context.verificationStatus,
        newStatus,
        response: isAccept ? "accept" : "decline",
        message: context.message.substring(0, 50)
      });

      return {
        processed: true,
        type: "verification",
        action: isAccept ? "verified" : "declined",
        message: isAccept
          ? "Terima kasih atas konfirmasinya! Anda akan menerima pengingat secara otomatis."
          : "Baik, terima kasih atas responsnya. Jika berubah pikiran, Anda bisa menghubungi relawan PRIMA."
      };
    } catch (error) {
      logger.error("Failed to update patient verification status", error as Error, {
        patientId: context.patientId,
        message: context.message
      });

      return {
        processed: false,
        type: "verification",
        action: "none",
        message: "Failed to update verification status"
      };
    }
  }

  /**
   * Handle reminder confirmation responses (SUDAH/BELUM)
   */
  private async handleReminderConfirmation(
    message: string,
    context: SimpleMessageContext
  ): Promise<SimpleProcessingResult> {
    // Only process if patient is verified
    if (context.verificationStatus !== "VERIFIED") {
      return { processed: false, type: "reminder_confirmation", action: "none", message: "Patient not verified" };
    }

    const isConfirmed = this.REMINDER_CONFIRMED_KEYWORDS.some(keyword =>
      message.includes(keyword)
    );

    const isMissed = this.REMINDER_MISSED_KEYWORDS.some(keyword =>
      message.includes(keyword)
    );

    if (!isConfirmed && !isMissed) {
      return { processed: false, type: "reminder_confirmation", action: "none", message: "No reminder confirmation keywords found" };
    }

    try {
      // Find the most recent pending reminder for this patient
      const recentReminders = await db
        .select({
          id: reminders.id,
          confirmationStatus: reminders.confirmationStatus,
          sentAt: reminders.sentAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, context.patientId),
            eq(reminders.confirmationStatus, "PENDING")
          )
        )
        .orderBy(reminders.sentAt)
        .limit(5); // Get last 5 pending confirmations

      if (recentReminders.length === 0) {
        return {
          processed: false,
          type: "reminder_confirmation",
          action: "none",
          message: "No pending reminders found for confirmation"
        };
      }

      // Update the most recent pending confirmation
      const reminderToUpdate = recentReminders[recentReminders.length - 1];
      const confirmationStatus = isConfirmed ? "CONFIRMED" : "MISSED";

      await db
        .update(reminders)
        .set({
          confirmationStatus,
          confirmationResponse: context.message,
          confirmationResponseAt: new Date(),
        })
        .where(eq(reminders.id, reminderToUpdate.id));

      logger.info("Reminder confirmation updated", {
        patientId: context.patientId,
        reminderId: reminderToUpdate.id,
        status: confirmationStatus,
        response: isConfirmed ? "confirmed" : "missed",
        message: context.message.substring(0, 50)
      });

      return {
        processed: true,
        type: "reminder_confirmation",
        action: isConfirmed ? "confirmed" : "missed",
        message: isConfirmed
          ? "Bagus! Terus jaga kesehatan ya. 💙"
          : "Jangan lupa pengingat berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙"
      };
    } catch (error) {
      logger.error("Failed to update reminder confirmation", error as Error, {
        patientId: context.patientId,
        message: context.message
      });

      return {
        processed: false,
        type: "reminder_confirmation",
        action: "none",
        message: "Failed to update reminder confirmation"
      };
    }
  }

  /**
   * Normalize message for better keyword matching
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/[.,!?;:]$/g, ""); // Remove trailing punctuation
  }
}