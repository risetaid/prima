/**
 * Patient service utilities for PRIMA system
 * Handles common patient-related database operations and data transformations
 */

import {
  db,
  patients,
  users,
  manualConfirmations,
  reminderLogs,
  reminderSchedules,
  patientMedications,
  medications,
} from "@/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { ComplianceService } from "@/lib/compliance-service";

export interface PatientWithRelations {
  id: string;
  name: string;
  phoneNumber: string;
  address: string | null;
  birthDate: Date | null;
  diagnosisDate: Date | null;
  cancerStage: string | null;
  assignedVolunteerId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  photoUrl: string | null;
  verificationStatus: string;
  verificationSentAt: Date | null;
  verificationResponseAt: Date | null;
  verificationMessage: string | null;
  verificationAttempts: string;
  verificationExpiresAt: Date | null;
  volunteerId: string | null;
  volunteerFirstName: string | null;
  volunteerLastName: string | null;
  volunteerEmail: string | null;
  volunteerRole: string | null;
  assignedVolunteer: any;
  manualConfirmations: any[];
  reminderLogs: any[];
  patientMedications: any[];
  complianceRate: number;
}

/**
 * Validate if a patient exists and is not soft deleted
 */
export async function validatePatientExists(
  patientId: string
): Promise<boolean> {
  const patientResult = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);

  return patientResult.length > 0;
}

/**
 * Get basic patient data with volunteer information
 */
export async function getPatientBasicData(patientId: string) {
  const patientResult = await db
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
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      notes: patients.notes,
      isActive: patients.isActive,
      deletedAt: patients.deletedAt,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      photoUrl: patients.photoUrl,
      // Verification fields
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
    })
    .from(patients)
    .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
    .where(eq(patients.id, patientId))
    .limit(1);

  return patientResult.length > 0 ? patientResult[0] : null;
}

/**
 * Get patient manual confirmations (recent 10)
 */
export async function getPatientManualConfirmations(patientId: string) {
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

/**
 * Get patient reminder logs (recent 10)
 */
export async function getPatientReminderLogs(patientId: string) {
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

/**
 * Get patient medications (active only)
 */
export async function getPatientMedications(patientId: string) {
  return await db
    .select({
      id: patientMedications.id,
      medicationName: medications.name,
      dosage: patientMedications.dosage,
      frequency: patientMedications.frequency,
      instructions: patientMedications.instructions,
      startDate: patientMedications.startDate,
      endDate: patientMedications.endDate,
      isActive: patientMedications.isActive,
      createdAt: patientMedications.createdAt,
    })
    .from(patientMedications)
    .leftJoin(medications, eq(patientMedications.medicationId, medications.id))
    .where(
      and(
        eq(patientMedications.patientId, patientId),
        eq(patientMedications.isActive, true)
      )
    )
    .orderBy(desc(patientMedications.createdAt));
}

/**
 * Transform patient data into the expected API response format
 */
export function transformPatientData(
  patientData: any,
  manualConfirmationsData: any[],
  reminderLogsData: any[],
  patientMedicationsData: any[],
  complianceRate: number
): PatientWithRelations {
  return {
    id: patientData.id,
    name: patientData.name,
    phoneNumber: patientData.phoneNumber,
    address: patientData.address,
    birthDate: patientData.birthDate,
    diagnosisDate: patientData.diagnosisDate,
    cancerStage: patientData.cancerStage,
    assignedVolunteerId: patientData.assignedVolunteerId,
    emergencyContactName: patientData.emergencyContactName,
    emergencyContactPhone: patientData.emergencyContactPhone,
    notes: patientData.notes,
    isActive: patientData.isActive,
    deletedAt: patientData.deletedAt,
    createdAt: patientData.createdAt,
    updatedAt: patientData.updatedAt,
    photoUrl: patientData.photoUrl,
    // Verification fields
    verificationStatus: patientData.verificationStatus,
    verificationSentAt: patientData.verificationSentAt,
    verificationResponseAt: patientData.verificationResponseAt,
    verificationMessage: patientData.verificationMessage,
    verificationAttempts: patientData.verificationAttempts,
    verificationExpiresAt: patientData.verificationExpiresAt,
    // Individual volunteer fields
    volunteerId: patientData.volunteerId,
    volunteerFirstName: patientData.volunteerFirstName,
    volunteerLastName: patientData.volunteerLastName,
    volunteerEmail: patientData.volunteerEmail,
    volunteerRole: patientData.volunteerRole,
    // Volunteer object
    assignedVolunteer: patientData.volunteerId
      ? {
          id: patientData.volunteerId,
          firstName: patientData.volunteerFirstName,
          lastName: patientData.volunteerLastName,
          email: patientData.volunteerEmail,
          role: patientData.volunteerRole,
        }
      : null,
    manualConfirmations: manualConfirmationsData.map((confirmation) => ({
      id: confirmation.id,
      visitDate: confirmation.visitDate,
      visitTime: confirmation.visitTime,
      medicationsTaken: confirmation.medicationsTaken,
      patientCondition: confirmation.patientCondition,
      notes: confirmation.notes,
      confirmedAt: confirmation.confirmedAt,
      volunteer: confirmation.volunteerId
        ? {
            id: confirmation.volunteerId,
            firstName: confirmation.volunteerFirstName,
            lastName: confirmation.volunteerLastName,
          }
        : null,
    })),
    reminderLogs: reminderLogsData.map((log) => ({
      id: log.id,
      message: log.message,
      sentAt: log.sentAt,
      status: log.status,
      medicationName: log.medicationName,
      dosage: log.dosage,
    })),
    patientMedications: patientMedicationsData.map((medication) => ({
      id: medication.id,
      medicationName: medication.medicationName,
      dosage: medication.dosage,
      frequency: medication.frequency,
      instructions: medication.instructions,
      startDate: medication.startDate,
      endDate: medication.endDate,
      isActive: medication.isActive,
      createdAt: medication.createdAt,
    })),
    complianceRate,
  };
}

/**
 * Get complete patient data with all relations
 */
export async function getPatientWithRelations(
  patientId: string
): Promise<PatientWithRelations | null> {
  // Get basic patient data
  const patientData = await getPatientBasicData(patientId);
  if (!patientData) return null;

  // Get related data in parallel
  const [
    manualConfirmationsData,
    reminderLogsData,
    patientMedicationsData,
    complianceData,
  ] = await Promise.all([
    getPatientManualConfirmations(patientId),
    getPatientReminderLogs(patientId),
    getPatientMedications(patientId),
    ComplianceService.calculatePatientCompliance(patientId),
  ]);

  // Transform and return
  return transformPatientData(
    patientData,
    manualConfirmationsData,
    reminderLogsData,
    patientMedicationsData,
    complianceData.complianceRate
  );
}
