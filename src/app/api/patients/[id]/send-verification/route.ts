import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, patients } from "@/db";
import { eq, and } from "drizzle-orm";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { ConversationStateService } from "@/services/conversation-state.service";

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

    // Send verification message with clear instructions
    const whatsappService = new WhatsAppService();
    const whatsappResult = await whatsappService.sendVerificationMessage(
      patient.phoneNumber,
      patient.name
    );

    if (!whatsappResult.success) {
      return NextResponse.json(
        { error: "Failed to send WhatsApp message: " + whatsappResult.error },
        { status: 500 }
      );
    }

    // Update patient verification status
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours expiry
    const currentAttempts = parseInt(patient.verificationAttempts || "0");

    await db
      .update(patients)
      .set({
        verificationStatus: "PENDING",
        verificationSentAt: new Date(),
        verificationMessage: `Text message: Verification request sent to ${patient.name}`,
        verificationAttempts: (currentAttempts + 1).toString(),
        verificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patientId));

    // DISABLED: Verification logging - verificationLogs table removed in schema cleanup

    // Set conversation state to verification context
    try {
      const conversationService = new ConversationStateService();
      await conversationService.getOrCreateConversationState(
        patientId,
        patient.phoneNumber,
        "verification"
      );
    } catch (conversationError: unknown) {
      logger.warn("Failed to set conversation state for verification", { error: conversationError instanceof Error ? conversationError.message : String(conversationError) });
      // Don't fail the entire request if conversation state update fails
    }

    return NextResponse.json({
      success: true,
      message:
        "Verification message sent successfully with clear response options",
      expiresAt: expiresAt.toISOString(),
      attempt: currentAttempts + 1,
      method: "text_verification",
    });
  } catch (error: unknown) {
    logger.error("Send verification error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
