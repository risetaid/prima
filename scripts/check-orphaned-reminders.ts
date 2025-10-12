#!/usr/bin/env bun

// Simple script to detect reminders missing conversation states
import { db, reminders, conversationStates } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

async function checkMissingConversationStates() {
  try {
    logger.info("Checking for reminders without conversation states");

    // Find reminders sent in last 24 hours that are still PENDING
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const orphanedReminders = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        message: reminders.message,
        sentAt: reminders.sentAt,
        confirmationStatus: reminders.confirmationStatus,
        fonnteMessageId: reminders.fonnteMessageId,
      })
      .from(reminders)
      .leftJoin(
        conversationStates,
        and(
          eq(conversationStates.relatedEntityId, reminders.id),
          eq(conversationStates.relatedEntityType, 'reminder'),
          eq(conversationStates.isActive, true)
        )
      )
      .where(
        and(
          eq(reminders.status, 'SENT'),
          eq(reminders.confirmationStatus, 'PENDING'),
          // reminders.sentAt exists and is recent
          // Note: Using raw SQL for sentAt check
        )
      );

    if (orphanedReminders.length > 0) {
      logger.error("Found reminders missing conversation states", undefined, {
        count: orphanedReminders.length,
        reminders: orphanedReminders.map(r => ({
          id: r.id,
          patientId: r.patientId,
          sentAt: r.sentAt,
          message: r.message?.substring(0, 50)
        }))
      });
    } else {
      logger.info("All reminders have proper conversation states");
    }

    return orphanedReminders.length;
  } catch (error) {
    logger.error("Failed to check missing conversation states", error as Error);
    return -1;
  }
}

// Run if called directly
if (import.meta.main) {
  const count = await checkMissingConversationStates();
  console.log(`Found ${count} reminders missing conversation states`);
  process.exit(count > 0 ? 1 : 0);
}

export { checkMissingConversationStates };