import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { distributedLockService } from "@/services/distributed-lock.service";
import { reminderProcessingRateLimiter } from "@/services/rate-limit.service";

// Import reminder service for follow-up scheduling
let reminderService:
  | import("@/services/reminder/reminder.service").ReminderService
  | null = null;

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
  const cronInstance = `cron_${Date.now()}`;
  logger.info("Cron job triggered, attempting to acquire lock", {
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
      return NextResponse.json(
        {
          success: false,
          error: "Global processing rate limit exceeded",
          details: `Try again after ${rateLimitResult.resetTime.toISOString()}`,
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Use distributed lock to prevent multiple cron instances from running simultaneously
    const lockResult = await distributedLockService.withLock(
      cronInstance,
      async () => {
        return await processRemindersWithLock();
      },
      {
        ttl: 600000, // 10 minute lock to handle 1min n8n triggers
        maxRetries: 1,
      }
    );

    if (!lockResult) {
      logger.warn("Could not acquire cron processing lock", { cronInstance });
      return NextResponse.json(
        {
          success: false,
          error: "Cron already running",
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    return lockResult;
  } catch (error) {
    logger.error("Cron processing failed", error as Error, { cronInstance });
    return NextResponse.json(
      {
        success: false,
        error: "Cron processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
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
    const { getWIBTime } = await import("@/lib/timezone");

    // Import reminder service for follow-up scheduling
    if (!reminderService) {
      const { ReminderService } = await import(
        "@/services/reminder/reminder.service"
      );
      reminderService = new ReminderService();
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM format

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
          lte(reminders.startDate, now),
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

        // Use individual reminder locking to prevent concurrent processing
        const reminderLockKey = `reminder_processing:${reminder.id}`;
        const reminderResult = await distributedLockService.withLock(
          reminderLockKey,
          async () => {
            // Double-check if reminder is still pending (might have been processed by another instance)
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
              return { alreadyProcessed: true };
            }

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
            });

            // Update reminder status in a transaction
            const status = sendResult.success ? "SENT" : "FAILED";
            await db.transaction(async (tx) => {
              await tx
                .update(reminders)
                .set({
                  sentAt: getWIBTime(),
                  status: status,
                  fonnteMessageId: sendResult.messageId,
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

            return {
              sendResult,
              alreadyProcessed: false,
            };
          },
          {
            ttl: 60000, // 1 minute lock per reminder
            maxRetries: 1,
          }
        );

        if (!reminderResult) {
          logger.warn("Failed to acquire reminder processing lock", {
            reminderId: reminder.id,
          });
          failedCount++;
          errors.push(
            `Reminder ${reminder.id}: Could not acquire processing lock`
          );
          continue;
        }

        if (reminderResult.alreadyProcessed) {
          // Skip this reminder as it was already processed
          continue;
        }

        const { sendResult } = reminderResult;

        if (sendResult?.success) {
          successCount++;
          logger.info("Reminder sent successfully", {
            reminderId: reminder.id,
            patientId: reminder.patientId,
            patientName: reminder.patientName,
            messageId: sendResult?.messageId,
            followupsScheduled: sendResult?.followupsScheduled,
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

    // Process followups
    const followupResult = await processFollowups();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reminders: {
        totalFound: remindersDue.length,
        processed: processedCount,
        successful: successCount,
        failed: failedCount,
        errors: errors.slice(0, 5), // Only show first 5 errors
      },
      followups: followupResult,
      message: `Processed ${processedCount} reminders (${successCount} sent, ${failedCount} failed) and ${
        followupResult.processed || 0
      } followups`,
    });
  } catch (error) {
    logger.error("Cron job failed", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function processFollowups() {
  try {
    const { FollowupService } = await import(
      "@/services/reminder/followup.service"
    );

    const followupService = new FollowupService();
    const results = await followupService.processPendingFollowups();

    const processed = results.length;
    const successful = results.filter((r) => r.processed).length;
    const failed = processed - successful;

    logger.info("Followups processed", {
      processed,
      successful,
      failed,
    });

    return {
      processed,
      successful,
      failed,
      results: results.slice(0, 5), // Only return first 5 results
    };
  } catch (error) {
    logger.error("Failed to process followups in cron", error as Error);
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
