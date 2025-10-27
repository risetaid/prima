// Simple Verification Service - Direct WhatsApp verification without complexity
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/waha";
import { logger } from "@/lib/logger";
import { whatsAppRateLimiter } from "@/services/rate-limit.service";
import { invalidatePatientCache } from "@/lib/cache";
import { ConversationStateService } from "@/services/conversation-state.service";
import { getAIIntentService } from "@/services/ai/ai-intent.service";

export type VerificationResponse = {
  processed: boolean;
  action: 'verified' | 'declined' | 'invalid_response';
  message: string;
};

export class SimpleVerificationService {
  private aiIntentService = getAIIntentService();
  /**
   * Send verification message to patient
   */
  async sendVerification(patientId: string, phoneNumber: string, patientName: string): Promise<boolean> {
    try {
      // Check rate limiting
      const rateLimitResult = await whatsAppRateLimiter.checkWhatsAppRateLimit(phoneNumber);
      if (!rateLimitResult.allowed) {
        logger.warn("Verification rate limit exceeded", {
          phoneNumber,
          rateLimitResult,
        });
        return false;
      }

      const message = `🏥 *PRIMA - Verifikasi WhatsApp*

Halo ${patientName}!

Apakah Anda bersedia menerima pengingat kesehatan dari PRIMA melalui WhatsApp?

*Balas dengan SALAH SATU kata ini saja:*
✅ *YA*
❌ *TIDAK*

⚠️ PENTING: Hanya balas dengan kata *YA* atau *TIDAK* saja (tanpa kata lain)

Pesan ini akan kadaluarsa dalam 48 jam.

Terima kasih! 💙 Tim PRIMA`;

      const formattedNumber = formatWhatsAppNumber(phoneNumber);
      const result = await sendWhatsAppMessage({
        to: formattedNumber,
        body: message,
      });

      if (result.success) {
        // Update patient record by ID to avoid affecting other patients with same phone
        await db
          .update(patients)
          .set({
            verificationStatus: "PENDING",
            verificationSentAt: new Date(),
            verificationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            verificationAttempts: "1",
            updatedAt: new Date(),
          })
          .where(eq(patients.id, patientId));

        // Set conversation context to verification with 48-hour expiration
        const conversationService = new ConversationStateService();
        try {
          // Get or create conversation state (may return existing with different context)
          const conversationState = await conversationService.getOrCreateConversationState(
            patientId,
            phoneNumber,
            "verification"
          );

          // Ensure the context is set to verification and extend expiration
          await conversationService.updateConversationState(conversationState.id, {
            currentContext: "verification",
            expectedResponseType: "yes_no",
            relatedEntityType: "verification",
            relatedEntityId: undefined, // Will be set when verification response is processed
            stateData: {
              verificationMessageId: `verification_${Date.now()}`,
              contextSetAt: new Date().toISOString(),
              attemptCount: 0
            },
            contextSetAt: new Date(),
            attemptCount: 0,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          });

          logger.info("Set conversation context to verification with 48h expiration", {
            patientId,
            phoneNumber,
            stateId: conversationState.id,
            previousContext: conversationState.currentContext,
          });
        } catch (error) {
          logger.warn("Failed to set verification conversation context", {
            patientId,
            phoneNumber,
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't fail the verification send if context setting fails
        }

        // Invalidate cache
await invalidatePatientCache(patientId);

        logger.info("Verification message sent successfully", {
          phoneNumber,
          messageId: result.messageId,
        });

        return true;
      } else {
        logger.error("Failed to send verification message", result.error ? new Error(result.error) : new Error("Unknown WhatsApp error"), {
          phoneNumber,
        });
        return false;
      }
    } catch (error) {
        logger.error("Error sending verification message", error instanceof Error ? error : new Error(String(error)), {
          phoneNumber,
        });
      return false;
    }
  }

  /**
   * Process verification response using simple string matching
   */
  async processResponse(message: string, patientId: string): Promise<VerificationResponse> {
    try {
      logger.info("SimpleVerificationService.processResponse called", {
        patientId,
        message: message.substring(0, 100),
        messageLength: message.length,
      });

      let action: 'verified' | 'declined' | 'invalid_response' = 'invalid_response';
      let classificationMethod: 'ai' | 'keyword' | 'none' = 'none';

      // 1. Try AI Intent Classification first
      try {
        // Get patient name for context
        const patientData = await db
          .select({ name: patients.name })
          .from(patients)
          .where(eq(patients.id, patientId))
          .limit(1);

        const patientName = patientData[0]?.name;

        logger.info("🤖 Attempting AI verification classification", {
          patientId,
          patientName,
          messagePreview: message.substring(0, 50)
        });

        const aiResult = await this.aiIntentService.classifyVerificationResponse(
          message,
          patientName
        );

        logger.info("🤖 AI verification classification result", {
          patientId,
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          confidenceLevel: aiResult.confidenceLevel,
          reasoning: aiResult.reasoning.substring(0, 100)
        });

        // Map AI intent to action if confidence is sufficient
        if (aiResult.intent === 'verification_accept' && aiResult.confidenceLevel !== 'low') {
          action = 'verified';
          classificationMethod = 'ai';
          logger.info("✅ AI classified as ACCEPT", {
            patientId,
            confidence: aiResult.confidence
          });
        } else if (aiResult.intent === 'verification_decline' && aiResult.confidenceLevel !== 'low') {
          action = 'declined';
          classificationMethod = 'ai';
          logger.info("❌ AI classified as DECLINE", {
            patientId,
            confidence: aiResult.confidence
          });
        } else {
          logger.info("🔄 AI unclear or low confidence, falling back to keywords", {
            patientId,
            intent: aiResult.intent,
            confidence: aiResult.confidence
          });
        }
      } catch (error) {
        logger.warn("⚠️ AI verification classification failed, falling back to keywords", {
          patientId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }

      // 2. Fallback to keyword matching if AI didn't provide clear result
      if (action === 'invalid_response') {
        const msg = message.toLowerCase().trim();

        // Simple keyword matching
        const acceptKeywords = ['ya', 'iya', 'yes', 'y', 'setuju', 'boleh', 'ok', 'oke'];
        const declineKeywords = ['tidak', 'no', 'n', 'tolak', 'ga', 'gak', 'engga'];

        logger.info("🔤 Using keyword fallback for verification", {
          patientId,
          message: msg,
          acceptKeywords,
          declineKeywords,
        });

        if (acceptKeywords.some(keyword => msg.includes(keyword))) {
          action = 'verified';
          classificationMethod = 'keyword';
          logger.info("✅ Keyword matched ACCEPT", {
            patientId,
            action,
            matchedKeyword: acceptKeywords.find(k => msg.includes(k))
          });
        } else if (declineKeywords.some(keyword => msg.includes(keyword))) {
          action = 'declined';
          classificationMethod = 'keyword';
          logger.info("❌ Keyword matched DECLINE", {
            patientId,
            action,
            matchedKeyword: declineKeywords.find(k => msg.includes(k))
          });
        } else {
          logger.info("❓ No keyword match, invalid response", { patientId, action });
        }
      }

      if (action === 'invalid_response') {
        // Send clarification message
        const patient = await db
          .select({ name: patients.name, phoneNumber: patients.phoneNumber })
          .from(patients)
          .where(eq(patients.id, patientId))
          .limit(1);

        if (patient[0]) {
          const clarificationMessage = `Halo ${patient[0].name}, mohon balas dengan jelas:

✅ *YA* atau *SETUJU* untuk menerima pengingat
❌ *TIDAK* atau *TOLAK* untuk menolak

Terima kasih! 💙 Tim PRIMA`;

          await sendWhatsAppMessage({
            to: formatWhatsAppNumber(patient[0].phoneNumber),
            body: clarificationMessage,
          });
        }

        return {
          processed: true,
          action: 'invalid_response',
          message: "Invalid response - clarification sent",
        };
      }

      // Update patient status
      const status = action === 'verified' ? 'VERIFIED' : 'DECLINED';

      logger.info("Updating patient verification status in database", {
        patientId,
        newStatus: status,
        action,
        classificationMethod, // Track whether AI or keyword was used
      });

      const updateResult = await db
        .update(patients)
        .set({
          verificationStatus: status,
          verificationResponseAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patientId));

      logger.info("Database update completed", {
        patientId,
        updateResult,
        status,
      });

      // Invalidate cache
      await invalidatePatientCache(patientId);

      // Send acknowledgment
      const patient = await db
        .select({ name: patients.name, phoneNumber: patients.phoneNumber })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (patient[0]) {
        const ackMessage = action === 'verified'
          ? `Terima kasih ${patient[0].name}! ✅\n\nAnda akan menerima pengingat dari relawan PRIMA.\n\nUntuk berhenti kapan saja, ketik: *BERHENTI*\n\n💙 Tim PRIMA`
          : `Baik ${patient[0].name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏\n\n💙 Tim PRIMA`;

        await sendWhatsAppMessage({
          to: formatWhatsAppNumber(patient[0].phoneNumber),
          body: ackMessage,
        });
      }

      // Clear conversation context after successful verification
      try {
        const conversationService = new ConversationStateService();
        await conversationService.clearContext(patientId);
        logger.info("Cleared conversation context after verification", {
          patientId,
          action
        });
      } catch (contextError) {
        logger.warn("Failed to clear context after verification", {
          patientId,
          error: contextError instanceof Error ? contextError.message : String(contextError)
        });
        // Don't fail the verification if context clearing fails
      }

      logger.info("Verification response processed successfully", {
        patientId,
        action,
        message: message.substring(0, 50),
      });

      return {
        processed: true,
        action,
        message: `Patient ${action} via simple verification`,
      };
    } catch (error) {
      logger.error("Error processing verification response", error instanceof Error ? error : new Error(String(error)), {
        patientId,
      });
      return {
        processed: false,
        action: 'invalid_response',
        message: "Error processing response",
      };
    }
  }
}