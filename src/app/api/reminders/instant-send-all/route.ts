import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import {
  db,
  reminderSchedules,
  patients,
  reminderLogs,
  reminderContentAttachments,
} from "@/db";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { getWIBTime, getWIBDateString, getWIBTimeString } from "@/lib/timezone";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { ValidatedContent } from "@/services/reminder/reminder.types";
// Rate limiter temporarily disabled

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

export async function POST() {
  try {
    console.log("🚀 Instant send API called");

    const user = await getAuthUser();
    if (!user) {
      console.log("❌ User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      `👤 User authenticated: ${user.email || user.id} (${user.role})`
    );

    // All authenticated users can send instant reminders to their assigned patients

    const startTime = Date.now();
    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;
    const debugLogs: string[] = [];

    // Build patient filter based on role
    const patientConditions = [isNull(patients.deletedAt)];
    if (user.role === "ADMIN" || user.role === "RELAWAN") {
      // Both ADMIN and MEMBER can only send to patients they manage
      patientConditions.push(eq(patients.assignedVolunteerId, user.id));
    }
    const patientFilter =
      patientConditions.length > 1
        ? and(...patientConditions)
        : patientConditions[0];

    // Get reminder schedules for TODAY ONLY (00:00 to 23:59 WIB)
    const todayWIB = getWIBDateString();
    const { startOfDay, endOfDay } = createWIBDateRange(todayWIB);

    console.log(
      `📅 Querying reminders for today: ${todayWIB} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`
    );
    console.log(
      `🕐 Current WIB time: ${getWIBDateString()} ${getWIBTimeString()}`
    );
    console.log(`👤 User role filter: ${user.role} (ID: ${user.id})`);

    // Debug: Check what reminders exist (excluding already delivered ones)
    console.log(
      "🔍 DEBUG: Checking active reminders for user (excluding already delivered today)..."
    );

    let activeReminders;
    try {
      console.log("🔍 DEBUG: About to query active reminders");
      console.log("🔍 DEBUG: startOfDay:", startOfDay.toISOString());
      console.log("🔍 DEBUG: endOfDay:", endOfDay.toISOString());

      activeReminders = await db
        .select({
          // Schedule fields
          id: reminderSchedules.id,
          patientId: reminderSchedules.patientId,
          medicationName: reminderSchedules.medicationName,
          scheduledTime: reminderSchedules.scheduledTime,
          startDate: reminderSchedules.startDate,
          customMessage: reminderSchedules.customMessage,
          // Patient fields
          patientName: patients.name,
          patientPhoneNumber: patients.phoneNumber,
        })
        .from(reminderSchedules)
        .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
        .where(
          and(
            eq(reminderSchedules.isActive, true),
            // Use date string comparison instead of timestamp comparison
            eq(sql`DATE(${reminderSchedules.startDate})`, todayWIB), // Only today's reminders
            patientFilter,
            isNull(reminderSchedules.deletedAt),
            // SMART DUPLICATE PREVENTION: Only send reminders that haven't been delivered today
            // This prevents re-sending already delivered reminders while allowing instant send override
            sql`NOT EXISTS (
               SELECT 1 FROM ${reminderLogs}
               WHERE ${reminderLogs.reminderScheduleId} = ${reminderSchedules.id}
               AND ${reminderLogs.status} = 'DELIVERED'
               AND DATE(${reminderLogs.sentAt}) = ${todayWIB}
             )`
          )
        );

      console.log(
        "🔍 DEBUG: Query completed, found reminders:",
        activeReminders.length
      );
      if (activeReminders.length > 0) {
        console.log("🔍 DEBUG: First reminder details:");
        console.log("  - ID:", activeReminders[0].id);
        console.log("  - startDate:", activeReminders[0].startDate);
        console.log("  - scheduledTime:", activeReminders[0].scheduledTime);
      }
    } catch (dbError) {
      console.error("❌ Database query error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database query failed",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
        },
        { status: 500 }
      );
    }

    console.log(
      `📋 Found ${activeReminders.length} active reminders for today`
    );

    // Log details about found reminders for debugging
    if (activeReminders.length > 0) {
      console.log("📝 Reminder details:");
      activeReminders.forEach((reminder, index) => {
        console.log(
          `  ${index + 1}. ${reminder.patientName} - ${
            reminder.medicationName
          } at ${reminder.scheduledTime} (${reminder.patientPhoneNumber})`
        );
      });
    }

    // Get content attachments for all today's reminders
    const reminderIds = activeReminders.map((r) => r.id);
    const contentAttachmentsMap = new Map();

    if (reminderIds.length > 0) {
      const contentAttachments = await db
        .select({
          reminderScheduleId: reminderContentAttachments.reminderScheduleId,
          contentType: reminderContentAttachments.contentType,
          contentTitle: reminderContentAttachments.contentTitle,
          contentUrl: reminderContentAttachments.contentUrl,
        })
        .from(reminderContentAttachments)
        .where(
          inArray(reminderContentAttachments.reminderScheduleId, reminderIds)
        );

      // Create content attachments map
      contentAttachments.forEach((attachment) => {
        if (!contentAttachmentsMap.has(attachment.reminderScheduleId)) {
          contentAttachmentsMap.set(attachment.reminderScheduleId, []);
        }
        contentAttachmentsMap.get(attachment.reminderScheduleId).push({
          id: attachment.reminderScheduleId,
          type: attachment.contentType,
          title: attachment.contentTitle,
          url: attachment.contentUrl,
        });
      });
    }

    const logMessage = `🚀 Starting instant send for ${
      activeReminders.length
    } reminders at ${getWIBDateString()} ${getWIBTimeString()}`;
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

        // Rate limiting temporarily disabled

        try {
          // Generate basic message
          const basicMessage =
            reminder.customMessage ||
            `Halo ${reminder.patientName}, jangan lupa minum obat ${reminder.medicationName} pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`;

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

          // Create reminder log
          const status: "DELIVERED" | "FAILED" = result.success
            ? "DELIVERED"
            : "FAILED";
          const logData = {
            reminderScheduleId: reminder.id,
            patientId: reminder.patientId,
            sentAt: getWIBTime(),
            status: status,
            message: messageBody,
            phoneNumber: reminder.patientPhoneNumber,
            fonnteMessageId: result.messageId,
            notes: `Instant send by ${
              user.role
            } - ${getWIBDateString()} ${getWIBTimeString()}`,
          };

          try {
            await db.insert(reminderLogs).values(logData);
            debugLogs.push(
              `✅ Reminder log created for ${reminder.patientName}`
            );
          } catch (dbError) {
            debugLogs.push(
              `⚠️ Warning: Failed to create reminder log for ${reminder.patientName}: ${dbError}`
            );
            // Don't increment errorCount for log failures, as the message was sent successfully
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
        wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
        duration: `${duration}ms`,
        provider: "FONNTE",
        triggeredBy: user.email || user.id,
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

    return NextResponse.json(summary);
  } catch (error) {
    console.error("❌ Error in instant send all reminders:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
      },
      { status: 500 }
    );
  }
}
