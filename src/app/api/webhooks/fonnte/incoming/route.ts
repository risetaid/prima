import { NextRequest } from "next/server";
import { z } from "zod";
import { requireWebhookToken } from "@/lib/webhook-auth";
import { isDuplicateEvent, hashFallbackId } from "@/lib/idempotency";
import { db, reminders } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import type { Patient } from "@/db";
import { patientResponseRateLimiter } from "@/services/rate-limit.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { ConversationStateService } from "@/services/conversation-state.service";
import { logger } from "@/lib/logger";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { KeywordMatcherService } from "@/services/keyword-matcher.service";
import { SimpleVerificationService } from "@/services/verification/simple-verification.service";
import { createApiHandler } from "@/lib/api-helpers";


interface WebhookBody {
  sender?: string;
  phone?: string;
  from?: string;
  number?: string;
  wa_number?: string;
  message?: string;
  text?: string;
  body?: string;
  device?: string;
  gateway?: string;
  instance?: string;
  name?: string;
  sender_name?: string;
  contact_name?: string;
  id?: string;
  message_id?: string;
  msgId?: string;
  timestamp?: string | number;
  time?: string | number;
  created_at?: string | number;
  [key: string]: unknown;
}

const whatsappService = new WhatsAppService();
const conversationService = new ConversationStateService();
const keywordMatcher = new KeywordMatcherService();
const simpleVerificationService = new SimpleVerificationService();

// Custom authentication function for webhook
async function verifyWebhookToken(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) {
    throw new Error("Unauthorized webhook");
  }
  return null; // No user object for webhooks
}

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

function normalizeIncoming(body: WebhookBody) {
  const sender =
    body.sender || body.phone || body.from || body.number || body.wa_number;
  const message = body.message || body.text || body.body;
  const device = body.device || body.gateway || body.instance;
  const name = body.name || body.sender_name || body.contact_name;
  const id = body.id || body.message_id || body.msgId;
  const timestamp = body.timestamp || body.time || body.created_at;

  const normalized = {
    sender,
    message,
    device,
    name,
    id,
    timestamp,
  };

  // Log normalization for debugging
  logger.info("Webhook normalization result", {
    sender: Boolean(sender),
    message: Boolean(message),
    originalKeys: Object.keys(body || {}),
    normalizedKeys: Object.keys(normalized).filter(
      (key) => normalized[key as keyof typeof normalized]
    ),
  });

  return normalized;
}





async function sendAck(phoneNumber: string, message: string) {
  try {
    await whatsappService.sendAck(phoneNumber, message);
  } catch (e) {
    logger.warn("Failed to send ACK via WhatsApp", { error: e as Error });
  }
}

async function parseWebhookBody(request: NextRequest) {
  let parsed: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      parsed = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      form.forEach((v, k) => {
        parsed[k] = v;
      });
    } else {
      const text = await request.text();
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }
    }
  } catch { }
  return { parsed, contentType };
}

function logWebhookPayload(
  parsed: WebhookBody,
  request: NextRequest,
  contentType: string
) {
  logger.info("Raw Fonnte webhook payload received", {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    contentType,
    headers: Object.fromEntries(request.headers.entries()),
    queryParams: Object.fromEntries(
      new URL(request.url).searchParams.entries()
    ),
    rawPayload: parsed,
    payloadKeys: Object.keys(parsed || {}),
    payloadValues: Object.entries(parsed || {}).reduce((acc, [key, value]) => {
      acc[key] =
        typeof value === "string"
          ? value.substring(0, 100) + (value.length > 100 ? "..." : "")
          : value;
      return acc;
    }, {} as Record<string, unknown>),
    messageFields: {
      message: Boolean(parsed.message),
      text: Boolean(parsed.text),
      body: Boolean(parsed.body),
      sender: Boolean(parsed.sender || parsed.phone || parsed.from),
      device: Boolean(parsed.device || parsed.gateway),
    },
  });
}

async function validateAndNormalizePayload(parsed: WebhookBody) {
  const normalized = normalizeIncoming(parsed);
  const result = IncomingSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`Invalid payload: ${JSON.stringify(result.error.flatten())}`);
  }
  return result.data;
}

async function checkIdempotency(data: {
  id?: string;
  sender: string;
  timestamp?: string | number;
  message: string;
}) {
  const fallbackId = hashFallbackId([
    data.id,
    data.sender,
    String(data.timestamp || ""),
    data.message,
  ]);
  const idemKey = `webhook:fonnte:incoming:${fallbackId}`;
  if (await isDuplicateEvent(idemKey)) {
    return { ok: true, duplicate: true };
  }
  return null;
}

async function findPatient(sender: string, parsed: WebhookBody) {
  const lookup = new PatientLookupService();
  const found = await lookup.findPatientByPhone(sender);
  if (!found.found || !found.patient) {
    logger.warn("Incoming webhook: no patient matched; ignoring", {
      sender,
      normalizedSender: sender,
      allPayloadFields: Object.keys(parsed || {}),
      senderFields: {
        sender: parsed.sender,
        phone: parsed.phone,
        from: parsed.from,
        number: parsed.number,
        wa_number: parsed.wa_number,
      },
    });
    return {
      ok: true,
      ignored: true,
      reason: "no_patient_match",
    };
  }
  return found.patient;
}

async function recordPatientResponse(
  patient: Patient,
  sender: string,
  message: string,
  context: {
    source: 'verification' | 'reminder_confirmation' | 'general';
    intent?: string;
    confidence?: number;
    relatedEntityId?: string;
    relatedEntityType?: 'reminder' | 'verification' | null;
    processingTimeMs?: number;
    responseClassification?: 'accepted' | 'declined' | 'confirmed' | 'missed' | 'unrecognized';
  }
) {
  try {
    const conv = new ConversationStateService();
    
    // Determine appropriate conversation state
    const conversationContext = context.source === 'verification' ? 'verification' : 
                              context.source === 'reminder_confirmation' ? 'reminder_confirmation' : 
                              'general_inquiry';

    const state = await conv.getOrCreateConversationState(
      patient.id,
      sender,
      conversationContext
    );

    // Classify message type accurately
    const messageType = context.source === 'verification' ? 'verification' :
                      context.source === 'reminder_confirmation' ? 'confirmation' : 
                      'general';

    await conv.addMessage(state.id, {
      message: message,
      direction: "inbound",
      messageType: messageType,
      intent: context.intent,
      confidence: context.confidence,
      processedAt: new Date(),
    });

    logger.info('Patient response recorded', {
      patientId: patient.id,
      source: context.source,
      messageType,
      intent: context.intent,
      confidence: context.confidence,
      processingTimeMs: context.processingTimeMs,
      classification: context.responseClassification
    });

  } catch (error) {
    logger.error('Failed to record patient response', error as Error, {
      patientId: patient.id,
      source: context.source,
      message: message.substring(0, 50)
    });
  }
}



async function handleUnrecognizedMessage(
  message: string | undefined,
  patient: Patient
) {
  // Record unrecognized message response
  if (message) {
    try {
      await recordPatientResponse(patient, patient.phoneNumber, message, {
        source: 'general',
        intent: 'unrecognized',
        confidence: 0,
        processingTimeMs: 0,
        responseClassification: 'unrecognized'
      })
    } catch (error) {
      logger.warn('Failed to record unrecognized message', {
        patientId: patient.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  logger.info("Sending unrecognized message response", {
    patientId: patient.id,
    verificationStatus: patient.verificationStatus,
    messageType:
      patient.verificationStatus === "PENDING"
        ? "verification_clarification"
        : "generic_thanks",
    messagePreview: message
      ? message.substring(0, 50) + (message.length > 50 ? "..." : "")
      : "no message",
  });

  if (patient.verificationStatus === "PENDING") {
    await sendAck(
      patient.phoneNumber,
      `Halo ${patient.name}, mohon balas pesan verifikasi dengan:\n\n✅ *YA* atau *SETUJU* untuk menerima pengingat\n❌ *TIDAK* atau *TOLAK* untuk menolak\n\nTerima kasih! 💙 Tim PRIMA`
    );
  } else if (patient.verificationStatus === "VERIFIED") {
    await sendAck(
      patient.phoneNumber,
      `Halo ${patient.name}, terima kasih atas pesannya.\n\nJika ada pertanyaan tentang obat, hubungi relawan PRIMA.\n\n💙 Tim PRIMA`
    );
  }
}

export const POST = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false } // Disable rate limiting for webhooks
  },
  async (body, { request }) => {
    // Parse webhook body with custom parsing function
    const { parsed, contentType } = await parseWebhookBody(request);
    logWebhookPayload(parsed, request, contentType);

    const validationResult = await validateAndNormalizePayload(parsed);
    if (validationResult instanceof Response) {
      throw new Error("Invalid webhook payload");
    }

    const { sender, message, device, id, timestamp } = validationResult;

    const duplicateCheck = await checkIdempotency({
      id,
      sender,
      timestamp,
      message,
    });
    if (duplicateCheck) {
      return { ok: true, duplicate: true };
    }

    logger.info("Fonnte incoming webhook received", {
      sender,
      device,
      hasId: Boolean(id),
      messagePreview: message
        ? message.substring(0, 50) + (message.length > 50 ? "..." : "")
        : "no message",
    });

    const patientResult = await findPatient(sender, parsed);
    if (patientResult instanceof Response) {
      return { ok: true, ignored: true, reason: "no_patient_match" };
    }
    const patient = patientResult as Patient;

    logger.info("Patient found for incoming message", {
      patientId: patient.id,
      patientName: patient.name,
      verificationStatus: patient.verificationStatus,
      messagePreview: message
        ? message.substring(0, 50) + (message.length > 50 ? "..." : "")
        : "no message",
    });

    // DEBUG: Log verification processing conditions
    logger.info("Verification processing debug", {
      patientId: patient.id,
      verificationStatus: patient.verificationStatus,
      message: message?.substring(0, 100),
      hasMessage: !!message,
    });

    // Check patient response rate limiting
    const rateLimitResult =
      await patientResponseRateLimiter.checkPatientResponseRateLimit(patient.id);
    if (!rateLimitResult.allowed) {
      logger.warn("Patient response rate limit exceeded", {
        patientId: patient.id,
        phoneNumber: sender,
        rateLimitResult,
      });
      return {
        ok: true,
        processed: false,
        action: "rate_limited",
        message:
          "Too many responses - please wait before sending another message",
      };
    }



    // 🔹 PRIORITY 1: Check for active context (HIGHEST PRIORITY)
    const activeContext = await conversationService.getActiveContext(patient.id);

    logger.info("Context check for patient", {
      patientId: patient.id,
      activeContext,
      verificationStatus: patient.verificationStatus,
    });

    // Check if this is a verification or reminder response that should bypass LLM
    if (activeContext) {
      logger.info('Active context detected - using strict keyword matching', {
        patientId: patient.id,
        activeContext,
        message: message?.substring(0, 100)
      })

      // Get conversation state
      const conversationState = await conversationService.findByPhoneNumber(patient.phoneNumber)

      if (!conversationState) {
        logger.error('Conversation state not found for active context', undefined, {
          patientId: patient.id,
          activeContext
        })
        throw new Error('Invalid state');
      }

      // 🚫 BLOCK LLM - Use simple verification service
      if (activeContext === 'verification') {
        logger.info("Processing verification response via active context", {
          patientId: patient.id,
          message: message?.substring(0, 50),
          activeContext,
        });

        const startTime = Date.now()
        const result = await simpleVerificationService.processResponse(message || '', patient.id)
        const processingTimeMs = Date.now() - startTime

        // Record verification response with proper context
        await recordPatientResponse(patient, sender, message || '', {
          source: 'verification',
          intent: result.action === 'verified' ? 'verification_accept' : 'verification_decline',
          confidence: 100, // Keyword matching is 100% confident
          relatedEntityId: patient.id,
          relatedEntityType: 'verification',
          processingTimeMs,
          responseClassification: result.action === 'verified' ? 'accepted' : 'declined'
        })

        logger.info("Verification response processed", {
          patientId: patient.id,
          action: result.action,
          success: result.processed,
          processingTimeMs
        });

        return {
          ok: true,
          processed: true,
          action: result.action,
          source: 'simple_verification',
          message: result.message
        }
      }

      if (activeContext === 'reminder_confirmation') {
        const confirmationMatch = keywordMatcher.matchConfirmation(message || '')

        if (confirmationMatch === 'done' || confirmationMatch === 'not_yet') {
          const relatedReminderId = conversationState.relatedEntityId

          if (relatedReminderId && conversationState.relatedEntityType === 'reminder') {
            // Record reminder confirmation response
            await recordPatientResponse(patient, sender, message || '', {
              source: 'reminder_confirmation',
              intent: confirmationMatch === 'done' ? 'reminder_confirmed' : 'reminder_missed',
              confidence: 100, // Exact keyword match
              relatedEntityId: relatedReminderId,
              relatedEntityType: 'reminder',
              processingTimeMs: 0, // Keyword matching is very fast
              responseClassification: confirmationMatch === 'done' ? 'confirmed' : 'missed'
            })

            if (confirmationMatch === 'done') {
              await db.update(reminders)
                .set({
                  status: 'DELIVERED',
                  confirmationStatus: 'CONFIRMED',
                  confirmationResponse: message,
                  confirmationResponseAt: new Date()
                })
                .where(eq(reminders.id, relatedReminderId))

              try {
                await whatsappService.sendAck(
                  patient.phoneNumber,
                  `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai.\n\n💙 Tim PRIMA`
                )

                logger.info('Confirmation acknowledgment sent', {
                  patientId: patient.id,
                  reminderId: relatedReminderId,
                  source: 'active_context_reminder_confirmation'
                })
              } catch (error) {
                logger.error('Failed to send confirmation acknowledgment', error as Error, {
                  patientId: patient.id,
                  reminderId: relatedReminderId,
                  phoneNumber: patient.phoneNumber
                })
                // Don't fail the whole operation if ACK fails
              }

              await conversationService.clearContext(patient.id)

              return {
                ok: true,
                processed: true,
                action: 'confirmed',
                source: 'reminder_confirmation'
              }
            } else {
              await db.update(reminders)
                .set({
                  status: 'SENT',
                  confirmationStatus: 'MISSED',
                  confirmationResponse: message,
                  confirmationResponseAt: new Date()
                })
                .where(eq(reminders.id, relatedReminderId))

              try {
                await whatsappService.sendAck(
                  patient.phoneNumber,
                  `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\n💙 Tim PRIMA`
                )

                logger.info('Not-yet acknowledgment sent', {
                  patientId: patient.id,
                  reminderId: relatedReminderId,
                  source: 'active_context_reminder_confirmation'
                })
              } catch (error) {
                logger.error('Failed to send not-yet acknowledgment', error as Error, {
                  patientId: patient.id,
                  reminderId: relatedReminderId,
                  phoneNumber: patient.phoneNumber
                })
                // Don't fail the whole operation if ACK fails
              }

              await conversationService.clearContext(patient.id)

              return {
                ok: true,
                processed: true,
                action: 'not_yet',
                source: 'reminder_confirmation'
              }
            }
          }
        }

        await whatsappService.sendAck(
          patient.phoneNumber,
          `Halo ${patient.name}, mohon balas dengan:\n\n✅ *SUDAH* untuk konfirmasi\n❌ *BELUM* untuk belum selesai\n\n💙 Tim PRIMA`
        )

        return {
          ok: true,
          processed: true,
          action: 'clarification_sent',
          source: 'reminder_confirmation'
        }
      }
    }

    // 🔹 PRIORITY 2: Fallback verification service for expired context
    // If patient is pending verification but context expired, still use simple verification service
    if (patient.verificationStatus === 'PENDING' && !activeContext) {
      logger.info('Fallback verification service - context expired but status pending', {
        patientId: patient.id,
        message: message?.substring(0, 50),
        operation: 'fallback_verification'
      })

      const startTime = Date.now()
      const result = await simpleVerificationService.processResponse(message || '', patient.id)
      const processingTimeMs = Date.now() - startTime

      // Record fallback verification response
      await recordPatientResponse(patient, sender, message || '', {
        source: 'verification',
        intent: result.action === 'verified' ? 'verification_accept' : 'verification_decline',
        confidence: 100, // Keyword matching is 100% confident
        relatedEntityId: patient.id,
        relatedEntityType: 'verification',
        processingTimeMs,
        responseClassification: result.action === 'verified' ? 'accepted' : 'declined'
      })

      logger.info("Fallback verification response processed", {
        patientId: patient.id,
        action: result.action,
        success: result.processed,
        processingTimeMs
      });

      return {
        ok: true,
        processed: true,
        action: result.action,
        source: 'fallback_verification',
        message: result.message
      }
    }

    // 🔹 PRIORITY 3: No active context - Check for simple reminder responses
    logger.info('No active context - checking for simple responses', {
      patientId: patient.id,
      message: message?.substring(0, 100),
      verificationStatus: patient.verificationStatus
    })

    // Check if patient has pending reminders and might be responding to one
    if (patient.verificationStatus === 'VERIFIED' && message) {
      logger.info('Patient is VERIFIED, attempting keyword match', {
        patientId: patient.id,
        message: message,
        messageLength: message.length
      })

      // Try to match simple confirmation keywords (SUDAH/BELUM)
      const confirmationMatch = keywordMatcher.matchConfirmation(message)

      logger.info('Keyword match result', {
        patientId: patient.id,
        message: message,
        confirmationMatch,
        isValid: confirmationMatch !== 'invalid'
      })

      if (confirmationMatch !== 'invalid') {
        // Find the most recent pending reminder for this patient
        const recentReminder = await db
          .select()
          .from(reminders)
          .where(and(
            eq(reminders.patientId, patient.id),
            eq(reminders.status, 'SENT')
          ))
          .orderBy(desc(reminders.sentAt))
          .limit(1)

        logger.info('Database query for recent reminder', {
          patientId: patient.id,
          foundReminders: recentReminder.length,
          reminderIds: recentReminder.map(r => r.id),
          reminderStatuses: recentReminder.map(r => r.status),
          sentAts: recentReminder.map(r => r.sentAt)
        })

        if (recentReminder.length > 0) {
          const reminder = recentReminder[0]

          logger.info('Processing simple reminder confirmation', {
            patientId: patient.id,
            reminderId: reminder.id,
            confirmationMatch,
            message: message?.substring(0, 50)
          })

          // Record simple reminder response
          await recordPatientResponse(patient, sender, message || '', {
            source: 'reminder_confirmation',
            intent: confirmationMatch === 'done' ? 'reminder_confirmed' : 'reminder_missed',
            confidence: 100, // Exact keyword match
            relatedEntityId: reminder.id,
            relatedEntityType: 'reminder',
            processingTimeMs: 0, // Keyword matching is very fast
            responseClassification: confirmationMatch === 'done' ? 'confirmed' : 'missed'
          })

          // Handle simple confirmation directly
          if (confirmationMatch === 'done') {
            // Update reminder as confirmed
            await db.update(reminders)
              .set({
                status: 'DELIVERED',
                confirmationStatus: 'CONFIRMED',
                confirmationResponse: message,
                confirmationResponseAt: new Date()
              })
              .where(eq(reminders.id, reminder.id))

            try {
              await whatsappService.sendAck(
                patient.phoneNumber,
                `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai.\n\n💙 Tim PRIMA`
              )

              logger.info('Confirmation acknowledgment sent', {
                patientId: patient.id,
                reminderId: reminder.id,
                source: 'simple_reminder_confirmation'
              })
            } catch (error) {
              logger.error('Failed to send confirmation acknowledgment', error as Error, {
                patientId: patient.id,
                reminderId: reminder.id,
                phoneNumber: patient.phoneNumber
              })
              // Don't fail the whole operation if ACK fails
            }

            return {
              ok: true,
              processed: true,
              action: 'confirmed',
              source: 'simple_reminder_confirmation'
            }
          } else if (confirmationMatch === 'not_yet') {
            // Update reminder response but keep status as SENT
            await db.update(reminders)
              .set({
                status: 'SENT',
                confirmationStatus: 'MISSED',
                confirmationResponse: message,
                confirmationResponseAt: new Date()
              })
              .where(eq(reminders.id, reminder.id))

            try {
              await whatsappService.sendAck(
                patient.phoneNumber,
                `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\nKami akan mengingatkan lagi nanti.\n\n💙 Tim PRIMA`
              )

              logger.info('Not-yet acknowledgment sent', {
                patientId: patient.id,
                reminderId: reminder.id,
                source: 'simple_reminder_confirmation'
              })
            } catch (error) {
              logger.error('Failed to send not-yet acknowledgment', error as Error, {
                patientId: patient.id,
                reminderId: reminder.id,
                phoneNumber: patient.phoneNumber
              })
              // Don't fail the whole operation if ACK fails
            }

            return {
              ok: true,
              processed: true,
              action: 'not_yet',
              source: 'simple_reminder_confirmation'
            }
          }
        }
      }
    }

    // 🔹 PRIORITY 4: Fallback for unrecognized messages
    await handleUnrecognizedMessage(message || '', patient)

    return { ok: true, processed: true, action: 'fallback' }
  }
);

export const GET = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false } // Disable rate limiting for webhooks
  },
  async (body, { request }) => {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "ping";
    return { ok: true, route: "fonnte/incoming", mode };
  }
);
