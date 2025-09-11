// Reminder Service - Core business logic for reminder management
import { ReminderRepository } from "./reminder.repository";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import {
  CreateReminderDTO,
  UpdateReminderDTO,
  CustomRecurrence,
  ReminderWithPatient,
  ValidationError,
  NotFoundError,
  ValidatedContent,
} from "./reminder.types";
import { getWIBTime, shouldSendReminderNow } from "@/lib/timezone";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { extractMedicationName } from "@/lib/medication-utils";
import { db, patients, reminderLogs } from "@/db";
import { eq } from "drizzle-orm";

export class ReminderService {
  private repository: ReminderRepository;
  private whatsappService: WhatsAppService;

  constructor() {
    this.repository = new ReminderRepository();
    this.whatsappService = new WhatsAppService();
  }

  // CREATE operations
  async createReminder(dto: CreateReminderDTO) {
    // Validate patient exists
    const patient = await this.getPatient(dto.patientId);
    if (!patient) throw new NotFoundError("Patient not found");

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
        medicationName: extractMedicationName(dto.message),
        scheduledTime: dto.time,
        frequency: dto.customRecurrence ? "CUSTOM_RECURRENCE" : "CUSTOM",
        startDate: reminderDate,
        endDate: reminderDate,
        isActive: true,
        customMessage: dto.message,
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
  async updateReminder(id: string, dto: UpdateReminderDTO, userId: string) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");

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
    const medicationName = extractMedicationName(
      dto.customMessage,
      reminder.medicationName || undefined
    );
    const updated = await this.repository.update(id, {
      scheduledTime: dto.reminderTime,
      customMessage: dto.customMessage,
      medicationName,
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
  async deleteReminder(id: string) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");

    await this.repository.softDelete(id, getWIBTime());
    await invalidateCache(CACHE_KEYS.reminderStats(reminder.patientId));

    return {
      success: true,
      message: "Reminder berhasil dihapus",
      deletedReminder: {
        id: reminder.id,
        medicationName: reminder.medicationName,
        scheduledTime: reminder.scheduledTime,
      },
    };
  }

  // READ operations
  async getReminder(id: string) {
    const reminder = await this.repository.getById(id);
    if (!reminder) throw new NotFoundError("Reminder not found");
    return reminder;
  }

  async listPatientReminders(patientId: string) {
    const reminders = await this.repository.listByPatient(patientId);
    return reminders.map((r) => ({
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

      await db.insert(reminderLogs).values({
        reminderScheduleId: scheduleId,
        patientId: patient.id,
        sentAt: getWIBTime(),
        status: result.success ? "DELIVERED" : "FAILED",
        message: message,
        phoneNumber: patient.phoneNumber,
        fonnteMessageId: result.messageId,
      });

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
