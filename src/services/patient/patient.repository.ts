// Patient repository: DB access for patient variables and basic patient checks
import {
  db,
  patients,
  patientVariables,
  healthNotes,
  users,
  reminderLogs,
  manualConfirmations,
  medications,
  patientMedications,
  verificationLogs,
  reminderSchedules,
} from "@/db";
import { and, eq, isNull, inArray, desc, count, sql } from "drizzle-orm";
import type {
  PatientVariableRow,
  NewPatientVariableRow,
  PatientFilters,
} from "./patient.types";

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
    const ops: Promise<any>[] = [];

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
      orderDirection = "asc",
    } = filters || {};

    const conditions: any[] = [];
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
    const orderSql = orderDirection === "desc" ? sql`DESC` : sql`ASC`;

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
      .where(whereClause as any)
      .offset(offset)
      .limit(Math.max(1, limit))
      .orderBy(orderColumn as any);

    // Note: orderDirection is not applied due to Drizzle limitation in this context; acceptable for now.
    return rows;
  }

  // ===== Simplified Compliance counts - Only count "Selesai" (completed) reminders =====
  async getCompletedComplianceCounts(patientIds: string[]) {
    if (!patientIds.length)
      return [] as Array<{
        patientId: string;
        totalConfirmed: number;
        takenCount: number;
      }>;

    // Get compliance data for each patient
    const results = await Promise.all(
      patientIds.map(async (patientId) => {
        // Count manual confirmations where medication was taken
        const manualTakenResult = await db
          .select({ count: count() })
          .from(manualConfirmations)
          .where(
            and(
              eq(manualConfirmations.patientId, patientId),
              eq(manualConfirmations.medicationsTaken, true)
            )
          );

        // Count automated confirmations where response was "SUDAH"
        const automatedTakenResult = await db
          .select({ count: count() })
          .from(reminderLogs)
          .where(
            and(
              eq(reminderLogs.patientId, patientId),
              eq(reminderLogs.confirmationStatus, "CONFIRMED"),
              eq(reminderLogs.confirmationResponse, "SUDAH")
            )
          );

        // Count total manual confirmations (regardless of taken status)
        const totalManualResult = await db
          .select({ count: count() })
          .from(manualConfirmations)
          .where(eq(manualConfirmations.patientId, patientId));

        // Count total automated confirmations (regardless of response)
        const totalAutomatedResult = await db
          .select({ count: count() })
          .from(reminderLogs)
          .where(
            and(
              eq(reminderLogs.patientId, patientId),
              eq(reminderLogs.confirmationStatus, "CONFIRMED")
            )
          );

        const manualTaken = Number(manualTakenResult[0]?.count || 0);
        const automatedTaken = Number(automatedTakenResult[0]?.count || 0);
        const totalManual = Number(totalManualResult[0]?.count || 0);
        const totalAutomated = Number(totalAutomatedResult[0]?.count || 0);

        return {
          patientId,
          totalConfirmed: totalManual + totalAutomated,
          takenCount: manualTaken + automatedTaken,
        };
      })
    );

    return results;
  }

  // ===== Medications =====
  async listActiveMedications(patientId: string) {
    return await db
      .select({
        id: patientMedications.id,
        patientId: patientMedications.patientId,
        medicationId: patientMedications.medicationId,
        dosage: patientMedications.dosage,
        frequency: patientMedications.frequency,
        instructions: patientMedications.instructions,
        startDate: patientMedications.startDate,
        endDate: patientMedications.endDate,
        isActive: patientMedications.isActive,
        createdAt: patientMedications.createdAt,
        medicationName: medications.name,
      })
      .from(patientMedications)
      .leftJoin(
        medications,
        eq(patientMedications.medicationId, medications.id)
      )
      .where(
        and(
          eq(patientMedications.patientId, patientId),
          eq(patientMedications.isActive, true)
        )
      )
      .orderBy(desc(patientMedications.createdAt));
  }

  // ===== Patient detail building blocks =====
  async getPatientBasicData(patientId: string) {
    const rows = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        address: patients.address,
        birthDate: patients.birthDate,
        diagnosisDate: patients.diagnosisDate,
        cancerStage: patients.cancerStage,
        assignedVolunteerId: patients.assignedVolunteerId,
        doctorName: patients.doctorName,
        hospitalName: patients.hospitalName,
        emergencyContactName: patients.emergencyContactName,
        emergencyContactPhone: patients.emergencyContactPhone,
        notes: patients.notes,
        isActive: patients.isActive,
        deletedAt: patients.deletedAt,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        photoUrl: patients.photoUrl,
        verificationStatus: patients.verificationStatus,
        verificationSentAt: patients.verificationSentAt,
        verificationResponseAt: patients.verificationResponseAt,
        verificationMessage: patients.verificationMessage,
        verificationAttempts: patients.verificationAttempts,
        verificationExpiresAt: patients.verificationExpiresAt,
        volunteerId: users.id,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerEmail: users.email,
        volunteerRole: users.role,
        volunteerHospitalName: users.hospitalName,
      })
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(eq(patients.id, patientId))
      .limit(1);
    return rows[0] || null;
  }

  async getPatientManualConfirmations(patientId: string) {
    return await db
      .select({
        id: manualConfirmations.id,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
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
        medicationName: reminderSchedules.medicationName,
        dosage: reminderSchedules.dosage,
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
  async insertPatient(values: any) {
    const inserted = await db.insert(patients).values(values).returning();
    return inserted[0];
  }

  async updatePatient(id: string, values: any) {
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

  async insertVerificationLog(values: {
    patientId: string;
    action: string;
    patientResponse?: string | null;
    verificationResult?: any;
    processedBy?: string | null;
  }) {
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
