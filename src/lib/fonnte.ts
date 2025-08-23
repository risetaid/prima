// Fonnte WhatsApp API integration for PRIMA (Backup System)
// Hidden backup untuk medical-grade reliability

export interface FontteMessage {
  to: string           // Format: 6281234567890 (no + prefix)
  body: string
  mediaUrl?: string    // Optional image/document URL
}

export interface FontteMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send WhatsApp message via Fonnte API
 */
export const sendWhatsAppMessageFonnte = async (
  message: FontteMessage
): Promise<FontteMessageResult> => {
  const fonnte_token = process.env.FONNTE_TOKEN
  
  if (!fonnte_token) {
    return {
      success: false,
      error: 'Fonnte token not configured'
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

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnte_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (result.status) {
      return {
        success: true,
        messageId: result.id || 'fonnte_' + Date.now()
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
 * Format phone number for Fonnte (remove prefixes, Indonesia format)
 */
export const formatFontteNumber = (phoneNumber: string): string => {
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
  
  return cleaned // No whatsapp: prefix for Fonnte
}

/**
 * Universal WhatsApp sender - automatically chooses provider
 */
export const sendUniversalWhatsApp = async (
  to: string,
  body: string,
  mediaUrl?: string
): Promise<FontteMessageResult> => {
  const provider = process.env.WHATSAPP_PROVIDER || 'fonnte'
  
  if (provider === 'fonnte') {
    return await sendWhatsAppMessageFonnte({
      to: formatFontteNumber(to),
      body,
      mediaUrl
    })
  } else {
    // Default to Twilio - import dynamically to avoid circular deps
    const { sendWhatsAppMessage, formatWhatsAppNumber } = await import('./twilio')
    return await sendWhatsAppMessage({
      to: formatWhatsAppNumber(to),
      body,
      mediaUrl
    })
  }
}