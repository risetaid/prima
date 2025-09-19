/**
 * Response Templates for LLM-generated patient messages
 * Provides structured templates for different conversation contexts
 */


export interface ResponseTemplate {
  template: string
  variables: string[]
  tone: 'friendly' | 'professional' | 'empathetic' | 'urgent'
  maxLength?: number
  category?: 'GENERAL' | 'VERIFICATION' | 'EMERGENCY' | 'EDUCATIONAL'
}

export interface TemplateContext {
  patientName?: string
  intent: string
  confidence: number
  conversationHistory: number
  hasActiveReminders: boolean
  verificationStatus?: string
}

/**
 * Response templates for different intents and contexts
 */
export const RESPONSE_TEMPLATES: Record<string, ResponseTemplate> = {
  // Verification responses
  verification_success: {
    template: `Halo {patientName}! 🎉

Terima kasih atas konfirmasinya. Nomor WhatsApp Anda telah berhasil diverifikasi untuk layanan PRIMA.

Sistem kami sekarang dapat mengirimkan pengingat dan dukungan kesehatan melalui WhatsApp ini.

Jika ada yang bisa dibantu, jangan ragu untuk menghubungi kami.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    category: 'VERIFICATION',
    maxLength: 300
  },

  verification_pending: {
    template: `Halo {patientName},

Kami menunggu konfirmasi verifikasi WhatsApp Anda untuk mengaktifkan layanan PRIMA.

Silakan balas pesan ini dengan "YA" untuk memverifikasi nomor WhatsApp Anda.

Fitur yang akan aktif setelah verifikasi:
- Pengingat kesehatan otomatis
- Dukungan kesehatan personal
- Monitoring kesehatan jarak jauh

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'professional',
    category: 'VERIFICATION',
    maxLength: 350
  },

  verification_declined: {
    template: `Halo {patientName},

Kami menerima penolakan verifikasi WhatsApp Anda.

Jika ini adalah kesalahan atau Anda berubah pikiran, silakan hubungi relawan kesehatan Anda untuk verifikasi ulang.

Layanan PRIMA tetap tersedia jika Anda membutuhkannya nanti.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'empathetic',
    category: 'VERIFICATION',
    maxLength: 250
  },

  // Unsubscribe responses
  unsubscribe_confirmed: {
    template: `Halo {patientName},

Kami konfirmasi bahwa Anda telah berhenti dari layanan pengingat PRIMA.

Semua data pribadi Anda akan tetap aman dan terlindungi sesuai kebijakan privasi kami.

Terima kasih telah menggunakan layanan PRIMA. Semoga sehat selalu! 🙏

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'empathetic',
    category: 'GENERAL',
    maxLength: 250
  },

  unsubscribe_unclear: {
    template: `Halo {patientName},

Kami menerima pesan Anda. Untuk berhenti dari layanan PRIMA, silakan balas dengan "BERHENTI" atau "STOP".

Jika ini bukan maksud Anda, silakan beri tahu kami bagaimana kami bisa membantu.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    category: 'GENERAL',
    maxLength: 200
  },

  // General inquiry responses
  general_info: {
    template: `Halo {patientName},

Terima kasih telah menghubungi PRIMA. Kami siap membantu dengan informasi layanan dan dukungan kesehatan.

Yang bisa kami bantu:
- Informasi status akun dan verifikasi
- Jadwal pengingat aktif
- Panduan penggunaan sistem
- Bantuan teknis

Silakan sampaikan pertanyaan spesifik Anda.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    category: 'GENERAL',
    maxLength: 300
  },

  reminder_info: {
    template: `Halo {patientName},

Berikut informasi pengingat Anda saat ini:
{hasActiveReminders}

Untuk melihat detail lengkap atau mengubah pengingat, silakan hubungi relawan kesehatan Anda.

💙 Tim PRIMA`,
    variables: ['patientName', 'hasActiveReminders'],
    tone: 'professional',
    category: 'GENERAL',
    maxLength: 250
  },

  // Emergency responses
  emergency_guidance: {
    template: `🚨 *Panduan Darurat*

Halo {patientName},

Jika Anda mengalami keadaan darurat medis:
1. Segera hubungi layanan darurat (118/119)
2. Hubungi keluarga terdekat
3. Kunjungi fasilitas kesehatan terdekat

Untuk bantuan non-darurat, Anda dapat menghubungi relawan kesehatan Anda.

PRIMA bukan layanan darurat. Harap segera cari bantuan medis profesional!

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'urgent',
    category: 'EMERGENCY',
    maxLength: 300
  },

  // Error responses
  error_message: {
    template: `Maaf, terjadi kesalahan dalam memproses pesan Anda.

Silakan coba beberapa saat lagi atau hubungi relawan kesehatan Anda jika masalah berlanjut.

Terima kasih pengertiannya.

💙 Tim PRIMA`,
    variables: [],
    tone: 'empathetic',
    category: 'GENERAL',
    maxLength: 200
  },

  // Default response
  default_response: {
    template: `Halo {patientName},

Terima kasih telah menghubungi PRIMA. Kami akan membantu permintaan Anda.

Agar kami dapat memberikan bantuan yang tepat, silakan berikan informasi lebih detail tentang apa yang Anda butuhkan.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    category: 'GENERAL',
    maxLength: 200
  }
}

/**
 * Get template based on intent and context
 */
export function getResponseTemplate(
  intent: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: TemplateContext
): ResponseTemplate {
  // Intent-based template selection
  switch (intent) {
    case 'verified':
      return RESPONSE_TEMPLATES.verification_success
    case 'declined':
      return RESPONSE_TEMPLATES.verification_declined
    case 'unsubscribed':
      return RESPONSE_TEMPLATES.unsubscribe_confirmed
    case 'emergency':
      return RESPONSE_TEMPLATES.emergency_guidance
    case 'general_inquiry':
      return RESPONSE_TEMPLATES.general_info
    case 'reminder_info':
      return RESPONSE_TEMPLATES.reminder_info
    default:
      return RESPONSE_TEMPLATES.default_response
  }
}

/**
 * Format template with context variables
 */
export function formatTemplate(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  let formatted = template

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    formatted = formatted.replace(
      new RegExp(placeholder, 'g'),
      String(value)
    )
  })

  return formatted
}

export type { ResponseTemplate as ResponseTemplateType }