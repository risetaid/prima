// PatientService centralizes patient listing and verification history
import { PatientRepository } from "@/services/patient/patient.repository";
import { ComplianceService } from "@/services/patient/compliance.service";
import type {
  PatientFilters,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientRow,
} from "@/services/patient/patient.types";
import { ValidationError, NotFoundError } from "@/services/patient/patient.types";
import { db, patients, conversationStates, conversationMessages } from "@/db";
import { and, eq, isNull, inArray, desc } from "drizzle-orm";
import { invalidateAfterPatientOperation } from "@/lib/cache-invalidation";
import { validatePhoneWithMessage } from "@/lib/phone-utils";
import { PatientAccessControl } from "@/services/patient/patient-access-control";

export class PatientService {
  private repo: PatientRepository;
  private compliance: ComplianceService;

  constructor() {
    this.repo = new PatientRepository();
    this.compliance = new ComplianceService();
  }

  async list(filters: PatientFilters) {
    const cacheKey = `patients:${JSON.stringify(filters)}`;
    const { cacheWithFallback, CACHE_TTL } = await import("@/lib/cache");
    return await cacheWithFallback(
      cacheKey,
      () => this.repo.listPatients(filters),
      CACHE_TTL.PATIENT
    );
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

    // Get conversation states for this patient
    const conversationStateIds = await db
      .select({ id: conversationStates.id })
      .from(conversationStates)
      .where(and(
        eq(conversationStates.patientId, patientId),
        eq(conversationStates.isActive, true)
      ));

    const stateIds = conversationStateIds.map((state: { id: string }) => state.id);

    if (stateIds.length === 0) {
      return [];
    }

    // Get conversation messages for these states
    const messages = await db
      .select({
        id: conversationMessages.id,
        message: conversationMessages.message,
        direction: conversationMessages.direction,
        messageType: conversationMessages.messageType,
        intent: conversationMessages.intent,
        createdAt: conversationMessages.createdAt,
        conversationStateId: conversationMessages.conversationStateId,
        context: conversationStates.currentContext,
        expectedResponseType: conversationStates.expectedResponseType,
        relatedEntityType: conversationStates.relatedEntityType,
      })
      .from(conversationMessages)
      .innerJoin(conversationStates, eq(conversationMessages.conversationStateId, conversationStates.id))
      .where(inArray(conversationMessages.conversationStateId, stateIds))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(50);

    // Transform messages into history format
    return messages.map((msg) => {
      let action = 'Pesan masuk';
      let result = undefined;

      if (msg.direction === 'outbound') {
        action = 'Pesan keluar';
        if (msg.messageType === 'verification') {
          action = '📱 Verifikasi dikirim';
        } else if (msg.messageType === 'reminder') {
          action = '⏰ Pengingat dikirim';
        } else if (msg.messageType === 'confirmation') {
          action = '✅ Konfirmasi dikirim';
        }
      } else if (msg.direction === 'inbound') {
        action = '💬 Respon pasien';
        if (msg.intent === 'verification_accept') {
          action = '✅ Verifikasi diterima';
          result = 'verified';
        } else if (msg.intent === 'verification_decline') {
          action = '❌ Verifikasi ditolak';
          result = 'declined';
        } else if (msg.intent === 'reminder_confirmed') {
          action = '✅ Pengingat dikonfirmasi';
          result = 'confirmed';
        } else if (msg.intent === 'reminder_missed') {
          action = '❌ Pengingat dilewatkan';
          result = 'missed';
        }
      }

      return {
        id: msg.id,
        timestamp: msg.createdAt.toISOString(),
        action,
        message: msg.message,
        response: msg.direction === 'inbound' ? msg.message : undefined,
        result,
        context: msg.context,
        expectedResponseType: msg.expectedResponseType,
        relatedEntityType: msg.relatedEntityType,
      };
    });
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
      hospitalName: basic.hospitalName,
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
      volunteerId: basic.assignedVolunteerId,
      volunteerFirstName: basic.volunteerFirstName,
      volunteerLastName: basic.volunteerLastName,
      volunteerEmail: basic.volunteerEmail,
      volunteerRole: basic.volunteerRole,
      assignedVolunteer: basic.assignedVolunteerId
        ? {
          id: basic.assignedVolunteerId,
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
    const normalizedStage = cancerStageStr.toString().toUpperCase().trim();

    let cancerStage: "I" | "II" | "III" | "IV" | null = null;
    if (normalizedStage) {
      // Handle numeric inputs (1, 2, 3, 4)
      if (/^[1-4]$/.test(normalizedStage)) {
        const stageMap = ["I", "II", "III", "IV"] as const;
        cancerStage = stageMap[parseInt(normalizedStage) - 1];
      }
      // Handle roman numeral inputs (I, II, III, IV) - case insensitive
      else if ((["I", "II", "III", "IV"] as const).includes(normalizedStage as "I" | "II" | "III" | "IV")) {
        cancerStage = normalizedStage as "I" | "II" | "III" | "IV";
      }
      // Handle lowercase roman numerals (i, ii, iii, iv)
      else if (["i", "ii", "iii", "iv"].includes(normalizedStage)) {
        cancerStage = normalizedStage.toUpperCase() as "I" | "II" | "III" | "IV";
      }
    }

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

    // Only update fields that are explicitly provided and not null
    // This prevents accidental data deletion when frontend sends null values
    if (body.name !== undefined && body.name !== null) values.name = body.name;
    if (body.phoneNumber !== undefined && body.phoneNumber !== null) {
      const phoneValidation = validatePhoneWithMessage(body.phoneNumber);
      if (!phoneValidation.isValid) {
        throw new ValidationError(phoneValidation.message);
      }
      values.phoneNumber = body.phoneNumber;
    }
    if (body.doctorName !== undefined && body.doctorName !== null) values.doctorName = body.doctorName;
    if (body.hospitalName !== undefined && body.hospitalName !== null)
      values.hospitalName = body.hospitalName;
    if (body.address !== undefined && body.address !== null) values.address = body.address;
    if (body.birthDate !== undefined && body.birthDate !== null)
      values.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if (body.diagnosisDate !== undefined && body.diagnosisDate !== null)
      values.diagnosisDate = body.diagnosisDate
        ? new Date(body.diagnosisDate)
        : null;
    if (body.cancerStage !== undefined && body.cancerStage !== null) values.cancerStage = body.cancerStage;
    if (body.emergencyContactName !== undefined && body.emergencyContactName !== null)
      values.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined && body.emergencyContactPhone !== null)
      values.emergencyContactPhone = body.emergencyContactPhone;
    if (body.notes !== undefined && body.notes !== null) values.notes = body.notes;
    if (body.isActive !== undefined) values.isActive = body.isActive;
    if (body.photoUrl !== undefined && body.photoUrl !== null) values.photoUrl = body.photoUrl;

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
