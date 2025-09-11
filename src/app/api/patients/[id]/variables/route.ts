import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { createErrorResponse, handleApiError } from "@/lib/api-utils";
import { VariablesService } from "@/services/patient/variables.service";
import { PatientError } from "@/services/patient/patient.types";

const variablesService = new VariablesService();

// GET /api/patients/[id]/variables - Get all variables for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;

    const response = await variablesService.get(patientId);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return handleApiError(error, "fetching patient variables");
  }
}

// POST /api/patients/[id]/variables - Create or update patient variables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id: patientId } = await params;
    const body = await request.json();
    const { variables } = body;

    const response = await variablesService.upsertMany(patientId, variables, currentUser.id);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return handleApiError(error, "updating patient variables");
  }
}

// DELETE /api/patients/[id]/variables - Delete a specific variable
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    const variableName = searchParams.get("variableName");

    if (!variableName) {
      return createErrorResponse(
        "variableName parameter is required",
        400,
        undefined,
        "VALIDATION_ERROR"
      );
    }

    const result = await variablesService.delete(patientId, variableName);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return handleApiError(error, "deleting patient variable");
  }
}
