import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { createErrorResponse, handleApiError } from "@/lib/api-helpers";
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
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
    if (!id || typeof id !== "string") {
      return createErrorResponse(
        "Invalid patient ID",
        400,
        undefined,
        "VALIDATION_ERROR"
      );
    }

    // Get only the updatedAt timestamp for lightweight polling
    const patientResult = await db
      .select({
        updatedAt: patients.updatedAt,
        verificationStatus: patients.verificationStatus,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (patientResult.length === 0) {
      return createErrorResponse(
        "Patient not found",
        404,
        undefined,
        "NOT_FOUND_ERROR"
      );
    }

    const patient = patientResult[0];

    return NextResponse.json({
      version: patient.updatedAt.getTime(), // Use timestamp as version
      verificationStatus: patient.verificationStatus,
      updatedAt: patient.updatedAt,
    });
  } catch (error) {
    return handleApiError(error, "fetching patient version");
  }
}