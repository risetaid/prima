// Patient Query Builder - Consolidates common patient query patterns
import {
  db,
  patients,
  users,
  manualConfirmations,
} from "@/db";
import { eq, desc } from "drizzle-orm";

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

  // ===== PATIENT MANUAL CONFIRMATIONS WITH VOLUNTEER =====
  static async getPatientManualConfirmationsWithVolunteer(
    patientId: string,
    limit?: number
  ) {
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

}
