// Reminder Repository - Database access layer for reminders
import { db, reminderSchedules, patients, reminderContentAttachments } from '@/db'
import { eq, inArray, desc } from 'drizzle-orm'
import { ReminderSchedule, ReminderScheduleInsert, ValidatedContent } from './reminder.types'
import { validateContentAttachments } from '@/lib/content-validation'

export class ReminderRepository {
  async getById(id: string) {
    const result = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        endDate: reminderSchedules.endDate,
        customMessage: reminderSchedules.customMessage,
        isActive: reminderSchedules.isActive,
        createdById: reminderSchedules.createdById,
        createdAt: reminderSchedules.createdAt,
        updatedAt: reminderSchedules.updatedAt,
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1)

    return result[0] || null
  }

  async listByPatient(patientId: string) {
    const reminders = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        dosage: reminderSchedules.dosage,
        doctorName: reminderSchedules.doctorName,
        scheduledTime: reminderSchedules.scheduledTime,
        frequency: reminderSchedules.frequency,
        startDate: reminderSchedules.startDate,
        endDate: reminderSchedules.endDate,
        customMessage: reminderSchedules.customMessage,
        isActive: reminderSchedules.isActive,
        createdById: reminderSchedules.createdById,
        createdAt: reminderSchedules.createdAt,
        updatedAt: reminderSchedules.updatedAt,
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber,
      })
      .from(reminderSchedules)
      .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
      .where(eq(reminderSchedules.patientId, patientId))
      .orderBy(desc(reminderSchedules.createdAt))

    return reminders
  }

  async insert(values: ReminderScheduleInsert) {
    const result = await db.insert(reminderSchedules).values(values).returning()
    return result[0]
  }

  async update(id: string, values: Partial<ReminderSchedule>) {
    const result = await db
      .update(reminderSchedules)
      .set(values)
      .where(eq(reminderSchedules.id, id))
      .returning()

    return result[0]
  }

  async softDelete(id: string, now: Date) {
    await db
      .update(reminderSchedules)
      .set({ deletedAt: now, isActive: false, updatedAt: now })
      .where(eq(reminderSchedules.id, id))
  }

  async addAttachments(reminderId: string, contents: ValidatedContent[], createdBy: string) {
    if (!contents?.length) return

    const values = contents.map((content, index) => ({
      reminderScheduleId: reminderId,
      contentType: content.type,
      contentId: content.id,
      contentTitle: content.title,
      contentUrl: content.url,
      attachmentOrder: index + 1,
      createdBy,
    }))

    await db.insert(reminderContentAttachments).values(values)
  }

  async removeAttachments(reminderId: string) {
    await db
      .delete(reminderContentAttachments)
      .where(eq(reminderContentAttachments.reminderScheduleId, reminderId))
  }

  async getAttachments(reminderIds: string[]) {
    if (!reminderIds?.length) return [] as Array<{ reminderScheduleId: string; contentType: string; contentTitle: string; contentUrl: string }>

    const rows = await db
      .select({
        reminderScheduleId: reminderContentAttachments.reminderScheduleId,
        contentType: reminderContentAttachments.contentType,
        contentTitle: reminderContentAttachments.contentTitle,
        contentUrl: reminderContentAttachments.contentUrl,
      })
      .from(reminderContentAttachments)
      .where(inArray(reminderContentAttachments.reminderScheduleId, reminderIds))

    return rows
  }

  async validateAttachments(attachedContent: Array<{ id: string; type: 'article' | 'video' | 'ARTICLE' | 'VIDEO'; title: string }>) {
    return await validateContentAttachments(attachedContent)
  }
}


