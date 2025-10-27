// WAHA (WhatsApp HTTP API) integration for PRIMA
import * as crypto from 'crypto'
import { logger } from '@/lib/logger'

// Primary WhatsApp provider for Indonesian healthcare system

const WAHA_ENDPOINT = process.env.WAHA_ENDPOINT || 'http://localhost:3000'
const WAHA_API_KEY = process.env.WAHA_API_KEY
const WAHA_SESSION = process.env.WAHA_SESSION || 'default'
const ALLOW_UNSIGNED_WEBHOOKS =
  (process.env.ALLOW_UNSIGNED_WEBHOOKS || '').toLowerCase() === 'true' ||
  process.env.NODE_ENV !== 'production'

export interface WhatsAppMessage {
  to: string           // Format: 6281234567890 (no @ suffix, will be added in sendWhatsAppMessage)
  body: string
  mediaUrl?: string    // Optional image/document URL
}

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

if (!WAHA_API_KEY) {
  logger.warn('WAHA credentials not configured. WhatsApp messaging will be disabled.')
}

/**
 * Send WhatsApp message via WAHA API
 */
export const sendWhatsAppMessage = async (
  message: WhatsAppMessage
): Promise<WhatsAppMessageResult> => {
  if (!WAHA_API_KEY) {
    return {
      success: false,
      error: 'WAHA not configured'
    }
  }

  try {
    // Format phone number with @c.us suffix for WAHA
    const chatId = `${message.to}@c.us`

    const payload: Record<string, unknown> = {
      session: WAHA_SESSION,
      chatId: chatId,
      text: message.body
    }

    // WAHA may support media differently - investigate further
    // Media support in WAHA is pending verification
    // if (message.mediaUrl) {
    //   payload.media = message.mediaUrl
    // }

    const response = await fetch(`${WAHA_ENDPOINT}/api/sendText`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (result.success || response.ok) {
      return {
        success: true,
        messageId: result.messageId || result.id || 'waha_' + Date.now()
      }
    } else {
      return {
        success: false,
        error: result.error || result.message || 'WAHA API error'
      }
    }
  } catch (error) {
    logger.error(
      'WAHA WhatsApp send error',
      error instanceof Error ? error : new Error(String(error))
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Format phone number for WhatsApp (Indonesia format, no @c.us suffix - added by sendWhatsAppMessage)
 * with validation
 */
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number: must be a non-empty string')
  }

  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '')

  if (!cleaned || cleaned.length < 8) {
    throw new Error('Invalid phone number: too short after cleaning')
  }

  // Convert Indonesian numbers with validation
  if (cleaned.startsWith('08')) {
    if (cleaned.length < 10 || cleaned.length > 13) {
      throw new Error('Invalid Indonesian phone number length (08 format)')
    }
    cleaned = '628' + cleaned.slice(2) // 08xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
    if (cleaned.length < 9 || cleaned.length > 12) {
      throw new Error('Invalid Indonesian phone number length (8 format)')
    }
    cleaned = '62' + cleaned // 8xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith('62')) {
    if (cleaned.length < 11 || cleaned.length > 14) {
      throw new Error('Invalid Indonesian phone number length (62 format)')
    }
    // Already has country code
  } else {
    // Assume local Indonesian number
    if (cleaned.length < 8 || cleaned.length > 11) {
      throw new Error('Invalid phone number length')
    }
    cleaned = '62' + cleaned // Add Indonesia code
  }

  // Final validation - Indonesian mobile numbers after 62 should start with 8
  if (!cleaned.startsWith('628')) {
    throw new Error('Invalid Indonesian mobile number format')
  }

  // Return clean number format without @c.us suffix
  // The @c.us suffix will be added by sendWhatsAppMessage
  return cleaned
}



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

_Pesan otomatis dari PRIMA - Sistem Monitoring Pasien_`
}

/**
 * Validate WAHA webhook signature for security
 */
export const validateWahaWebhook = (
  signature: string,
  body: unknown
): boolean => {
  // WAHA webhook validation strategy:
  // - Option 1: HMAC-SHA256 like Fonnte (if WAHA_API_KEY exists)
  // - Option 2: API Key validation only (if using X-Api-Key header)
  // - TODO: Verify WAHA webhook validation requirements

  if (!WAHA_API_KEY) return false

  try {
    // For now, implement same HMAC validation as Fonnte
    // This may need adjustment based on WAHA's actual webhook format
    const expectedSignature = crypto
      .createHmac('sha256', WAHA_API_KEY)
      .update(JSON.stringify(body))
      .digest('hex')

    return signature === expectedSignature
  } catch (error) {
    logger.error(
      'WAHA webhook validation error',
      error instanceof Error ? error : new Error(String(error))
    )
    return false
  }
}

/**
 * Enhanced webhook validation with multiple security checks
 */
export const validateWebhookRequest = (
  signature: string,
  body: unknown,
  timestamp?: string
): { valid: boolean; error?: string } => {
  // Check if secrets are configured
  if (!WAHA_API_KEY) {
    return { valid: false, error: 'WAHA credentials not configured' }
  }

  // Validate signature
  if (!signature) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true }
    }
    return { valid: false, error: 'Missing webhook signature' }
  }

  if (!validateWahaWebhook(signature, body)) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true }
    }
    return { valid: false, error: 'Invalid webhook signature' }
  }

  // Check timestamp if provided (prevent replay attacks)
  if (timestamp) {
    const now = Date.now()
    const webhookTime = parseInt(timestamp)
    const timeDiff = Math.abs(now - webhookTime)

    // Allow 5 minute window for webhook delivery
    if (timeDiff > 5 * 60 * 1000) {
      return { valid: false, error: 'Webhook timestamp too old' }
    }
  }

  return { valid: true }
}
