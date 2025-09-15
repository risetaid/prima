/**
 * Test script for the follow-up confirmation system
 * Tests the complete flow: reminder -> confirmation scheduling -> confirmation response
 */

import { db, patients, reminderSchedules, reminderLogs } from "@/db";
import { eq, and } from "drizzle-orm";
import { VerificationWebhookService } from "@/services/webhook/verification-webhook.service";

async function testConfirmationFlow() {
  console.log("🧪 Testing Follow-up Confirmation System\n");

  try {
    // 1. Find a verified patient
    const verifiedPatients = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.verificationStatus, "verified"),
          eq(patients.isActive, true)
        )
      )
      .limit(1);

    if (!verifiedPatients.length) {
      console.log(
        "❌ No verified patients found. Please verify a patient first."
      );
      return;
    }

    const patient = verifiedPatients[0];
    console.log(
      `✅ Found verified patient: ${patient.name} (${patient.phoneNumber})`
    );

    // 2. Find active reminder schedules for this patient
    const activeSchedules = await db
      .select()
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, patient.id),
          eq(reminderSchedules.isActive, true)
        )
      )
      .limit(1);

    if (!activeSchedules.length) {
      console.log(
        "❌ No active reminder schedules found. Please create a reminder first."
      );
      return;
    }

    const schedule = activeSchedules[0];
    console.log(
      `✅ Found active reminder schedule: Pengingat at ${schedule.scheduledTime}`
    );

    // 3. Simulate sending a reminder (create reminder log)
    console.log("\n📤 Simulating reminder delivery...");

    const reminderLog = await db
      .insert(reminderLogs)
      .values({
        reminderScheduleId: schedule.id,
        patientId: patient.id,
        message: `Halo ${patient.name}, jangan lupa minum obat pada waktu yang tepat.`,
        phoneNumber: patient.phoneNumber,
        sentAt: new Date(),
        status: "DELIVERED",
        confirmationMessage: `Halo ${patient.name}, apakah sudah diminum obat? Silakan balas "SUDAH" jika sudah diminum atau "BELUM" jika belum.`,
        confirmationSentAt: new Date(Date.now() + 18 * 60 * 1000), // 18 minutes later
        confirmationStatus: "PENDING",
      })
      .returning();

    console.log(
      `✅ Created reminder log with confirmation scheduled for ${reminderLog[0].confirmationSentAt}`
    );

    // 4. Test confirmation response processing
    console.log("\n📋 Testing confirmation responses...");

    const webhookService = new VerificationWebhookService();

    // Test "SUDAH" response
    console.log("Testing 'SUDAH' response...");
    const sudahResult = await webhookService.processWebhook({
      device: "test",
      sender: patient.phoneNumber,
      message: "SUDAH",
    });
    console.log(`✅ 'SUDAH' result: ${sudahResult.result}`);

    // Test "BELUM" response
    console.log("Testing 'BELUM' response...");
    const belumResult = await webhookService.processWebhook({
      device: "test",
      sender: patient.phoneNumber,
      message: "BELUM",
    });
    console.log(`✅ 'BELUM' result: ${belumResult.result}`);

    // Test "NANTI" response
    console.log("Testing 'NANTI' response...");
    const nantiResult = await webhookService.processWebhook({
      device: "test",
      sender: patient.phoneNumber,
      message: "NANTI",
    });
    console.log(`✅ 'NANTI' result: ${nantiResult.result}`);

    // 5. Check final confirmation status
    console.log("\n📊 Checking final confirmation status...");
    const finalLog = await db
      .select()
      .from(reminderLogs)
      .where(eq(reminderLogs.id, reminderLog[0].id))
      .limit(1);

    if (finalLog.length) {
      const log = finalLog[0];
      console.log(`📋 Final confirmation status: ${log.confirmationStatus}`);
      console.log(
        `📋 Confirmation response: ${log.confirmationResponse || "None"}`
      );
      console.log(
        `📋 Response timestamp: ${log.confirmationResponseAt || "None"}`
      );
    }

    console.log("\n🎉 Confirmation flow test completed successfully!");
  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

// Run the test
testConfirmationFlow().catch(console.error);
