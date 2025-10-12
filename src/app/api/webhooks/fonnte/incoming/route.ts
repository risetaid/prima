import { NextRequest } from "next/server";
import { z } from "zod";
import { requireWebhookToken } from "@/lib/webhook-auth";
import { isDuplicateEvent, hashFallbackId } from "@/lib/idempotency";
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
    // Parse webhook body
    const { parsed, contentType } = await parseWebhookBody(request);

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