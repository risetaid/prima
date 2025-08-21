// Twilio WhatsApp API integration for PRIMA
import twilio from 'twilio'

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER // Format: whatsapp:+14155238886

if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('Twilio credentials not configured. WhatsApp messaging will be disabled.')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export interface WhatsAppMessage {
  to: string           // Format: whatsapp:+6281234567890
  body: string
  mediaUrl?: string    // Optional image/document URL
}

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send WhatsApp message via Twilio
 */
export const sendWhatsAppMessage = async (
  message: WhatsAppMessage
): Promise<WhatsAppMessageResult> => {
  if (!client) {
    return {
      success: false,
      error: 'Twilio not configured'
    }
  }

  try {
    const result = await client.messages.create({
      from: whatsappNumber,
      to: message.to,
      body: message.body,
      ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] })
    })

    return {
      success: true,
      messageId: result.sid
    }
  } catch (error) {
    console.error('Twilio WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Format phone number for WhatsApp (add whatsapp: prefix and +62 for Indonesia)
 */
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '')
  
  // Convert Indonesian numbers
  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2) // 08xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
    cleaned = '62' + cleaned // 8xxxxxxxx -> 628xxxxxxxx
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned // Add Indonesia code if missing
  }
  
  return `whatsapp:+${cleaned}`
}

/**
 * Create medication reminder message template
 */
export const createMedicationReminder = (
  patientName: string,
  medicationName: string,
  dosage: string,
  time: string,
  educationLink?: string
): string => {
  let message = `🏥 *Pengingat Minum Obat - PRIMA*

Halo ${patientName},

⏰ Saatnya minum obat:
💊 *${medicationName}* 
📏 Dosis: ${dosage}
🕐 Waktu: ${time}

Jangan lupa minum obat sesuai jadwal ya! 

✅ Balas "SUDAH" jika sudah minum obat
❌ Balas "BELUM" jika belum sempat

Semoga lekas sembuh! 🙏`

  if (educationLink) {
    message += `\n\n📖 Info lebih lanjut: ${educationLink}`
  }

  message += '\n\n_Pesan otomatis dari PRIMA - Sistem Monitoring Pasien_'

  return message
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
 * Validate Twilio webhook signature for security
 */
export const validateTwilioWebhook = (
  signature: string,
  url: string,
  body: any
): boolean => {
  if (!client) return false
  
  const webhookSignature = process.env.TWILIO_AUTH_TOKEN
  if (!webhookSignature) return false
  
  // Convert body to params object for Twilio validation
  const bodyParams: Record<string, any> = typeof body === 'string' ? 
    Object.fromEntries(new URLSearchParams(body)) : (body as Record<string, any>)
  
  return twilio.validateRequest(webhookSignature, url, bodyParams, { 'X-Twilio-Signature': signature })
}