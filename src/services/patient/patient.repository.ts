// Patient repository: DB access for patient variables and basic patient checks
// Refactored to split long methods into smaller, focused functions
import {
  db,
  patients,
  patientVariables,
  healthNotes,
  users,
  reminderLogs,
  manualConfirmations,

  verificationLogs,
  reminderSchedules,
} from "@/db";
import type { NewVerificationLog } from "@/db";
import { and, eq, isNull, inArray, desc, count, sql, SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type {
  PatientVariableRow,
  NewPatientVariableRow,
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

  async getActiveVariables(patientId: string): Promise<PatientVariableRow[]> {
    return await db
      .select()
      .from(patientVariables)
      .where(
        and(
          eq(patientVariables.patientId, patientId),
          eq(patientVariables.isActive, true),
          isNull(patientVariables.deletedAt)
        )
      )
      .orderBy(patientVariables.variableName);
  }

  async upsertVariables(
    patientId: string,
    variables: Record<string, string>,
    createdById: string
  ): Promise<void> {
    // Read existing to decide update vs insert
    const existing = await db
      .select({ variableName: patientVariables.variableName })
      .from(patientVariables)
      .where(
        and(
          eq(patientVariables.patientId, patientId),
          eq(patientVariables.isActive, true)
        )
      );

    const existingSet = new Set(existing.map((v) => v.variableName));
    const ops: Promise<unknown>[] = [];

    for (const [name, value] of Object.entries(variables)) {
      const val = String(value || "").trim();
      if (!val) continue;

      if (existingSet.has(name)) {
        ops.push(
          db
            .update(patientVariables)
            .set({ variableValue: val, updatedAt: new Date() })
            .where(
              and(
                eq(patientVariables.patientId, patientId),
                eq(patientVariables.variableName, name),
                eq(patientVariables.isActive, true)
              )
            )
        );
      } else {
        ops.push(
          db.insert(patientVariables).values({
            patientId,
            variableName: name,
            variableValue: val,
            createdById,
            isActive: true,
          } as NewPatientVariableRow)
        );
      }
    }

    if (ops.length) await Promise.all(ops);
  }

  async softDeleteVariable(
    patientId: string,
    variableName: string
  ): Promise<number> {
    const result = await db
      .update(patientVariables)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(
        and(
          eq(patientVariables.patientId, patientId),
          eq(patientVariables.variableName, variableName),
          eq(patientVariables.isActive, true)
        )
      )
      .returning({ id: patientVariables.id });
    return result.length;
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

  // ===== Simplified Compliance counts - Only count "Selesai" (completed) reminders =====
  // Refactored to use helper functions for better readability
  async getCompletedComplianceCounts(patientIds: string[]) {
    if (!patientIds.length)
      return [] as Array<{
        patientId: string;
        totalConfirmed: number;
        takenCount: number;
      }>;

    const countManualTaken = async (patientId: string): Promise<number> => {
      const result = await db
        .select({ count: count() })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId));
      return Number(result[0]?.count || 0);
    };

    const countAutomatedTaken = async (patientId: string): Promise<number> => {
      const result = await db
        .select({ count: count() })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            eq(reminderLogs.confirmationStatus, "CONFIRMED"),
            eq(reminderLogs.confirmationResponse, "SUDAH")
          )
        );
      return Number(result[0]?.count || 0);
    };

    const countTotalManual = async (patientId: string): Promise<number> => {
      const result = await db
        .select({ count: count() })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId));
      return Number(result[0]?.count || 0);
    };

    const countTotalAutomated = async (patientId: string): Promise<number> => {
      const result = await db
        .select({ count: count() })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, patientId),
            eq(reminderLogs.confirmationStatus, "CONFIRMED")
          )
        );
      return Number(result[0]?.count || 0);
    };

    const getPatientData = async (patientId: string) => {
      const [
        manualTaken,
        automatedTaken,
        totalManual,
        totalAutomated,
      ] = await Promise.all([
        countManualTaken(patientId),
        countAutomatedTaken(patientId),
        countTotalManual(patientId),
        countTotalAutomated(patientId),
      ]);

      return {
        patientId,
        totalConfirmed: totalManual + totalAutomated,
        takenCount: manualTaken + automatedTaken,
      };
    };

    const results = await Promise.all(
      patientIds.map(patientId => getPatientData(patientId))
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
        id: reminderLogs.id,
        message: reminderLogs.message,
        sentAt: reminderLogs.sentAt,
        status: reminderLogs.status,

      })
      .from(reminderLogs)
      .leftJoin(
        reminderSchedules,
        eq(reminderLogs.reminderScheduleId, reminderSchedules.id)
      )
      .where(eq(reminderLogs.patientId, patientId))
      .orderBy(desc(reminderLogs.sentAt))
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
      .update(reminderSchedules)
      .set({ isActive, updatedAt: at })
      .where(eq(reminderSchedules.patientId, patientId));
  }

  async insertVerificationLog(values: NewVerificationLog) {
    await db.insert(verificationLogs).values(values);
  }

  async getVerificationHistoryRows(patientId: string) {
    return await db
      .select({
        id: verificationLogs.id,
        action: verificationLogs.action,
        messageSent: verificationLogs.messageSent,
        patientResponse: verificationLogs.patientResponse,
        verificationResult: verificationLogs.verificationResult,
        createdAt: verificationLogs.createdAt,
        processedBy: verificationLogs.processedBy,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerEmail: users.email,
      })
      .from(verificationLogs)
      .leftJoin(users, eq(verificationLogs.processedBy, users.id))
      .where(eq(verificationLogs.patientId, patientId))
      .orderBy(desc(verificationLogs.createdAt));
  }
}
