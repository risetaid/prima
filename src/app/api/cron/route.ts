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
  logger.info('Processing scheduled reminders via cron job');

  try {
    // Import dependencies
    const { db, reminders, patients } = await import('@/db');
    const { eq, and, lte, isNull } = await import('drizzle-orm');
    const { sendWhatsAppMessage, formatWhatsAppNumber } = await import('@/lib/fonnte');
    const { getWIBTime } = await import('@/lib/timezone');

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
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
        medicationDetails: reminders.medicationDetails,
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

        // Generate enhanced message with content attachments if available
        let enhancedMessage = reminder.message;
        if (reminder.medicationDetails && typeof reminder.medicationDetails === 'object') {
          const details = reminder.medicationDetails as { content?: Array<{ title: string; url: string; type: string }> };
          if (details.content && Array.isArray(details.content) && details.content.length > 0) {
            enhancedMessage += '\n\n📚 Informasi tambahan:';
            details.content.forEach(content => {
              const icon = content.type === 'video' ? '🎥' : '📄';
              enhancedMessage += `\n${icon} ${content.title}\n   ${content.url}`;
            });
          }
        }
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalFound: remindersDue.length,
        processed: processedCount,
        successful: successCount,
        failed: failedCount,
        errors: errors.slice(0, 5) // Only show first 5 errors
      },
      message: `Processed ${processedCount} reminders: ${successCount} sent, ${failedCount} failed`
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
