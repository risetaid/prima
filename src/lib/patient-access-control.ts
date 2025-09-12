import { db, patients } from "@/db";
import { eq } from "drizzle-orm";

export interface User {
  id: string;
  role: "DEVELOPER" | "ADMIN" | "RELAWAN";
}

/**
 * Checks if a user has access to a specific patient's data
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @param patientId - The patient ID to check access for
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export async function canAccessPatient(
  userId: string,
  userRole: string,
  patientId: string
): Promise<boolean> {
  // DEVELOPER and ADMIN can access all patients
  if (userRole === "DEVELOPER" || userRole === "ADMIN") {
    return true;
  }

  // RELAWAN can only access patients assigned to them
  if (userRole === "RELAWAN") {
    const patientResult = await db
      .select({ assignedVolunteerId: patients.assignedVolunteerId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patientResult.length === 0) {
      return false; // Patient doesn't exist
    }

    return patientResult[0].assignedVolunteerId === userId;
  }

  // Unknown role - deny access
  return false;
}

/**
 * Throws an error if user doesn't have access to the patient
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @param patientId - The patient ID to check access for
 * @param action - The action being performed (for error message)
 */
export async function requirePatientAccess(
  userId: string,
  userRole: string,
  patientId: string,
  action: string = "access this patient"
): Promise<void> {
  const hasAccess = await canAccessPatient(userId, userRole, patientId);

  if (!hasAccess) {
    throw new Error(`You don't have permission to ${action}`);
  }
}

/**
 * Gets the list of patient IDs that a user can access
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @returns Promise<string[]> - Array of patient IDs the user can access
 */
export async function getAccessiblePatientIds(
  userId: string,
  userRole: string
): Promise<string[]> {
  // DEVELOPER and ADMIN can access all patients
  if (userRole === "DEVELOPER" || userRole === "ADMIN") {
    const allPatients = await db.select({ id: patients.id }).from(patients);

    return allPatients.map((p) => p.id);
  }

  // RELAWAN can only access their assigned patients
  if (userRole === "RELAWAN") {
    const assignedPatients = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.assignedVolunteerId, userId));

    return assignedPatients.map((p) => p.id);
  }

  // Unknown role - no access
  return [];
}
