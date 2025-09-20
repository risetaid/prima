// PatientService centralizes patient listing and verification history
import { PatientRepository } from "./patient.repository";
import { ComplianceService } from "./compliance.service";
import type {
  PatientFilters,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientRow,
} from "./patient.types";
import { ValidationError, NotFoundError } from "./patient.types";
import { db, patients } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { invalidateAfterPatientOperation } from "@/lib/cache-invalidation";
import { validatePhoneWithMessage } from "@/lib/phone-utils";
import { PatientAccessControl } from "./patient-access-control";

export class PatientService {
  private repo: PatientRepository;
  private compliance: ComplianceService;

  constructor() {
    this.repo = new PatientRepository();
    this.compliance = new ComplianceService();
  }

  async list(filters: PatientFilters) {
    // No caching by default
    return await this.repo.listPatients(filters);
  }

  async listWithCompliance(filters: PatientFilters) {
    // Basic cache key composed from filters
    const keyParts = [
      filters.includeDeleted,
      filters.status,
      filters.assignedVolunteerId,
      filters.search,
      filters.page,
      filters.limit,
      filters.orderBy,
      filters.orderDirection,
    ];
    const cacheKey = `patients:list:${JSON.stringify(keyParts)}`;

    // Try cache
    try {
      const { getCachedData, setCachedData } = await import("@/lib/cache");
      const cached = await getCachedData(cacheKey);
      if (cached) return cached;

      const rows = await this.repo.listPatients(filters);
      const withRates = await this.compliance.attachCompliance(rows);
      await setCachedData(cacheKey, withRates, 600); // 10 minutes
      return withRates;
    } catch {
      // Fallback without cache
      const rows = await this.repo.listPatients(filters);
      return await this.compliance.attachCompliance(rows);
    }
  }

  async verifyPatientExists(id: string) {
    const rows = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1);
    if (rows.length === 0) throw new NotFoundError("Patient not found");
  }

  async getVerificationHistory(patientId: string) {
    if (!patientId) throw new ValidationError("Missing patientId");
    await this.verifyPatientExists(patientId);
    // Verification logs table was removed - return empty array
    return [];
  }

  async getDetail(patientId: string, user?: { id: string; role: string }) {
    if (!patientId) throw new ValidationError("Missing patientId");
    await this.verifyPatientExists(patientId);

    // Check role-based access if user is provided
    if (user) {
      await PatientAccessControl.requireAccess(
        user.id,
        user.role,
        patientId,
        "view this patient's details"
      );
    }

    const [basic, confirmations, logs, rate] = await Promise.all([
      this.repo.getPatientBasicData(patientId),
      this.repo.getPatientManualConfirmations(patientId),
      this.repo.getPatientReminderLogs(patientId),
      this.compliance.getPatientRate(patientId),
    ]);

    if (!basic) throw new NotFoundError("Patient not found");

    return {
      id: basic.id,
      name: basic.name,
      phoneNumber: basic.phoneNumber,
      address: basic.address,
      birthDate: basic.birthDate,
      diagnosisDate: basic.diagnosisDate,
      cancerStage: basic.cancerStage,
      assignedVolunteerId: basic.assignedVolunteerId,
      doctorName: basic.doctorName,
      hospitalName: basic.hospitalName || basic.volunteerHospitalName, // Use patient's hospitalName or fallback to volunteer's
      emergencyContactName: basic.emergencyContactName,
      emergencyContactPhone: basic.emergencyContactPhone,
      notes: basic.notes,
      isActive: basic.isActive,
      deletedAt: basic.deletedAt,
      createdAt: basic.createdAt,
      updatedAt: basic.updatedAt,
      photoUrl: basic.photoUrl,
      verificationStatus: basic.verificationStatus,
      verificationSentAt: basic.verificationSentAt,
      verificationResponseAt: basic.verificationResponseAt,
      verificationMessage: basic.verificationMessage,
      verificationAttempts: basic.verificationAttempts,
      verificationExpiresAt: basic.verificationExpiresAt,
      volunteerId: basic.volunteerId,
      volunteerFirstName: basic.volunteerFirstName,
      volunteerLastName: basic.volunteerLastName,
      volunteerEmail: basic.volunteerEmail,
      volunteerRole: basic.volunteerRole,
      assignedVolunteer: basic.volunteerId
        ? {
            id: basic.volunteerId,
            firstName: basic.volunteerFirstName,
            lastName: basic.volunteerLastName,
            email: basic.volunteerEmail,
            role: basic.volunteerRole,
          }
        : null,
      manualConfirmations: confirmations.map((c) => ({
        id: c.id,
        visitDate: c.visitDate,
        visitTime: c.visitTime,

        patientCondition: c.patientCondition,
        notes: c.notes,
        confirmedAt: c.confirmedAt,
        volunteer: c.volunteerId
          ? {
              id: c.volunteerId,
              firstName: c.volunteerFirstName,
              lastName: c.volunteerLastName,
            }
          : null,
      })),
      reminderLogs: logs.map((l) => ({
        id: l.id,
        message: l.message,
        sentAt: l.sentAt,
        status: l.status,
      })),

      complianceRate: rate,
    };
  }

  async createPatient(
    body: CreatePatientDTO,
    currentUser: { id: string; role: string }
  ) {
    const name = (body?.name || "").trim();
    const phoneNumber = (body?.phoneNumber || "").trim();
    if (!name || !phoneNumber)
      throw new ValidationError(
        "Missing required fields: name and phoneNumber"
      );

    // Validate phone format (do not persist formatted variant)
    const phoneValidation = validatePhoneWithMessage(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new ValidationError(phoneValidation.message);
    }

    const cancerStageStr = body?.cancerStage || "";
    const cancerStage =
      cancerStageStr && ["I", "II", "III", "IV"].includes(cancerStageStr)
        ? cancerStageStr
        : null;

    let assignedVolunteerId: string | null = body?.assignedVolunteerId || null;
    if (!assignedVolunteerId) assignedVolunteerId = currentUser.id;

    if (assignedVolunteerId) {
      const volunteer = await this.repo.getUserById(assignedVolunteerId);
      if (!volunteer)
        throw new ValidationError("Relawan yang ditugaskan tidak ditemukan");
      if (volunteer.isActive === false)
        throw new ValidationError("Relawan yang ditugaskan sedang tidak aktif");
    }

    const values = {
      name,
      phoneNumber,
      address: body?.address || null,
      birthDate: body?.birthDate ? new Date(body.birthDate) : null,
      diagnosisDate: body?.diagnosisDate ? new Date(body.diagnosisDate) : null,
      cancerStage,
      emergencyContactName: body?.emergencyContactName || null,
      emergencyContactPhone: body?.emergencyContactPhone || null,
      notes: body?.notes || null,
      photoUrl: body?.photoUrl || null,
      assignedVolunteerId,
      isActive: true,
    };

    const created = await this.repo.insertPatient(values);

    let assignedVolunteer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null = null;
    if (created.assignedVolunteerId) {
      const v = await this.repo.getUserById(created.assignedVolunteerId);
      if (v)
        assignedVolunteer = {
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
        };
    }

    return { ...created, assignedVolunteer };
  }

  async updatePatient(id: string, body: UpdatePatientDTO) {
    await this.verifyPatientExists(id);

    const values: Partial<PatientRow> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) values.name = body.name;
    if (body.phoneNumber !== undefined) {
      const phoneValidation = validatePhoneWithMessage(body.phoneNumber);
      if (!phoneValidation.isValid) {
        throw new ValidationError(phoneValidation.message);
      }
      values.phoneNumber = body.phoneNumber;
    }
    if (body.doctorName !== undefined) values.doctorName = body.doctorName;
    if (body.hospitalName !== undefined)
      values.hospitalName = body.hospitalName;
    if (body.address !== undefined) values.address = body.address;
    if (body.birthDate !== undefined)
      values.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if (body.diagnosisDate !== undefined)
      values.diagnosisDate = body.diagnosisDate
        ? new Date(body.diagnosisDate)
        : null;
    if (body.cancerStage !== undefined) values.cancerStage = body.cancerStage;
    if (body.emergencyContactName !== undefined)
      values.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined)
      values.emergencyContactPhone = body.emergencyContactPhone;
    if (body.notes !== undefined) values.notes = body.notes;
    if (body.isActive !== undefined) values.isActive = body.isActive;
    if (body.photoUrl !== undefined) values.photoUrl = body.photoUrl;

    const updated = await this.repo.updatePatient(id, values);
    await invalidateAfterPatientOperation(id, "update");
    return updated;
  }

  async deletePatient(id: string) {
    await this.verifyPatientExists(id);
    const now = new Date();
    await this.repo.softDeletePatient(id, now);
    await this.repo.setAllRemindersActive(id, false, now);
    await invalidateAfterPatientOperation(id, "delete");
    return { message: "Patient deleted successfully", deletedAt: now };
  }

  async reactivatePatient(
    id: string,
    currentUser: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    }
  ) {
    // Does not require current patient inactive check beyond existence for simplicity
    await this.verifyPatientExists(id);
    const now = new Date();
    const updateData = {
      isActive: true,
      verificationStatus: "PENDING" as const,
      verificationSentAt: null,
      verificationResponseAt: null,
      verificationMessage: null,
      verificationAttempts: "0",
      verificationExpiresAt: null,
      lastReactivatedAt: now,
      updatedAt: now,
    };

    await this.repo.updatePatient(id, updateData);
    await this.repo.setAllRemindersActive(id, true, now);

    const processedByName =
      `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
      currentUser.email ||
      currentUser.id;

    await invalidateAfterPatientOperation(id, "reactivate");

    return {
      success: true,
      message: "Patient berhasil diaktifkan kembali",
      newStatus: "PENDING",
      processedBy: processedByName,
      nextStep: "Patient siap untuk menerima pesan verifikasi ulang",
    };
  }
}
