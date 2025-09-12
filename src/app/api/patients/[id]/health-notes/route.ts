import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { HealthNoteService } from "@/services/patient/health-note.service";
import { PatientError } from "@/services/patient/patient.types";
import { requirePatientAccess } from "@/lib/patient-access-control";

const healthNoteService = new HealthNoteService();

// GET /api/patients/[id]/health-notes - Get all health notes for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      user.id,
      user.role,
      patientId,
      "view this patient's health notes"
    );

    const result = await healthNoteService.list(patientId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/patients/[id]/health-notes - Create a new health note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      user.id,
      user.role,
      patientId,
      "create health notes for this patient"
    );

    const body = await request.json();

    const result = await healthNoteService.create(patientId, body, user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
