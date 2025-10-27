import { NextRequest } from "next/server";
import { z } from "zod";
import { requireWebhookToken } from "@/lib/webhook-auth";
import { isDuplicateEvent, hashFallbackId } from "@/lib/idempotency";
import { db } from "@/db";
import { SimpleConfirmationService } from "@/services/simple-confirmation.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { SimpleVerificationService } from "@/services/verification/simple-verification.service";
import { logger } from "@/lib/logger";
import { createApiHandler } from "@/lib/api-helpers";

// Official WAHA webhook structure (see: https://waha.devlike.pro/docs/how-to/events/)
interface WahaWebhookEnvelope {
  id?: string; // Event ID
  timestamp?: number; // Event timestamp
  event?: string; // Event type: "message", "message.ack", etc.
  session?: string; // Session name
  payload?: WahaMessagePayload; // The actual message data
  me?: {
    id: string;
    pushName: string;
  };
  environment?: {
    tier: string;
    version: string;
  };
  engine?: string;
  [key: string]: unknown;
}

interface WahaMessagePayload {
  id?: string; // Message ID
  timestamp?: number;
  from?: string; // Format: 628xxxxxxxxxx@c.us
  fromMe?: boolean; // Critical: filter out our own messages
  to?: string;
  body?: string; // Message text
  source?: string; // "api" or "app"
  hasMedia?: boolean;
  ack?: number; // -1=ERROR, 1=SERVER, 2=DEVICE, 3=READ, 4=PLAYED
  pushName?: string;
  [key: string]: unknown;
}

// Legacy flat structure for backwards compatibility
interface WebhookBody {
  from?: string;
  chatId?: string;
  sender?: string;
  phone?: string;
  number?: string;
  text?: string;
  message?: string;
  body?: string;
  messageId?: string;
  id?: string;
  message_id?: string;
  msgId?: string;
  timestamp?: string | number;
  time?: string | number;
  created_at?: string | number;
  pushName?: string;
  name?: string;
  device?: string;
  [key: string]: unknown;
}

const simpleConfirmationService = new SimpleConfirmationService();
const patientLookup = new PatientLookupService();
const simpleVerificationService = new SimpleVerificationService();

// Custom authentication function for webhook
async function verifyWebhookToken(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) {
    throw new Error("Unauthorized webhook");
  }
  return null;
}

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

function normalizeIncoming(envelope: WahaWebhookEnvelope) {
  // WAHA wraps message data in payload object
  // See: https://waha.devlike.pro/docs/how-to/events/
  const payload = envelope.payload;

  if (!payload) {
    // Fallback for legacy flat structure (shouldn't happen with WAHA)
    const legacy = envelope as unknown as WebhookBody;
    let sender = legacy.from || legacy.chatId || legacy.sender || legacy.phone || legacy.number;
    if (sender?.includes('@c.us')) {
      sender = sender.replace('@c.us', '');
    }
    return {
      sender,
      message: legacy.text || legacy.message || legacy.body,
      device: envelope.session || legacy.device,
      name: legacy.pushName || legacy.name,
      id: legacy.messageId || legacy.id || legacy.message_id,
      timestamp: legacy.timestamp || legacy.time,
    };
  }

  // Extract from WAHA payload structure
  let sender = payload.from || payload.to;

  // Strip @c.us suffix (WAHA format: 628xxxxxxxxxx@c.us)
  if (sender?.includes('@c.us')) {
    sender = sender.replace('@c.us', '');
  }

  const message = payload.body;
  const device = envelope.session;
  const name = payload.pushName;
  const id = payload.id;
  const timestamp = payload.timestamp || envelope.timestamp;

  return {
    sender,
    message,
    device,
    name,
    id,
    timestamp,
  };
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
  const idemKey = `webhook:waha:incoming:${fallbackId}`;
  if (await isDuplicateEvent(idemKey)) {
    return { ok: true, duplicate: true };
  }
  return null;
}

export const POST = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false }
  },
  async (body, { request }) => {
    // Body is already parsed by createApiHandler
    const envelope = (body || {}) as WahaWebhookEnvelope;

    // Log raw payload for debugging
    logger.info('📥 WAHA webhook payload received', {
      contentType: request.headers.get('content-type'),
      event: envelope.event,
      session: envelope.session,
      hasPayload: Boolean(envelope.payload),
      payloadKeys: envelope.payload ? Object.keys(envelope.payload) : [],
      fromMe: envelope.payload?.fromMe,
      senderPreview: envelope.payload?.from || 'no sender'
    });

    // Filter 1: Only process "message" events (ignore message.ack, session.status, etc.)
    if (envelope.event && envelope.event !== 'message') {
      // Handle message acknowledgment (delivery status) separately
      if (envelope.event === 'message.ack') {
        return await handleMessageAck(envelope);
      }

      logger.info('Ignoring non-message event', { event: envelope.event });
      return { ok: true, ignored: true, reason: 'not_message_event', event: envelope.event };
    }

    // Filter 2: Skip messages sent by us (fromMe: true or source: "api")
    // This prevents infinite loops and wasted AI tokens
    if (envelope.payload?.fromMe === true || envelope.payload?.source === 'api') {
      logger.info('Ignoring outbound message', {
        fromMe: envelope.payload?.fromMe,
        source: envelope.payload?.source,
        messageId: envelope.payload?.id
      });
      return { ok: true, ignored: true, reason: 'own_message' };
    }

    // Handle incoming message (patient response)
    const normalized = normalizeIncoming(envelope);
    const validationResult = IncomingSchema.safeParse(normalized);
    if (!validationResult.success) {
      throw new Error(`Invalid payload: ${JSON.stringify(validationResult.error.flatten())}`);
    }

    const { sender, message, device, id, timestamp } = validationResult.data;

    // Check for duplicate events
    const duplicateCheck = await checkIdempotency({
      id,
      sender,
      timestamp,
      message,
    });
    if (duplicateCheck) {
      return { ok: true, duplicate: true };
    }

    logger.info("WAHA incoming webhook received", {
      sender,
      device,
      hasId: Boolean(id),
      messagePreview: message ? message.substring(0, 50) : "no message",
    });

    // Find patient
    const patientResult = await patientLookup.findPatientByPhone(sender);
    if (!patientResult.found || !patientResult.patient) {
      logger.info("No patient matched, ignoring message", { sender });
      return { ok: true, ignored: true, reason: "no_patient_match" };
    }

    const patient = patientResult.patient;

    // Check patient response rate limiting
    const { patientResponseRateLimiter } = await import("@/services/rate-limit.service");
    const rateLimitResult = await patientResponseRateLimiter.checkPatientResponseRateLimit(patient.id);
    if (!rateLimitResult.allowed) {
      logger.warn("Patient response rate limit exceeded", {
        patientId: patient.id,
        phoneNumber: sender,
      });
      return {
        ok: true,
        processed: false,
        action: "rate_limited",
      };
    }

    // Priority 1: Check verification responses for pending patients
    if (patient.verificationStatus === 'PENDING') {
      logger.info("Processing verification response", {
        patientId: patient.id,
        message: message?.substring(0, 50),
      });

      const result = await simpleVerificationService.processResponse(message, patient.id);

      return {
        ok: true,
        processed: true,
        action: result.action,
        source: 'verification',
        message: result.message
      };
    }

    // Priority 2: Process reminder confirmations for verified patients
    if (patient.verificationStatus === 'VERIFIED') {
      logger.info("Processing reminder confirmation", {
        patientId: patient.id,
        message: message?.substring(0, 50),
      });

      const result = await simpleConfirmationService.processReminderResponse(sender, message);

      // If it's not a reminder confirmation response, check if it's a general inquiry
      if (result.action === 'invalid_response') {
        logger.info("Not a reminder confirmation, checking for general inquiry", {
          patientId: patient.id,
          message: message?.substring(0, 50),
        });

        // Priority 3: Handle general health inquiries with conversational AI
        const { getAIGeneralInquiryService } = await import("@/services/ai/ai-general-inquiry.service");
        const aiGeneralInquiryService = getAIGeneralInquiryService();

        const inquiryResult = await aiGeneralInquiryService.handleInquiry(
          message,
          {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            cancerStage: patient.cancerStage,
          },
          patient.assignedVolunteerId ? {
            id: patient.assignedVolunteerId,
            name: 'Assigned Volunteer', // Could fetch actual name if needed
          } : undefined
        );

        return {
          ok: true,
          processed: true,
          action: inquiryResult.action,
          source: 'ai_general_inquiry',
          escalated: inquiryResult.action === 'escalated' || inquiryResult.action === 'emergency',
        };
      }

      return {
        ok: true,
        processed: true,
        action: result.action,
        source: 'simple_reminder_confirmation'
      };
    }

    // Default: unprocessed
    return { ok: true, processed: false, action: 'ignored' };
  }
);

// Handle message acknowledgment (delivery status) - WAHA uses message.ack event
// See: https://waha.devlike.pro/docs/how-to/events/#messageack
async function handleMessageAck(envelope: WahaWebhookEnvelope) {
  const payload = envelope.payload;
  if (!payload) {
    return { ok: true, ignored: true, type: 'message_ack', reason: 'no_payload' };
  }

  const id = payload.id;
  const ack = payload.ack; // -1=ERROR, 1=SERVER, 2=DEVICE, 3=READ, 4=PLAYED
  const timestamp = payload.timestamp || envelope.timestamp;

  logger.info('WAHA message acknowledgment received', {
    id,
    ack,
    timestamp,
    event: envelope.event
  });

  if (!id) {
    return { ok: true, ignored: true, type: 'message_ack', reason: 'no_id' };
  }

  // Check for duplicate status updates
  const idemKey = `webhook:waha:message-ack:${hashFallbackId([id, String(timestamp || ''), String(ack || '')])}`;
  if (await isDuplicateEvent(idemKey)) {
    return { ok: true, duplicate: true, type: 'message_ack' };
  }

  // Map ACK to enum
  const mapped = mapAckToEnum(ack);
  if (!mapped) {
    return { ok: true, ignored: true, type: 'message_ack', reason: 'unmapped_ack', ack };
  }

  try {
    // Update reminder status
    const { reminders } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { del, CACHE_KEYS } = await import("@/lib/cache");

    // First get the patientId for cache invalidation
    const logData = await db
      .select({ patientId: reminders.patientId })
      .from(reminders)
      .where(eq(reminders.wahaMessageId, id))
      .limit(1);

    const updates = { status: mapped! };
    if (mapped === 'FAILED') {
      logger.warn('WAHA message failed', { id, ack });
    }

    await db.update(reminders).set(updates).where(eq(reminders.wahaMessageId, id));
    logger.info('Updated reminder status from WAHA message.ack', { id, ack, mapped });

    // Invalidate cache if we have patientId
    if (logData.length > 0) {
      await del(CACHE_KEYS.reminderStats(logData[0].patientId));
    }

    return { ok: true, processed: true, type: 'message_ack' };

  } catch (error) {
    logger.error('Failed to update message ack status', error as Error, { id, ack });
    throw new Error('Failed to update message ack status');
  }
}

// Map WAHA ACK values to our status enum
// See: https://waha.devlike.pro/docs/how-to/events/#messageack
// -1 = ERROR, 1 = SERVER, 2 = DEVICE, 3 = READ, 4 = PLAYED
function mapAckToEnum(ack?: number): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  if (ack === undefined || ack === null) return null;

  if (ack === -1) return 'FAILED'; // Error
  if (ack === 1) return 'SENT'; // Server received
  if (ack === 2 || ack === 3 || ack === 4) return 'DELIVERED'; // Device, Read, or Played

  return null;
}

export const GET = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false }
  },
  async (body, { request }) => {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "ping";
    return { ok: true, route: "waha", mode };
  }
);
