import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";

import {
  getCachedData,
  setCachedData,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";
import { createErrorResponse, handleApiError } from "@/lib/api-utils";
import { withRateLimit } from "@/middleware/rate-limit";
import { PatientService } from "@/services/patient/patient.service";
import { PatientAccessControl } from "@/services/patient/patient-access-control";

export const GET = withRateLimit(async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
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

    const paramsResolved = await params;
    const id = paramsResolved.id;
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

    // Use centralized PatientService to get complete patient data
    const service = new PatientService();
    const patient = await service.getDetail(id, {
      id: user.id,
      role: user.role,
    });

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
  { params }: { params: Promise<Record<string, string | string[]>> }
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

    const paramsResolved = await params;
    const id = paramsResolved.id;
    // Validate patient ID
    if (!id || typeof id !== "string") {
      return createErrorResponse(
        "Invalid patient ID",
        400,
        undefined,
        "VALIDATION_ERROR"
      );
    }

    // Check role-based access
    await PatientAccessControl.requireAccess(user.id, user.role, id, "update this patient");

    const body = await request.json();

    const service = new PatientService();
    const updated = await service.updatePatient(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "updating patient");
  }
},
  "GENERAL");

export const DELETE = withRateLimit(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
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

    const paramsResolved = await params;
    const id = paramsResolved.id;
    // Validate patient ID
    if (!id || typeof id !== "string") {
      return createErrorResponse(
        "Invalid patient ID",
        400,
        undefined,
        "VALIDATION_ERROR"
      );
    }

    // Check role-based access
    await PatientAccessControl.requireAccess(user.id, user.role, id, "delete this patient");

    const service = new PatientService();
    const result = await service.deletePatient(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "deleting patient");
  }
},
"GENERAL");

