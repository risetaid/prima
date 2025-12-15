// GOWA (go-whatsapp-web-multidevice) integration for PRIMA
import * as crypto from "crypto";
import { logger } from "@/lib/logger";

// Primary WhatsApp provider for Indonesian healthcare system

const GOWA_ENDPOINT = process.env.GOWA_ENDPOINT;
const GOWA_BASIC_AUTH_USER = process.env.GOWA_BASIC_AUTH_USER;
const GOWA_BASIC_AUTH_PASSWORD = process.env.GOWA_BASIC_AUTH_PASSWORD;
const GOWA_WEBHOOK_SECRET = process.env.GOWA_WEBHOOK_SECRET;

// Remove the default fallback - require explicit opt-in
const ALLOW_UNSIGNED_WEBHOOKS = process.env.ALLOW_UNSIGNED_WEBHOOKS === "true";

// Add validation check at module load
if (!GOWA_ENDPOINT || !GOWA_WEBHOOK_SECRET) {
  logger.error('GOWA configuration incomplete', undefined, {
    has_endpoint: !!GOWA_ENDPOINT,
    has_secret: !!GOWA_WEBHOOK_SECRET,
  });
}

/**
 * Convert Markdown formatting to WhatsApp-compatible formatting
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 * Markdown uses: **bold**, *italic*, ~~strikethrough~~, `code`
 *
 * Also handles:
 * - Markdown headers (# ## ###) → remove formatting, keep text
 * - Markdown bullet lists (- or *) → clean numbered or emoji lists
 * - Markdown numbered lists (1. 2. 3.) → keep as-is
 * - Markdown links [text](url) → text: url
 */
export const formatForWhatsApp = (text: string): string => {
  let result = text;

  // Convert Markdown bold **text** to WhatsApp bold *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, "*$1*");

  // Convert Markdown italic _text_ stays same, but handle *text* (single asterisk is italic in MD)
  // WhatsApp uses _italic_, but we should convert MD italic to WA italic
  // Note: Be careful not to convert already-converted bold
  // MD uses *italic* but WA uses _italic_ - convert carefully
  // Skip this conversion as it may conflict with bold

  // Convert Markdown strikethrough ~~text~~ to WhatsApp ~text~
  result = result.replace(/~~([^~]+)~~/g, "~$1~");

  // Convert inline code `text` to WhatsApp monospace ```text```
  // But skip if it's already triple backticks
  result = result.replace(/(?<!`)`([^`]+)`(?!`)/g, "```$1```");

  // Remove Markdown headers but keep the text
  // # Heading → Heading (optionally bold it)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // Convert Markdown bullet lists using - or * at start of line
  // - item → • item (or just remove the dash)
  result = result.replace(/^[\s]*[-*]\s+/gm, "• ");

  // Convert Markdown links [text](url) → text: url
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2");

  // Remove horizontal rules (--- or ***)
  result = result.replace(/^[-*_]{3,}$/gm, "");

  // Clean up excessive newlines (more than 2 consecutive)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  result = result.trim();

  return result;
};

export interface WhatsAppMessage {
  to: string; // Format: 6281234567890 (no @ suffix, will be added in sendWhatsAppMessage)
  body: string;
  mediaUrl?: string; // Optional image/document URL
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Generate Basic Auth header
function getBasicAuthHeader(): string {
  const credentials = `${GOWA_BASIC_AUTH_USER}:${GOWA_BASIC_AUTH_PASSWORD}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
}

if (!GOWA_BASIC_AUTH_PASSWORD) {
  logger.warn(
    "GOWA credentials not configured. WhatsApp messaging will be disabled."
  );
}

/**
 * Send chat presence (typing indicator) via GOWA API
 * API: POST /send/chat-presence
 * Payload: { phone: "628xxx@s.whatsapp.net", action: "start" | "stop" }
 */
export const sendChatPresence = async (
  to: string,
  action: "start" | "stop"
): Promise<{ success: boolean; error?: string }> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return { success: false, error: "GOWA not configured" };
  }

  try {
    const phone = `${to}@s.whatsapp.net`;

    const response = await fetch(`${GOWA_ENDPOINT}/send/chat-presence`, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, action }),
    });

    const result = await response.json();

    if (result.code === "SUCCESS" || response.ok) {
      logger.debug(`Typing indicator ${action} sent to ${to}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: result.message || "GOWA chat-presence API error",
      };
    }
  } catch (error) {
    logger.warn(`Failed to send typing indicator (${action})`, {
      error: error instanceof Error ? error.message : String(error),
      phoneNumber: to,
    });
    // Don't fail the whole flow just because typing indicator failed
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Helper to wrap async operation with typing indicator
 * Automatically starts typing before operation and stops after
 */
export const withTypingIndicator = async <T>(
  phoneNumber: string,
  operation: () => Promise<T>
): Promise<T> => {
  // Start typing indicator
  await sendChatPresence(phoneNumber, "start");

  try {
    // Execute the operation (e.g., AI processing)
    const result = await operation();
    return result;
  } finally {
    // Always stop typing indicator, even if operation fails
    await sendChatPresence(phoneNumber, "stop");
  }
};

/**
 * Send WhatsApp message via GOWA API
 * API: POST /send/message
 * Payload: { phone: "628xxx@s.whatsapp.net", message: "text" }
 */
export const sendWhatsAppMessage = async (
  message: WhatsAppMessage
): Promise<WhatsAppMessageResult> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return {
      success: false,
      error: "GOWA not configured",
    };
  }

  try {
    // Format phone number with @s.whatsapp.net suffix for GOWA
    const phone = `${message.to}@s.whatsapp.net`;

    const payload: Record<string, unknown> = {
      phone: phone,
      message: message.body,
    };

    const response = await fetch(`${GOWA_ENDPOINT}/send/message`, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // GOWA response: { code: "SUCCESS", message: "Success", results: { message_id: "xxx", status: "..." } }
    if (result.code === "SUCCESS" || response.ok) {
      return {
        success: true,
        messageId: result.results?.message_id || "gowa_" + Date.now(),
      };
    } else {
      return {
        success: false,
        error: result.message || "GOWA API error",
      };
    }
  } catch (error) {
    logger.error(
      "GOWA WhatsApp send error",
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send WhatsApp image via GOWA API
 * API: POST /send/image (multipart/form-data or JSON with image_url)
 */
export const sendWhatsAppImage = async (
  to: string,
  imageUrl: string,
  caption?: string
): Promise<WhatsAppMessageResult> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return {
      success: false,
      error: "GOWA not configured",
    };
  }

  try {
    const phone = `${to}@s.whatsapp.net`;

    // Use FormData for image sending
    const formData = new FormData();
    formData.append("phone", phone);
    formData.append("image_url", imageUrl);
    if (caption) {
      formData.append("caption", caption);
    }

    const response = await fetch(`${GOWA_ENDPOINT}/send/image`, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
      },
      body: formData,
    });

    const result = await response.json();

    if (result.code === "SUCCESS" || response.ok) {
      return {
        success: true,
        messageId: result.results?.message_id || "gowa_img_" + Date.now(),
      };
    } else {
      return {
        success: false,
        error: result.message || "GOWA image API error",
      };
    }
  } catch (error) {
    logger.error(
      "GOWA WhatsApp image send error",
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Send WhatsApp document/file via GOWA API
 * API: POST /send/file (multipart/form-data)
 */
export const sendWhatsAppFile = async (
  to: string,
  fileUrl: string,
  caption?: string
): Promise<WhatsAppMessageResult> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return {
      success: false,
      error: "GOWA not configured",
    };
  }

  try {
    const phone = `${to}@s.whatsapp.net`;

    const formData = new FormData();
    formData.append("phone", phone);
    // Note: GOWA might need the actual file, not URL - check API docs
    // For now, we'll try with the URL approach
    if (caption) {
      formData.append("caption", caption);
    }

    const response = await fetch(`${GOWA_ENDPOINT}/send/file`, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
      },
      body: formData,
    });

    const result = await response.json();

    if (result.code === "SUCCESS" || response.ok) {
      return {
        success: true,
        messageId: result.results?.message_id || "gowa_file_" + Date.now(),
      };
    } else {
      return {
        success: false,
        error: result.message || "GOWA file API error",
      };
    }
  } catch (error) {
    logger.error(
      "GOWA WhatsApp file send error",
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Format phone number for WhatsApp (Indonesia format, no @s.whatsapp.net suffix)
 * The suffix will be added by sendWhatsAppMessage
 */
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw new Error("Invalid phone number: must be a non-empty string");
  }

  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  if (!cleaned || cleaned.length < 8) {
    throw new Error("Invalid phone number: too short after cleaning");
  }

  // Convert Indonesian numbers with validation
  if (cleaned.startsWith("08")) {
    if (cleaned.length < 10 || cleaned.length > 13) {
      throw new Error("Invalid Indonesian phone number length (08 format)");
    }
    cleaned = "628" + cleaned.slice(2); // 08xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith("8") && cleaned.length >= 9) {
    if (cleaned.length < 9 || cleaned.length > 12) {
      throw new Error("Invalid Indonesian phone number length (8 format)");
    }
    cleaned = "62" + cleaned; // 8xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith("62")) {
    if (cleaned.length < 11 || cleaned.length > 14) {
      throw new Error("Invalid Indonesian phone number length (62 format)");
    }
    // Already has country code
  } else {
    // Assume local Indonesian number
    if (cleaned.length < 8 || cleaned.length > 11) {
      throw new Error("Invalid phone number length");
    }
    cleaned = "62" + cleaned; // Add Indonesia code
  }

  // Final validation - Indonesian mobile numbers after 62 should start with 8
  if (!cleaned.startsWith("628")) {
    throw new Error("Invalid Indonesian mobile number format");
  }

  // Return clean number format without @s.whatsapp.net suffix
  return cleaned;
};

/**
 * Create appointment reminder message
 */
export const createAppointmentReminder = (
  patientName: string,
  appointmentType: string,
  date: string,
  time: string,
  location: string
): string => {
  return `🏥 *Pengingat Jadwal Dokter - PRIMA*

Halo ${patientName},

📅 Anda memiliki jadwal:
🩺 *${appointmentType}*
📅 Tanggal: ${date}
🕐 Waktu: ${time}
📍 Lokasi: ${location}

Pastikan datang tepat waktu ya!

Jika ada kendala, segera hubungi relawan atau rumah sakit.

Semoga sehat selalu! 🙏

_Pesan otomatis dari PRIMA - Sistem Monitoring Pasien_`;
};

/**
 * Validate GOWA webhook signature (HMAC SHA256)
 * Header: X-Hub-Signature-256
 * Format: sha256={signature}
 */
export const validateGowaWebhook = (
  signature: string,
  body: string | Buffer
): boolean => {
  if (!GOWA_WEBHOOK_SECRET) return false;

  try {
    // Remove 'sha256=' prefix if present
    const receivedSignature = signature.replace("sha256=", "");

    // Convert body to string if it's a Buffer
    const bodyString = Buffer.isBuffer(body) ? body.toString("utf8") : body;

    const expectedSignature = crypto
      .createHmac("sha256", GOWA_WEBHOOK_SECRET)
      .update(bodyString, "utf8")
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(receivedSignature, "hex")
    );
  } catch (error) {
    logger.error(
      "GOWA webhook validation error",
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
};

/**
 * Enhanced webhook validation with multiple security checks
 */
export const validateWebhookRequest = (
  signature: string,
  body: string | Buffer,
  timestamp?: string
): { valid: boolean; error?: string } => {
  // Check if secrets are configured
  if (!GOWA_WEBHOOK_SECRET) {
    return { valid: false, error: "GOWA webhook secret not configured" };
  }

  // Validate signature
  if (!signature) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true };
    }
    return { valid: false, error: "Missing webhook signature" };
  }

  if (!validateGowaWebhook(signature, body)) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true };
    }
    return { valid: false, error: "Invalid webhook signature" };
  }

  // Check timestamp if provided (prevent replay attacks)
  if (timestamp) {
    const now = Date.now();
    const webhookTime = new Date(timestamp).getTime();
    const timeDiff = Math.abs(now - webhookTime);

    // Allow 5 minute window for webhook delivery
    if (timeDiff > 5 * 60 * 1000) {
      if (!ALLOW_UNSIGNED_WEBHOOKS) {
        return { valid: false, error: "Webhook timestamp too old" };
      }
    }
  }

  return { valid: true };
};

/**
 * Check if GOWA is connected/logged in
 * API: GET /app/devices
 */
export const checkGowaStatus = async (): Promise<{
  connected: boolean;
  devices?: Array<{ name: string; device: string }>;
  error?: string;
}> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return { connected: false, error: "GOWA not configured" };
  }

  try {
    const response = await fetch(`${GOWA_ENDPOINT}/app/devices`, {
      method: "GET",
      headers: {
        Authorization: getBasicAuthHeader(),
      },
    });

    const result = await response.json();

    if (result.code === "SUCCESS" && result.results?.length > 0) {
      return {
        connected: true,
        devices: result.results,
      };
    } else {
      return {
        connected: false,
        error: result.message || "Not connected",
      };
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
};

/**
 * Reconnect to WhatsApp
 * API: GET /app/reconnect
 */
export const reconnectGowa = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return { success: false, error: "GOWA not configured" };
  }

  try {
    const response = await fetch(`${GOWA_ENDPOINT}/app/reconnect`, {
      method: "GET",
      headers: {
        Authorization: getBasicAuthHeader(),
      },
    });

    const result = await response.json();

    return {
      success: result.code === "SUCCESS",
      error: result.code !== "SUCCESS" ? result.message : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reconnect failed",
    };
  }
};
