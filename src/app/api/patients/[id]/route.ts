import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
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
import {
  getCachedData,
  setCachedData,
  CACHE_KEYS,
  CACHE_TTL,
  invalidatePatientCache,
} from "@/lib/cache";
import { createErrorResponse, handleApiError } from "@/lib/api-utils";
import { ComplianceService } from "@/lib/compliance-service";
import {
  getPatientWithRelations,
  validatePatientExists,
} from "@/lib/patient-service";
import { withRateLimit } from "@/middleware/rate-limit";

export const GET = withRateLimit(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;

    // Validate patient ID
    if (!id || typeof id !== "string") {
      return createErrorResponse(
        "Invalid patient ID",
        400,
        undefined,
        "VALIDATION_ERROR"
      );
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.patient(id);
    const cachedPatient = await getCachedData(cacheKey);

    if (cachedPatient) {
      return NextResponse.json(cachedPatient);
    }

    // Use the patient service to get complete patient data
    const patient = await getPatientWithRelations(id);

    if (!patient) {
      return createErrorResponse(
        "Patient not found",
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    // Cache the patient data
    await setCachedData(cacheKey, patient, CACHE_TTL.PATIENT);

    return NextResponse.json(patient);
  } catch (error) {
    return handleApiError(error, "fetching patient");
  }
},
"GENERAL");

export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      phoneNumber,
      address,
      birthDate,
      diagnosisDate,
      cancerStage,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      isActive,
      photoUrl,
    } = body;

    // Check if patient exists and is not soft deleted
    const patientExists = await validatePatientExists(id);
    if (!patientExists) {
      return createErrorResponse(
        "Patient not found",
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    // Update patient (simplified response for now)
    await db
      .update(patients)
      .set({
        name,
        phoneNumber,
        address,
        birthDate: birthDate ? new Date(birthDate) : null,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
        cancerStage,
        emergencyContactName,
        emergencyContactPhone,
        notes,
        isActive,
        photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id));

    // Get updated patient
    const updatedPatientResult = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    const patient = updatedPatientResult[0];

    // Invalidate patient cache after update
    await invalidatePatientCache(id);

    return NextResponse.json(patient);
  } catch (error) {
    return handleApiError(error, "updating patient");
  }
},
"GENERAL");

export const DELETE = withRateLimit(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;

    // Check if patient exists and is not already soft deleted
    const patientExists = await validatePatientExists(id);
    if (!patientExists) {
      return createErrorResponse(
        "Patient not found",
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    const deleteTime = new Date();

    // Soft delete by setting deletedAt timestamp
    await db
      .update(patients)
      .set({
        deletedAt: deleteTime,
        isActive: false,
        updatedAt: deleteTime,
      })
      .where(eq(patients.id, id));

    // Also deactivate all related reminders
    await db
      .update(reminderSchedules)
      .set({
        isActive: false,
        updatedAt: deleteTime,
      })
      .where(eq(reminderSchedules.patientId, id));

    // Invalidate patient cache after deletion
    await invalidatePatientCache(id);

    return NextResponse.json({
      message: "Patient deleted successfully",
      deletedAt: deleteTime,
    });
  } catch (error) {
    return handleApiError(error, "deleting patient");
  }
},
"GENERAL");
