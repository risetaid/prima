// Consolidated Patient Access Control - Reusable patterns for patient permissions
import { db, patients } from "@/db";
import { eq, and, isNull, SQL } from "drizzle-orm";

type PatientSummary = {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  photoUrl: string | null;
  createdAt: Date;
};

export class PatientAccessControl {
  // ===== CHECK IF USER CAN ACCESS PATIENT =====
  static async canAccessPatient(userId: string, userRole: string, patientId: string): Promise<boolean> {
    // Admin and developer can access all patients
    if (userRole === "ADMIN" || userRole === "DEVELOPER") {
      return true;
    }

    // Check if patient is assigned to this user
    const patientResult = await db
      .select({ assignedVolunteerId: patients.assignedVolunteerId })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1);

    if (patientResult.length === 0) {
      return false; // Patient doesn't exist
    }

    return patientResult[0].assignedVolunteerId === userId;
  }

  // ===== GET PATIENTS ASSIGNED TO USER =====
  static async getAssignedPatients(userId: string, userRole: string): Promise<PatientSummary[]> {
    // Admin and developer can see all patients
    if (userRole === "ADMIN" || userRole === "DEVELOPER") {
      return await db
        .select({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          isActive: patients.isActive,
          photoUrl: patients.photoUrl,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(isNull(patients.deletedAt))
        .orderBy(patients.createdAt);
    }

    // Regular users only see their assigned patients
    return await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        isActive: patients.isActive,
        photoUrl: patients.photoUrl,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(
        and(
          eq(patients.assignedVolunteerId, userId),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(patients.createdAt);
  }

  // ===== FILTER PATIENTS BY USER ACCESS =====
  static applyAccessFilter(userId: string, userRole: string, baseConditions: SQL<unknown>[] = []) {
    const conditions = [...baseConditions];

    // Non-admin users can only see their assigned patients
    if (userRole !== "ADMIN" && userRole !== "DEVELOPER") {
      conditions.push(eq(patients.assignedVolunteerId, userId));
    }

    return conditions;
  }

  // ===== REQUIRE PATIENT ACCESS (THROWS ERROR IF DENIED) =====
  static async requireAccess(userId: string, userRole: string, patientId: string, action: string = "access this patient") {
    const hasAccess = await this.canAccessPatient(userId, userRole, patientId);
    if (!hasAccess) {
      throw new Error(`Access denied: You do not have permission to ${action}`);
    }
  }
}