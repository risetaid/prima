import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { reminderProcessingRateLimiter } from "@/services/rate-limit.service";
import { apiSuccess, apiError } from "@/lib/api-helpers";

// Import reminder service for follow-up scheduling
let reminderService:
  | import("@/services/reminder/reminder.service").ReminderService
  | null = null;

// GET endpoint for cron functions
export async function GET(request: NextRequest) {
  // Verify this is called by cron with secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error("CRON_SECRET environment variable is not set", undefined, {
      operation: "cron_auth",
    });
    return apiError("Server configuration error", {
      status: 500,
      code: "CONFIG_ERROR",
      operation: "cron_auth",
    });
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", {
      status: 401,
      code: "AUTH_REQUIRED",
      operation: "cron_auth",
    });
  }

  return await processReminders();
}

// POST endpoint for manual trigger during development/testing
export async function POST(request: NextRequest) {
  // Always require auth in production
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return apiError("Server configuration error", {
        status: 500,
        code: "CONFIG_ERROR",
        operation: "cron_auth",
      });
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("Unauthorized", {
        status: 401,
        code: "AUTH_REQUIRED",
        operation: "cron_auth",
      });
    }
  }

  return await processReminders();
}

async function processReminders() {
  const cronInstance = `cron_${Date.now()}`;
  logger.info("Cron job triggered", {
    cronInstance,
    triggerTime: new Date().toISOString(),
  });

  try {
    // Check global reminder processing rate limit
    const rateLimitResult =
      await reminderProcessingRateLimiter.checkReminderProcessingRateLimit();
    if (!rateLimitResult.allowed) {
      logger.warn("Global reminder processing rate limit exceeded", {
        cronInstance,
        rateLimitResult,
      });
      return apiError("Global processing rate limit exceeded", {
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        details: { resetTime: rateLimitResult.resetTime.toISOString() },
        operation: "cron_rate_limit",
      });
    }

    // Process reminders directly (rely on cron scheduler to prevent concurrent runs)
    return await processRemindersWithLock();
  } catch (error) {
    logger.error("Cron processing failed", error as Error, { cronInstance });
    return apiError("Cron processing failed", {
      status: 500,
      code: "CRON_PROCESSING_ERROR",
      details: {
        originalError: error instanceof Error ? error.message : "Unknown error",
      },
      operation: "cron_processing",
    });
  }
}

async function processRemindersWithLock() {
  logger.info("Lock acquired successfully, starting reminder processing", {
    startTime: new Date().toISOString(),
  });

  try {
    // Import dependencies
    const { db, reminders, patients } = await import("@/db");
    const { eq, and, lte, isNull } = await import("drizzle-orm");
    const { getWIBTime, getCurrentTimeWIB } = await import("@/lib/datetime");

    // Import reminder service for follow-up scheduling
    if (!reminderService) {
      const { ReminderService } = await import(
        "@/services/reminder/reminder.service"
      );
      reminderService = new ReminderService();
    }

    const currentTime = getCurrentTimeWIB();

    // Find reminders that should be sent now:
    // 1. Active reminders
    // 2. Start date is today or earlier
    // 3. Scheduled time is now or earlier
    // 4. Not sent yet (sentAt is null)
    // 5. Status is PENDING
    const remindersDue = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        message: reminders.message,
        scheduledTime: reminders.scheduledTime,
        startDate: reminders.startDate,
        reminderType: reminders.reminderType,
        title: reminders.title,
        description: reminders.description,
        metadata: reminders.metadata,
        // Patient info
        patientName: patients.name,
        patientPhone: patients.phoneNumber,
        patientVerified: patients.verificationStatus,
        patientActive: patients.isActive,
      })
      .from(reminders)
      .innerJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.isActive, true),
          lte(reminders.startDate, getWIBTime()),
          lte(reminders.scheduledTime, currentTime),
          isNull(reminders.sentAt),
          eq(reminders.status, "PENDING"),
          eq(patients.isActive, true),
          eq(patients.verificationStatus, "VERIFIED")
        )
      )
      .limit(50); // Process max 50 reminders per run

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const reminder of remindersDue) {
      try {
        processedCount++;

        // Double-check if reminder is still pending (prevent duplicate processing)
        const [currentReminder] = await db
          .select({ status: reminders.status, sentAt: reminders.sentAt })
          .from(reminders)
          .where(eq(reminders.id, reminder.id))
          .limit(1);

        if (currentReminder && currentReminder.status !== "PENDING") {
          logger.info("Reminder already processed, skipping", {
            reminderId: reminder.id,
            currentStatus: currentReminder.status,
          });
          continue;
        }

        // Extract attachedContent from metadata
        const metadata = reminder.metadata as { attachedContent?: unknown[] } | null;
        const attachedContent = metadata?.attachedContent && Array.isArray(metadata.attachedContent)
          ? metadata.attachedContent
          : undefined;

        // Use ReminderService to send message with type-specific formatting
        const sendResult = await reminderService!.sendReminder({
          patientId: reminder.patientId,
          phoneNumber: reminder.patientPhone,
          message: reminder.message,
          reminderId: reminder.id,
          reminderName: reminder.title || "Pengingat",
          patientName: reminder.patientName,
          reminderType: reminder.reminderType,
          reminderTitle: reminder.title ? reminder.title : undefined,
          reminderDescription: reminder.description
            ? reminder.description
            : undefined,
          attachedContent: attachedContent,
        });

        // Update reminder status in a transaction
        const status = sendResult.success ? "SENT" : "FAILED";
        await db.transaction(async (tx) => {
          await tx
            .update(reminders)
            .set({
              sentAt: getWIBTime(),
              status: status,
              wahaMessageId: sendResult.messageId,
              updatedAt: getWIBTime(),
            })
            .where(eq(reminders.id, reminder.id));

          // Log the reminder send transaction
          logger.info("Reminder status updated in transaction", {
            reminderId: reminder.id,
            newStatus: status,
            messageId: sendResult.messageId,
          });
        });

        if (sendResult?.success) {
          successCount++;
          logger.info("Reminder sent successfully", {
            reminderId: reminder.id,
            patientId: reminder.patientId,
            patientName: reminder.patientName,
            messageId: sendResult?.messageId,
          });
        } else {
          failedCount++;
          errors.push(
            `Reminder ${reminder.id}: ${sendResult?.error || "Unknown error"}`
          );
          logger.warn("Failed to send reminder", {
            reminderId: reminder.id,
            patientId: reminder.patientId,
            error: sendResult?.error,
          });
        }
      } catch (error) {
        failedCount++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Reminder ${reminder.id}: ${errorMsg}`);
        logger.error("Error processing reminder", error as Error, {
          reminderId: reminder.id,
          patientId: reminder.patientId,
        });
      }
    }

    logger.info("Cron job completed", {
      totalFound: remindersDue.length,
      processed: processedCount,
      successful: successCount,
      failed: failedCount,
      errors: errors.length,
    });

    return apiSuccess(
      {
        reminders: {
          totalFound: remindersDue.length,
          processed: processedCount,
          successful: successCount,
          failed: failedCount,
          errors: errors.slice(0, 5), // Only show first 5 errors
        },
        message: `Processed ${processedCount} reminders (${successCount} sent, ${failedCount} failed)`,
      },
      {
        message: "Cron job completed successfully",
        operation: "cron_completion",
      }
    );
  } catch (error) {
    logger.error("Cron job failed", error as Error);
    return apiError("Cron processing failed", {
      status: 500,
      code: "CRON_JOB_ERROR",
      details: {
        originalError: error instanceof Error ? error.message : "Unknown error",
      },
      operation: "cron_job",
    });
  }
}
