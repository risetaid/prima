/**
 * Response Templates for LLM-generated patient messages
 * Provides structured templates for different conversation contexts
 */

import { ConversationContext } from './llm.types'

export interface ResponseTemplate {
  template: string
  variables: string[]
  tone: 'friendly' | 'professional' | 'empathetic' | 'urgent'
  maxLength?: number
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

Anda akan menerima pengingat kesehatan secara otomatis. Jika ada pertanyaan, silakan hubungi kami kapan saja.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 300
  },

  verification_pending: {
    template: `Halo {patientName}!

Kami sedang memproses verifikasi nomor WhatsApp Anda. Mohon tunggu sebentar ya.

Jika dalam 24 jam belum menerima konfirmasi, silakan hubungi relawan PRIMA.

🙏 Terima kasih atas kesabarannya.`,
    variables: ['patientName'],
    tone: 'professional',
    maxLength: 250
  },

  // Medication confirmation responses
  medication_confirmed: {
    template: `Bagus, {patientName}! 💊✅

Terima kasih sudah mengonfirmasi bahwa Anda telah minum obat sesuai jadwal. Konsistensi seperti ini sangat penting untuk kesehatan Anda.

Jaga terus pola hidup sehatnya ya!

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 200
  },

  medication_missed: {
    template: `Tidak apa-apa, {patientName}. 😊

Yang penting segera minum obatnya ya. Jika ada kendala atau lupa, ceritakan saja kepada relawan PRIMA agar bisa membantu.

Kesehatan Anda adalah prioritas kami!

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'empathetic',
    maxLength: 250
  },

  medication_reminder: {
    template: `Halo {patientName}! 💊⏰

Saatnya minum obat sesuai jadwal ya. Jangan lupa untuk melanjutkan perawatan yang telah direkomendasikan dokter.

Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 200
  },

  // General inquiry responses
  general_greeting: {
    template: `Halo {patientName}! 😊

Ada yang bisa PRIMA bantu hari ini? Kami siap membantu dengan informasi kesehatan atau pertanyaan lainnya.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 150
  },

  general_help: {
    template: `Halo {patientName}!

PRIMA di sini untuk membantu. Anda bisa bertanya tentang:
• Jadwal pengobatan
• Cara minum obat
• Informasi kesehatan umum
• Bantuan darurat

Apa yang bisa kami bantu?

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'professional',
    maxLength: 200
  },

  // Emergency responses
  emergency_detected: {
    template: `🚨 DARURAT MEDIS TERDETEKSI 🚨

{patientName}, kami mendeteksi ini sebagai situasi darurat. Relawan PRIMA akan segera menghubungi Anda untuk memberikan bantuan.

Jangan panik, bantuan sedang dalam perjalanan!

📞 Hubungi: [Emergency Contact]
💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'urgent',
    maxLength: 250
  },

  // Unsubscribe responses
  unsubscribe_confirm: {
    template: `Baik, {patientName}. 😔

Kami akan menghentikan semua pengingat kesehatan melalui WhatsApp sesuai permintaan Anda.

Jika suatu saat ingin bergabung kembali, Anda bisa menghubungi relawan PRIMA.

Semoga tetap sehat selalu!

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'empathetic',
    maxLength: 200
  },

  unsubscribe_cancel: {
    template: `Baik, {patientName}! 😊

Pengiriman pengingat kesehatan akan dilanjutkan seperti biasa.

Jika ada perubahan, beri tahu kami ya.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 150
  },

  // Low confidence responses
  low_confidence: {
    template: `Maaf {patientName}, pesan Anda agak sulit dipahami. 🤔

Bisa dijelaskan lebih detail? Atau relawan PRIMA akan segera membantu Anda.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'empathetic',
    maxLength: 150
  },

  // Follow-up responses
  follow_up_check: {
    template: `Halo {patientName}! 📅

Bagaimana kondisi kesehatan Anda hari ini? Sudah minum obat sesuai jadwal?

Balas "SUDAH" jika sudah, atau "BANTUAN" jika butuh bantuan.

💙 Tim PRIMA`,
    variables: ['patientName'],
    tone: 'friendly',
    maxLength: 180
  }
}

/**
 * Get appropriate template based on context
 */
export function getResponseTemplate(
  intent: string,
  context: TemplateContext
): ResponseTemplate | null {
  // Map intent to template key
  const templateKey = mapIntentToTemplate(intent, context)

  if (!templateKey || !RESPONSE_TEMPLATES[templateKey]) {
    return null
  }

  return RESPONSE_TEMPLATES[templateKey]
}

/**
 * Map intent to template key based on context
 */
function mapIntentToTemplate(intent: string, context: TemplateContext): string | null {
  switch (intent) {
    case 'verification_response':
      return context.verificationStatus === 'verified' ? 'verification_success' : 'verification_pending'

    case 'medication_confirmation':
      // This would need more context about whether it was confirmed or missed
      return 'medication_confirmed' // Default to confirmed

    case 'unsubscribe':
      return 'unsubscribe_confirm'

    case 'emergency':
      return 'emergency_detected'

    case 'general_inquiry':
      return context.conversationHistory === 0 ? 'general_greeting' : 'general_help'

    default:
      if (context.confidence < 0.6) {
        return 'low_confidence'
      }
      return null
  }
}

/**
 * Fill template variables
 */
export function fillTemplate(template: ResponseTemplate, variables: Record<string, string>): string {
  let filled = template.template

  for (const variable of template.variables) {
    const value = variables[variable] || `{${variable}}`
    filled = filled.replace(new RegExp(`{${variable}}`, 'g'), value)
  }

  return filled
}

/**
 * Generate personalized response using template
 */
export function generateFromTemplate(
  intent: string,
  context: ConversationContext,
  templateContext: TemplateContext
): string | null {
  const template = getResponseTemplate(intent, templateContext)

  if (!template) {
    return null
  }

  const variables: Record<string, string> = {
    patientName: context.patientInfo?.name || 'Pasien yang terhormat'
  }

  return fillTemplate(template, variables)
}

/**
 * Get template suggestions for LLM prompt engineering
 */
export function getTemplateSuggestions(intent: string): string[] {
  const suggestions: Record<string, string[]> = {
    verification_response: [
      'Konfirmasi verifikasi berhasil',
      'Minta konfirmasi ulang jika ambigu',
      'Jelaskan langkah selanjutnya'
    ],
    medication_confirmation: [
      'Berikan apresiasi atas kepatuhan',
      'Ingatkan pentingnya konsistensi',
      'Tawarkan bantuan jika ada masalah'
    ],
    general_inquiry: [
      'Sapa dengan ramah',
      'Tawarkan bantuan spesifik',
      'Jaga nada positif dan membantu'
    ],
    emergency: [
      'Prioritaskan keselamatan',
      'Arahkan ke bantuan profesional',
      'Jaga ketenangan dan empati'
    ]
  }

  return suggestions[intent] || []
}