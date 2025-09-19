// Reminder Service - Core business logic for reminder management
import { ReminderRepository } from "./reminder.repository";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { FollowupService } from "./followup.service";
import {
  CreateReminderDTO,
  UpdateReminderDTO,
  CustomRecurrence,
  ValidationError,
  NotFoundError,
  ValidatedContent,
} from "./reminder.types";
import { getWIBTime, shouldSendReminderNow } from "@/lib/timezone";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";

import { db, patients, reminders } from "@/db";
import { ReminderError } from "./reminder.types";
import { requirePatientAccess } from "@/lib/patient-access-control";
import { eq, and, gte, lte, isNull } from "drizzle-orm";

export class ReminderService {
  private repository: ReminderRepository;
  private whatsappService: WhatsAppService;
  private followupService: FollowupService;

  constructor() {
    this.repository = new ReminderRepository();
    this.whatsappService = new WhatsAppService();
    this.followupService = new FollowupService();
  }

  // CREATE operations
  async createReminder(dto: CreateReminderDTO) {
    // Validate patient exists
    const patient = await this.getPatient(dto.patientId);
    if (!patient) throw new NotFoundError("Patient not found");

    if (
      patient.verificationStatus !== "VERIFIED" ||
      patient.isActive !== true
    ) {
      throw new ReminderError(
        "Patient must be verified and active to create reminders",
        "PATIENT_NOT_VERIFIED",
        403,
        {
          verificationStatus: patient.verificationStatus,
          isActive: patient.isActive,
        }
      );
    }

    // Validate and process content attachments
    let validatedContent: ValidatedContent[] = [];
    if (dto.attachedContent?.length) {
      validatedContent = await this.repository.validateAttachments(
        dto.attachedContent
      );
      if (!validatedContent.length) {
        throw new ValidationError(
          "None of the selected content items are valid or published"
        );
      }
    }

    // Generate dates based on recurrence
    const dates = dto.customRecurrence
      ? this.generateRecurrenceDates(dto.customRecurrence)
      : dto.selectedDates || [];

    if (!dates.length) {
      throw new ValidationError("No dates specified for reminder");
    }

    const createdSchedules = [];

    for (const dateString of dates) {
      const reminderDate = new Date(dateString);
      if (isNaN(reminderDate.getTime())) continue;

      const schedule = await this.repository.insert({
        patientId: dto.patientId,
        scheduledTime: dto.time,
        startDate: reminderDate,
        endDate: reminderDate,
        message: dto.message,
        createdById: dto.createdById,
      });

      createdSchedules.push(schedule);

      // Add content attachments
      if (validatedContent.length) {
        await this.repository.addAttachments(
          schedule.id,
          validatedContent,
          dto.createdById
        );
      }

      // Check if should send immediately
      const scheduleDate = schedule.startDate.toISOString().split("T")[0];
      if (shouldSendReminderNow(scheduleDate, dto.time)) {
        await this.sendReminder(
          schedule.id,
          patient,
          dto.message,
          validatedContent
        );
      }
    }

    await invalidateCache(CACHE_KEYS.reminderStats(dto.patientId));
    return createdSchedules;
  }

  // UPDATE operations
  async updateReminder(
    id: string,
    dto: UpdateReminderDTO,
    userId: string,
    userRole: string
  ) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");

    // Check patient access control
    await requirePatientAccess(
      userId,
      userRole,
      reminder.patientId,
      "update this patient's reminder"
    );

    // Validate content attachments if provided
    let validatedContent: ValidatedContent[] = [];
    if (dto.attachedContent !== undefined) {
      if (dto.attachedContent.length) {
        validatedContent = await this.repository.validateAttachments(
          dto.attachedContent
        );
      }
    }

    // Update reminder
    const updated = await this.repository.update(id, {
      scheduledTime: dto.reminderTime,
      message: dto.customMessage,
      updatedAt: getWIBTime(),
    });

    // Update attachments if provided
    if (dto.attachedContent !== undefined) {
      await this.repository.removeAttachments(id);
      if (validatedContent.length) {
        await this.repository.addAttachments(id, validatedContent, userId);
      }
    }

    await invalidateCache(CACHE_KEYS.reminderStats(reminder.patientId));
    return { ...updated, attachedContent: validatedContent };
  }

  // DELETE operations
  async deleteReminder(id: string, userId: string, userRole: string) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");

    // Check patient access control
    await requirePatientAccess(
      userId,
      userRole,
      reminder.patientId,
      "delete this patient's reminder"
    );

    await this.repository.softDelete(id, getWIBTime());
    await invalidateCache(CACHE_KEYS.reminderStats(reminder.patientId));

    return {
      success: true,
      message: "Reminder berhasil dihapus",
      deletedReminder: {
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
      },
    };
  }

  // READ operations
  async getReminder(id: string, userId: string, userRole: string) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");

    // Check patient access control
    await requirePatientAccess(
      userId,
      userRole,
      reminder.patientId,
      "view this patient's reminder"
    );

    return reminder;
  }

  async listPatientReminders(
    patientId: string,
    userId: string,
    userRole: string
  ) {
    // Check patient access control
    await requirePatientAccess(
      userId,
      userRole,
      patientId,
      "view this patient's reminders"
    );

    const patientReminders = await this.repository.listByPatient(patientId);
    return patientReminders.map((r) => ({
      ...r,
      patient: {
        name: r.patientName,
        phoneNumber: r.patientPhoneNumber,
      },
    }));
  }

  // Helper methods
  private async getPatient(patientId: string) {
    const result = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        verificationStatus: patients.verificationStatus,
        isActive: patients.isActive,
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    return result[0] || null;
  }

  private async sendReminder(
    scheduleId: string,
    patient: { id: string; name: string; phoneNumber: string },
    message: string,
    attachments: ValidatedContent[]
  ) {
    try {
      const enhancedMessage = this.whatsappService.buildMessage(
        message,
        attachments
      );
      const result = await this.whatsappService.send(
        patient.phoneNumber,
        enhancedMessage
      );

      // ReminderLogs table was removed from schema
      // Log reminder send using logger instead
      logger.info('Reminder sent', {
        reminderScheduleId: scheduleId,
        patientId: patient.id,
        sentAt: getWIBTime(),
        status: result.success ? "DELIVERED" : "FAILED",
        message: message,
        phoneNumber: patient.phoneNumber,
        fonnteMessageId: result.messageId,
      });

      // Log reminder send and schedule followups for all reminders
      if (result.success) {
        try {
          await this.followupService.scheduleMedicationFollowups({
            patientId: patient.id,
            reminderId: scheduleId,
            phoneNumber: patient.phoneNumber,
            patientName: patient.name,
            reminderName: message,
          });

          logger.info('Followups scheduled for reminder', {
            reminderScheduleId: scheduleId,
            patientId: patient.id,
            reminderMessage: message,
            operation: 'schedule_followups_after_reminder'
          });
        } catch (followupError) {
          logger.error('Failed to schedule followups after reminder', followupError as Error, {
            reminderScheduleId: scheduleId,
            patientId: patient.id,
            operation: 'schedule_followups_after_reminder'
          });
          // Don't fail the reminder send if followup scheduling fails
        }
      }

      await invalidateCache(CACHE_KEYS.reminderStats(patient.id));
      return result;
    } catch (error) {
      logger.error("Failed to send reminder", error as Error, {
        scheduleId,
        patientId: patient.id,
      });
      throw error;
    }
  }

  /**
   * Get today's reminders for a patient - real-time data access
   */
  async getTodaysReminders(patientId: string, userId?: string, userRole?: string) {
    // Check patient access control if userId and userRole provided
    if (userId && userRole) {
      await requirePatientAccess(
        userId,
        userRole,
        patientId,
        "view this patient's reminders"
      );
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysReminders = await db
        .select({
          id: reminders.id,
          scheduledTime: reminders.scheduledTime,
          reminderType: reminders.reminderType,
          message: reminders.message,
          startDate: reminders.startDate,
          status: reminders.status,
          sentAt: reminders.sentAt,
          confirmationResponse: reminders.confirmationResponse,
          confirmationResponseAt: reminders.confirmationResponseAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            eq(reminders.isActive, true),
            isNull(reminders.deletedAt),
            gte(reminders.startDate, today),
            lte(reminders.startDate, tomorrow)
          )
        )
        .orderBy(reminders.scheduledTime)
        .limit(20);

      logger.info("Retrieved today's reminders for patient", {
        patientId,
        remindersCount: todaysReminders.length,
        operation: "get_todays_reminders",
      });

      return todaysReminders.map(reminder => ({
        ...reminder,
        isCompleted: reminder.status === 'DELIVERED',
        timeRemaining: this.calculateTimeRemaining(reminder.scheduledTime),
      }));

    } catch (error) {
      logger.error("Failed to get today's reminders", error as Error, {
        patientId,
        operation: "get_todays_reminders",
      });
      throw new ReminderError(
        "Failed to retrieve today's reminders",
        "DATABASE_ERROR",
        500,
        { patientId }
      );
    }
  }

  /**
   * Calculate time remaining until reminder time
   */
  private calculateTimeRemaining(scheduledTime: string): string {
    try {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      // If reminder time has passed today, assume it's for tomorrow
      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const diffMs = reminderTime.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours} jam ${diffMinutes} menit`;
      } else {
        return `${diffMinutes} menit`;
      }
    } catch {
      return "Waktu tidak tersedia";
    }
  }

  /**
   * Format reminders for LLM consumption
   */
  formatRemindersForLLM(reminders: Array<{scheduledTime: string; message?: string; isCompleted?: boolean; timeRemaining?: string}>): string {
    if (reminders.length === 0) {
      return "Tidak ada pengingat yang dijadwalkan untuk hari ini.";
    }

    const formattedReminders = reminders.map((reminder, index) => {
      const time = reminder.scheduledTime;
      const message = reminder.message || "Pengingat";
      const status = reminder.isCompleted ? "✅ Selesai" : "⏰ Menunggu";
      const timeRemaining = reminder.timeRemaining ? `(${reminder.timeRemaining})` : "";

      return `${index + 1}. Pukul ${time}: ${message} ${status} ${timeRemaining}`;
    }).join('\n');

    return `Pengingat Hari Ini:\n${formattedReminders}`;
  }


  private generateRecurrenceDates(recurrence: CustomRecurrence): string[] {
    const dates: string[] = [];
    const today = new Date();
    const startDate = new Date(today);

    let endDate: Date;
    if (recurrence.endType === "never") {
      endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (recurrence.endType === "on" && recurrence.endDate) {
      endDate = new Date(recurrence.endDate);
    } else if (recurrence.endType === "after" && recurrence.occurrences) {
      endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);
    }

    const currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxOccurrences =
      recurrence.endType === "after"
        ? Math.max(1, parseInt(String(recurrence.occurrences)) || 1)
        : 1000;

    let loopCounter = 0;
    const maxLoops = 10000;

    while (
      currentDate <= endDate &&
      occurrenceCount < maxOccurrences &&
      loopCounter < maxLoops
    ) {
      loopCounter++;
      let shouldInclude = false;

      if (recurrence.frequency === "day") {
        shouldInclude = true;
      } else if (recurrence.frequency === "week") {
        const dayOfWeek = currentDate.getDay();
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const currentDayName = dayNames[dayOfWeek];

        if (recurrence.daysOfWeek && Array.isArray(recurrence.daysOfWeek)) {
          shouldInclude = recurrence.daysOfWeek.includes(currentDayName);
        } else {
          shouldInclude = true;
        }
      } else if (recurrence.frequency === "month") {
        shouldInclude = currentDate.getDate() === startDate.getDate();
      }

      if (shouldInclude) {
        dates.push(currentDate.toISOString().split("T")[0]);
        occurrenceCount++;
      }

      if (recurrence.frequency === "day") {
        currentDate.setDate(currentDate.getDate() + recurrence.interval);
      } else if (recurrence.frequency === "week") {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (recurrence.frequency === "month") {
        currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
      }
    }

    return dates;
  }
}
