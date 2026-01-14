// Patient repository: DB access for patient variables and basic patient checks
// Refactored to split long methods into smaller, focused functions
import {
  db,
  patients,
  users,
  reminders,
  manualConfirmations,
} from "@/db";
import { and, eq, isNull, inArray, desc, sql, SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type {
  PatientFilters,
} from "@/services/patient/patient.types";
import { auditService } from "@/services/audit/audit.service";

// Audit context - set by the service layer
export let currentAuditContext: { userId?: string; ipAddress?: string; userAgent?: string; requestId?: string } | undefined = undefined;

/**
 * Set audit context for repository operations
 * Should be called before any patient data access
 */
export function setAuditContext(context: { userId?: string; ipAddress?: string; userAgent?: string; requestId?: string }) {
  currentAuditContext = context;
}

/**
 * Clear audit context after operation
 */
export function clearAuditContext() {
  currentAuditContext = undefined;
}

export class PatientRepository {
  async patientExists(patientId: string): Promise<boolean> {
    const rows = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    return rows.length > 0;
  }

  // ===== User Management =====
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

    // Audit log for patient list access
    auditService.logAccess({
      action: 'READ',
      resourceType: 'patient',
      metadata: {
        operation: 'list_patients',
        filters: {
          status,
          assignedVolunteerId,
          search: search ? '[PRESENT]' : null,
          page,
          limit,
          resultCount: rows.length,
        },
      },
      context: currentAuditContext,
    }).catch(() => {});

    return rows;
  }

  // ===== Optimized Compliance counts using batch queries =====
  async getCompletedComplianceCounts(patientIds: string[]) {
    if (!patientIds.length) {
      return [] as Array<{
        patientId: string;
        totalConfirmed: number;
        takenCount: number;
      }>;
    }

    // Import here to avoid circular dependency
    const { ComplianceService } = await import("@/services/patient/compliance.service");
    const complianceService = new ComplianceService();

    // Use batch method for O(1) DB queries instead of O(N)
    const statsMap = await complianceService.getBatchPatientStats(patientIds);

    // Transform to expected format
    return patientIds.map(patientId => {
      const stats = statsMap.get(patientId);
      return {
        patientId,
        totalConfirmed: stats?.completedReminders ?? 0,
        takenCount: stats?.completedReminders ?? 0,
      };
    });
  }



  // ===== Patient detail building blocks =====
  async getPatientBasicData(patientId: string) {
    // Get patient with volunteer info (inlined from PatientQueryBuilder)
    const result = await db
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
        verificationStatus: patients.verificationStatus,
        photoUrl: patients.photoUrl,
        verificationSentAt: patients.verificationSentAt,
        verificationResponseAt: patients.verificationResponseAt,
        verificationMessage: patients.verificationMessage,
        verificationAttempts: patients.verificationAttempts,
        verificationExpiresAt: patients.verificationExpiresAt,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerEmail: users.email,
        volunteerRole: users.role,
      })
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    // Audit log for individual patient access
    if (result[0]) {
      auditService.logAccess({
        action: 'READ',
        resourceType: 'patient',
        resourceId: patientId,
        patientId,
        metadata: {
          operation: 'get_patient_basic_data',
          verificationStatus: result[0].verificationStatus,
          isActive: result[0].isActive,
        },
        context: currentAuditContext,
      }).catch(() => {});
    }

    return result[0] || null;
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
