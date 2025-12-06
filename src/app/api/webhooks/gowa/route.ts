import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDuplicateEvent, hashFallbackId } from "@/lib/idempotency";
import { db } from "@/db";
import { SimpleConfirmationService } from "@/services/simple-confirmation.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { SimpleVerificationService } from "@/services/verification/simple-verification.service";
import { logger } from "@/lib/logger";
import { validateWebhookRequest, withTypingIndicator } from "@/lib/gowa";

// GOWA webhook payload structure
// See: https://github.com/aldinokemal/go-whatsapp-web-multidevice/blob/main/docs/webhook-payload.md

// Common fields for all webhook payloads
interface GowaWebhookBase {
  sender_id: string; // Phone number without @s.whatsapp.net (e.g., "628123456789")
  chat_id: string; // Chat identifier
  from: string; // Full JID (e.g., "628123456789@s.whatsapp.net")
  timestamp: string; // RFC3339 format (e.g., "2023-10-15T10:30:00Z")
  pushname: string; // Display name of sender
  message: {
    text: string;
    id: string; // Message ID
    replied_id: string; // ID of replied message (empty if not a reply)
    quoted_message: string;
  };
}

// Text message webhook (uses only base fields)
type GowaTextMessage = GowaWebhookBase;

// Image message webhook
interface GowaImageMessage extends GowaWebhookBase {
  image: {
    media_path: string;
    mime_type: string;
    caption: string;
  };
}

// Message acknowledgment (delivered/read receipts)
interface GowaMessageAck {
  event: "message.ack";
  payload: {
    chat_id: string;
    from: string;
    ids: string[];
    receipt_type: "delivered" | "read" | "played";
    receipt_type_description: string;
    sender_id: string;
  };
  timestamp: string;
}

// Protocol messages (revoke, edit)
interface GowaMessageRevoked extends GowaWebhookBase {
  action: "message_revoked";
  revoked_chat: string;
  revoked_from_me: boolean;
  revoked_message_id: string;
}

interface GowaMessageEdited extends GowaWebhookBase {
  action: "message_edited";
  original_message_id: string;
  edited_text: string;
}

// Union type for all webhook payloads
type GowaWebhookPayload =
  | GowaTextMessage
  | GowaImageMessage
  | GowaMessageAck
  | GowaMessageRevoked
  | GowaMessageEdited;

const simpleConfirmationService = new SimpleConfirmationService();
const patientLookup = new PatientLookupService();
const simpleVerificationService = new SimpleVerificationService();

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.string().optional(),
});

/**
 * Normalize GOWA webhook payload to common format
 */
function normalizeIncoming(payload: GowaWebhookPayload) {
  // Handle message.ack events separately
  if ("event" in payload && payload.event === "message.ack") {
    return null; // Will be handled by handleMessageAck
  }

  // Handle revoked/edited messages
  if ("action" in payload) {
    if (
      payload.action === "message_revoked" ||
      payload.action === "message_edited"
    ) {
      return null; // Skip these for now
    }
  }

  // Extract sender from different formats
  // GOWA format: sender_id = "628123456789" (clean number)
  // GOWA format: from = "628123456789@s.whatsapp.net"
  let sender = (payload as GowaTextMessage).sender_id;

  // If sender_id not present, extract from 'from' field
  if (!sender && (payload as GowaTextMessage).from) {
    sender = (payload as GowaTextMessage).from.replace("@s.whatsapp.net", "");
  }

  const basePayload = payload as GowaTextMessage;
  const message = basePayload.message?.text || "";
  const name = basePayload.pushname;
  const id = basePayload.message?.id;
  const timestamp = basePayload.timestamp;

  return {
    sender,
    message,
    name,
    id,
    timestamp,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";

    // Parse JSON
    let payload: GowaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.warn("GOWA webhook: Invalid JSON payload");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Log raw payload for debugging
    logger.info("📥 GOWA webhook payload received", {
      contentType: request.headers.get("content-type"),
      hasSignature: Boolean(signature),
      event: "event" in payload ? (payload as GowaMessageAck).event : "message",
      senderId: "sender_id" in payload ? payload.sender_id : "unknown",
    });

    // Validate webhook signature
    const validation = validateWebhookRequest(
      signature,
      rawBody,
      "timestamp" in payload ? payload.timestamp : undefined
    );

    if (!validation.valid) {
      logger.warn("GOWA webhook validation failed", {
        error: validation.error,
      });
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    // Handle message acknowledgment events (delivered/read)
    if ("event" in payload && payload.event === "message.ack") {
      return await handleMessageAck(payload as GowaMessageAck);
    }

    // Skip protocol messages (revoke, edit)
    if ("action" in payload) {
      const action = (payload as GowaMessageRevoked | GowaMessageEdited).action;
      if (action === "message_revoked" || action === "message_edited") {
        logger.info("GOWA: Ignoring protocol message", { action });
        return NextResponse.json({ ok: true, ignored: true, reason: action });
      }
    }

    // Normalize incoming message
    const normalized = normalizeIncoming(payload);
    if (!normalized) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "unsupported_event",
      });
    }

    const validationResult = IncomingSchema.safeParse(normalized);
    if (!validationResult.success) {
      logger.warn("GOWA webhook: Invalid payload structure", {
        errors: validationResult.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { sender, message, id, name } = validationResult.data;

    // Check for duplicate events using message ID
    if (id) {
      const idemKey = `webhook:gowa:message:${id}`;
      if (await isDuplicateEvent(idemKey)) {
        logger.info("GOWA: Duplicate message detected, skipping", {
          messageId: id,
        });
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    logger.info("GOWA incoming webhook received", {
      sender,
      name,
      hasId: Boolean(id),
      messagePreview: message ? message.substring(0, 50) : "no message",
    });

    // Find patient
    const patientResult = await patientLookup.findPatientByPhone(sender);
    if (!patientResult.found || !patientResult.patient) {
      logger.info("No patient matched, ignoring message", { sender });
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "no_patient_match",
      });
    }

    const patient = patientResult.patient;

    // Check patient response rate limiting
    const { patientResponseRateLimiter } = await import(
      "@/services/rate-limit.service"
    );
    const rateLimitResult =
      await patientResponseRateLimiter.checkPatientResponseRateLimit(
        patient.id
      );
    if (!rateLimitResult.allowed) {
      logger.warn("Patient response rate limit exceeded", {
        patientId: patient.id,
        phoneNumber: sender,
      });
      return NextResponse.json({
        ok: true,
        processed: false,
        action: "rate_limited",
      });
    }

    // Priority 1: Check verification responses for pending patients
    if (patient.verificationStatus === "PENDING") {
      logger.info("🔐 Processing verification response", {
        patientId: patient.id,
        patientName: patient.name,
        patientVerificationStatus: patient.verificationStatus,
        message: message?.substring(0, 50),
      });

      try {
        const result = await simpleVerificationService.processResponse(
          message,
          patient.id
        );

        logger.info("🔐 Verification response processed", {
          patientId: patient.id,
          action: result.action,
          processed: result.processed,
          resultMessage: result.message,
        });

        return NextResponse.json({
          ok: true,
          processed: true,
          action: result.action,
          source: "verification",
          message: result.message,
        });
      } catch (verificationError) {
        logger.error(
          "🔐 Verification processing error",
          verificationError instanceof Error
            ? verificationError
            : new Error(String(verificationError)),
          {
            patientId: patient.id,
            message: message?.substring(0, 50),
          }
        );
        return NextResponse.json(
          {
            ok: false,
            error: "Verification processing failed",
          },
          { status: 500 }
        );
      }
    }

    // Priority 2: Process reminder confirmations for verified patients
    if (patient.verificationStatus === "VERIFIED") {
      logger.info("Processing reminder confirmation", {
        patientId: patient.id,
        message: message?.substring(0, 50),
      });

      const result = await simpleConfirmationService.processReminderResponse(
        sender,
        message
      );

      // If it's not a reminder confirmation response, check if it's a general inquiry
      if (result.action === "invalid_response") {
        logger.info(
          "Not a reminder confirmation, checking for general inquiry",
          {
            patientId: patient.id,
            message: message?.substring(0, 50),
          }
        );

        // Priority 3: Handle general health inquiries with conversational AI
        // Use typing indicator while AI is processing
        const inquiryResult = await withTypingIndicator(sender, async () => {
          const { getAIGeneralInquiryService } = await import(
            "@/services/ai/ai-general-inquiry.service"
          );
          const aiGeneralInquiryService = getAIGeneralInquiryService();

          return await aiGeneralInquiryService.handleInquiry(
            message,
            {
              id: patient.id,
              name: patient.name,
              phoneNumber: patient.phoneNumber,
              cancerStage: patient.cancerStage,
            },
            patient.assignedVolunteerId
              ? {
                  id: patient.assignedVolunteerId,
                  name: "Assigned Volunteer",
                }
              : undefined
          );
        });

        return NextResponse.json({
          ok: true,
          processed: true,
          action: inquiryResult.action,
          source: "ai_general_inquiry",
          escalated:
            inquiryResult.action === "escalated" ||
            inquiryResult.action === "emergency",
        });
      }

      return NextResponse.json({
        ok: true,
        processed: true,
        action: result.action,
        source: "simple_reminder_confirmation",
      });
    }

    // Default: unprocessed
    return NextResponse.json({ ok: true, processed: false, action: "ignored" });
  } catch (error) {
    logger.error(
      "GOWA webhook error",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle message acknowledgment (delivery status)
 * GOWA sends receipt_type: "delivered" | "read" | "played"
 */
async function handleMessageAck(
  payload: GowaMessageAck
): Promise<NextResponse> {
  const { ids, receipt_type } = payload.payload;
  const timestamp = payload.timestamp;

  logger.info("GOWA message acknowledgment received", {
    ids,
    receipt_type,
    timestamp,
  });

  if (!ids || ids.length === 0) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      type: "message_ack",
      reason: "no_ids",
    });
  }

  // Process each message ID
  for (const id of ids) {
    // Check for duplicate status updates
    const idemKey = `webhook:gowa:message-ack:${hashFallbackId([
      id,
      timestamp || "",
      receipt_type,
    ])}`;
    if (await isDuplicateEvent(idemKey)) {
      continue;
    }

    // Map receipt_type to our status enum
    const mapped = mapReceiptTypeToStatus(receipt_type);
    if (!mapped) {
      continue;
    }

    try {
      // Update reminder status
      const { reminders } = await import("@/db");
      const { eq } = await import("drizzle-orm");
      const { del, CACHE_KEYS } = await import("@/lib/cache");

      // First get the patientId for cache invalidation
      // Note: We store GOWA message ID in wahaMessageId field (same column, different provider)
      const logData = await db
        .select({ patientId: reminders.patientId })
        .from(reminders)
        .where(eq(reminders.wahaMessageId, id))
        .limit(1);

      const updates = { status: mapped };
      if (mapped === "FAILED") {
        logger.warn("GOWA message failed", { id, receipt_type });
      }

      await db
        .update(reminders)
        .set(updates)
        .where(eq(reminders.wahaMessageId, id));
      logger.info("Updated reminder status from GOWA message.ack", {
        id,
        receipt_type,
        mapped,
      });

      // Invalidate cache if we have patientId
      if (logData.length > 0) {
        await del(CACHE_KEYS.reminderStats(logData[0].patientId));
      }
    } catch (error) {
      logger.error("Failed to update message ack status", error as Error, {
        id,
        receipt_type,
      });
    }
  }

  return NextResponse.json({ ok: true, processed: true, type: "message_ack" });
}

/**
 * Map GOWA receipt_type to our status enum
 */
function mapReceiptTypeToStatus(
  receiptType: string
): "PENDING" | "SENT" | "DELIVERED" | "FAILED" | null {
  switch (receiptType) {
    case "delivered":
      return "DELIVERED";
    case "read":
    case "played":
      return "DELIVERED"; // Read/Played both mean delivered
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "ping";
  return NextResponse.json({ ok: true, route: "gowa", mode });
}
