/**
 * Reminder Worker for BullMQ
 *
 * Processes reminder jobs from the queue.
 * Handles WhatsApp message sending with retries and error handling.
 */

import { Worker } from 'bullmq';
import { redisConnection, reminderRateLimiter, BULLMQ_CONCURRENCY, createGracefulShutdown } from '@/jobs/reminder-queue';
import { logger } from '@/lib/logger';
import { sanitizeForAudit } from '@/lib/phi-mask';
import { formatWhatsAppNumber } from '@/lib/gowa';
import { sendWhatsAppMessage } from '@/lib/gowa';
import { db, reminders } from '@/db';
import { eq } from 'drizzle-orm';

interface ReminderJobData {
  reminderId: string;
  patientId: string;
  phoneNumber: string;
  message: string;
  reminderType: string;
}

/**
 * Process a reminder job
 */
async function processReminderJob(job: { data: ReminderJobData }) {
  const { reminderId, patientId, phoneNumber, message, reminderType } = job.data;

  logger.info('Processing reminder job', sanitizeForAudit({
    reminderId,
    patientId,
    reminderType,
  }));

  try {
    // Fetch reminder data to ensure it's still valid
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    if (!reminder) {
      logger.warn('Reminder not found, skipping job', { reminderId });
      return { success: false, reason: 'REMINDER_NOT_FOUND' };
    }

    // Check if already sent
    if (reminder.status === 'DELIVERED' || reminder.status === 'SENT') {
      logger.info('Reminder already sent, skipping', { reminderId });
      return { success: true, reason: 'ALREADY_SENT' };
    }

    // Format phone number for WhatsApp
    const formattedPhone = formatWhatsAppNumber(phoneNumber);

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({ to: formattedPhone, body: message });

    if (result.success) {
      // Update reminder status
      await db
        .update(reminders)
        .set({
          status: 'SENT',
          sentAt: new Date(),
          wahaMessageId: result.messageId || null,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, reminderId));

      logger.info('Reminder sent successfully', sanitizeForAudit({
        reminderId,
        patientId,
        messageId: result.messageId,
      }));

      return { success: true, messageId: result.messageId };
    } else {
      // Update reminder status to FAILED
      await db
        .update(reminders)
        .set({
          status: 'FAILED',
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, reminderId));

      throw new Error(result.error || 'Failed to send WhatsApp message');
    }
  } catch (error) {
    logger.error('Failed to process reminder', error as Error, sanitizeForAudit({
      reminderId,
      patientId,
    }));

    throw error; // Let BullMQ handle retry logic
  }
}

// Create the worker
export const reminderWorker = new Worker(
  'reminders',
  processReminderJob,
  {
    connection: redisConnection,
    concurrency: BULLMQ_CONCURRENCY,
    // Rate limiter: max 100 jobs per minute total across all workers
    limiter: reminderRateLimiter,
  }
);

// Handle worker events
reminderWorker.on('completed', (job) => {
  logger.debug('Reminder job completed', {
    jobId: job.id,
    reminderId: job.data.reminderId,
  });
});

reminderWorker.on('failed', (job, err) => {
  logger.error('Reminder job failed', err, {
    jobId: job?.id,
    reminderId: job?.data.reminderId,
    attemptsMade: job?.attemptsMade,
  });
});

reminderWorker.on('error', (error) => {
  logger.error('Reminder worker error', error);
});

// Graceful shutdown handlers
process.on('SIGTERM', createGracefulShutdown(reminderWorker));
process.on('SIGINT', createGracefulShutdown(reminderWorker));

// Export worker for external access
export { processReminderJob };
