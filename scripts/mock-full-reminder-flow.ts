#!/usr/bin/env bun

// Mock test: Send reminder to David + Mock SUDAH response + Send acknowledgment
// David will receive 2 messages without sending anything

import { ReminderService } from "@/services/reminder/reminder.service";
import { SimpleConfirmationService } from "@/services/simple-confirmation.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

async function mockFullReminderFlow() {
  const patientId = "1f2c2345-58d2-48f4-9b06-f893b81f5b75";
  const phoneNumber = "081333852187";
  const patientName = "David Yusaku";

  const reminderService = new ReminderService();
  const simpleConfirmationService = new SimpleConfirmationService();
  const whatsappService = new WhatsAppService();

  try {
    logger.info("Starting mock full reminder flow test", {
      patientId,
      phoneNumber,
      patientName
    });

    // STEP 1: Send test reminder to David
    logger.info("STEP 1: Sending test reminder to David");

    const testReminderMessage = "🧪 Ini adalah tes pengingat. Silakan abaikan pesan ini.";

    const reminderResult = await reminderService.sendReminder({
      patientId,
      phoneNumber,
      message: testReminderMessage,
      reminderId: uuidv4(),
      patientName,
      reminderType: "GENERAL",
      reminderTitle: "Tes Pengingat",
      reminderDescription: "Mock test untuk reminder confirmation"
    });

    if (!reminderResult.success) {
      throw new Error(`Failed to send reminder: ${reminderResult.error}`);
    }

    logger.info("Test reminder sent successfully", {
      messageId: reminderResult.messageId,
      message: testReminderMessage
    });

    // Wait a moment between messages
    await new Promise(resolve => setTimeout(resolve, 2000));

    // STEP 2: Mock SUDAH response and send acknowledgment
    logger.info("STEP 2: Mocking SUDAH response and sending acknowledgment");

    const mockConfirmationResult = await simpleConfirmationService.processReminderResponse(
      phoneNumber,
      "SUDAH"
    );

    if (!mockConfirmationResult.success) {
      throw new Error(`Failed to process confirmation: ${mockConfirmationResult.error}`);
    }

    logger.info("Mock confirmation processed successfully", {
      action: mockConfirmationResult.action,
      message: "SUDAH"
    });

    // STEP 3: Send a final test message to David
    logger.info("STEP 3: Sending final test message");

    const finalMessage = `✅ *Tes Selesai!*

Halo ${patientName}!

Anda seharusnya menerima 3 pesan:
1. Pesan tes pengingat
2. Konfirmasi "SUDAH" diproses
3. Pesan final ini

Sistem reminder confirmation sudah berfungsi dengan baik! 🎉

💙 Tim PRIMA`;

    await whatsappService.sendAck(phoneNumber, finalMessage);

    logger.info("Final test message sent", {
      patientId,
      phoneNumber
    });

    return {
      success: true,
      reminderSent: true,
      confirmationProcessed: true,
      finalMessageSent: true
    };

  } catch (error) {
    logger.error("Mock full reminder flow failed", error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Run if called directly
if (import.meta.main) {
  const result = await mockFullReminderFlow();
  console.log(`Mock test ${result.success ? "PASSED" : "FAILED"}:`, result);
  process.exit(result.success ? 0 : 1);
}

export { mockFullReminderFlow };