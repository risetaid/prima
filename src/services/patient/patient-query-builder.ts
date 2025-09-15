// Patient Query Builder - Consolidates common patient query patterns
import { db, patients, users, reminderSchedules, medicalRecords, manualConfirmations, verificationLogs } from "@/db";
import { eq, and, desc } from "drizzle-orm";

export class PatientQueryBuilder {
  // ===== COMMON PATIENT WITH VOLUNTEER QUERY =====
  static async getPatientWithVolunteer(patientId: string) {
    const result = await db
      .select({
        // Patient fields
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

        // Volunteer fields
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

    return result[0] || null;
  }



  // ===== PATIENT REMINDER SCHEDULES WITH CREATOR =====
  static async getPatientRemindersWithCreator(patientId: string, limit?: number) {
    const query = db
      .select({
        id: reminderSchedules.id,

        scheduledTime: reminderSchedules.scheduledTime,
        isActive: reminderSchedules.isActive,
        createdAt: reminderSchedules.createdAt,
        creatorId: users.id,
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorHospitalName: users.hospitalName,
      })
      .from(reminderSchedules)
      .leftJoin(users, eq(reminderSchedules.createdById, users.id))
      .where(
        and(
          eq(reminderSchedules.patientId, patientId),
          eq(reminderSchedules.isActive, true)
        )
      )
      .orderBy(desc(reminderSchedules.createdAt));

    if (limit) {
      query.limit(limit);
    }

    return await query;
  }

  // ===== PATIENT MEDICAL RECORDS WITH RECORDER =====
  static async getPatientMedicalRecordsWithRecorder(patientId: string, limit?: number) {
    const query = db
      .select({
        id: medicalRecords.id,
        recordType: medicalRecords.recordType,
        title: medicalRecords.title,
        description: medicalRecords.description,
        recordedDate: medicalRecords.recordedDate,
        createdAt: medicalRecords.createdAt,
        recorderId: users.id,
        recorderFirstName: users.firstName,
        recorderLastName: users.lastName,
        recorderHospitalName: users.hospitalName,
      })
      .from(medicalRecords)
      .leftJoin(users, eq(medicalRecords.recordedBy, users.id))
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.recordedDate));

    if (limit) {
      query.limit(limit);
    }

    return await query;
  }

  // ===== PATIENT MANUAL CONFIRMATIONS WITH VOLUNTEER =====
  static async getPatientManualConfirmationsWithVolunteer(patientId: string, limit?: number) {
    const query = db
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
      .orderBy(desc(manualConfirmations.confirmedAt));

    if (limit) {
      query.limit(limit);
    }

    return await query;
  }

  // ===== PATIENT VERIFICATION HISTORY WITH PROCESSOR =====
  static async getPatientVerificationHistoryWithProcessor(patientId: string) {
    return await db
      .select({
        id: verificationLogs.id,
        action: verificationLogs.action,
        messageSent: verificationLogs.messageSent,
        patientResponse: verificationLogs.patientResponse,
        verificationResult: verificationLogs.verificationResult,
        createdAt: verificationLogs.createdAt,
        processedBy: verificationLogs.processedBy,
        processorFirstName: users.firstName,
        processorLastName: users.lastName,
        processorEmail: users.email,
      })
      .from(verificationLogs)
      .leftJoin(users, eq(verificationLogs.processedBy, users.id))
      .where(eq(verificationLogs.patientId, patientId))
      .orderBy(desc(verificationLogs.createdAt));
  }

  // ===== COMPREHENSIVE PATIENT AUTOFILL DATA =====
  static async getPatientAutofillData(patientId: string) {
    const [patient, reminders, medicalRecords] = await Promise.all([
      this.getPatientWithVolunteer(patientId),
      this.getPatientRemindersWithCreator(patientId, 3),
      this.getPatientMedicalRecordsWithRecorder(patientId, 1),
    ]);

    return {
      patient,
      reminders,
      medicalRecords,
    };
  }
}