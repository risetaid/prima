/**
 * API Endpoint: Test Reminder Confirmation Flow
 *
 * Test di browser/Postman:
 * GET /api/test/reminder-flow?phone=081333852187&message=sudah
 *
 * Hanya aktif di development atau jika ALLOW_TEST_ENDPOINTS=true
 */

import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/gowa";
import { SimpleConfirmationService } from "@/services/simple-confirmation.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { getAIIntentService } from "@/services/ai/ai-intent.service";
import { db, reminders } from "@/db";
import { eq, and, desc, gte, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Only allow in dev or if explicitly enabled via secret
const ALLOW_TEST =
  process.env.NODE_ENV === "development" ||
  process.env.ALLOW_TEST_ENDPOINTS === "true";

const TEST_SECRET = process.env.CRON_SECRET; // Reuse cron secret for auth

export async function GET(request: NextRequest) {
  // Check authorization via header or query param
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const providedSecret =
    authHeader?.replace("Bearer ", "") || searchParams.get("secret");

  if (!ALLOW_TEST && providedSecret !== TEST_SECRET) {
    return NextResponse.json(
      {
        error:
          "Test endpoint requires authorization. Add ?secret=YOUR_CRON_SECRET or set ALLOW_TEST_ENDPOINTS=true",
      },
      { status: 403 }
    );
  }

  const phone = searchParams.get("phone") || "081333852187";
  const message = searchParams.get("message") || "sudah";
  const sendReminder = searchParams.get("sendReminder") === "true";

  const results: Record<string, unknown> = {
    testPhone: phone,
    testMessage: message,
    timestamp: new Date().toISOString(),
    steps: {},
  };

  try {
    // Step 1: Find patient
    logger.info("🧪 TEST: Finding patient", { phone });
    const patientLookup = new PatientLookupService();
    const patientResult = await patientLookup.findPatientByPhone(phone);

    results.steps = {
      ...(results.steps as object),
      step1_findPatient: {
        found: patientResult.found,
        patient: patientResult.patient
          ? {
              id: patientResult.patient.id,
              name: patientResult.patient.name,
              phoneNumber: patientResult.patient.phoneNumber,
              verificationStatus: patientResult.patient.verificationStatus,
            }
          : null,
        alternatives: patientResult.alternatives,
      },
    };

    if (!patientResult.found || !patientResult.patient) {
      return NextResponse.json({
        ...results,
        error: "Patient not found",
        suggestion: "Pastikan ada pasien dengan nomor ini di database",
      });
    }

    const patient = patientResult.patient;

    // Step 2: Check pending reminders
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const pendingReminders = await db
      .select({
        id: reminders.id,
        title: reminders.title,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
        sentAt: reminders.sentAt,
        message: reminders.message,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patient.id),
          or(eq(reminders.status, "SENT"), eq(reminders.status, "DELIVERED")),
          eq(reminders.confirmationStatus, "PENDING"),
          gte(reminders.sentAt, yesterday)
        )
      )
      .orderBy(desc(reminders.sentAt))
      .limit(5);

    results.steps = {
      ...(results.steps as object),
      step2_checkReminders: {
        count: pendingReminders.length,
        reminders: pendingReminders.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          confirmationStatus: r.confirmationStatus,
          sentAt: r.sentAt?.toISOString(),
        })),
      },
    };

    // Optional: Send test reminder
    if (sendReminder) {
      const reminderMessage = `🔔 *Pengingat Kesehatan (TEST)*

Halo ${patient.name}!

Ini adalah pengingat test untuk cek flow konfirmasi.

*Balas dengan:*
✅ SUDAH jika sudah selesai
⏰ BELUM jika belum

💙 Tim PRIMA`;

      const sendResult = await sendWhatsAppMessage({
        to: formatWhatsAppNumber(patient.phoneNumber),
        body: reminderMessage,
      });

      results.steps = {
        ...(results.steps as object),
        step2b_sendTestReminder: {
          success: sendResult.success,
          messageId: sendResult.messageId,
          error: sendResult.error,
        },
      };
    }

    // Step 3: Test AI Intent Classification
    logger.info("🧪 TEST: AI Intent Classification", { message });
    const aiIntentService = getAIIntentService();

    let aiResult;
    const aiStartTime = Date.now();
    try {
      aiResult = await aiIntentService.classifyReminderConfirmation(
        message,
        patient.name
      );
    } catch (error) {
      aiResult = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
    const aiLatency = Date.now() - aiStartTime;

    results.steps = {
      ...(results.steps as object),
      step3_aiIntentClassification: {
        input: message,
        result: aiResult,
        latencyMs: aiLatency,
      },
    };

    // Step 4: Test full processReminderResponse
    logger.info("🧪 TEST: processReminderResponse", { phone, message });
    const simpleConfirmation = new SimpleConfirmationService();

    let confirmationResult;
    const confirmStartTime = Date.now();
    try {
      confirmationResult = await simpleConfirmation.processReminderResponse(
        formatWhatsAppNumber(phone),
        message
      );
    } catch (error) {
      confirmationResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    const confirmLatency = Date.now() - confirmStartTime;

    results.steps = {
      ...(results.steps as object),
      step4_processReminderResponse: {
        result: confirmationResult,
        latencyMs: confirmLatency,
      },
    };

    // Summary
    results.summary = {
      patientFound: true,
      patientVerified: patient.verificationStatus === "VERIFIED",
      hasPendingReminders: pendingReminders.length > 0,
      aiClassifiedCorrectly:
        "intent" in (aiResult || {}) &&
        (aiResult as { intent: string }).intent === "reminder_confirmed",
      confirmationProcessed: confirmationResult?.success,
      confirmationAction: confirmationResult?.action,
    };

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Test reminder flow error", error as Error);
    return NextResponse.json(
      {
        ...results,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
