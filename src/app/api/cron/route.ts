import { NextRequest, NextResponse } from "next/server";
import { db, reminderSchedules, patients, reminderLogs, patientVariables } from "@/db";
import { eq, and, gte, lte, notExists, or, count, isNull } from "drizzle-orm";
import {
  shouldSendReminderNow,
  getWIBTime,
  getWIBDateString,
  getWIBTimeString,
  getWIBTodayStart,
} from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { ReminderRepository } from "@/services/reminder/reminder.repository";
import { isDuplicateEvent } from "@/lib/idempotency";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { MedicationParser, type MedicationDetails } from "@/lib/medication-parser";
// Rate limiter temporarily disabled

const whatsappService = new WhatsAppService();
const reminderRepository = new ReminderRepository();

interface ReminderSchedule {
  id: string;
  patientId: string;
  scheduledTime: string;
  startDate: Date;
  customMessage: string | null;
  patientName: string | null;
  patientPhoneNumber: string | null;
}

type AttachmentsByScheduleId = Record<
  string,
  Array<{
    type: "article" | "video";
    title: string;
    url: string;
    id: string;
  }>
>;

// Helper function to create date range for WIB timezone (equivalent to createDateRangeQuery)
function createWIBDateRange(dateString: string) {
  const date = new Date(dateString);
  // Start of day in WIB (00:00:00)
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(17, 0, 0, 0); // 17:00 UTC = 00:00 WIB (UTC+7)

  // End of day in WIB (23:59:59.999)
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(16, 59, 59, 999); // 16:59 UTC next day = 23:59 WIB (UTC+7)
  endOfDay.setDate(endOfDay.getDate() + 1);

  return { startOfDay, endOfDay };
}

/**
 * Get patient medication details for personalization
 */
async function getPatientMedicationDetails(patientId: string): Promise<MedicationDetails | null> {
  try {
    // Get patient variables to extract medication information
    const variables = await db
      .select({
        variableName: patientVariables.variableName,
        variableValue: patientVariables.variableValue,
        variableCategory: patientVariables.variableCategory
      })
      .from(patientVariables)
      .where(
        and(
          eq(patientVariables.patientId, patientId),
          eq(patientVariables.isActive, true),
          eq(patientVariables.variableCategory, 'MEDICATION')
        )
      );

    // Convert to format expected by MedicationParser
    const variableArray = variables.map(v => ({
      name: v.variableName,
      value: v.variableValue
    }));

    // Parse medication details from variables
    return MedicationParser.parseFromVariables(variableArray);
  } catch (error) {
    logger.warn('Failed to get patient medication details for cron', {
      patientId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Build personalized medication message
 */
function buildMedicationMessage(medication: MedicationDetails | null, template: string): string {
  if (!medication) {
    return template.replace(/obat Anda/gi, 'medikasi Anda');
  }

  return template
    .replace(/obat Anda/gi, `${medication.name} Anda`)
    .replace(/\{name\}/gi, medication.name || 'medikasi')
    .replace(/\{dosage\}/gi, medication.dosage || '')
    .replace(/\{form\}/gi, medication.form || 'tablet');
}

async function validateEnvironment() {
  // Basic validation checks
  logger.info("🔄 Starting reminder cron job - initialization", {
    api: true,
    cron: true,
    nodeEnv: process.env.NODE_ENV,
    hasDbConnection: Boolean(db),
    hasWhatsAppService: Boolean(whatsappService),
  });

  // Test basic database connection with a simple query
  logger.info("Testing database connection", {
    api: true,
    cron: true,
    timestamp: new Date().toISOString(),
  });

  try {
    const connectionTest = await db
      .select({ count: count() })
      .from(patients)
      .limit(1);

    logger.info("Database connection test successful", {
      api: true,
      cron: true,
      hasResults: connectionTest.length > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (dbTestError) {
    logger.error("Database connection test failed", dbTestError as Error, {
      api: true,
      cron: true,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Database connection failed: ${(dbTestError as Error).message}`
    );
  }

  logger.info("🔄 Starting reminder cron job", {
    api: true,
    cron: true,
    wibDate: getWIBDateString(),
    wibTime: getWIBTimeString(),
    timestamp: new Date().toISOString(),
  });
}

async function fetchReminderSchedules(todayWIB: string, endOfDay: Date, todayStart: Date) {
  // Get all active reminder schedules that haven't been sent today
  logger.info("Executing reminder schedules query", {
    api: true,
    cron: true,
    todayWIB,
  });

  const reminderSchedulesToProcess = await db
    .select({
      id: reminderSchedules.id,
      patientId: reminderSchedules.patientId,
      scheduledTime: reminderSchedules.scheduledTime,
      startDate: reminderSchedules.startDate,
      customMessage: reminderSchedules.customMessage,
      patientName: patients.name,
      patientPhoneNumber: patients.phoneNumber,
    })
    .from(reminderSchedules)
    .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
    .where(
      and(
        eq(reminderSchedules.isActive, true),
        isNull(reminderSchedules.deletedAt), // Exclude deleted reminders
        // Only get reminders for TODAY (not yesterday or future dates)
        gte(reminderSchedules.startDate, todayStart),
        lte(reminderSchedules.startDate, endOfDay),
        eq(patients.isActive, true),
        eq(patients.verificationStatus, "verified"),
        notExists(
          db
            .select()
            .from(reminderLogs)
            .where(
              and(
                eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                // Check for both SENT and DELIVERED statuses to exclude all processed reminders
                or(eq(reminderLogs.status, "SENT"), eq(reminderLogs.status, "DELIVERED")),
                gte(reminderLogs.sentAt, todayStart)
              )
            )
        )
      )
    )
    .orderBy(reminderSchedules.scheduledTime);

  logger.info("Query completed successfully", {
    api: true,
    cron: true,
    schedulesFound: reminderSchedulesToProcess.length,
  });

  return reminderSchedulesToProcess;
}

async function fetchAttachments(scheduleIds: string[]) {
  // Fetch attachments for all schedules
  const allAttachments =
    scheduleIds.length > 0
      ? await reminderRepository.getAttachments(scheduleIds)
      : [];

  // Group attachments by reminderScheduleId
  const attachmentsByScheduleId: Record<
    string,
    Array<{
      type: "article" | "video";
      title: string;
      url: string;
      id: string;
    }>
  > = {};
  for (const attachment of allAttachments) {
    if (!attachmentsByScheduleId[attachment.reminderScheduleId]) {
      attachmentsByScheduleId[attachment.reminderScheduleId] = [];
    }
    attachmentsByScheduleId[attachment.reminderScheduleId].push({
      type: attachment.contentType as "article" | "video",
      title: attachment.contentTitle,
      url: attachment.contentUrl,
      id: "", // Not needed for building message
    });
  }

  return attachmentsByScheduleId;
}

async function processSchedule(schedule: ReminderSchedule, attachmentsByScheduleId: AttachmentsByScheduleId, debugLogs: string[]) {
  // Check if it's time to send this reminder
  const scheduleDate = schedule.startDate.toISOString().split("T")[0];
  const shouldSend = shouldSendReminderNow(
    scheduleDate,
    schedule.scheduledTime
  );

  // Debug logging for manual cron troubleshooting
  if (shouldSend) {
    debugLogs.push(
      `✅ Reminder ${schedule.patientName} (${
        schedule.scheduledTime
      }) should be sent - current: ${getWIBTimeString()}, scheduled: ${
        schedule.scheduledTime
      }`
    );
  } else {
    debugLogs.push(
      `❌ Reminder ${schedule.patientName} (${
        schedule.scheduledTime
      }) not ready - current: ${getWIBTimeString()}, scheduled: ${
        schedule.scheduledTime
      }`
    );
  }

  if (shouldSend) {
    // Idempotency: ensure we only send once per schedule per WIB day
    const idempotencyKey = `reminder:sent:${
      schedule.id
    }:${getWIBDateString()}`;
    const alreadySent = await isDuplicateEvent(
      idempotencyKey,
      24 * 60 * 60
    );
    if (alreadySent) {
      debugLogs.push(
        `⏭️ Skipping duplicate send for ${schedule.patientName} (${schedule.scheduledTime})`
      );
      return { sent: false, error: false };
    }

    // Validate phone number exists
    if (!schedule.patientPhoneNumber) {
      debugLogs.push(
        `❌ Missing phone number for ${schedule.patientName}`
      );
      return { sent: false, error: true };
    }

    // Rate limiting temporarily disabled

    try {
      // Send WhatsApp health reminder
      logger.info("Sending WhatsApp health reminder", {
        api: true,
        cron: true,
        patientId: schedule.patientId,
        reminderId: schedule.id,
  
        hasCustomMessage: Boolean(schedule.customMessage),
      });

      // Get attachments for this schedule
      const attachments = attachmentsByScheduleId[schedule.id] || [];

      // Get patient medication details for personalization
      const medicationDetails = await getPatientMedicationDetails(schedule.patientId);

      // Build message: use customMessage if available, otherwise fallback to template
      let messageToSend: string;
      if (schedule.customMessage) {
        // Use custom message with attachments
        messageToSend = whatsappService.buildMessage(
          schedule.customMessage,
          attachments
        );
      } else {
        // Build personalized template message
        const templateMessage = `💚 *Pengingat Kesehatan*

Halo ${schedule.patientName}!

Saatnya menjalankan rutinitas kesehatan:
🔹 *Waktu:* ${schedule.scheduledTime}

*Balas setelah menyelesaikan:*
✅ SUDAH / SELESAI
⏰ BELUM (akan diingatkan lagi)
🆘 BANTUAN (butuh bantuan relawan)

💙 Tim PRIMA`;

        // Personalize message with medication details
        const personalizedMessage = buildMedicationMessage(medicationDetails, templateMessage);

        messageToSend =
          attachments.length > 0
            ? whatsappService.buildMessage(personalizedMessage, attachments)
            : personalizedMessage;
      }

      const result = await whatsappService.send(
        schedule.patientPhoneNumber,
        messageToSend
      );

      const providerLogMessage = `🔍 FONNTE result for ${schedule.patientName}: success=${result.success}, messageId=${result.messageId}, error=${result.error}`;
      debugLogs.push(providerLogMessage);

      // Get medication details for logging
      const medicationDetailsForLogging = await getPatientMedicationDetails(schedule.patientId);
      const medicationDisplay = buildMedicationMessage(medicationDetailsForLogging, 'obat Anda');

      // Add comprehensive details about the sent reminder
      if (result.success) {
        debugLogs.push(`✅ Reminder sent successfully:`);
        debugLogs.push(`   👤 Patient: ${schedule.patientName}`);
        debugLogs.push(`   📱 WhatsApp: ${schedule.patientPhoneNumber}`);
        debugLogs.push(`   💊 Medication: ${medicationDisplay}`);
        debugLogs.push(`   ⏰ Scheduled: ${schedule.scheduledTime}`);
        debugLogs.push(
          `   📝 Custom Message: ${
            schedule.customMessage ? "Yes" : "No (using template)"
          }`
        );
        debugLogs.push(`   📎 Attachments: ${attachments.length}`);
        debugLogs.push(`   🆔 Fonnte ID: ${result.messageId}`);
      } else {
        debugLogs.push(`❌ Failed to send reminder:`);
        debugLogs.push(`   👤 Patient: ${schedule.patientName}`);
        debugLogs.push(`   📱 WhatsApp: ${schedule.patientPhoneNumber}`);
        debugLogs.push(`   💊 Medication: ${medicationDisplay}`);
        debugLogs.push(`   ❌ Error: ${result.error}`);
      }

      // Create reminder log - SENT means waiting for text response confirmation
      const status: "SENT" | "FAILED" = result.success
        ? "SENT" // Changed from DELIVERED since we need text response confirmation
        : "FAILED";
      const logData = {
        reminderScheduleId: schedule.id,
        patientId: schedule.patientId,
        sentAt: getWIBTime(),
        status: status,
        message:
          schedule.customMessage ||
          `Medication reminder at ${schedule.scheduledTime}`,
        phoneNumber: schedule.patientPhoneNumber,
        fonnteMessageId: result.messageId,
      };

      // Create reminder log with error handling
      try {
        await db
          .insert(reminderLogs)
          .values(logData)
          .returning();
        // Log created successfully
      } catch (logError) {
        console.error(
          `❌ Failed to create reminder log for ${schedule.patientName}:`,
          logError
        );
        console.error(`❌ Log data that failed:`, logData);
        // Fallback: attempt a minimal log to preserve UI state and stop re-sends
        try {
          await db
            .insert(reminderLogs)
            .values({
              reminderScheduleId: schedule.id,
              patientId: schedule.patientId,
              sentAt: getWIBTime(),
              status: status,
              message: `Text: Medication reminder`,
              phoneNumber: schedule.patientPhoneNumber,
              fonnteMessageId: result.messageId,
            })
            .returning();
        } catch (fallbackError) {
          console.error(
            "❌ Fallback reminder log insert also failed",
            fallbackError
          );
        }
        return { sent: false, error: true };
      }

      // Invalidate reminder stats cache after creating log
      await invalidateCache(CACHE_KEYS.reminderStats(schedule.patientId));

      return { sent: result.success, error: !result.success };
    } catch {
      return { sent: false, error: true };
    }
  }
  return { sent: false, error: false };
}

function buildSummary(startTime: number, processedCount: number, sentCount: number, errorCount: number, reminderSchedulesToProcess: ReminderSchedule[], debugLogs: string[]) {
  const duration = Date.now() - startTime;
  const summary = {
    success: true,
    message:
      sentCount > 0
        ? `✅ Cron completed: ${sentCount} reminders sent successfully`
        : `📋 Cron completed: No reminders needed at this time`,
    execution: {
      timestamp: new Date().toISOString(),
      wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
      duration: `${duration}ms`,
      provider: "FONNTE",
    },
    results: {
      schedulesFound: reminderSchedulesToProcess.length,
      schedulesProcessed: processedCount,
      messagesSent: sentCount,
      errors: errorCount,
      successRate:
        processedCount > 0 && sentCount >= 0
          ? `${Math.round((sentCount / processedCount) * 100)}%`
          : "0%",
      note: "Only processing reminders that have NOT been delivered yet (Terjadwal status)"
    },
    details:
      debugLogs.length > 0 ? debugLogs : ["No detailed logs available"],
  };

  return summary;
}

function handleError(error: unknown, processedCount: number, sentCount: number, errorCount: number) {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    "Cron job failed with critical error",
    error instanceof Error ? error : new Error(errorMessage),
    {
      api: true,
      cron: true,
      processedCount,
      sentCount,
      errorCount,
      errorMessage,
      errorStack: errorStack?.substring(0, 500), // Limit stack trace length
    }
  );

  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      details: errorMessage, // Show error message for debugging
      debugInfo: {
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: errorStack?.substring(0, 300), // Show partial stack trace
      },
      timestamp: new Date().toISOString(),
      wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
      stats: {
        processed: processedCount,
        sent: sentCount,
        errors: errorCount + 1,
      },
    },
    { status: 500 }
  );
}

// GET endpoint for cron functions
export async function GET(request: NextRequest) {
  // Verify this is called by cron with secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await processReminders();
}

// POST endpoint for manual trigger during development/testing
export async function POST(request: NextRequest) {
  // Always require auth in production
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return await processReminders();
}

async function processReminders() {
  const startTime = Date.now();
  let processedCount = 0;
  let sentCount = 0;
  let errorCount = 0;
  const debugLogs: string[] = [];

  try {
    await validateEnvironment();

    const logMessage = `🔄 Starting reminder cron job at ${getWIBDateString()} ${getWIBTimeString()}`;
    debugLogs.push(logMessage);

    // Get all active reminder schedules for today
    let todayWIB: string;

    try {
      todayWIB = getWIBDateString();
      logger.info("WIB date string generated successfully", {
        api: true,
        cron: true,
        todayWIB,
      });
    } catch (error) {
      logger.error("Failed to get WIB date string", error as Error, {
        api: true,
        cron: true,
      });
      throw new Error(
        `Timezone calculation failed: ${(error as Error).message}`
      );
    }

    // Simple timezone calculations
    const { endOfDay } = createWIBDateRange(todayWIB);
    const todayStart = getWIBTodayStart();

    logger.info("Timezone calculations completed", {
      api: true,
      cron: true,
      endOfDay: endOfDay.toISOString(),
      todayStart: todayStart.toISOString(),
    });

    const reminderSchedulesToProcess = await fetchReminderSchedules(todayWIB, endOfDay, todayStart);
    const scheduleIds = reminderSchedulesToProcess.map((s) => s.id);
    const attachmentsByScheduleId = await fetchAttachments(scheduleIds);

    for (const schedule of reminderSchedulesToProcess) {
      processedCount++;

      try {
        const result = await processSchedule(schedule, attachmentsByScheduleId, debugLogs);
        if (result.sent) sentCount++;
        if (result.error) errorCount++;
      } catch {
        errorCount++;
      }
    }

    const summary = buildSummary(startTime, processedCount, sentCount, errorCount, reminderSchedulesToProcess, debugLogs);
    return NextResponse.json(summary);
  } catch (error) {
    return handleError(error, processedCount, sentCount, errorCount);
  }
}
