// Reminder Repository - Database access layer for reminders
import { db, reminders, patients } from "@/db";
import { eq, desc } from "drizzle-orm";
import { validateContentAttachments } from "@/lib/content-validation";
import { logger } from "@/lib/logger";

// Enhanced types for reminder system
type ReminderInsert = {
  patientId: string;
  scheduledTime: string;
  message: string;
  startDate: Date;
  endDate?: Date;
  createdById: string;
  reminderType?: "MEDICATION" | "APPOINTMENT" | "GENERAL";
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  recurrencePattern?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type ValidatedContent = {
  id: string;
  type: string;
  title: string;
  url: string;
};

export class ReminderRepository {
  async getById(id: string) {
    const result = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        endDate: reminders.endDate,
        message: reminders.message,
        isActive: reminders.isActive,
        createdById: reminders.createdById,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
      })
      .from(reminders)
      .where(eq(reminders.id, id))
      .limit(1);

    return result[0] || null;
  }

  async listByPatient(patientId: string) {
    const reminderList = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        endDate: reminders.endDate,
        message: reminders.message,
        isActive: reminders.isActive,
        createdById: reminders.createdById,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(eq(reminders.patientId, patientId))
      .orderBy(desc(reminders.createdAt));

    return reminderList;
  }

  async insert(values: ReminderInsert) {
    const result = await db.insert(reminders).values(values).returning();
    return result[0];
  }

  async update(id: string, values: Partial<Record<string, unknown>>) {
    const result = await db
      .update(reminders)
      .set(values)
      .where(eq(reminders.id, id))
      .returning();

    return result[0];
  }

  async softDelete(id: string, now: Date) {
    await db
      .update(reminders)
      .set({ deletedAt: now, isActive: false, updatedAt: now })
      .where(eq(reminders.id, id));
  }

  async addAttachments(
    reminderId: string,
    contents: ValidatedContent[],
    createdBy: string
  ) {
    // Attachments table was removed - no-op
    logger.info(
      `Would add ${contents.length} attachments to reminder ${reminderId} by user ${createdBy}`
    );
  }

  async removeAttachments(reminderId: string) {
    // Attachments table was removed - no-op
    logger.info(`Would remove attachments from reminder ${reminderId}`);
  }

  async getAttachments(reminderIds: string[]) {
    // Attachments table was removed - return empty array
    logger.info(`Would get attachments for ${reminderIds.length} reminders`);
    return [] as Array<{
      reminderScheduleId: string;
      contentType: string;
      contentTitle: string;
      contentUrl: string;
    }>;
  }

  async validateAttachments(
    attachedContent: Array<{
      id: string;
      type: "article" | "video" | "ARTICLE" | "VIDEO";
      title: string;
    }>
  ) {
    return await validateContentAttachments(attachedContent);
  }
}
