// WhatsApp Messaging Service - centralizes WA message building and sending
import {
  sendWhatsAppMessage,
  formatWhatsAppNumber,
  WhatsAppMessageResult,
} from "@/lib/fonnte";
import { ValidatedContent } from "@/services/reminder/reminder.types";
import { logger } from "@/lib/logger";
import { whatsAppRateLimiter } from "@/services/rate-limit.service";
import { distributedLockService } from "@/services/distributed-lock.service";

export class WhatsAppService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000; // 1 second base delay

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async sendWithRetry(
    toPhoneNumber: string,
    message: string,
    attempt: number = 1
  ): Promise<WhatsAppMessageResult> {
    try {
      const formatted = formatWhatsAppNumber(toPhoneNumber);
      const result = await sendWhatsAppMessage({
        to: formatted,
        body: message,
      });

      if (result.success) {
        logger.info("WhatsApp message sent successfully", {
          phoneNumber: toPhoneNumber,
          attempt,
          messageId: result.messageId,
        });
        return result;
      } else {
        throw new Error(result.error || "Unknown WhatsApp send error");
      }
    } catch (error) {
      logger.warn("WhatsApp send attempt failed", {
        phoneNumber: toPhoneNumber,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info("Retrying WhatsApp send", {
          phoneNumber: toPhoneNumber,
          attempt: attempt + 1,
          delayMs,
        });

        await this.delay(delayMs);
        return this.sendWithRetry(toPhoneNumber, message, attempt + 1);
      } else {
        logger.error(
          "WhatsApp send failed after all retries",
          error instanceof Error ? error : new Error(String(error)),
          {
            phoneNumber: toPhoneNumber,
            attempts: this.MAX_RETRY_ATTEMPTS,
          }
        );
        throw error;
      }
    }
  }

  getContentPrefix(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📚 Baca juga:";
      case "video":
        return "🎥 Tonton juga:";
      default:
        return "📖 Lihat juga:";
    }
  }

  getContentIcon(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case "article":
        return "📄";
      case "video":
        return "🎥";
      default:
        return "📖";
    }
  }

  buildMessage(baseMessage: string, attachments: ValidatedContent[]): string {
    if (!attachments || attachments.length === 0) return baseMessage;

    let message = baseMessage;
    const contentByType: Record<string, ValidatedContent[]> = {};

    for (const content of attachments) {
      const type = content.type?.toLowerCase() || "other";
      if (!contentByType[type]) contentByType[type] = [];
      contentByType[type].push(content);
    }

    for (const contentType of Object.keys(contentByType)) {
      const contents = contentByType[contentType];
      message += `\n\n${this.getContentPrefix(contentType)}`;
      for (const c of contents) {
        const icon = this.getContentIcon(c.type);
        message += `\n${icon} ${c.title}`;
        message += `\n   ${c.url}`;
      }
    }

    message += "\n\n💙 Tim PRIMA";
    return message;
  }

  async send(toPhoneNumber: string, message: string) {
    logger.info("Attempting to send WhatsApp message (sendAck)", {
      phoneNumber: toPhoneNumber,
      messageLength: message.length,
      messagePreview:
        message.substring(0, 50) + (message.length > 50 ? "..." : ""),
    });

    // Check rate limiting first
    const rateLimitResult = await whatsAppRateLimiter.checkWhatsAppRateLimit(
      toPhoneNumber
    );

    if (!rateLimitResult.allowed) {
      logger.warn("WhatsApp rate limit exceeded", {
        phoneNumber: toPhoneNumber,
        rateLimitResult,
      });
      throw new Error(
        `Rate limit exceeded for ${toPhoneNumber}. Try again after ${rateLimitResult.resetTime.toISOString()}`
      );
    }

    // Use distributed locking to prevent concurrent sends to the same number
    const lockKey = `whatsapp_send:${toPhoneNumber}:${Date.now()}`;
    const lockResult = await distributedLockService.withLock(
      lockKey,
      async () => {
        return await this.sendWithRetry(toPhoneNumber, message);
      },
      {
        ttl: 30000, // 30 second lock
        maxRetries: 2,
      }
    );

    if (!lockResult) {
      logger.warn("Failed to acquire WhatsApp send lock", {
        phoneNumber: toPhoneNumber,
        lockKey,
      });
      throw new Error(
        "Could not acquire lock for WhatsApp send - please try again"
      );
    }

    return lockResult;
  }

  /**
   * Send verification message to patient (text-based, not poll)
   */
  async sendVerificationMessage(
    phoneNumber: string,
    patientName: string
  ): Promise<WhatsAppMessageResult> {
    const message = `🏥 *PRIMA - Verifikasi WhatsApp*

Halo ${patientName}!

Apakah Anda bersedia menerima pengingat kesehatan dari PRIMA melalui WhatsApp?

*Balas dengan salah satu:*
✅ YA / SETUJU / BOLEH
❌ TIDAK / TOLAK

Pesan ini akan kadaluarsa dalam 48 jam.

Terima kasih! 💙 Tim PRIMA`;

    return await this.send(phoneNumber, message);
  }

  /**
   * Send follow-up message (15 minutes after initial reminder)
   */
  async sendFollowUpMessage(
    phoneNumber: string,
    patientName: string
  ): Promise<WhatsAppMessageResult> {
    const message = `⏰ *Follow-up: Pengingat Kesehatan*

Halo ${patientName}!

Apakah sudah menyelesaikan rutinitas kesehatan?

*Balas dengan:*
✅ SUDAH / SELESAI
⏰ BELUM (butuh waktu lebih)
🆘 BANTUAN (butuh bantuan relawan)

💙 Tim PRIMA`;

    return await this.send(phoneNumber, message);
  }

  /**
   * Send acknowledgment message after response
   */
  async sendAck(
    phoneNumber: string,
    message: string
  ): Promise<WhatsAppMessageResult> {
    return await this.send(phoneNumber, message);
  }

  /**
   * Send personalized natural language response
   */
  async sendPersonalizedResponse(
    phoneNumber: string,
    patientName: string,
    intent: string,
    response: string,
    includeSignature: boolean = true
  ): Promise<WhatsAppMessageResult> {
    let message = response;

    // Add signature if requested
    if (includeSignature) {
      message += "\n\n💙 Tim PRIMA";
    }

    return await this.send(phoneNumber, message);
  }

  /**
   * Send emergency alert to volunteers
   */
  async sendEmergencyAlert(
    patientPhone: string,
    patientName: string,
    message: string,
    priority: "urgent" | "high" | "medium" = "urgent"
  ): Promise<WhatsAppMessageResult[]> {
    // This would send to volunteer WhatsApp numbers
    // For now, just log the emergency
    const alertMessage = `🚨 DARURAT MEDIS 🚨

Pasien: ${patientName}
No. HP: ${patientPhone}
Pesan: "${message}"
Prioritas: ${priority.toUpperCase()}

Segera hubungi pasien atau koordinasikan dengan tim medis.

💙 Tim PRIMA`;

    // Emergency alerts require volunteer WhatsApp configuration
    // Implementation would send to configured volunteer numbers
    logger.warn(
      "Emergency alert system requires volunteer WhatsApp configuration",
      {
        patientPhone,
        patientName,
        priority,
        alertMessageLength: alertMessage.length,
      }
    );
    return [];
  }

  /**
   * Send follow-up message for missed reminder
   */
  async sendFollowUpReminder(
    phoneNumber: string,
    patientName: string,
    reminderMessage: string
  ): Promise<WhatsAppMessageResult> {
    const message = `⏰ *Follow-up: Pengingat*

Halo ${patientName}!

Kami ingin memastikan Anda sudah mengikuti pengingat: "${reminderMessage}"

Apakah sudah dilakukan? Balas "SUDAH" atau "BELUM".

Jika ada kendala, jangan ragu untuk menghubungi kami.

💙 Tim PRIMA`;

    return await this.send(phoneNumber, message);
  }
}
