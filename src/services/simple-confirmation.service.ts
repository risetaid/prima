// Simple Reminder Confirmation Service
// No complex conversation states - direct database lookup approach

import { db, reminders } from "@/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";

export class SimpleConfirmationService {
  private whatsappService: WhatsAppService;
  private patientLookup: PatientLookupService;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.patientLookup = new PatientLookupService();
  }

  /**
   * Process incoming patient response for reminder confirmation
   * Simple flow: Find recent pending reminder → Match keywords → Update → Send ACK
   */
  async processReminderResponse(sender: string, message: string): Promise<{
    success: boolean;
    action?: 'confirmed' | 'missed' | 'no_reminder' | 'invalid_response';
    error?: string;
  }> {
    try {
      logger.info('🔍 Processing reminder response', {
        sender,
        message: message.substring(0, 50),
        messageLength: message.length
      });

      // 1. Find patient by phone number
      const patientResult = await this.patientLookup.findPatientByPhone(sender);
      if (!patientResult.found || !patientResult.patient) {
        logger.info('❌ No patient found for message', { sender, message: message.substring(0, 50) });
        return { success: true, action: 'no_reminder' };
      }

      const patient = patientResult.patient;
      logger.info('✅ Patient found', {
        patientId: patient.id,
        patientName: patient.name,
        verificationStatus: patient.verificationStatus
      });

      // 2. Check for simple keyword matches
      const normalizedMessage = message.toLowerCase().trim();
      logger.info('🔤 Normalized message for matching', {
        original: message,
        normalized: normalizedMessage,
        patientId: patient.id
      });

      let confirmationType: 'confirmed' | 'missed' | null = null;

      if (['sudah', 'selesai'].includes(normalizedMessage)) {
        confirmationType = 'confirmed';
        logger.info('✅ Matched CONFIRMED keyword', { normalizedMessage, patientId: patient.id });
      } else if (['belum'].includes(normalizedMessage)) {
        confirmationType = 'missed';
        logger.info('⏰ Matched MISSED keyword', { normalizedMessage, patientId: patient.id });
      } else {
        logger.info('❌ Not a confirmation keyword', {
          patientId: patient.id,
          normalizedMessage,
          original: message.substring(0, 50)
        });
        return { success: true, action: 'invalid_response' };
      }

      // 3. Find most recent pending reminder (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      logger.info('🔍 Searching for pending reminders', {
        patientId: patient.id,
        since: yesterday.toISOString(),
        confirmationType
      });

      const recentReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patient.id),
            eq(reminders.status, 'SENT'),
            eq(reminders.confirmationStatus, 'PENDING'),
            gte(reminders.sentAt, yesterday)
          )
        )
        .orderBy(desc(reminders.sentAt))
        .limit(1);

      logger.info('📊 Reminder search results', {
        patientId: patient.id,
        foundCount: recentReminders.length,
        confirmationType
      });

      if (recentReminders.length === 0) {
        logger.warn('⚠️ No pending reminders found', {
          patientId: patient.id,
          confirmationType,
          message: message.substring(0, 50)
        });
        return { success: true, action: 'no_reminder' };
      }

      const reminder = recentReminders[0];

      logger.info('📝 Found reminder to update', {
        reminderId: reminder.id,
        patientId: patient.id,
        reminderStatus: reminder.status,
        reminderConfirmationStatus: reminder.confirmationStatus,
        sentAt: reminder.sentAt,
        confirmationType
      });

      // 4. Update reminder based on confirmation
      const updateData: {
        confirmationResponse: string;
        confirmationResponseAt: Date;
        status: 'DELIVERED' | 'SENT';
        confirmationStatus: 'CONFIRMED' | 'MISSED';
      } = {
        confirmationResponse: message,
        confirmationResponseAt: new Date(),
        ...(confirmationType === 'confirmed'
          ? { status: 'DELIVERED', confirmationStatus: 'CONFIRMED' }
          : { status: 'SENT', confirmationStatus: 'MISSED' }
        )
      };

      logger.info('💾 Updating reminder with data', {
        reminderId: reminder.id,
        updateData,
        patientId: patient.id
      });

      await db
        .update(reminders)
        .set(updateData)
        .where(eq(reminders.id, reminder.id));

      logger.info('✅ Reminder updated successfully', {
        patientId: patient.id,
        reminderId: reminder.id,
        confirmationType,
        message: message.substring(0, 50)
      });

      // 5. Send acknowledgment
      await this.sendAcknowledgment({
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber
      }, confirmationType);

      return {
        success: true,
        action: confirmationType
      };

    } catch (error) {
      logger.error('Failed to process reminder confirmation', error as Error, {
        sender,
        message: message.substring(0, 50)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send acknowledgment message to patient
   */
  private async sendAcknowledgment(patient: {
    id: string;
    name: string;
    phoneNumber: string;
  }, confirmationType: 'confirmed' | 'missed'): Promise<void> {
    try {
      let message: string;

      if (confirmationType === 'confirmed') {
        message = `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai.\n\n💙 Tim PRIMA`;
      } else {
        message = `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\nKami akan mengingatkan lagi nanti.\n\n💙 Tim PRIMA`;
      }

      await this.whatsappService.sendAck(patient.phoneNumber, message);

      logger.info('Acknowledgment sent', {
        patientId: patient.id,
        confirmationType
      });

    } catch (error) {
      logger.error('Failed to send acknowledgment', error as Error, {
        patientId: patient.id,
        confirmationType
      });
      // Don't fail the whole operation if ACK fails
    }
  }
}