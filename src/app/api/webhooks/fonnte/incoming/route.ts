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

interface WebhookBody {
  sender?: string;
  phone?: string;
  from?: string;
  number?: string;
  wa_number?: string;
  message?: string;
  text?: string;
  body?: string;
  id?: string;
  message_id?: string;
  msgId?: string;
  timestamp?: string | number;
  time?: string | number;
  created_at?: string | number;
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

function normalizeIncoming(body: WebhookBody) {
  const sender =
    body.sender || body.phone || body.from || body.number || body.wa_number;
  const message = body.message || body.text || body.body;
  const device = body.device || body.gateway || body.instance;
  const name = body.name || body.sender_name || body.contact_name;
  const id = body.id || body.message_id || body.msgId;
  const timestamp = body.timestamp || body.time || body.created_at;

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
  const idemKey = `webhook:fonnte:incoming:${fallbackId}`;
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
    const parsed = (body || {}) as Record<string, unknown>;
    
    // Log raw payload for debugging
    logger.info('📥 Webhook payload received', {
      contentType: request.headers.get('content-type'),
      hasData: Object.keys(parsed).length > 0,
      keys: Object.keys(parsed),
      senderPreview: parsed.sender || parsed.phone || parsed.from || 'no sender'
    });

    // Check if this is a message status update (no sender, but has id and status)
    if (!parsed.sender && !parsed.phone && !parsed.from && parsed.id && (parsed.status || parsed.state)) {
      // Handle message status update
      return await handleMessageStatusUpdate(parsed);
    }

    // Handle incoming message (patient response)
    const normalized = normalizeIncoming(parsed);
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

    logger.info("Fonnte incoming webhook received", {
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

// Handle message status updates (sent/delivered/failed)
async function handleMessageStatusUpdate(parsed: Record<string, unknown>) {
  // Normalize status data
  const id = String((parsed.id as string) || (parsed.message_id as string) || (parsed.msgId as string) || '');
  const status = (parsed.status as string) || (parsed.state as string);
  const reason = parsed.reason as string;
  const timestamp = (parsed.timestamp as string | number) || (parsed.time as string | number) || (parsed.updated_at as string | number);

  logger.info('Message status update received', {
    id,
    status,
    reason,
    timestamp
  });

  // Check for duplicate status updates
  const idemKey = `webhook:fonnte:message-status:${hashFallbackId([id, String(timestamp || '')])}`;
  if (await isDuplicateEvent(idemKey)) {
    return { ok: true, duplicate: true, type: 'message_status' };
  }

  // Map status to enum
  const mapped = mapStatusToEnum(status);
  if (!mapped) {
    return { ok: true, ignored: true, type: 'message_status', reason: 'unmapped_status' };
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
      .where(eq(reminders.fonnteMessageId, id))
      .limit(1);

    const updates = { status: mapped! };
    if (mapped === 'FAILED' && reason) {
      logger.warn('Fonnte message failed', { id, reason });
    }

    await db.update(reminders).set(updates).where(eq(reminders.fonnteMessageId, id));
    logger.info('Updated reminder log status from webhook', { id, mapped });

    // Invalidate cache if we have patientId
    if (logData.length > 0) {
      await del(CACHE_KEYS.reminderStats(logData[0].patientId));
    }

    return { ok: true, processed: true, type: 'message_status' };

  } catch (error) {
    logger.error('Failed to update message status', error as Error, { id, status });
    throw new Error('Failed to update message status');
  }
}

function mapStatusToEnum(status?: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  const s = (status || '').toLowerCase()
  if (!s) return null
  if (['sent', 'queued'].includes(s)) return 'SENT'
  if (['delivered', 'read', 'opened', 'received'].includes(s)) return 'DELIVERED'
  if (['failed', 'error', 'undelivered'].includes(s)) return 'FAILED'
  return null
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
    return { ok: true, route: "fonnte/incoming", mode };
  }
);