import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
// Rate limiter temporarily disabled

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
  logger.info('Processing scheduled reminders and followups via cron job');

  try {
    // Import dependencies
    const { db, reminders, patients } = await import('@/db');
    const { eq, and, lte, isNull } = await import('drizzle-orm');
    const { sendWhatsAppMessage, formatWhatsAppNumber } = await import('@/lib/fonnte');
    const { getWIBTime } = await import('@/lib/timezone');

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

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
        // medicationDetails removed - system now uses custom message field only
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
          eq(reminders.status, 'PENDING'),
          eq(patients.isActive, true),
          eq(patients.verificationStatus, 'VERIFIED')
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

        // Use simplified message system - medicationDetails removed
        let enhancedMessage = reminder.message;
        // Content attachment system simplified - no longer uses medicationDetails
        enhancedMessage += '\n\n💙 Tim PRIMA';

        // Send WhatsApp message
        const result = await sendWhatsAppMessage({
          to: formatWhatsAppNumber(reminder.patientPhone),
          body: enhancedMessage,
        });

        // Update reminder status
        const status = result.success ? 'SENT' : 'FAILED';
        await db.update(reminders)
          .set({
            sentAt: getWIBTime(),
            status: status,
            fonnteMessageId: result.messageId,
            updatedAt: getWIBTime(),
          })
          .where(eq(reminders.id, reminder.id));

        if (result.success) {
          successCount++;
          logger.info('Reminder sent successfully', {
            reminderId: reminder.id,
            patientId: reminder.patientId,
            patientName: reminder.patientName,
            messageId: result.messageId
          });
        } else {
          failedCount++;
          errors.push(`Reminder ${reminder.id}: ${result.error || 'Unknown error'}`);
          logger.warn('Failed to send reminder', {
            reminderId: reminder.id,
            patientId: reminder.patientId,
            error: result.error
          });
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Reminder ${reminder.id}: ${errorMsg}`);
        logger.error('Error processing reminder', error as Error, {
          reminderId: reminder.id,
          patientId: reminder.patientId
        });
      }
    }

    logger.info('Cron job completed', {
      totalFound: remindersDue.length,
      processed: processedCount,
      successful: successCount,
      failed: failedCount,
      errors: errors.length
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
        errors: errors.slice(0, 5) // Only show first 5 errors
      },
      followups: followupResult,
      message: `Processed ${processedCount} reminders (${successCount} sent, ${failedCount} failed) and ${followupResult.processed || 0} followups`
    });

  } catch (error) {
    logger.error('Cron job failed', error as Error);
    return NextResponse.json({
      success: false,
      error: 'Cron processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function processFollowups() {
  try {
    const { FollowupService } = await import('@/services/reminder/followup.service');

    const followupService = new FollowupService();
    const results = await followupService.processPendingFollowups();

    const processed = results.length;
    const successful = results.filter(r => r.processed).length;
    const failed = processed - successful;

    logger.info('Followups processed', {
      processed,
      successful,
      failed
    });

    return {
      processed,
      successful,
      failed,
      results: results.slice(0, 5) // Only return first 5 results
    };
  } catch (error) {
    logger.error('Failed to process followups in cron', error as Error);
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
