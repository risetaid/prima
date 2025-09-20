import { db, patients, reminders, manualConfirmations } from "@/db";
import { eq, and, isNull, not, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

async function showReminderHistory() {
  logger.info("📋 Reminder History Analysis");
  logger.info("===========================");

  try {
    // Get a patient to analyze (you can modify this to get a specific patient)
    const testPatient = await db
      .select()
      .from(patients)
      .where(and(isNull(patients.deletedAt), eq(patients.isActive, true)))
      .limit(1);

    if (testPatient.length === 0) {
      logger.info("❌ No active patients found");
      return;
    }

    const patient = testPatient[0];
    logger.info(`👤 Patient: ${patient.name} (${patient.id})`);
    logger.info(`📅 Created: ${patient.createdAt}`);
    logger.info(`📊 Status: ${patient.isActive ? "Active" : "Inactive"}`);
    logger.info("");

    // Get ALL reminders (including inactive ones)
    const allReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.patientId, patient.id))
      .orderBy(desc(reminders.createdAt));

    logger.info(`📋 ALL REMINDERS (${allReminders.length}):`);
    logger.info("=====================================");

    allReminders.forEach((reminder, index) => {
      logger.info(`${index + 1}. ${reminder.message}`);
      logger.info(`   ⏰ Time: ${reminder.scheduledTime}`);
      logger.info(
        `   📅 Start: ${reminder.startDate.toISOString().split("T")[0]}`
      );
      logger.info(`   ✅ Active: ${reminder.isActive ? "Yes" : "No"}`);
      logger.info(`   📊 Status: ${reminder.status}`);
      logger.info(`   🕒 Created: ${reminder.createdAt}`);
      logger.info("");
    });

    // Get only ACTIVE reminders
    const activeReminders = allReminders.filter((r) => r.isActive);
    logger.info(`📋 ACTIVE REMINDERS (${activeReminders.length}):`);
    logger.info("===============================================");

    if (activeReminders.length === 0) {
      logger.info("❌ No active reminders found!");
      logger.info("💡 This explains why Terjadwal/Perlu Diperbarui/Semua = 0");
    } else {
      activeReminders.forEach((reminder, index) => {
        logger.info(
          `${index + 1}. ${reminder.message} - ${reminder.scheduledTime}`
        );
      });
    }
    logger.info("");

    // Get sent reminders history
    const sentReminders = await db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.patientId, patient.id), not(isNull(reminders.sentAt)))
      )
      .orderBy(desc(reminders.sentAt));

    logger.info(`📨 SENT REMINDERS HISTORY (${sentReminders.length}):`);
    logger.info("===============================================");

    if (sentReminders.length === 0) {
      logger.info("❌ No sent reminders found");
    } else {
      sentReminders.slice(0, 10).forEach((reminder, index) => {
        logger.info(`${index + 1}. ${reminder.message} (${reminder.status})`);
        logger.info(`   📅 Sent: ${reminder.sentAt}`);
        logger.info(`   📋 Active: ${reminder.isActive ? "Yes" : "No"}`);
        logger.info(`   💬 Message: ${reminder.message.substring(0, 50)}...`);
        logger.info("");
      });

      if (sentReminders.length > 10) {
        logger.info(`... and ${sentReminders.length - 10} more reminders`);
      }
    }

    // Get confirmations history
    const allConfirmations = await db
      .select()
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patient.id))
      .orderBy(desc(manualConfirmations.confirmedAt));

    logger.info(`✅ CONFIRMATIONS HISTORY (${allConfirmations.length}):`);
    logger.info("===============================================");

    if (allConfirmations.length === 0) {
      logger.info("❌ No confirmations found");
    } else {
      allConfirmations.slice(0, 10).forEach((conf, index) => {
        const reminder = allReminders.find((r) => r.id === conf.reminderId);
        const reminderMessage = reminder ? reminder.message : "Unknown";

        logger.info(`${index + 1}. ${reminderMessage}`);
        logger.info(`   📅 Confirmed: ${conf.confirmedAt}`);
        logger.info(
          `   📋 Reminder Active: ${reminder?.isActive ? "Yes" : "No"}`
        );
        logger.info("");
      });

      if (allConfirmations.length > 10) {
        logger.info(
          `... and ${allConfirmations.length - 10} more confirmations`
        );
      }
    }

    // Analysis
    logger.info("🔍 ANALYSIS:");
    logger.info("============");
    logger.info(`Total Reminders: ${allReminders.length}`);
    logger.info(`Active Reminders: ${activeReminders.length}`);
    logger.info(
      `Inactive Reminders: ${allReminders.length - activeReminders.length}`
    );
    logger.info(`Sent Reminders: ${sentReminders.length}`);
    logger.info(`Total Confirmations: ${allConfirmations.length}`);

    // Note: Patient reactivation tracking is handled in the database
    // Old reminders may be deactivated and not counted in stats
    // But compliance calculation includes historical data

    logger.info("");
    logger.info("🎯 RECOMMENDATION:");
    logger.info("==================");
    if (activeReminders.length === 0 && allReminders.length > 0) {
      logger.info("✅ Reactivate old reminders OR create new ones");
      logger.info(
        '✅ This will fix the "Terjadwal/Perlu Diperbarui/Semua = 0" issue'
      );
    }
  } catch (error) {
    logger.error("❌ Error:", error as Error);
  }
}

// Run the analysis
showReminderHistory()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Script failed:", error);
    process.exit(1);
  });
