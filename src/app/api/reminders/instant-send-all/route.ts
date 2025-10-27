import { createApiHandler, apiRateLimitError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { db, reminders, patients } from "@/db";
import { eq, and, isNull, sql, or, ne } from "drizzle-orm";
import { getWIBTime, getCurrentDateWIB, getCurrentTimeWIB } from "@/lib/datetime";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { ValidatedContent } from "@/services/reminder/reminder.types";
import { RateLimiter } from "@/lib/rate-limiter";

const whatsappService = new WhatsAppService();

// Helper function to create date range for WIB timezone (same as cron)
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

// POST /api/reminders/instant-send-all - Send all pending reminders instantly
export const POST = createApiHandler(
  { auth: "required" },
  async (_, { user }) => {
    logger.debug("Instant send API called");

    logger.debug("User authenticated", {
      email: user!.email,
      id: user!.id,
      role: user!.role,
    });

    // All authenticated users can send instant reminders to their assigned patients

    // Rate limiting: 5 instant send requests per hour per user
    const rateLimitResult = await RateLimiter.checkRateLimit(`user:${user!.id}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyPrefix: 'instant_send'
    });

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for instant send', {
        userId: user!.id,
        remaining: rateLimitResult.remaining,
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      });
      throw apiRateLimitError({ message: 'Rate limit exceeded' });
    }

    const startTime = Date.now();
    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;
    const debugLogs: string[] = [];

    // Build patient filter based on role
    const patientConditions = [
      isNull(patients.deletedAt),
      eq(patients.isActive, true),
      eq(patients.verificationStatus, "VERIFIED"),
    ];
    if (user!.role === "ADMIN" || user!.role === "RELAWAN") {
      // Both ADMIN and RELAWAN can only send to patients they manage
      patientConditions.push(eq(patients.assignedVolunteerId, user!.id));
    }
    const patientFilter =
      patientConditions.length > 1
        ? and(...patientConditions)
        : patientConditions[0];

    // Get reminder schedules for TODAY ONLY (00:00 to 23:59 WIB)
    const todayWIB = getCurrentDateWIB();
    const { startOfDay, endOfDay } = createWIBDateRange(todayWIB);

    logger.debug("Querying reminders for today", {
      today: todayWIB,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      currentTimeWIB: `${getCurrentDateWIB()} ${getCurrentTimeWIB()}`,
      userRole: user!.role,
      userId: user!.id,
    });

    // Check for active reminders excluding already delivered ones
    logger.debug("Checking active reminders for user", {
      userId: user!.id,
      excludeDeliveredToday: true,
    });

    let activeReminders;
    try {
      logger.debug("Querying active reminders", {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        userRole: user!.role,
      });

      activeReminders = await db
        .select({
          // Reminder fields
          id: reminders.id,
          patientId: reminders.patientId,
          scheduledTime: reminders.scheduledTime,
          startDate: reminders.startDate,
          customMessage: reminders.message,
          status: reminders.status,
          sentAt: reminders.sentAt,
          // Patient fields
          patientName: patients.name,
          patientPhoneNumber: patients.phoneNumber,
        })
        .from(reminders)
        .leftJoin(patients, eq(reminders.patientId, patients.id))
        .where(
          and(
            eq(reminders.isActive, true),
            // Use date string comparison instead of timestamp comparison
            eq(sql`DATE(${reminders.startDate})`, todayWIB), // Only today's reminders
            patientFilter,
            isNull(reminders.deletedAt),
            // SMART DUPLICATE PREVENTION: Only send reminders that haven't been delivered today
            // This prevents re-sending already delivered reminders while allowing instant send override
            or(
              isNull(reminders.sentAt),
              ne(reminders.status, "DELIVERED"),
              sql`DATE(${reminders.sentAt}) != ${todayWIB}`
            )
          )
        );

      logger.debug("Query completed, found reminders", {
        count: activeReminders.length,
      });
      if (activeReminders.length > 0) {
        logger.debug("First reminder details", {
          id: activeReminders[0].id,
          startDate: activeReminders[0].startDate,
          scheduledTime: activeReminders[0].scheduledTime,
        });
      }
    } catch (dbError: unknown) {
      logger.error("❌ Database query error:", dbError instanceof Error ? dbError : new Error(String(dbError)));
      throw new Error(`Database query failed: ${
        dbError instanceof Error
          ? dbError.message
          : "Unknown database error"
      }`);
    }

    logger.info(
      `📋 Found ${activeReminders.length} active reminders for today`
    );

    // Log details about found reminders for debugging
    if (activeReminders.length > 0) {
      logger.debug("Reminder details", {
        reminders: activeReminders.map((r) => ({
          patientName: r.patientName,
          scheduledTime: r.scheduledTime,
          patientPhoneNumber: r.patientPhoneNumber,
        })),
      });
    }

    // Content attachments functionality has been removed in the new schema
    const contentAttachmentsMap = new Map();

    const logMessage = `🚀 Starting instant send for ${
      activeReminders.length
    } reminders at ${getCurrentDateWIB()} ${getCurrentTimeWIB()}`;
    debugLogs.push(logMessage);

    // Process reminders with time-based filtering and duplicate prevention
    for (const reminder of activeReminders) {
      processedCount++;

      try {
        // Validate phone number exists
        if (!reminder.patientPhoneNumber || !reminder.patientName) {
          errorCount++;
          debugLogs.push(
            `❌ Skipped reminder ${reminder.id}: Missing patient data`
          );
          continue;
        }

        // For instant send, bypass time-based filtering - allow sending any active reminder
        // (unlike cron jobs which only send within 10-minute windows)
        const scheduleDate = reminder.startDate.toISOString().split("T")[0];

        debugLogs.push(
          `📅 Processing ${reminder.patientName} (${reminder.scheduledTime}) - Date: ${scheduleDate}`
        );
        debugLogs.push(
          `🚀 Instant send: bypassing time check for ${reminder.patientName}`
        );

        try {
          // Generate basic message
          const basicMessage =
            reminder.customMessage ||
            `Halo ${reminder.patientName}, jangan lupa melakukan pengingat pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`;

          // Get content attachments for this reminder and enhance message
          const attachments = contentAttachmentsMap.get(reminder.id) || [];
          const messageBody = whatsappService.buildMessage(
            basicMessage,
            attachments as ValidatedContent[]
          );

          debugLogs.push(
            `📱 Preparing to send to ${reminder.patientName} (${reminder.patientPhoneNumber})`
          );

          // Send WhatsApp message
          let result: { success: boolean; messageId?: string; error?: string };
          try {
            result = await whatsappService.send(
              reminder.patientPhoneNumber,
              messageBody
            );
          } catch (sendError) {
            errorCount++;
            debugLogs.push(
              `❌ WhatsApp send error for ${reminder.patientName}: ${sendError}`
            );
            continue;
          }

          debugLogs.push(
            `📱 WhatsApp result for ${reminder.patientName}: success=${result.success}, messageId=${result.messageId}`
          );

          // Update reminder with sent status
          const status: "DELIVERED" | "FAILED" = result.success
            ? "DELIVERED"
            : "FAILED";

          try {
            await db
              .update(reminders)
              .set({
                sentAt: getWIBTime(),
                status: status,
                wahaMessageId: result.messageId,
                updatedAt: getWIBTime(),
              })
              .where(eq(reminders.id, reminder.id));

            debugLogs.push(
              `✅ Reminder updated with sent status for ${reminder.patientName}`
            );
          } catch (dbError) {
            debugLogs.push(
              `⚠️ Warning: Failed to update reminder status for ${reminder.patientName}: ${dbError}`
            );
            // Don't increment errorCount for update failures, as the message was sent successfully
          }

          if (result.success) {
            sentCount++;
            debugLogs.push(`✅ Reminder sent to ${reminder.patientName}`);
          } else {
            errorCount++;
            debugLogs.push(
              `❌ Failed to send reminder to ${reminder.patientName}: ${result.error}`
            );
          }
        } catch (sendError) {
          errorCount++;
          debugLogs.push(
            `❌ Error sending to ${reminder.patientName}: ${sendError}`
          );
        }

        // Small delay to prevent overwhelming the WhatsApp API
        if (processedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (reminderError) {
        errorCount++;
        debugLogs.push(
          `❌ Error processing reminder ${reminder.id}: ${reminderError}`
        );
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      message:
        sentCount > 0
          ? `✅ Instant send completed: ${sentCount} reminders sent successfully`
          : activeReminders.length > 0
          ? `⚠️ Instant send completed: ${activeReminders.length} reminders found but ${errorCount} failed to send`
          : `📋 Instant send completed: No active reminders found for today`,
      execution: {
        timestamp: new Date().toISOString(),
        wibTime: `${getCurrentDateWIB()} ${getCurrentTimeWIB()}`,
        duration: `${duration}ms`,
        provider: "WAHA",
        triggeredBy: user!.email || user!.id,
        note: "Instant send includes only today's reminders that haven't been delivered yet",
      },
      results: {
        remindersFound: activeReminders.length,
        remindersProcessed: processedCount,
        messagesSent: sentCount,
        errors: errorCount,
        successRate:
          processedCount > 0
            ? `${Math.round((sentCount / processedCount) * 100)}%`
            : "0%",
      },
      details: debugLogs,
    };

    return summary;
  }
);
