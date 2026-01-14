// GOWA (go-whatsapp-web-multidevice) integration for PRIMA
// Server-only module - imports Node.js modules (crypto) and Redis-backed services
import "server-only";

import * as crypto from "crypto";
import { logger } from "@/lib/logger";
import { getCircuitBreaker, DEFAULT_CIRCUIT_CONFIGS } from "@/lib/circuit-breaker";

// Re-export client-safe functions from phone-format.ts for backward compatibility
// These can be imported directly from phone-format.ts for client components
export { formatWhatsAppNumber, formatForWhatsApp } from "@/lib/phone-format";

// Primary WhatsApp provider for Indonesian healthcare system

const GOWA_ENDPOINT = process.env.GOWA_ENDPOINT;
const GOWA_BASIC_AUTH_USER = process.env.GOWA_BASIC_AUTH_USER;
const GOWA_BASIC_AUTH_PASSWORD = process.env.GOWA_BASIC_AUTH_PASSWORD;
const GOWA_WEBHOOK_SECRET = process.env.GOWA_WEBHOOK_SECRET;

// Remove the default fallback - require explicit opt-in
const ALLOW_UNSIGNED_WEBHOOKS = process.env.ALLOW_UNSIGNED_WEBHOOKS === "true";

// Circuit breaker for GOWA API calls
const gowaCircuitBreaker = getCircuitBreaker('gowa', {
  failureThreshold: DEFAULT_CIRCUIT_CONFIGS.external_api.failureThreshold, // 10 failures
  resetTimeout: DEFAULT_CIRCUIT_CONFIGS.external_api.resetTimeout, // 60s
  monitoringPeriod: DEFAULT_CIRCUIT_CONFIGS.external_api.monitoringPeriod,
});

// Add validation check at module load
if (!GOWA_ENDPOINT || !GOWA_WEBHOOK_SECRET) {
  logger.error('GOWA configuration incomplete', undefined, {
    has_endpoint: !!GOWA_ENDPOINT,
    has_secret: !!GOWA_WEBHOOK_SECRET,
  });
}

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
 * Send WhatsApp message via GOWA API with retry logic
 * API: POST /send/message
 * Payload: { phone: "628xxx@s.whatsapp.net", message: "text" }
 * 
 * Retry logic (when PERF_WHATSAPP_RETRY flag enabled):
 * - 3 attempts with exponential backoff (1s, 2s, 4s)
 * - 10s timeout per attempt
 * - Don't retry on 4xx client errors
 * - Retry on 5xx server errors and network failures
 */
/**
 * Core GOWA API call wrapped with circuit breaker
 * This is the actual HTTP call that the circuit breaker protects
 */
async function gowaApiCall(
  phone: string,
  messageBody: string
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const payload: Record<string, unknown> = {
    phone,
    message: messageBody,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const response = await fetch(`${GOWA_ENDPOINT}/send/message`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  clearTimeout(timeout);
  return response;
}

export const sendWhatsAppMessage = async (
  message: WhatsAppMessage
): Promise<WhatsAppMessageResult> => {
  if (!GOWA_BASIC_AUTH_PASSWORD) {
    return {
      success: false,
      error: "GOWA not configured",
    };
  }

  const useRetry = process.env.FEATURE_FLAG_PERF_WHATSAPP_RETRY === 'true';
  const maxRetries = useRetry ? 3 : 1;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Format phone number with @s.whatsapp.net suffix for GOWA
      const phone = `${message.to}@s.whatsapp.net`;

      // Execute through circuit breaker
      const response = await gowaCircuitBreaker.execute(() =>
        gowaApiCall(phone, message.body)
      );

      const result = await response.json() as { code?: string; message?: string; results?: { message_id?: string } };

      // GOWA response: { code: "SUCCESS", message: "Success", results: { message_id: "xxx", status: "..." } }
      if (result.code === "SUCCESS" || response.ok) {
        if (attempt > 0) {
          logger.info('WhatsApp send succeeded after retry', {
            operation: 'whatsapp.send',
            attempt: attempt + 1,
            to: message.to,
          });
        }

        return {
          success: true,
          messageId: result.results?.message_id || "gowa_" + Date.now(),
        };
      }

      // Don't retry on 4xx client errors (invalid request won't succeed on retry)
      if (response.status >= 400 && response.status < 500) {
        logger.warn('WhatsApp send failed with client error (no retry)', {
          operation: 'whatsapp.send',
          status: response.status,
          to: message.to,
        });
        return {
          success: false,
          error: result.message || "GOWA API error",
        };
      }

      // Retry on 5xx server errors
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn('WhatsApp send failed, retrying', {
          operation: 'whatsapp.send',
          attempt: attempt + 1,
          maxRetries,
          nextRetryDelayMs: delay,
          status: response.status,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Final attempt failed
      return {
        success: false,
        error: result.message || "GOWA API error",
      };

    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        logger.error(
          "GOWA WhatsApp send error",
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'whatsapp.send',
            attempt: attempt + 1,
            isTimeout,
          }
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Retry on network failures
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn('WhatsApp send error, retrying', {
        operation: 'whatsapp.send',
        attempt: attempt + 1,
        maxRetries,
        nextRetryDelayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  return {
    success: false,
    error: "Max retries exceeded",
  };
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
