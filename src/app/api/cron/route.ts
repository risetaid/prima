import { NextRequest, NextResponse } from "next/server";
import {
  db,
  reminderSchedules,
  patients,
  reminderLogs,
  reminderContentAttachments,
} from "@/db";
import { eq, and, gte, lte, notExists, count, sql, isNull } from "drizzle-orm";
import {
  shouldSendReminderNow,
  getWIBTime,
  getWIBDateString,
  getWIBTimeString,
  getWIBTodayStart,
} from "@/lib/timezone";
import { logger } from "@/lib/logger";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { isDuplicateEvent } from "@/lib/idempotency";
// Rate limiter temporarily disabled

const whatsappService = new WhatsAppService();

// Helper function to load content attachments separately
async function loadContentAttachments(reminderScheduleId: string) {
  try {
    const attachments = await db
      .select({
        type: reminderContentAttachments.contentType,
        title: reminderContentAttachments.contentTitle,
        url: reminderContentAttachments.contentUrl,
        order: reminderContentAttachments.attachmentOrder,
      })
      .from(reminderContentAttachments)
      .where(eq(reminderContentAttachments.reminderScheduleId, reminderScheduleId))
      .orderBy(reminderContentAttachments.attachmentOrder);
    
    return attachments || [];
  } catch (error) {
    logger.error("Failed to load content attachments", error as Error, {
      reminderScheduleId
    });
    return []; // Return empty array on error to prevent blocking reminder
  }
}

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

// GET endpoint for Vercel Cron Functions
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron with secret
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

/**
 * Process 15-minute follow-up reminders for patients who haven't responded
 */
async function processFollowUpReminders(debugLogs: string[]): Promise<{
  sentCount: number;
  errorCount: number;
}> {
  let sentCount = 0;
  let errorCount = 0;

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Find reminder logs that:
    // 1. Were sent more than 15 minutes ago
    // 2. Status is SENT (not yet confirmed/delivered)
    // 3. Haven't had a follow-up sent yet
    // 4. Haven't been confirmed via poll response or manual confirmation
    // 5. Patient is still active and verified
    const pendingReminders = await db
      .select({
        id: reminderLogs.id,
        patientId: reminderLogs.patientId,
        phoneNumber: reminderLogs.phoneNumber,
        sentAt: reminderLogs.sentAt,
        patientName: patients.name,
        medicationName: reminderLogs.message, // Using message field for now
      })
      .from(reminderLogs)
      .leftJoin(patients, eq(patients.id, reminderLogs.patientId))
      .where(
        and(
          eq(reminderLogs.status, 'SENT'), // Only SENT status (waiting for confirmation)
          lte(reminderLogs.sentAt, fifteenMinutesAgo), // Sent more than 15 minutes ago
          isNull(reminderLogs.followupSentAt), // No follow-up sent yet
          eq(reminderLogs.confirmationStatus, 'PENDING'), // Not confirmed yet
          eq(patients.isActive, true), // Patient is active
          eq(patients.verificationStatus, 'verified'), // Patient is verified
          // Check that no text response confirmation exists
          isNull(reminderLogs.confirmationResponse)
        )
      )
      .limit(50); // Limit to prevent overwhelming the system

    debugLogs.push(`📞 Found ${pendingReminders.length} reminders needing follow-up`);

    for (const reminder of pendingReminders) {
      if (!reminder.patientName || !reminder.phoneNumber) {
        errorCount++;
        continue;
      }

      try {
        // Send follow-up text message
        const result = await whatsappService.sendFollowUpMessage(
          reminder.phoneNumber,
          reminder.patientName
        );

        if (result.success) {
          // Update reminder log with follow-up info
          await db
            .update(reminderLogs)
            .set({
              followupSentAt: getWIBTime(),
              followupMessageId: result.messageId,
              updatedAt: getWIBTime(),
            })
            .where(eq(reminderLogs.id, reminder.id));

          sentCount++;
          debugLogs.push(
            `📞 Follow-up sent to ${reminder.patientName} (15min after initial)`
          );

          logger.info('Follow-up reminder sent', {
            api: true,
            cron: true,
            patientId: reminder.patientId,
            reminderLogId: reminder.id,
            followupMessageId: result.messageId,
          });
        } else {
          errorCount++;
          debugLogs.push(
            `❌ Follow-up failed for ${reminder.patientName}: ${result.error}`
          );
          
          logger.error('Follow-up reminder failed', new Error(result.error || 'Unknown error'), {
            api: true,
            cron: true,
            patientId: reminder.patientId,
            reminderLogId: reminder.id,
            error: result.error,
          });
        }

        // Add small delay between sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        debugLogs.push(
          `❌ Follow-up error for ${reminder.patientName}: ${errorMessage}`
        );
        
        logger.error('Follow-up reminder processing failed', error as Error, {
          api: true,
          cron: true,
          patientId: reminder.patientId,
          reminderLogId: reminder.id,
        });
      }
    }

    return { sentCount, errorCount };
  } catch (error) {
    logger.error('Follow-up processing failed', error as Error, {
      api: true,
      cron: true,
    });
    return { sentCount, errorCount: errorCount + 1 };
  }
}

async function processReminders() {
  const startTime = Date.now();
  let processedCount = 0;
  let sentCount = 0;
  let errorCount = 0;
  const debugLogs: string[] = [];

  try {
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
      });
    } catch (dbTestError) {
      logger.error("Database connection test failed", dbTestError as Error, {
        api: true,
        cron: true,
      });
      throw new Error(`Database connection failed: ${(dbTestError as Error).message}`);
    }

    logger.info("🔄 Starting reminder cron job", {
      api: true,
      cron: true,
      wibDate: getWIBDateString(),
      wibTime: getWIBTimeString(),
      timestamp: new Date().toISOString(),
    });

    const logMessage = `🔄 Starting reminder cron job at ${getWIBDateString()} ${getWIBTimeString()}`;
    debugLogs.push(logMessage);

    // Get all active reminder schedules for today
    let todayWIB: string;
    let endOfDay: Date;
    let todayStart: Date;
    
    try {
      todayWIB = getWIBDateString();
      logger.info("WIB date string generated successfully", {
        api: true,
        cron: true,
        todayWIB
      });
    } catch (error) {
      logger.error("Failed to get WIB date string", error as Error, {
        api: true,
        cron: true
      });
      throw new Error(`Timezone calculation failed: ${(error as Error).message}`);
    }

    // Use batch processing for better memory management
    const batchSize = 50; // Process in batches to prevent memory issues

    // First, get count to determine if we need batch processing
    try {
      const dateRange = createWIBDateRange(todayWIB);
      endOfDay = dateRange.endOfDay;
      todayStart = getWIBTodayStart();
      
      logger.info("Timezone calculations completed", {
        api: true,
        cron: true,
        endOfDay: endOfDay.toISOString(),
        todayStart: todayStart.toISOString(),
      });
    } catch (error) {
      logger.error("Failed to calculate timezone ranges", error as Error, {
        api: true,
        cron: true,
        todayWIB
      });
      throw new Error(`Timezone range calculation failed: ${(error as Error).message}`);
    }

    // Count reminder schedules that haven't been delivered today yet
    logger.info("Executing database count query for reminder schedules", {
      api: true,
      cron: true,
      todayWIB,
      endOfDay: endOfDay.toISOString(),
      todayStart: todayStart.toISOString(),
    });

    let totalCountResult;
    try {
      totalCountResult = await db
        .select({ count: count() })
        .from(reminderSchedules)
        .where(
          and(
            eq(reminderSchedules.isActive, true),
            lte(reminderSchedules.startDate, endOfDay), // Process today and past dates
            // Haven't been delivered today yet (using notExists for efficiency)
            notExists(
              db
                .select()
              .from(reminderLogs)
              .where(
                and(
                  eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                  eq(reminderLogs.status, "DELIVERED"),
                  gte(reminderLogs.sentAt, todayStart)
                )
              )
          )
        )
      );
    } catch (dbError) {
      logger.error("Database count query failed", dbError as Error, {
        api: true,
        cron: true,
        todayWIB,
        endOfDay: endOfDay.toISOString(),
      });
      throw new Error(`Database count query failed: ${(dbError as Error).message}`);
    }

    const totalCount = totalCountResult[0]?.count || 0;

    logger.info("Database count query completed", {
      api: true,
      cron: true,
      totalCount,
      batchSize,
    });

    let reminderSchedulesToProcess: Array<{
      id: string;
      patientId: string;
      medicationName: string;
      scheduledTime: string;
      startDate: Date;
      customMessage: string | null;
      patientName: string | null;
      patientPhoneNumber: string | null;
      contentAttachments: any[];
    }> = [];
    if (totalCount > batchSize) {
      // Process in batches to prevent memory overload
      logger.info("Starting batch processing", {
        api: true,
        cron: true,
        totalCount,
        batchSize,
        totalBatches: Math.ceil(totalCount / batchSize)
      });
      
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        logger.info("Processing batch", {
          api: true,
          cron: true,
          skip,
          batchSize,
          currentBatch: Math.floor(skip / batchSize) + 1
        });
        
        let batch;
        try {
          batch = await db
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
            // Simplified: Load attachments separately to avoid complex JSON aggregation
            // This reduces query complexity and potential database errors
            attachmentCount: sql`COUNT(${reminderContentAttachments.id})`,
          })
          .from(reminderSchedules)
          .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
          .leftJoin(
            reminderContentAttachments,
            eq(
              reminderSchedules.id,
              reminderContentAttachments.reminderScheduleId
            )
          )
          .where(
            and(
              eq(reminderSchedules.isActive, true),
              lte(reminderSchedules.startDate, endOfDay), // Process today and past dates
              notExists(
                db
                  .select()
                  .from(reminderLogs)
                  .where(
                    and(
                      eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                      eq(reminderLogs.status, "DELIVERED"),
                      gte(reminderLogs.sentAt, todayStart)
                    )
                  )
              )
            )
          )
          .offset(skip)
          .limit(batchSize)
          .orderBy(reminderSchedules.scheduledTime)
          .groupBy(
            reminderSchedules.id, 
            reminderSchedules.patientId,
            reminderSchedules.medicationName,
            reminderSchedules.scheduledTime,
            reminderSchedules.startDate,
            reminderSchedules.customMessage,
            patients.id,
            patients.name,
            patients.phoneNumber
          ); // Add GROUP BY for JSON_AGG
        
        logger.info("Batch query completed successfully", {
          api: true,
          cron: true,
          batchLength: batch.length,
          skip,
          batchSize
        });
        } catch (batchError) {
          logger.error("Batch query failed", batchError as Error, {
            api: true,
            cron: true,
            skip,
            batchSize,
            totalCount,
            errorMessage: (batchError as Error).message
          });
          throw new Error(`Batch query failed at skip ${skip}: ${(batchError as Error).message}`);
        }

        // Transform to match expected structure with null checks
        // Load content attachments separately for each reminder
        const formattedBatch: Array<{
          id: string;
          patientId: string;
          medicationName: string;
          scheduledTime: string;
          startDate: Date;
          customMessage: string | null;
          patientName: string | null;
          patientPhoneNumber: string | null;
          contentAttachments: any[];
        }> = [];
        
        for (const item of batch) {
          if (item.patientName && item.patientPhoneNumber) {
            // Load content attachments for this specific reminder schedule
            const contentAttachments = await loadContentAttachments(item.id);
            
            formattedBatch.push({
              id: item.id,
              patientId: item.patientId,
              medicationName: item.medicationName,
              scheduledTime: item.scheduledTime,
              startDate: item.startDate,
              customMessage: item.customMessage,
              patientName: item.patientName,
              patientPhoneNumber: item.patientPhoneNumber,
              contentAttachments,
            });
          }
        }

        reminderSchedulesToProcess.push(...formattedBatch);

        // Small delay between batches to prevent database overload
        if (skip + batchSize < totalCount) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    } else {
      // Small dataset, process all at once
      logger.info("Executing main reminder schedules query", {
        api: true,
        cron: true,
        queryType: "single_batch",
      });

      const allSchedules = await db
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
          // Simplified: Load attachments separately to avoid complex JSON aggregation
          attachmentCount: sql`COUNT(${reminderContentAttachments.id})`,
        })
        .from(reminderSchedules)
        .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
        .leftJoin(
          reminderContentAttachments,
          eq(
            reminderSchedules.id,
            reminderContentAttachments.reminderScheduleId
          )
        )
        .where(
          and(
            eq(reminderSchedules.isActive, true),
            lte(reminderSchedules.startDate, endOfDay), // Process today and past dates
            notExists(
              db
                .select()
                .from(reminderLogs)
                .where(
                  and(
                    eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                    eq(reminderLogs.status, "DELIVERED"),
                    gte(reminderLogs.sentAt, todayStart)
                  )
                )
            )
          )
        )
        .orderBy(reminderSchedules.scheduledTime)
        .groupBy(
          reminderSchedules.id, 
          reminderSchedules.patientId,
          reminderSchedules.medicationName,
          reminderSchedules.scheduledTime,
          reminderSchedules.startDate,
          reminderSchedules.customMessage,
          patients.id,
          patients.name,
          patients.phoneNumber
        ); // Add GROUP BY for JSON_AGG

      logger.info("Main query completed successfully", {
        api: true,
        cron: true,
        schedulesFound: allSchedules.length,
      });

      // Transform to match expected structure with null checks
      // Load content attachments separately for each reminder
      reminderSchedulesToProcess = [];
      
      for (const item of allSchedules) {
        if (item.patientName && item.patientPhoneNumber) {
          // Load content attachments for this specific reminder schedule
          const contentAttachments = await loadContentAttachments(item.id);
          
          reminderSchedulesToProcess.push({
            id: item.id,
            patientId: item.patientId,
            medicationName: item.medicationName,
            scheduledTime: item.scheduledTime,
            startDate: item.startDate,
            customMessage: item.customMessage,
            patientName: item.patientName,
            patientPhoneNumber: item.patientPhoneNumber,
            contentAttachments,
          });
        }
      }
    }

    for (const schedule of reminderSchedulesToProcess) {
      processedCount++;

      try {
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
          const idempotencyKey = `reminder:sent:${schedule.id}:${getWIBDateString()}`;
          const alreadySent = await isDuplicateEvent(idempotencyKey, 24 * 60 * 60);
          if (alreadySent) {
            debugLogs.push(
              `⏭️ Skipping duplicate send for ${schedule.patientName} (${schedule.scheduledTime})`
            );
            continue;
          }

          // Validate phone number exists
          if (!schedule.patientPhoneNumber) {
            errorCount++;
            continue;
          }

          // Rate limiting temporarily disabled

          try {
            // Send WhatsApp medication reminder with confirmation options
            logger.info("Sending WhatsApp medication reminder", {
              api: true,
              cron: true,
              patientId: schedule.patientId,
              reminderId: schedule.id,
              contentCount: schedule.contentAttachments?.length || 0,
              medicationName: schedule.medicationName,
            });

            const result = await whatsappService.sendMedicationReminder(
              schedule.patientPhoneNumber,
              schedule.patientName!,
              schedule.medicationName || 'obat Anda',
              'sesuai resep', // Default dosage text
              schedule.scheduledTime,
              schedule.contentAttachments
            );

            const providerLogMessage = `🔍 FONNTE result for ${schedule.patientName}: success=${result.success}, messageId=${result.messageId}, error=${result.error}`;
            debugLogs.push(providerLogMessage);

            // Create reminder log - SENT means waiting for poll confirmation
            const status: "SENT" | "FAILED" = result.success
              ? "SENT"  // Changed from DELIVERED since we need poll confirmation
              : "FAILED";
            const logData = {
              reminderScheduleId: schedule.id,
              patientId: schedule.patientId,
              sentAt: getWIBTime(),
              status: status,
              message: `Text: Medication reminder for ${schedule.medicationName} at ${schedule.scheduledTime}`,
              phoneNumber: schedule.patientPhoneNumber,
              fonnteMessageId: result.messageId,
              needsFollowup: true, // Enable 15-minute follow-up
              confirmationSource: 'text_pending',
            };

            // Create reminder log with error handling
            let reminderLogId: string | undefined;
            try {
              const createdLog = await db
                .insert(reminderLogs)
                .values(logData)
                .returning();
              reminderLogId = createdLog[0]?.id;
              // Log created successfully
            } catch (logError) {
              console.error(
                `❌ Failed to create reminder log for ${schedule.patientName}:`,
                logError
              );
              console.error(`❌ Log data that failed:`, logData);
              // Fallback: attempt a minimal log to preserve UI state and stop re-sends
              try {
                const minimalLog = await db
                  .insert(reminderLogs)
                  .values({
                    reminderScheduleId: schedule.id,
                    patientId: schedule.patientId,
                    sentAt: getWIBTime(),
                    status: status,
                    message: `Text: Medication reminder for ${schedule.medicationName}`,
                    phoneNumber: schedule.patientPhoneNumber,
                    fonnteMessageId: result.messageId,
                    needsFollowup: true,
                  })
                  .returning();
                reminderLogId = minimalLog[0]?.id;
              } catch (fallbackError) {
                console.error("❌ Fallback reminder log insert also failed", fallbackError);
              }
              errorCount++;
              continue; // Skip to next schedule
            }

            if (result.success) {
              sentCount++;
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
            continue;
          }
        }
      } catch {
        errorCount++;
      }
    }

    // PHASE 2: Send 15-minute follow-up messages
    const followUpResults = await processFollowUpReminders(debugLogs);
    sentCount += followUpResults.sentCount;
    errorCount += followUpResults.errorCount;

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
      },
      details:
        debugLogs.length > 0 ? debugLogs : ["No detailed logs available"],
    };

    return NextResponse.json(summary);
  } catch (error) {
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
          errorType: error instanceof Error ? error.constructor.name : typeof error,
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
}
