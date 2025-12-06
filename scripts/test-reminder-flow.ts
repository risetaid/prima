/**
 * Test Script: Reminder Confirmation Flow
 *
 * Skenario:
 * 1. Kirim reminder ke nomor test (081333852187)
 * 2. Simulasi balasan "sudah" dari pasien
 * 3. Cek apakah AI intent bekerja
 * 4. Cek apakah acknowledgment dikirim
 *
 * Usage: bunx tsx scripts/test-reminder-flow.ts
 */

import { sendWhatsAppMessage, formatWhatsAppNumber } from "../src/lib/gowa";
import { SimpleConfirmationService } from "../src/services/simple-confirmation.service";
import { PatientLookupService } from "../src/services/patient/patient-lookup.service";
import { getAIIntentService } from "../src/services/ai/ai-intent.service";
import { db } from "../src/db";
import { reminders } from "../src/db/reminder-schema";
import { eq, and, desc, gte } from "drizzle-orm";

const TEST_PHONE = "081333852187";
const TEST_MESSAGE = "sudah";

async function main() {
  console.log("=".repeat(60));
  console.log("🧪 TEST: Reminder Confirmation Flow");
  console.log("=".repeat(60));
  console.log(`📱 Test Phone: ${TEST_PHONE}`);
  console.log(`💬 Test Message: "${TEST_MESSAGE}"`);
  console.log("");

  // Step 1: Find patient by phone
  console.log("📌 STEP 1: Find patient by phone number");
  console.log("-".repeat(40));

  const patientLookup = new PatientLookupService();
  const patientResult = await patientLookup.findPatientByPhone(TEST_PHONE);

  if (!patientResult.found || !patientResult.patient) {
    console.log("❌ Patient not found!");
    console.log("   Alternatives tried:", patientResult.alternatives);
    console.log("");
    console.log("💡 Pastikan ada pasien dengan nomor ini di database");
    return;
  }

  const patient = patientResult.patient;
  console.log("✅ Patient found:");
  console.log(`   ID: ${patient.id}`);
  console.log(`   Name: ${patient.name}`);
  console.log(`   Phone: ${patient.phoneNumber}`);
  console.log(`   Verification: ${patient.verificationStatus}`);
  console.log("");

  // Step 2: Check for pending reminders
  console.log("📌 STEP 2: Check for pending reminders (last 24h)");
  console.log("-".repeat(40));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const pendingReminders = await db
    .select({
      id: reminders.id,
      title: reminders.title,
      status: reminders.status,
      confirmationStatus: reminders.confirmationStatus,
      sentAt: reminders.sentAt,
    })
    .from(reminders)
    .where(
      and(eq(reminders.patientId, patient.id), gte(reminders.sentAt, yesterday))
    )
    .orderBy(desc(reminders.sentAt))
    .limit(5);

  if (pendingReminders.length === 0) {
    console.log("⚠️  No reminders found in last 24 hours");
    console.log("");
    console.log("💡 Sending a test reminder first...");

    // Send test reminder
    const reminderMessage = `🔔 *Pengingat Kesehatan*

Halo ${patient.name}!

Ini adalah pengingat test untuk minum obat.

*Balas dengan:*
✅ SUDAH jika sudah selesai
⏰ BELUM jika belum

💙 Tim PRIMA`;

    const sendResult = await sendWhatsAppMessage({
      to: formatWhatsAppNumber(patient.phoneNumber),
      body: reminderMessage,
    });

    console.log("📤 Test reminder sent:");
    console.log(`   Success: ${sendResult.success}`);
    console.log(`   Message ID: ${sendResult.messageId}`);
    console.log(`   Error: ${sendResult.error || "none"}`);
    console.log("");
    console.log(
      "⏳ Sekarang balas 'sudah' dari WhatsApp, lalu run script ini lagi"
    );
    console.log("   Atau lanjut ke Step 3 untuk test AI intent saja");
    console.log("");
  } else {
    console.log(`✅ Found ${pendingReminders.length} reminder(s):`);
    pendingReminders.forEach((r, i) => {
      console.log(
        `   ${i + 1}. [${r.status}/${r.confirmationStatus}] ${
          r.title || "No title"
        }`
      );
      console.log(`      Sent: ${r.sentAt?.toISOString()}`);
    });
    console.log("");
  }

  // Step 3: Test AI Intent Classification
  console.log("📌 STEP 3: Test AI Intent Classification");
  console.log("-".repeat(40));
  console.log(`   Testing message: "${TEST_MESSAGE}"`);
  console.log("");

  const aiIntentService = getAIIntentService();

  try {
    const startTime = Date.now();
    const aiResult = await aiIntentService.classifyReminderConfirmation(
      TEST_MESSAGE,
      patient.name
    );
    const latency = Date.now() - startTime;

    console.log("🤖 AI Classification Result:");
    console.log(`   Intent: ${aiResult.intent}`);
    console.log(`   Confidence: ${aiResult.confidence}%`);
    console.log(`   Confidence Level: ${aiResult.confidenceLevel}`);
    console.log(`   Reasoning: ${aiResult.reasoning}`);
    console.log(`   Latency: ${latency}ms`);
    console.log("");

    if (aiResult.intent === "reminder_confirmed") {
      console.log("✅ AI correctly identified as CONFIRMED!");
    } else if (aiResult.intent === "reminder_missed") {
      console.log("⏰ AI identified as MISSED");
    } else {
      console.log(`⚠️  AI returned: ${aiResult.intent}`);
    }
  } catch (error) {
    console.log("❌ AI Classification Error:");
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log("");

  // Step 4: Test full processReminderResponse flow
  console.log(
    "📌 STEP 4: Test Full Confirmation Flow (processReminderResponse)"
  );
  console.log("-".repeat(40));

  const simpleConfirmation = new SimpleConfirmationService();

  try {
    const result = await simpleConfirmation.processReminderResponse(
      formatWhatsAppNumber(TEST_PHONE),
      TEST_MESSAGE
    );

    console.log("📊 processReminderResponse Result:");
    console.log(`   Success: ${result.success}`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Error: ${result.error || "none"}`);
    console.log("");

    if (result.action === "confirmed") {
      console.log("✅ Flow completed: Reminder marked as CONFIRMED");
      console.log("   Acknowledgment should have been sent to patient");
    } else if (result.action === "missed") {
      console.log("⏰ Flow completed: Reminder marked as MISSED");
    } else if (result.action === "no_reminder") {
      console.log("⚠️  No pending reminder found to confirm");
    } else if (result.action === "invalid_response") {
      console.log("❌ Message not recognized as confirmation");
    }
  } catch (error) {
    console.log("❌ processReminderResponse Error:");
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("🏁 TEST COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
