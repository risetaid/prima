// Context-Aware Confirmations Service - Simplified version for new schema
// Basic confirmation functionality using the unified reminders table

import { db } from "@/db";
import { reminders, patients } from "@/db";
import { eq } from "drizzle-orm";

import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/gowa";

export interface ConfirmationContext {
  patientId: string;
  reminderId: string;
  scheduledTime: string;
  timeSinceSent: number; // minutes
  previousConfirmations: number;
}

export interface AdaptiveConfirmation {
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  followUpDelay: number; // minutes
  escalationLevel: number;
  personalizedElements: string[];
}

export class ContextAwareConfirmationsService {
  constructor() {
    // Simplified constructor
  }

  /**
   * Generate context-aware confirmation message
   */
  async generateAdaptiveConfirmation(
    reminderId: string
  ): Promise<AdaptiveConfirmation> {
    try {
      // Get reminder data
      const reminder = await db
        .select()
        .from(reminders)
        .where(eq(reminders.id, reminderId))
        .limit(1);

      if (!reminder.length) {
        return this.getDefaultConfirmation();
      }

      const reminderData = reminder[0];
      const timeSinceSent = reminderData.sentAt
        ? Math.floor((Date.now() - reminderData.sentAt.getTime()) / (1000 * 60))
        : 0;

      // Generate basic personalized message
      let message = `Halo! Sudah menyelesaikan rutinitas kesehatan yang dijadwalkan pukul ${reminderData.scheduledTime}?`;

      if (timeSinceSent > 60) {
        const hoursLate = Math.floor(timeSinceSent / 60);
        message += `\n\nSudah ${hoursLate} jam sejak pengingat dikirim ya.`;
      }

      message += `\n\nBalas:`;
      message += `\n✅ SUDAH - jika sudah selesai`;
      message += `\n❌ BELUM - jika belum sempat`;
      message += `\n⏰ NANTI - jika akan selesai sebentar lagi`;
      message += `\n\n_Terima kasih atas kerja sama Anda! 🙏_`;

      // Determine priority based on time
      let priority: "low" | "medium" | "high" | "urgent" = "medium";
      if (timeSinceSent > 120) priority = "high";
      if (timeSinceSent > 180) priority = "urgent";

      return {
        message,
        priority,
        followUpDelay: priority === "urgent" ? 5 : 15,
        escalationLevel: priority === "urgent" ? 3 : 1,
        personalizedElements: [],
      };
    } catch {
      return this.getDefaultConfirmation();
    }
  }

  /**
   * Send context-aware confirmation
   */
  async sendAdaptiveConfirmation(reminderId: string): Promise<boolean> {
    try {
      const adaptiveConfirmation = await this.generateAdaptiveConfirmation(
        reminderId
      );

      // Get patient phone number
      const reminderWithPatient = await db
        .select({
          patientId: reminders.patientId,
          phoneNumber: patients.phoneNumber,
        })
        .from(reminders)
        .leftJoin(patients, eq(reminders.patientId, patients.id))
        .where(eq(reminders.id, reminderId))
        .limit(1);

      if (!reminderWithPatient.length || !reminderWithPatient[0].phoneNumber) {
        return false;
      }

      const { phoneNumber } = reminderWithPatient[0];

      // Send the confirmation message
      const formattedNumber = formatWhatsAppNumber(phoneNumber);
      const result = await sendWhatsAppMessage({
        to: formattedNumber,
        body: adaptiveConfirmation.message,
      });

      if (result.success) {
        // Update reminder with confirmation details
        await db
          .update(reminders)
          .set({
            confirmationSentAt: new Date(),
            confirmationStatus: "PENDING",
          })
          .where(eq(reminders.id, reminderId));
      }

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get default confirmation for fallback
   */
  private getDefaultConfirmation(): AdaptiveConfirmation {
    return {
      message: `Halo! Sudah menyelesaikan rutinitas kesehatan yang dijadwalkan?\n\nBalas:\n✅ SUDAH\n❌ BELUM\n⏰ NANTI`,
      priority: "medium",
      followUpDelay: 15,
      escalationLevel: 1,
      personalizedElements: [],
    };
  }
}
