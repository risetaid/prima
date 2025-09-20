import { db, reminders, patients } from "@/db/index.js";
import { eq, and, sql, isNull } from "drizzle-orm";
import { getWIBDateString } from "@/lib/timezone.js";
import { logger } from "@/lib/logger.js";

async function checkReminders() {
  try {
    logger.info("🔍 Checking current reminder state...");
    logger.info("📅 Today WIB:", { date: getWIBDateString() });

    // Get today's active reminders
    const todayReminders = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        isActive: reminders.isActive,
        status: reminders.status,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.isActive, true),
          eq(sql`DATE(${reminders.startDate})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt)
        )
      );

    logger.info(
      `\n📋 Found ${todayReminders.length} active reminders for today:`
    );
    todayReminders.forEach((reminder, index) => {
      logger.info(
        `  ${index + 1}. ${reminder.patientName} - Pengingat at ${
          reminder.scheduledTime
        } (${reminder.status})`
      );
    });

    // Get today's sent reminders
    const todaySent = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        status: reminders.status,
        sentAt: reminders.sentAt,
        message: reminders.message,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(sql`DATE(${reminders.sentAt})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt)
        )
      );

    logger.info(`\n📨 Found ${todaySent.length} reminders sent today:`);
    todaySent.forEach((reminder, index) => {
      logger.info(
        `  ${index + 1}. ${reminder.patientName} - ${reminder.status} at ${
          reminder.sentAt
        }`
      );
    });

    // Check which reminders would be sent with our new logic
    logger.info("\n🎯 Testing smart duplicate prevention:");
    const remindersToSend = await db
      .select({
        id: reminders.id,
        patientName: patients.name,
        scheduledTime: reminders.scheduledTime,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.isActive, true),
          eq(sql`DATE(${reminders.startDate})`, getWIBDateString()),
          isNull(reminders.deletedAt),
          isNull(patients.deletedAt),
          // SMART DUPLICATE PREVENTION: Only send reminders that haven't been delivered today
          sql`(${reminders.status} != 'DELIVERED' OR ${
            reminders.sentAt
          } IS NULL OR DATE(${reminders.sentAt}) != ${getWIBDateString()})`
        )
      );

    logger.info(
      `\n✅ Reminders that would be sent with smart duplicate prevention: ${remindersToSend.length}`
    );
    remindersToSend.forEach((reminder, index) => {
      logger.info(
        `  ${index + 1}. ${reminder.patientName} - Pengingat at ${
          reminder.scheduledTime
        }`
      );
    });
  } catch (error) {
    logger.error("❌ Error checking reminders:", error instanceof Error ? error : new Error(String(error)));
  } finally {
    process.exit(0);
  }
}

checkReminders();
