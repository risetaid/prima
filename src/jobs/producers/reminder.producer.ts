/**
 * Reminder Producer for BullMQ
 *
 * Creates and queues reminder jobs for processing.
 * Handles deduplication and job size validation.
 */

import { reminderQueue, generateReminderJobId } from '@/jobs/reminder-queue';
import { db, reminders, patients } from '@/db';
import { eq, and, isNull, gte } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { sanitizeForAudit } from '@/lib/phi-mask';

// Maximum job data size in bytes (10KB)
const MAX_JOB_SIZE_BYTES = 10 * 1024;

export interface CreateReminderJobParams {
  reminderId: string;
  patientId: string;
  phoneNumber: string;
  message: string;
  reminderType: string;
  scheduledAt: Date;
}

/**
 * Validate job data size
 * Returns true if valid, false if exceeds limit
 */
function validateJobSize(data: CreateReminderJobParams): boolean {
  const size = JSON.stringify(data).length;
  return size <= MAX_JOB_SIZE_BYTES;
}

/**
 * Add a reminder to the queue
 */
export async function addReminderJob(params: CreateReminderJobParams): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    // Validate job size
    if (!validateJobSize(params)) {
      logger.warn('Reminder job exceeds size limit', sanitizeForAudit({
        reminderId: params.reminderId,
        patientId: params.patientId,
      }));
      return {
        success: false,
        error: `Job data exceeds ${MAX_JOB_SIZE_BYTES} byte limit`,
      };
    }

    // Generate deterministic job ID for deduplication
    const jobId = generateReminderJobId(params.patientId, params.scheduledAt);

    // Check if job already exists (deduplication)
    const existingJob = await reminderQueue.getJob(jobId);
    if (existingJob) {
      logger.info('Reminder job already exists, skipping', {
        jobId,
        reminderId: params.reminderId,
      });
      return { success: true, jobId };
    }

    // Add job to queue
    const job = await reminderQueue.add(
      'send-reminder',
      {
        reminderId: params.reminderId,
        patientId: params.patientId,
        phoneNumber: params.phoneNumber,
        message: params.message,
        reminderType: params.reminderType,
      },
      {
        jobId, // Enable deduplication
        // Delay job until scheduled time
        delay: Math.max(0, params.scheduledAt.getTime() - Date.now()),
      }
    );

    logger.info('Reminder job added to queue', sanitizeForAudit({
      jobId: job.id,
      reminderId: params.reminderId,
      patientId: params.patientId,
      scheduledAt: params.scheduledAt.toISOString(),
    }));

    return { success: true, jobId: job.id };
  } catch (error) {
    logger.error('Failed to add reminder job', error as Error, sanitizeForAudit({
      reminderId: params.reminderId,
      patientId: params.patientId,
    }));

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Migrate pending reminders from cron to queue
 * Called during initial queue setup
 */
export async function migratePendingReminders(): Promise<{
  migrated: number;
  errors: number;
}> {
  let migrated = 0;
  let errors = 0;

  try {
    // Find all pending reminders that are due (with patient phone number via join)
    const pendingReminders = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        phoneNumber: patients.phoneNumber,
        message: reminders.message,
        reminderType: reminders.reminderType,
        startDate: reminders.startDate,
      })
      .from(reminders)
      .innerJoin(patients, eq(reminders.patientId, patients.id))
      .where(
        and(
          eq(reminders.status, 'PENDING'),
          isNull(reminders.deletedAt),
          gte(reminders.startDate, new Date())
        )
      )
      .limit(1000); // Process in batches

    for (const reminder of pendingReminders) {
      const result = await addReminderJob({
        reminderId: reminder.id,
        patientId: reminder.patientId,
        phoneNumber: reminder.phoneNumber,
        message: reminder.message,
        reminderType: reminder.reminderType,
        scheduledAt: new Date(reminder.startDate),
      });

      if (result.success) {
        migrated++;
      } else {
        errors++;
      }
    }

    logger.info('Pending reminders migration complete', {
      migrated,
      errors,
    });

    return { migrated, errors };
  } catch (error) {
    logger.error('Failed to migrate pending reminders', error as Error);
    return { migrated, errors };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    reminderQueue.getWaitingCount(),
    reminderQueue.getActiveCount(),
    reminderQueue.getCompletedCount(),
    reminderQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
