// Fonnte WhatsApp API integration for PRIMA
// Primary WhatsApp provider for Indonesian healthcare system

const FONNTE_BASE_URL = process.env.FONNTE_BASE_URL || 'https://api.fonnte.com'
const FONNTE_TOKEN = process.env.FONNTE_TOKEN

export interface WhatsAppMessage {
  to: string           // Format: 6281234567890 (no + prefix)
  body: string
  mediaUrl?: string    // Optional image/document URL
}

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

if (!FONNTE_TOKEN) {
  console.warn('Fonnte credentials not configured. WhatsApp messaging will be disabled.')
}

/**
 * Send WhatsApp message via Fonnte API
 */
export const sendWhatsAppMessage = async (
  message: WhatsAppMessage
): Promise<WhatsAppMessageResult> => {
  if (!FONNTE_TOKEN) {
    return {
      success: false,
      error: 'Fonnte not configured'
    }
  }

  try {
    const payload: any = {
      target: message.to,
      message: message.body
    }

    // Add media if provided
    if (message.mediaUrl) {
      payload.url = message.mediaUrl
    }

    const response = await fetch(`${FONNTE_BASE_URL}/send`, {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (result.status) {
      // Fonnte API returns messageId as array, convert to string
      const messageId = Array.isArray(result.id) ? result.id[0] : result.id
      return {
        success: true,
        messageId: messageId || 'fonnte_' + Date.now()
      }
    } else {
      return {
        success: false,
        error: result.reason || 'Fonnte API error'
      }
    }
  } catch (error) {
    console.error('Fonnte WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Format phone number for WhatsApp (Indonesia format, no prefixes)
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
  
  return cleaned // Clean number format for Fonnte
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
 * Validate Fonnte webhook signature for security
 */
export const validateFonnteWebhook = (
  signature: string,
  body: any
): boolean => {
  if (!FONNTE_TOKEN) return false
  
  try {
    // Implement Fonnte webhook validation if available
    // For now, basic token validation
    return signature === FONNTE_TOKEN
  } catch (error) {
    console.error('Fonnte webhook validation error:', error)
    return false
  }
}