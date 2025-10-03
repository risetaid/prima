import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, patients } from "@/db";
import { eq, and } from "drizzle-orm";
import { SimpleVerificationService } from "@/services/verification/simple-verification.service";

import { logger } from '@/lib/logger';
// Send verification message to patient
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;

    // Get patient details
    const patientResult = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.isActive, true)))
      .limit(1);

    if (patientResult.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = patientResult[0];

    // Send verification message using simple service
    const verificationService = new SimpleVerificationService();
    const success = await verificationService.sendVerification(
      patientId,
      patient.phoneNumber,
      patient.name
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send verification message" },
        { status: 500 }
      );
    }

    // Get updated patient data for response
    const updatedPatient = await db
      .select({
        verificationExpiresAt: patients.verificationExpiresAt,
        verificationAttempts: patients.verificationAttempts
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    const expiresAt = updatedPatient[0]?.verificationExpiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000);
    const attempts = parseInt(updatedPatient[0]?.verificationAttempts || "1");

    return NextResponse.json({
      success: true,
      message: "Verification message sent successfully",
      expiresAt: expiresAt.toISOString(),
      attempt: attempts,
      method: "simple_verification",
    });
  } catch (error: unknown) {
    logger.error("Send verification error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
