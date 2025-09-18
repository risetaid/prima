// Patient Query Builder - Consolidates common patient query patterns
import { db, patients, users, reminders, medicalRecords, manualConfirmations } from "@/db";
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



  // ===== PATIENT REMINDERS WITH CREATOR =====
  static async getPatientRemindersWithCreator(patientId: string, limit?: number) {
    const query = db
      .select({
        id: reminders.id,
        scheduledTime: reminders.scheduledTime,
        isActive: reminders.isActive,
        createdAt: reminders.createdAt,
        creatorId: users.id,
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorHospitalName: users.hospitalName,
      })
      .from(reminders)
      .leftJoin(users, eq(reminders.createdById, users.id))
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true)
        )
      )
      .orderBy(desc(reminders.createdAt));

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