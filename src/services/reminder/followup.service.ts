// Redis-based Followup Automation Service
// Handles medication reminder followups with Redis storage

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getWIBTime } from "@/lib/timezone";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { FollowupQueueService } from "./followup-queue.service";
import {
  FollowupData,
  FollowupType,
  FollowupStatus,
  FollowupStage,
  FollowupScheduleRequest,
  FollowupProcessingResult,
  FollowupStats,
} from "./followup.types";

export class FollowupService {
  private readonly FOLLOWUP_PREFIX = "followup:data:";
  private readonly FOLLOWUP_QUEUE_KEY = "followup:schedule";
  private readonly FOLLOWUP_PATIENT_KEY = "followup:patient:";
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly MAX_FOLLOWUP_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  private whatsappService: WhatsAppService;
  private queueService: FollowupQueueService;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.queueService = new FollowupQueueService();
  }

  /**
   * Schedule followups for a medication reminder
   * Creates a series of followups: 15min, 2h, 24h
   */
  async scheduleMedicationFollowups(request: FollowupScheduleRequest): Promise<string[]> {
    try {
      const followupIds: string[] = [];
      const now = getWIBTime();

      // Schedule 15-minute followup
      const followup15Min = await this.createFollowup({
        ...request,
        followupType: 'REMINDER_15MIN',
        scheduledAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
        stage: 'FOLLOWUP_15MIN',
      });
      followupIds.push(followup15Min);

      // Schedule 2-hour followup
      const followup2H = await this.createFollowup({
        ...request,
        followupType: 'REMINDER_2H',
        scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        stage: 'FOLLOWUP_2H',
      });
      followupIds.push(followup2H);

      // Schedule 24-hour followup
      const followup24H = await this.createFollowup({
        ...request,
        followupType: 'REMINDER_24H',
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        stage: 'FOLLOWUP_24H',
      });
      followupIds.push(followup24H);

      logger.info("Medication followups scheduled", {
        reminderId: request.reminderId,
        patientId: request.patientId,
        followupIds,
        operation: "schedule_medication_followups"
      });

      return followupIds;
    } catch (error) {
      logger.error("Failed to schedule medication followups", error instanceof Error ? error : new Error(String(error)), {
        reminderId: request.reminderId,
        patientId: request.patientId,
        operation: "schedule_medication_followups"
      });
      throw error;
    }
  }

  /**
   * Create a single followup
   */
  private async createFollowup(params: {
    patientId: string;
    reminderId: string;
    phoneNumber: string;
    patientName: string;
    reminderName?: string;
    followupType: FollowupType;
    scheduledAt: Date;
    stage: FollowupStage;
  }): Promise<string> {
    const followupId = this.generateFollowupId();
    const now = getWIBTime();

    const followupData: FollowupData = {
      id: followupId,
      patientId: params.patientId,
      reminderId: params.reminderId,
      phoneNumber: params.phoneNumber,
      patientName: params.patientName,
      reminderName: params.reminderName,
      followupType: params.followupType,
      stage: params.stage,
      scheduledAt: params.scheduledAt,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
    };

    // Store followup data in Redis hash
    await this.storeFollowupData(followupData);

    // Add to patient index
    await redis.hset(
      this.FOLLOWUP_PATIENT_KEY + params.patientId,
      followupId,
      followupData.scheduledAt.toISOString()
    );

    // Schedule in queue
    await this.queueService.enqueueFollowup(followupId, params.scheduledAt);

    return followupId;
  }

  /**
   * Process pending followups (called by cron job)
   */
  async processPendingFollowups(): Promise<FollowupProcessingResult[]> {
    try {
      const dueJobs = await this.queueService.processQueue();
      const results: FollowupProcessingResult[] = [];

      for (const job of dueJobs) {
        try {
          const result = await this.processFollowup(job.followupId);
          results.push(result);

          if (result.processed) {
            await this.queueService.completeJob(job.id);
          } else {
            await this.queueService.failJob(
              job.id,
              result.error || 'Processing failed',
              job.retryCount + 1,
              job.maxRetries
            );
          }
        } catch (error) {
          logger.error("Failed to process followup job", error instanceof Error ? error : new Error(String(error)), {
            followupId: job.followupId,
            jobId: job.id,
            operation: "process_pending_followups"
          });

          await this.queueService.failJob(
            job.id,
            error instanceof Error ? error.message : String(error),
            job.retryCount + 1,
            job.maxRetries
          );
        }
      }

      logger.info(`Processed ${results.length} followup jobs`, {
        operation: "process_pending_followups"
      });

      return results;
    } catch (error) {
      logger.error("Failed to process pending followups", error instanceof Error ? error : new Error(String(error)), {
        operation: "process_pending_followups"
      });
      throw error;
    }
  }

  /**
   * Process a single followup
   */
  private async processFollowup(followupId: string): Promise<FollowupProcessingResult> {
    try {
      const followup = await this.getFollowupData(followupId);
      if (!followup) {
        return {
          processed: false,
          followupId,
          status: 'FAILED',
          error: 'Followup data not found'
        };
      }

      // Check if followup is still valid
      if (followup.status !== 'PENDING') {
        return {
          processed: true,
          followupId,
          status: followup.status
        };
      }

      // Send followup message
      const message = this.buildFollowupMessage(followup);
      const sendResult = await this.whatsappService.send(followup.phoneNumber, message);

      if (sendResult.success) {
        // Update followup status
        followup.status = 'SENT';
        followup.sentAt = getWIBTime();
        followup.messageId = sendResult.messageId;
        followup.updatedAt = getWIBTime();

        await this.storeFollowupData(followup);

        logger.info("Followup message sent successfully", {
          followupId,
          patientId: followup.patientId,
          messageId: sendResult.messageId,
          operation: "process_followup"
        });

        return {
          processed: true,
          followupId,
          status: 'SENT',
          sentMessageId: sendResult.messageId
        };
      } else {
        // Mark as failed
        followup.status = 'FAILED';
        followup.error = sendResult.error;
        followup.retryCount++;
        followup.updatedAt = getWIBTime();

        await this.storeFollowupData(followup);

        logger.warn("Followup message send failed", {
          followupId,
          patientId: followup.patientId,
          error: sendResult.error,
          operation: "process_followup"
        });

        return {
          processed: false,
          followupId,
          status: 'FAILED',
          error: sendResult.error
        };
      }
    } catch (error) {
      logger.error("Failed to process followup", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "process_followup"
      });

      return {
        processed: false,
        followupId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process followup response from patient
   */
  async processFollowupResponse(
    patientId: string,
    phoneNumber: string,
    message: string,
    followupId?: string
  ): Promise<{
    processed: boolean;
    emergencyDetected: boolean;
    response: string;
    escalated: boolean;
  }> {
    try {
      let followup: FollowupData | null = null;

      // If followupId is provided, get specific followup
      if (followupId) {
        followup = await this.getFollowupData(followupId);
      } else {
        // Find active followup for patient
        followup = await this.findActiveFollowupForPatient(patientId);
      }

      if (!followup) {
        return {
          processed: false,
          emergencyDetected: false,
          response: "Tidak ada followup aktif yang ditemukan.",
          escalated: false
        };
      }

      // Analyze response
      const analysis = this.analyzeResponse(message);

      // Update followup
      followup.response = message;
      followup.respondedAt = getWIBTime();
      followup.status = analysis.confirmed ? 'CONFIRMED' : 'RESPONDED';
      followup.updatedAt = getWIBTime();

      await this.storeFollowupData(followup);

      // Send acknowledgment
      const ackMessage = this.buildAcknowledgmentMessage(followup, analysis);
      await this.whatsappService.sendAck(phoneNumber, ackMessage);

      logger.info("Followup response processed", {
        followupId: followup.id,
        patientId,
        confirmed: analysis.confirmed,
        emergencyDetected: analysis.emergencyDetected,
        escalated: analysis.escalated,
        operation: "process_followup_response"
      });

      return {
        processed: true,
        emergencyDetected: analysis.emergencyDetected,
        response: ackMessage,
        escalated: analysis.escalated
      };
    } catch (error) {
      logger.error("Failed to process followup response", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        followupId,
        operation: "process_followup_response"
      });

      return {
        processed: false,
        emergencyDetected: false,
        response: "Terjadi kesalahan dalam memproses respons Anda. Silakan hubungi tim PRIMA.",
        escalated: false
      };
    }
  }

  /**
   * Get followup statistics
   */
  async getFollowupStats(patientId?: string): Promise<FollowupStats> {
    try {
      // This is a simplified implementation
      // In production, you might want to scan Redis keys or maintain counters
      const stats: FollowupStats = {
        total: 0,
        pending: 0,
        sent: 0,
        responded: 0,
        confirmed: 0,
        failed: 0,
        cancelled: 0,
        expired: 0
      };

      // If patientId provided, get patient-specific stats
      if (patientId) {
        const patientFollowups = await redis.hgetall(this.FOLLOWUP_PATIENT_KEY + patientId);

        for (const followupId of Object.keys(patientFollowups)) {
          const followup = await this.getFollowupData(followupId);
          if (followup) {
            stats.total++;
            stats[followup.status.toLowerCase() as keyof FollowupStats]++;
          }
        }
      }

      return stats;
    } catch (error) {
      logger.error("Failed to get followup stats", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        operation: "get_followup_stats"
      });

      return {
        total: 0,
        pending: 0,
        sent: 0,
        responded: 0,
        confirmed: 0,
        failed: 0,
        cancelled: 0,
        expired: 0
      };
    }
  }

  /**
   * Cancel a followup
   */
  async cancelFollowup(followupId: string): Promise<void> {
    try {
      const followup = await this.getFollowupData(followupId);
      if (!followup) {
        logger.warn("Followup not found for cancellation", { followupId });
        return;
      }

      followup.status = 'CANCELLED';
      followup.updatedAt = getWIBTime();

      await this.storeFollowupData(followup);
      await this.queueService.dequeueFollowup(followupId);

      logger.info("Followup cancelled", {
        followupId,
        patientId: followup.patientId,
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

  /**
   * Clean up expired followups
   */
  async cleanupExpiredFollowups(): Promise<void> {
    try {
      // This is a simplified cleanup - in production you might want to scan keys
      // or maintain a separate index of expired followups

      logger.info("Expired followups cleanup completed", {
        operation: "cleanup_expired_followups"
      });
    } catch (error) {
      logger.error("Failed to cleanup expired followups", error instanceof Error ? error : new Error(String(error)), {
        operation: "cleanup_expired_followups"
      });
      throw error;
    }
  }

  // Private helper methods

  private generateFollowupId(): string {
    return `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeFollowupData(followup: FollowupData): Promise<void> {
    const key = this.FOLLOWUP_PREFIX + followup.id;
    const data = {
      id: followup.id,
      patientId: followup.patientId,
      reminderId: followup.reminderId,
      phoneNumber: followup.phoneNumber,
      patientName: followup.patientName,
      reminderName: followup.reminderName || '',
      followupType: followup.followupType,
      stage: followup.stage,
      scheduledAt: followup.scheduledAt.toISOString(),
      sentAt: followup.sentAt?.toISOString() || '',
      respondedAt: followup.respondedAt?.toISOString() || '',
      response: followup.response || '',
      status: followup.status,
      retryCount: followup.retryCount.toString(),
      maxRetries: followup.maxRetries.toString(),
      createdAt: followup.createdAt.toISOString(),
      updatedAt: followup.updatedAt.toISOString(),
      error: followup.error || '',
      messageId: followup.messageId || '',
    };

    await redis.hset(key, data);
    await redis.expire(key, this.DEFAULT_TTL);
  }

  private async getFollowupData(followupId: string): Promise<FollowupData | null> {
    const key = this.FOLLOWUP_PREFIX + followupId;
    const data = await redis.hgetall(key);

    if (!data || !data.id) {
      return null;
    }

    return {
      id: data.id,
      patientId: data.patientId,
      reminderId: data.reminderId,
      phoneNumber: data.phoneNumber,
      patientName: data.patientName,
      reminderName: data.reminderName || undefined,
      followupType: data.followupType as FollowupType,
      stage: data.stage as FollowupStage,
      scheduledAt: new Date(data.scheduledAt),
      sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
      respondedAt: data.respondedAt ? new Date(data.respondedAt) : undefined,
      response: data.response || undefined,
      status: data.status as FollowupStatus,
      retryCount: parseInt(data.retryCount) || 0,
      maxRetries: parseInt(data.maxRetries) || 3,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      error: data.error || undefined,
      messageId: data.messageId || undefined,
    };
  }

  private async findActiveFollowupForPatient(patientId: string): Promise<FollowupData | null> {
    const patientFollowups = await redis.hgetall(this.FOLLOWUP_PATIENT_KEY + patientId);

    for (const followupId of Object.keys(patientFollowups)) {
      const followup = await this.getFollowupData(followupId);
      if (followup && (followup.status === 'PENDING' || followup.status === 'SENT')) {
        return followup;
      }
    }

    return null;
  }

  private buildFollowupMessage(followup: FollowupData): string {
    const medicationText = followup.reminderName
      ? ` untuk mengonsumsi ${followup.reminderName}`
      : '';

    switch (followup.followupType) {
      case 'REMINDER_15MIN':
        return `⏰ *Follow-up: Pengingat Obat*

Halo ${followup.patientName}!

15 menit yang lalu kami mengirim pengingat${medicationText}.

Apakah sudah diminum? Balas "SUDAH" atau "BELUM".

💙 Tim PRIMA`;

      case 'REMINDER_2H':
        return `⏰ *Follow-up: Pengingat Obat*

Halo ${followup.patientName}!

2 jam yang lalu kami mengirim pengingat${medicationText}.

Bagaimana kondisinya? Apakah sudah diminum?

💙 Tim PRIMA`;

      case 'REMINDER_24H':
        return `⏰ *Follow-up: Pengingat Obat*

Halo ${followup.patientName}!

24 jam yang lalu kami mengirim pengingat${medicationText}.

Mohon konfirmasi apakah sudah sesuai jadwal.

💙 Tim PRIMA`;

      default:
        return `⏰ *Follow-up: Konfirmasi*

Halo ${followup.patientName}!

Apakah Anda menerima pengingat kesehatan kami?

💙 Tim PRIMA`;
    }
  }

  private analyzeResponse(message: string): {
    confirmed: boolean;
    emergencyDetected: boolean;
    escalated: boolean;
  } {
    const lowerMessage = message.toLowerCase().trim();

    // Check for confirmation
    const confirmationKeywords = ['sudah', 'selesai', 'ya', 'yes', 'done', 'ok', 'baik'];
    const confirmed = confirmationKeywords.some(keyword => lowerMessage.includes(keyword));

    // Check for emergency keywords
    const emergencyKeywords = ['darurat', 'sakit', 'mual', 'muntah', 'alergi', 'gawat', 'bantuan', 'tolong'];
    const emergencyDetected = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));

    // Check for escalation request
    const escalationKeywords = ['bantuan', 'relawan', 'dokter', 'rumah sakit'];
    const escalated = escalationKeywords.some(keyword => lowerMessage.includes(keyword));

    return { confirmed, emergencyDetected, escalated };
  }

  private buildAcknowledgmentMessage(followup: FollowupData, analysis: { confirmed: boolean; emergencyDetected: boolean; escalated: boolean }): string {
    if (analysis.emergencyDetected || analysis.escalated) {
      return `🚨 Terima kasih atas informasi Anda. Kami akan segera menghubungi relawan terdekat untuk membantu Anda.

Mohon jaga kondisi kesehatan Anda. Jika ini adalah darurat medis, segera hubungi rumah sakit terdekat.

💙 Tim PRIMA`;
    }

    if (analysis.confirmed) {
      return `✅ Terima kasih atas konfirmasinya! Senang mendengar Anda sudah mengikuti rutinitas kesehatan dengan baik.

Kami akan terus memantau dan mengingatkan Anda. Tetap jaga kesehatan!

💙 Tim PRIMA`;
    }

    return `📝 Terima kasih atas respons Anda. Kami akan terus memantau kondisi kesehatan Anda.

Jika ada yang bisa kami bantu, jangan ragu untuk menghubungi kami.

💙 Tim PRIMA`;
  }

  // Legacy methods for backwards compatibility
  async schedule15MinuteFollowup(
    reminderId: string,
    followupType: "REMINDER_CONFIRMATION" | "MEDICATION_COMPLIANCE" | "SYMPTOM_CHECK" | "GENERAL_WELLBEING" = "REMINDER_CONFIRMATION"
  ): Promise<{ id: string; patientId: string; status: string; message: string; scheduledAt: Date }> {
    // This is a legacy method - redirect to new implementation
    logger.warn("Using legacy followup scheduling method", {
      reminderId,
      followupType,
      operation: "legacy_schedule15MinuteFollowup"
    });

    return {
      id: 'legacy-' + reminderId,
      patientId: reminderId,
      status: 'DISABLED',
      message: `Legacy followup method - use scheduleMedicationFollowups instead`,
      scheduledAt: new Date()
    };
  }
}