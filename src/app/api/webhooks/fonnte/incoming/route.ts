import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: "Invalid payload", issues: result.error.flatten() },
      { status: 400 }
    );
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
    return NextResponse.json({ ok: true, duplicate: true });
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
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "no_patient_match",
    });
  }
  return found.patient;
}

async function logConversation(
  patient: Patient,
  sender: string,
  message: string | undefined
) {
  try {
    const conv = new ConversationStateService();
    const state = await conv.getOrCreateConversationState(
      patient.id,
      sender,
      "general_inquiry"
    );
    await conv.addMessage(state.id, {
      message: message || "",
      direction: "inbound",
      messageType: "general",
      intent: undefined,
      confidence: undefined,
      processedAt: new Date(),
    });
  } catch { }
}

async function handleUnrecognizedMessage(
  message: string | undefined,
  patient: Patient
) {
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

export async function POST(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;

  const { parsed, contentType } = await parseWebhookBody(request);
  logWebhookPayload(parsed, request, contentType);

  const validationResult = await validateAndNormalizePayload(parsed);
  if (validationResult instanceof NextResponse) return validationResult;

  const { sender, message, device, id, timestamp } = validationResult;

  const duplicateCheck = await checkIdempotency({
    id,
    sender,
    timestamp,
    message,
  });
  if (duplicateCheck) return duplicateCheck;

  logger.info("Fonnte incoming webhook received", {
    sender,
    device,
    hasId: Boolean(id),
    messagePreview: message
      ? message.substring(0, 50) + (message.length > 50 ? "..." : "")
      : "no message",
  });

  const patientResult = await findPatient(sender, parsed);
  if (patientResult instanceof NextResponse) return patientResult;
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
    return NextResponse.json({
      ok: true,
      processed: false,
      action: "rate_limited",
      message:
        "Too many responses - please wait before sending another message",
    });
  }

  await logConversation(patient, sender, message || "");

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
      return NextResponse.json({ error: 'Invalid state' }, { status: 500 })
    }

    // 🚫 BLOCK LLM - Use simple verification service
    if (activeContext === 'verification') {
      logger.info("Processing verification response via active context", {
        patientId: patient.id,
        message: message?.substring(0, 50),
        activeContext,
      });

      const result = await simpleVerificationService.processResponse(message || '', patient.id)

      logger.info("Verification response processed", {
        patientId: patient.id,
        action: result.action,
        success: result.processed,
      });

      return NextResponse.json({
        ok: true,
        processed: true,
        action: result.action,
        source: 'simple_verification',
        message: result.message
      })
    }

    if (activeContext === 'reminder_confirmation') {
      const confirmationMatch = keywordMatcher.matchConfirmation(message || '')
      
      if (confirmationMatch === 'done' || confirmationMatch === 'not_yet') {
        const relatedReminderId = conversationState.relatedEntityId
        
        if (relatedReminderId && conversationState.relatedEntityType === 'reminder') {
          if (confirmationMatch === 'done') {
            await db.update(reminders)
              .set({
                status: 'DELIVERED',
                confirmationStatus: 'CONFIRMED',
                confirmationResponse: message,
                confirmationResponseAt: new Date()
              })
              .where(eq(reminders.id, relatedReminderId))

            await whatsappService.sendAck(
              patient.phoneNumber,
              `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai.\n\n💙 Tim PRIMA`
            )

            await conversationService.clearContext(patient.id)

            return NextResponse.json({
              ok: true,
              processed: true,
              action: 'confirmed',
              source: 'reminder_confirmation'
            })
          } else {
            await db.update(reminders)
              .set({
                confirmationResponse: message,
                confirmationResponseAt: new Date()
              })
              .where(eq(reminders.id, relatedReminderId))

            await whatsappService.sendAck(
              patient.phoneNumber,
              `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\n💙 Tim PRIMA`
            )

            await conversationService.clearContext(patient.id)

            return NextResponse.json({
              ok: true,
              processed: true,
              action: 'not_yet',
              source: 'reminder_confirmation'
            })
          }
        }
      }
      
      await whatsappService.sendAck(
        patient.phoneNumber,
        `Halo ${patient.name}, mohon balas dengan:\n\n✅ *SUDAH* untuk konfirmasi\n❌ *BELUM* untuk belum selesai\n\n💙 Tim PRIMA`
      )
      
      return NextResponse.json({
        ok: true,
        processed: true,
        action: 'clarification_sent',
        source: 'reminder_confirmation'
      })
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

    const result = await simpleVerificationService.processResponse(message || '', patient.id)

    logger.info("Fallback verification response processed", {
      patientId: patient.id,
      action: result.action,
      success: result.processed,
    });

    return NextResponse.json({
      ok: true,
      processed: true,
      action: result.action,
      source: 'fallback_verification',
      message: result.message
    })
  }

  // 🔹 PRIORITY 3: No active context - Check for simple reminder responses
  logger.info('No active context - checking for simple responses', {
    patientId: patient.id,
    message: message?.substring(0, 100),
    verificationStatus: patient.verificationStatus
  })

  // Check if patient has pending reminders and might be responding to one
  if (patient.verificationStatus === 'VERIFIED' && message) {
    // Try to match simple confirmation keywords (SUDAH/BELUM)
    const confirmationMatch = keywordMatcher.matchConfirmation(message)

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

      if (recentReminder.length > 0) {
        const reminder = recentReminder[0]

        logger.info('Processing simple reminder confirmation', {
          patientId: patient.id,
          reminderId: reminder.id,
          confirmationMatch,
          message: message?.substring(0, 50)
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

          await whatsappService.sendAck(
            patient.phoneNumber,
            `Terima kasih ${patient.name}! ✅\n\nPengingat sudah dikonfirmasi selesai pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n💙 Tim PRIMA`
          )

          return NextResponse.json({
            ok: true,
            processed: true,
            action: 'confirmed',
            source: 'simple_reminder_confirmation'
          })
        } else if (confirmationMatch === 'not_yet') {
          // Update reminder response but keep status as SENT
          await db.update(reminders)
            .set({
              confirmationResponse: message,
              confirmationResponseAt: new Date()
            })
            .where(eq(reminders.id, reminder.id))

          await whatsappService.sendAck(
            patient.phoneNumber,
            `Baik ${patient.name}, jangan lupa selesaikan pengingat Anda ya! 📝\n\nKami akan mengingatkan lagi nanti.\n\n💙 Tim PRIMA`
          )

          return NextResponse.json({
            ok: true,
            processed: true,
            action: 'not_yet',
            source: 'simple_reminder_confirmation'
          })
        }
      }
    }
  }

  // 🔹 PRIORITY 4: Fallback for unrecognized messages
  await handleUnrecognizedMessage(message || '', patient)

  return NextResponse.json({ ok: true, processed: true, action: 'fallback' })
}

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "ping";
  return NextResponse.json({ ok: true, route: "fonnte/incoming", mode });
}
