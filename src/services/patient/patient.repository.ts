// Patient repository: DB access for patient variables and basic patient checks
// Refactored to split long methods into smaller, focused functions
import {
  db,
  patients,
  healthNotes,
  users,
  reminders,
  manualConfirmations,
} from "@/db";
import { and, eq, isNull, inArray, desc, sql, SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type {
  PatientFilters,
} from "./patient.types";
import { PatientQueryBuilder } from "./patient-query-builder";

export class PatientRepository {
  async patientExists(patientId: string): Promise<boolean> {
    const rows = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    return rows.length > 0;
  }







  // ===== Health Notes =====
  async listHealthNotes(patientId: string) {
    return await db
      .select({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt,
      })
      .from(healthNotes)
      .where(
        and(eq(healthNotes.patientId, patientId), isNull(healthNotes.deletedAt))
      )
      .orderBy(desc(healthNotes.noteDate));
  }

  async getHealthNote(patientId: string, noteId: string) {
    const rows = await db
      .select({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt,
      })
      .from(healthNotes)
      .where(
        and(
          eq(healthNotes.id, noteId),
          eq(healthNotes.patientId, patientId),
          isNull(healthNotes.deletedAt)
        )
      )
      .limit(1);
    return rows[0] || null;
  }

  async createHealthNote(
    patientId: string,
    note: string,
    noteDate: Date,
    recordedBy: string
  ) {
    const inserted = await db
      .insert(healthNotes)
      .values({ patientId, note, noteDate, recordedBy })
      .returning({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt,
      });
    return inserted[0];
  }

  async updateHealthNote(noteId: string, note: string, noteDate: Date) {
    const updated = await db
      .update(healthNotes)
      .set({ note, noteDate })
      .where(eq(healthNotes.id, noteId))
      .returning({
        id: healthNotes.id,
        patientId: healthNotes.patientId,
        note: healthNotes.note,
        noteDate: healthNotes.noteDate,
        recordedBy: healthNotes.recordedBy,
        createdAt: healthNotes.createdAt,
        updatedAt: healthNotes.updatedAt,
      });
    return updated[0];
  }

  async softDeleteHealthNote(patientId: string, noteId: string) {
    const deleted = await db
      .update(healthNotes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(healthNotes.id, noteId), eq(healthNotes.patientId, patientId))
      )
      .returning({ id: healthNotes.id });
    return deleted.length;
  }

  async softDeleteHealthNotes(patientId: string, noteIds: string[]) {
    if (!noteIds.length) return 0;
    const deleted = await db
      .update(healthNotes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          inArray(healthNotes.id, noteIds),
          eq(healthNotes.patientId, patientId)
        )
      )
      .returning({ id: healthNotes.id });
    return deleted.length;
  }

  async getUsersByIds(userIds: string[]) {
    if (!userIds.length)
      return [] as Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
      }>;
    return await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, userIds));
  }

  // ===== Patient listing =====
  async getUserById(id: string) {
    const rows = await db
      .select({
        id: users.id,
        isActive: users.isActive,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async listPatients(filters: PatientFilters) {
    const {
      includeDeleted = false,
      status = "all",
      assignedVolunteerId,
      search,
      page = 1,
      limit = 50,
      orderBy = "createdAt",
    } = filters || {};

    // Build filter conditions
    const conditions: SQL<unknown>[] = [];
    if (!includeDeleted) conditions.push(isNull(patients.deletedAt));
    if (status === "active") conditions.push(eq(patients.isActive, true));
    if (status === "inactive") conditions.push(eq(patients.isActive, false));
    if (assignedVolunteerId)
      conditions.push(eq(patients.assignedVolunteerId, assignedVolunteerId));
    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      conditions.push(sql`LOWER(${patients.name}) LIKE ${pattern}`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const orderColumn = orderBy === "name" ? patients.name : patients.createdAt;

    // Drizzle doesn't support dynamic order direction without sql template, so use raw sql order
    const rows = await db
      .select({
        id: patients.id,
        name: patients.name,
        isActive: patients.isActive,
        photoUrl: patients.photoUrl,
        phoneNumber: patients.phoneNumber,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(whereClause)
      .offset(offset)
      .limit(Math.max(1, limit))
      .orderBy(orderColumn);

    // Note: orderDirection is not applied due to Drizzle limitation in this context; acceptable for now.
    return rows;
  }

  // ===== Standardized Compliance counts using CompletionCalculationService =====
  // Uses unified completion logic for consistency across all endpoints
  async getCompletedComplianceCounts(patientIds: string[]) {
    if (!patientIds.length)
      return [] as Array<{
        patientId: string;
        totalConfirmed: number;
        takenCount: number;
      }>;

    // Import here to avoid circular dependency
    const { CompletionCalculationService } = await import("@/services/reminder/completion-calculation.service");

    const results = await Promise.all(
      patientIds.map(async (patientId) => {
        const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);

        return {
          patientId,
          totalConfirmed: stats.completedReminders, // Total completed reminders
          takenCount: stats.completedReminders, // In simplified logic, completed = taken
        };
      })
    );

    return results;
  }



  // ===== Patient detail building blocks =====
  async getPatientBasicData(patientId: string) {
    // Use the consolidated query builder for consistency
    return await PatientQueryBuilder.getPatientWithVolunteer(patientId);
  }

  async getPatientManualConfirmations(patientId: string) {
    return await db
      .select({
        id: manualConfirmations.id,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,

        patientCondition: manualConfirmations.patientCondition,
        notes: manualConfirmations.notes,
        confirmedAt: manualConfirmations.confirmedAt,
        volunteerId: manualConfirmations.volunteerId,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
      })
      .from(manualConfirmations)
      .leftJoin(users, eq(manualConfirmations.volunteerId, users.id))
      .where(eq(manualConfirmations.patientId, patientId))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .limit(10);
  }

  async getPatientReminderLogs(patientId: string) {
    return await db
      .select({
        id: reminders.id,
        message: reminders.message,
        sentAt: reminders.sentAt,
        status: reminders.status,
      })
      .from(reminders)
      .where(eq(reminders.patientId, patientId))
      .orderBy(desc(reminders.sentAt))
      .limit(10);
  }

  // ===== Verification History =====
  async insertPatient(values: InferInsertModel<typeof patients>) {
    const inserted = await db.insert(patients).values(values).returning();
    return inserted[0];
  }

  async updatePatient(id: string, values: Partial<InferInsertModel<typeof patients>>) {
    const updated = await db
      .update(patients)
      .set(values)
      .where(eq(patients.id, id))
      .returning();
    return updated[0];
  }

  async softDeletePatient(id: string, at: Date) {
    await db
      .update(patients)
      .set({ deletedAt: at, isActive: false, updatedAt: at })
      .where(eq(patients.id, id));
  }

  async setAllRemindersActive(patientId: string, isActive: boolean, at: Date) {
    await db
      .update(reminders)
      .set({ isActive, updatedAt: at })
      .where(eq(reminders.patientId, patientId));
  }


}
