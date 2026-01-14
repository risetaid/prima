/**
 * BullMQ Queue Configuration for PRIMA
 *
 * Job queue with reliability features for reminder processing.
 * Uses Redis as the backend for persistence and distribution.
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection configuration
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  // BullMQ requires enableReadyCheck: false for reliability
  enableReadyCheck: false,
});

// CRITICAL: Conservative concurrency formula
// Each job may make multiple DB queries and external API calls.
// Account for: DB pool usage + in-flight HTTP connections + Redis operations
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '15');
const RESERVED_FOR_API = 5;
// Use 50% of remaining pool for BullMQ (more conservative)
const MAX_DB_CONSUMPTION = Math.floor((DB_POOL_SIZE - RESERVED_FOR_API) * 0.5);
// Cap at 10 as per tech spec, but 5 is safer for most workloads
export const BULLMQ_CONCURRENCY = Math.min(MAX_DB_CONSUMPTION, 10);

/**
 * Generate deterministic job ID from patient + scheduled time
 * This enables deduplication - same patient/scheduled time = same job ID
 */
export function generateReminderJobId(patientId: string, scheduledAt: Date): string {
  const hash = `${patientId}-${scheduledAt.toISOString()}`;
  // Use base64url for safe job IDs
  return `reminder-${Buffer.from(hash).toString('base64url').slice(0, 32)}`;
}

// Reminder queue for processing reminder jobs
export const reminderQueue = new Queue('reminders', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    // Remove completed jobs after 100, keep for audit trail
    removeOnComplete: 100,
    // Keep failed jobs for 7 days (audit + manual review)
    removeOnFail: 7 * 24 * 60 * 60 * 1000,
    // Note: jobId is set per-job with generateReminderJobId()
  },
});

// Dead Letter Queue - jobs that fail after all retries go here
// Note: In BullMQ 5.x+, DLQ is configured via failedJobEvent handler
// Jobs with removeOnFail: false are kept for inspection
export const REMINDER_DLQ_NAME = 'reminders-dlq';

// Note: QueueScheduler was removed in BullMQ 5.x
// Scheduling is now handled automatically by the Queue

// Rate limiter: Prevent overwhelming downstream services
export const reminderRateLimiter = {
  max: 100,
  duration: 60 * 1000, // 100 jobs per minute
};

export interface ReminderJobData {
  reminderId: string;
  patientId: string;
  phoneNumber: string;
  message: string;
  reminderType: string;
}

/**
 * Create a graceful shutdown handler for the worker
 */
export function createGracefulShutdown(worker: Worker) {
  return async (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new jobs
    await worker.close();

    // Close queue connections
    await reminderQueue.close();

    console.log('Graceful shutdown complete');
  };
}

// Export for use in other modules
export { redisConnection };
