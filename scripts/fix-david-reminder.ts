#!/usr/bin/env bun

// Manual fix for David's missing conversation state
import { db, reminders, conversationStates } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ConversationStateService } from "@/services/conversation-state.service";

async function fixDavidReminder() {
  const reminderId = "684972f0-215c-48b1-92d0-b6d22752e99f";
  const patientId = "1f2c2345-58d2-48f4-9b06-f893b81f5b75";
  const phoneNumber = "081333852187";

  try {
    logger.info("Fixing David's reminder conversation state", {
      reminderId,
      patientId
    });

    // 1. Check if reminder exists and needs fixing
    const reminder = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    if (reminder.length === 0) {
      logger.error("Reminder not found", undefined, { reminderId });
      return false;
    }

    const r = reminder[0];
    if (r.confirmationStatus !== "PENDING") {
      logger.info("Reminder already processed", {
        reminderId,
        confirmationStatus: r.confirmationStatus
      });
      return true;
    }

    // 2. Create conversation state
    const conversationService = new ConversationStateService();
    await conversationService.setReminderConfirmationContext(
      patientId,
      phoneNumber,
      reminderId,
      r.fonnteMessageId || "manual-fix"
    );

    logger.info("Conversation state created successfully", {
      reminderId,
      patientId
    });

    // 3. Check result
    const context = await conversationService.getActiveContext(patientId);
    logger.info("Active context after fix", {
      patientId,
      activeContext: context
    });

    return true;
  } catch (error) {
    logger.error("Failed to fix David's reminder", error as Error, {
      reminderId,
      patientId
    });
    return false;
  }
}

// Run if called directly
if (import.meta.main) {
  const success = await fixDavidReminder();
  console.log(`Fix ${success ? "succeeded" : "failed"}`);
  process.exit(success ? 0 : 1);
}

export { fixDavidReminder };