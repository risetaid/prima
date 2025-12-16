// WhatsApp Messaging Service - centralizes WA message building and sending
// Uses GOWA (go-whatsapp-web-multidevice) as the WhatsApp provider
import {
  sendWhatsAppMessage,
  formatWhatsAppNumber,
  WhatsAppMessageResult,
} from "@/lib/gowa";
import { ValidatedContent } from "@/services/reminder/reminder.types";
import { logger } from "@/lib/logger";
import { whatsAppRateLimiter } from "@/services/rate-limit.service";
import { formatContentForWhatsApp, ContentItem } from "@/lib/content-formatting";

export class WhatsAppService {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000; // 1 second base delay

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Jitter prevents synchronized retries under load (thundering herd)
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    // Add 50-100% jitter to prevent synchronized retries
    const jitter = 0.5 + Math.random() * 0.5;
    return Math.round(baseDelay * jitter);
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
        const delayMs = this.calculateRetryDelay(attempt);
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

  buildMessage(baseMessage: string, attachments: ValidatedContent[]): string {
    return formatContentForWhatsApp(baseMessage, attachments as unknown as ContentItem[]);
  }

  async send(toPhoneNumber: string, message: string) {
    logger.info("Attempting to send WhatsApp message", {
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

    // Send with retry logic (rate limiter prevents concurrent sends)
    return await this.sendWithRetry(toPhoneNumber, message);
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

*Balas dengan SALAH SATU kata ini saja:*
✅ *YA*
❌ *TIDAK*

⚠️ PENTING: Hanya balas dengan kata *YA* atau *TIDAK* saja (tanpa kata lain)

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
