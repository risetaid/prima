import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, patients } from "@/db";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/waha";

import { logger } from '@/lib/logger';
// Manual verification by volunteer
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
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!["VERIFIED", "DECLINED", "PENDING"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid verification status" },
        { status: 400 }
      );
    }

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

    // Update patient verification status
    const updateData: {
      verificationStatus:
        | "PENDING"
        | "VERIFIED"
        | "DECLINED"
        | "EXPIRED";
      updatedAt: Date;
      verificationResponseAt?: Date | null;
      verificationExpiresAt?: Date | null;
    } = {
      verificationStatus: status,
      updatedAt: new Date(),
    };

    if (status === "VERIFIED" || status === "DECLINED") {
      updateData.verificationResponseAt = new Date();
    }

    if (status === "PENDING") {
      // Reset verification when setting back to pending
      updateData.verificationResponseAt = null;
      updateData.verificationExpiresAt = null;
    }

    await db.update(patients).set(updateData).where(eq(patients.id, patientId));

    // DISABLED: Verification logging - verificationLogs table removed in schema cleanup

    // Send confirmation message to patient if verified or declined
    if (status === "VERIFIED" || status === "DECLINED") {
      const confirmationMessage = generateConfirmationMessage(patient, status);
      await sendConfirmationMessage(patient.phoneNumber, confirmationMessage);
    }

    return NextResponse.json({
      success: true,
      message: `Patient verification status updated to ${status}`,
      newStatus: status,
      processedBy: `${user.firstName} ${user.lastName}`.trim() || user.email,
    });
  } catch (error: unknown) {
    logger.error("Manual verification error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to generate confirmation message
function generateConfirmationMessage(
  patient: { name: string },
  status: string
): string {
  if (status === "VERIFIED") {
    return `Terima kasih ${patient.name}! ✅

Anda akan menerima reminder dari relawan PRIMA.

Untuk berhenti, ketik: BERHENTI`;
  } else if (status === "DECLINED") {
    return `Baik ${patient.name}, terima kasih atas responsnya.

Semoga sehat selalu! 🙏`;
  }

  return "";
}

// Helper function to send confirmation message
async function sendConfirmationMessage(phoneNumber: string, message: string) {
  try {
    // Format phone number using WAHA formatter
    const formattedPhone = formatWhatsAppNumber(phoneNumber);

    // Send via WAHA
    const result = await sendWhatsAppMessage({
      to: formattedPhone,
      body: message,
    });

    if (!result.success) {
      logger.warn("Failed to send confirmation message", {
        error: result.error,
        phoneNumber: formattedPhone
      });
    }
  } catch (error: unknown) {
    logger.warn("Error sending confirmation message", { error: error instanceof Error ? error.message : String(error) });
    // Don't throw error, just log it as confirmation message is optional
  }
}
