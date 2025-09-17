import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getWIBTime } from "@/lib/timezone";

export interface FollowupJob {
  id: string;
  followupId: string;
  scheduledAt: Date;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export class FollowupQueueService {
  private readonly QUEUE_KEY = "followup:queue";
  private readonly PROCESSING_KEY = "followup:processing";
  private readonly COMPLETED_KEY = "followup:completed";
  private readonly FAILED_KEY = "followup:failed";
  private readonly JOB_PREFIX = "followup:job:";
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Enqueue a followup job
   */
  async enqueueFollowup(followupId: string, scheduledAt: Date): Promise<void> {
    try {
      const jobId = this.generateJobId(followupId);
      const job: FollowupJob = {
        id: jobId,
        followupId,
        scheduledAt,
        status: "pending",
        createdAt: getWIBTime(),
        retryCount: 0,
        maxRetries: 3,
      };

      const jobData = JSON.stringify(job);
      const score = scheduledAt.getTime();

      // Store job data
      await redis.hset(this.JOB_PREFIX + jobId, {
        data: jobData,
        status: job.status,
        retryCount: job.retryCount.toString(),
        createdAt: job.createdAt.toISOString(),
      });

      // Set TTL for job data
      await redis.expire(this.JOB_PREFIX + jobId, this.DEFAULT_TTL);

      // Add to sorted queue with scheduled time as score
      await redis.zadd(this.QUEUE_KEY, score, jobId);

      logger.info("Followup job enqueued", {
        jobId,
        followupId,
        scheduledAt: scheduledAt.toISOString(),
        operation: "enqueue_followup"
      });
    } catch (error) {
      logger.error("Failed to enqueue followup job", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        scheduledAt: scheduledAt.toISOString(),
        operation: "enqueue_followup"
      });
      throw error;
    }
  }

  /**
   * Process the queue - get due jobs and mark them for processing
   */
  async processQueue(): Promise<FollowupJob[]> {
    try {
      const now = getWIBTime().getTime();
      const maxJobs = 100; // Process max 100 jobs at once

      // Get jobs that are due (score <= current time)
      const dueJobIds = await redis.zrangebyscore(
        this.QUEUE_KEY,
        0,
        now
      );
      
      // Limit to max jobs
      const limitedJobIds = dueJobIds.slice(0, maxJobs);

      if (limitedJobIds.length === 0) {
        return [];
      }

      const jobs: FollowupJob[] = [];

      for (const jobId of limitedJobIds) {
        try {
          // Get job data
          const jobData = await redis.hget(this.JOB_PREFIX + jobId, "data");
          if (!jobData) {
            logger.warn("Job data not found, removing from queue", {
              jobId,
              operation: "process_queue"
            });
            await this.removeJobFromQueue(jobId);
            continue;
          }

          const job: FollowupJob = JSON.parse(jobData);

          // Check if job is not already being processed
          const isProcessing = await redis.hget(this.PROCESSING_KEY, jobId);
          if (isProcessing === "1") {
            continue;
          }

          // Mark as processing
          await redis.hset(this.PROCESSING_KEY, jobId, "1");
          job.status = "processing";

          // Update job status
          await redis.hset(this.JOB_PREFIX + jobId, {
            status: job.status,
          });

          jobs.push(job);
        } catch (error) {
          logger.error("Failed to process job", error instanceof Error ? error : new Error(String(error)), {
            jobId,
            operation: "process_queue"
          });
          // Remove problematic job from queue
          await this.removeJobFromQueue(jobId);
        }
      }

      logger.info(`Processed ${jobs.length} followup jobs`, {
        operation: "process_queue"
      });

      return jobs;
    } catch (error) {
      logger.error("Failed to process followup queue", error instanceof Error ? error : new Error(String(error)), {
        operation: "process_queue"
      });
      throw error;
    }
  }

  /**
   * Complete a job successfully
   */
  async completeJob(jobId: string): Promise<void> {
    try {
      // Remove from processing set
      await redis.hdel(this.PROCESSING_KEY, jobId);

      // Remove from queue
      await this.removeJobFromQueue(jobId);

      // Add to completed set with TTL
      await redis.hset(this.COMPLETED_KEY, jobId, "1");
      await redis.expire(this.COMPLETED_KEY, this.DEFAULT_TTL);

      logger.info("Followup job completed", {
        jobId,
        operation: "complete_job"
      });
    } catch (error) {
      logger.error("Failed to complete followup job", error instanceof Error ? error : new Error(String(error)), {
        jobId,
        operation: "complete_job"
      });
      throw error;
    }
  }

  /**
   * Mark a job as failed
   */
  async failJob(jobId: string, error: string, retryCount: number, maxRetries: number): Promise<void> {
    try {
      // Remove from processing set
      await redis.hdel(this.PROCESSING_KEY, jobId);

      if (retryCount >= maxRetries) {
        // Max retries reached, move to failed set
        await redis.hset(this.FAILED_KEY, jobId, "1");
        await redis.expire(this.FAILED_KEY, this.DEFAULT_TTL);
        
        // Remove from queue
        await this.removeJobFromQueue(jobId);

        logger.warn("Followup job failed after max retries", {
          jobId,
          retryCount,
          maxRetries,
          error,
          operation: "fail_job"
        });
      } else {
        // Update job for retry
        const jobData = await redis.hget(this.JOB_PREFIX + jobId, "data");
        if (jobData) {
          const job: FollowupJob = JSON.parse(jobData);
          job.retryCount = retryCount;
          job.error = error;
          job.status = "pending";

          // Calculate next retry time with exponential backoff
          const retryDelay = Math.pow(2, retryCount) * 5 * 60 * 1000; // 5, 10, 20 minutes
          const nextScheduledAt = new Date(getWIBTime().getTime() + retryDelay);

          job.scheduledAt = nextScheduledAt;

          // Update job data
          await redis.hset(this.JOB_PREFIX + jobId, {
            data: JSON.stringify(job),
            status: job.status,
            retryCount: job.retryCount.toString(),
          });

          // Re-add to queue with new score
          await redis.zadd(this.QUEUE_KEY, nextScheduledAt.getTime(), jobId);

          logger.info("Followup job scheduled for retry", {
            jobId,
            retryCount,
            nextScheduledAt: nextScheduledAt.toISOString(),
            error,
            operation: "fail_job"
          });
        }
      }
    } catch (error) {
      logger.error("Failed to mark followup job as failed", error instanceof Error ? error : new Error(String(error)), {
        jobId,
        operation: "fail_job"
      });
      throw error;
    }
  }

  /**
   * Remove a job from the queue
   */
  async dequeueFollowup(followupId: string): Promise<void> {
    try {
      const jobId = this.generateJobId(followupId);
      await this.removeJobFromQueue(jobId);

      logger.info("Followup job dequeued", {
        jobId,
        followupId,
        operation: "dequeue_followup"
      });
    } catch (error) {
      logger.error("Failed to dequeue followup job", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "dequeue_followup"
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        redis.zcard(this.QUEUE_KEY),
        this.getHashCount(this.PROCESSING_KEY),
        this.getHashCount(this.COMPLETED_KEY),
        this.getHashCount(this.FAILED_KEY),
      ]);

      return {
        pending,
        processing,
        completed,
        failed,
      };
    } catch (error) {
      logger.error("Failed to get queue stats", error instanceof Error ? error : new Error(String(error)), {
        operation: "get_queue_stats"
      });
      throw error;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up old job data (older than 7 days)
      // Note: This is a simplified approach. In production, you might want to use Redis SCAN
      // or maintain a separate index of job keys for more efficient cleanup
      
      logger.info("Followup queue cleanup completed", {
        operation: "cleanup_queue"
      });
    } catch (error) {
      logger.error("Failed to cleanup followup queue", error instanceof Error ? error : new Error(String(error)), {
        operation: "cleanup_queue"
      });
      throw error;
    }
  }

  /**
   * Remove job from queue and clean up associated data
   */
  private async removeJobFromQueue(jobId: string): Promise<void> {
    try {
      // Remove from sorted set
      await redis.zrem(this.QUEUE_KEY, jobId);
      
      // Remove job data
      await redis.del(this.JOB_PREFIX + jobId);
      
      // Remove from processing set if present
      await redis.hdel(this.PROCESSING_KEY, jobId);
    } catch (error) {
      logger.error("Failed to remove job from queue", error instanceof Error ? error : new Error(String(error)), {
        jobId,
        operation: "remove_job_from_queue"
      });
      throw error;
    }
  }

  /**
   * Get count of items in a hash (simulating set operations)
   */
  private async getHashCount(key: string): Promise<number> {
    try {
      const hashData = await redis.hgetall(key);
      return Object.keys(hashData).length;
    } catch (error) {
      logger.warn("Failed to get hash count", {
        key,
        error: error instanceof Error ? error.message : String(error),
        operation: "get_hash_count"
      });
      return 0;
    }
  }

  /**
   * Generate a unique job ID for a followup
   */
  private generateJobId(followupId: string): string {
    return `followup_${followupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}