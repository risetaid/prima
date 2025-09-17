import { db, reminderLogs, reminderFollowups, patients } from "@/db";
import { sql } from "drizzle-orm";
import { eq, and, isNull, gt, lt, or } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getWIBTime, addMinutesToWIB } from "@/lib/timezone";
import { FollowupQueueService } from "./followup-queue.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { NewReminderFollowup, ReminderFollowup } from "@/db";

export class FollowupService {
  private queueService: FollowupQueueService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.queueService = new FollowupQueueService();
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Schedule a 15-minute followup for a reminder log
   */
  async schedule15MinuteFollowup(
    reminderLogId: string,
    followupType: "REMINDER_CONFIRMATION" | "MEDICATION_COMPLIANCE" | "SYMPTOM_CHECK" | "GENERAL_WELLBEING" = "REMINDER_CONFIRMATION"
  ): Promise<ReminderFollowup> {
    try {
      logger.info("Scheduling 15-minute followup", {
        reminderLogId,
        followupType,
        operation: "schedule_followup"
      });

      // Get the reminder log with patient details
      const reminderLog = await db
        .select({
          id: reminderLogs.id,
          patientId: reminderLogs.patientId,
          phoneNumber: reminderLogs.phoneNumber,
          message: reminderLogs.message,
          patientName: patients.name,
          patientPhone: patients.phoneNumber
        })
        .from(reminderLogs)
        .leftJoin(patients, eq(reminderLogs.patientId, patients.id))
        .where(eq(reminderLogs.id, reminderLogId))
        .limit(1);

      if (!reminderLog[0]) {
        throw new Error(`Reminder log not found: ${reminderLogId}`);
      }

      const scheduledAt = addMinutesToWIB(new Date(), 15);
      
      // Create followup message
      const followupMessage = this.generateFollowupMessage(
        followupType,
        reminderLog[0].patientName || "Pasien"
      );

      // Create followup record
      const followupData: NewReminderFollowup = {
        reminderLogId,
        patientId: reminderLog[0].patientId,
        followupType,
        status: "PENDING",
        scheduledAt,
        message: followupMessage,
        retryCount: 0,
        maxRetries: 3,
      };

      const [createdFollowup] = await db
        .insert(reminderFollowups)
        .values(followupData)
        .returning();

      logger.info("Followup scheduled successfully", {
        followupId: createdFollowup.id,
        reminderLogId,
        scheduledAt: createdFollowup.scheduledAt.toISOString(),
        operation: "schedule_followup"
      });

      // Enqueue the followup job
      await this.queueService.enqueueFollowup(createdFollowup.id, scheduledAt);

      return createdFollowup;
    } catch (error) {
      logger.error("Failed to schedule followup", error instanceof Error ? error : new Error(String(error)), {
        reminderLogId,
        followupType,
        operation: "schedule_followup"
      });
      throw error;
    }
  }

  /**
   * Process pending followups that are due
   */
  async processPendingFollowups(): Promise<void> {
    try {
      logger.info("Processing pending followups", {
        operation: "process_followups"
      });

      const now = getWIBTime();

      // Get followups that are due and pending
      const pendingFollowups = await db
        .select({
          id: reminderFollowups.id,
          reminderLogId: reminderFollowups.reminderLogId,
          patientId: reminderFollowups.patientId,
          followupType: reminderFollowups.followupType,
          message: reminderFollowups.message,
          retryCount: reminderFollowups.retryCount,
          maxRetries: reminderFollowups.maxRetries,
          phoneNumber: reminderLogs.phoneNumber,
          patientName: patients.name
        })
        .from(reminderFollowups)
        .leftJoin(reminderLogs, eq(reminderFollowups.reminderLogId, reminderLogs.id))
        .leftJoin(patients, eq(reminderFollowups.patientId, patients.id))
        .where(
          and(
            eq(reminderFollowups.status, "PENDING"),
            lt(reminderFollowups.scheduledAt, now),
            or(
              isNull(reminderFollowups.sentAt),
              and(
                gt(reminderFollowups.retryCount, 0),
                lt(reminderFollowups.retryCount, reminderFollowups.maxRetries)
              )
            )
          )
        );

      logger.info(`Found ${pendingFollowups.length} pending followups to process`, {
        operation: "process_followups"
      });

      for (const followup of pendingFollowups) {
        try {
          await this.sendFollowup(followup);
        } catch (error) {
          logger.error("Failed to send followup", error instanceof Error ? error : new Error(String(error)), {
            followupId: followup.id,
            operation: "send_followup"
          });
        }
      }
    } catch (error) {
      logger.error("Failed to process pending followups", error instanceof Error ? error : new Error(String(error)), {
        operation: "process_followups"
      });
      throw error;
    }
  }

  /**
   * Send a followup message
   */
  private async sendFollowup(followup: {
    id: string;
    phoneNumber: string | null;
    message: string;
  }): Promise<void> {
    try {
      logger.info("Sending followup message", {
        followupId: followup.id,
        phoneNumber: followup.phoneNumber,
        operation: "send_followup"
      });

      // Send WhatsApp message
      if (!followup.phoneNumber) {
        throw new Error(`Phone number is required for followup ${followup.id}`);
      }
      const sendResult = await this.whatsappService.send(followup.phoneNumber, followup.message);

      if (sendResult.success) {
        // Update followup status to SENT
        await db
          .update(reminderFollowups)
          .set({
            status: "SENT",
            sentAt: getWIBTime(),
            queueJobId: sendResult.messageId,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followup.id));

        logger.info("Followup sent successfully", {
          followupId: followup.id,
          messageId: sendResult.messageId,
          operation: "send_followup"
        });
      } else {
        // Handle failed send
        await this.handleFollowupFailure(followup.id, sendResult.error || "Unknown error");
      }
    } catch (error) {
      logger.error("Failed to send followup message", error instanceof Error ? error : new Error(String(error)), {
        followupId: followup.id,
        operation: "send_followup"
      });
      await this.handleFollowupFailure(followup.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle followup send failure
   */
  private async handleFollowupFailure(followupId: string, error: string): Promise<void> {
    try {
      const followup = await db
        .select({
          retryCount: reminderFollowups.retryCount,
          maxRetries: reminderFollowups.maxRetries
        })
        .from(reminderFollowups)
        .where(eq(reminderFollowups.id, followupId))
        .limit(1);

      if (!followup[0]) {
        logger.error("Followup not found for failure handling", undefined, {
          followupId,
          operation: "handle_followup_failure"
        });
        return;
      }

      const newRetryCount = followup[0].retryCount + 1;

      if (newRetryCount >= followup[0].maxRetries) {
        // Mark as FAILED
        await db
          .update(reminderFollowups)
          .set({
            status: "FAILED",
            retryCount: newRetryCount,
            error: error,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followupId));

        logger.warn("Followup failed after max retries", {
          followupId,
          retryCount: newRetryCount,
          maxRetries: followup[0].maxRetries,
          error: String(error),
          operation: "handle_followup_failure"
        });
      } else {
        // Schedule retry
        const retryDelay = Math.pow(2, newRetryCount) * 5; // Exponential backoff: 5, 10, 20 minutes
        const nextScheduledAt = addMinutesToWIB(new Date(), retryDelay);

        await db
          .update(reminderFollowups)
          .set({
            retryCount: newRetryCount,
            scheduledAt: nextScheduledAt,
            error: error,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followupId));

        // Re-enqueue for retry
        await this.queueService.enqueueFollowup(followupId, nextScheduledAt);

        logger.info("Followup retry scheduled", {
          followupId,
          retryCount: newRetryCount,
          nextScheduledAt: nextScheduledAt.toISOString(),
          error,
          operation: "handle_followup_failure"
        });
      }
    } catch (error) {
      logger.error("Failed to handle followup failure", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "handle_followup_failure"
      });
    }
  }

  /**
   * Generate followup message based on type
   */
  private generateFollowupMessage(
    followupType: string,
    patientName: string
  ): string {
    const messages = {
      REMINDER_CONFIRMATION: `Halo ${patientName}, kami ingin memastikan apakah Anda sudah mengonsumsi obat sesuai jadwal? Mohon balas "YA" jika sudah atau "TIDAK" jika belum.`,
      MEDICATION_COMPLIANCE: `Halo ${patientName}, bagaimana kondisi Anda setelah mengonsumsi obat? Apakah ada efek samping yang dirasakan?`,
      SYMPTOM_CHECK: `Halo ${patientName}, kami ingin mengetahui kondisi kesehatan Anda saat ini. Apakah ada gejala yang perlu diperhatikan?`,
      GENERAL_WELLBEING: `Halo ${patientName}, kami harap Anda dalam keadaan baik. Ada yang bisa kami bantu hari ini?`
    };

    return messages[followupType as keyof typeof messages] || messages.GENERAL_WELLBEING;
  }

  /**
   * Get followup statistics
   */
  async getFollowupStats(patientId?: string): Promise<Record<string, number>> {
    try {
      const baseQuery = db
        .select({
          status: reminderFollowups.status,
          count: sql<number>`count(*)::int`
        })
        .from(reminderFollowups)
        .groupBy(reminderFollowups.status);

      if (patientId) {
        baseQuery.where(eq(reminderFollowups.patientId, patientId));
      }

      const stats = await baseQuery;

      return stats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat.count;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      logger.error("Failed to get followup stats", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        operation: "get_followup_stats"
      });
      throw error;
    }
  }

  /**
   * Cancel a pending followup
   */
  async cancelFollowup(followupId: string): Promise<void> {
    try {
      await db
        .update(reminderFollowups)
        .set({
          status: "CANCELLED",
          updatedAt: getWIBTime()
        })
        .where(
          and(
            eq(reminderFollowups.id, followupId),
            eq(reminderFollowups.status, "PENDING")
          )
        );

      // Remove from queue
      await this.queueService.dequeueFollowup(followupId);

      logger.info("Followup cancelled", {
        followupId,
        operation: "cancel_followup"
      });
    } catch (error) {
      logger.error("Failed to cancel followup", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "cancel_followup"
      });
      throw error;
    }
  }
}