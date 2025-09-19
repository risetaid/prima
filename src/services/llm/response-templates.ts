/**
 * Response Templates for LLM-generated patient messages
 * Provides structured templates for different conversation contexts with enhanced medication support
 */

import { ConversationContext } from './llm.types'
import { MedicationDetails } from '@/lib/medication-parser'

export interface ResponseTemplate {
  template: string
  variables: string[]
  tone: 'friendly' | 'professional' | 'empathetic' | 'urgent'
  maxLength?: number
  category?: 'GENERAL' | 'MEDICATION' | 'VERIFICATION' | 'EMERGENCY' | 'EDUCATIONAL'
  medicationAware?: boolean
}

export interface TemplateContext {
  patientName?: string
  intent: string
  confidence: number
  conversationHistory: number
  hasActiveReminders: boolean
  verificationStatus?: string
  medicationDetails?: MedicationDetails
  medicationContext?: MedicationContext
}

export interface MedicationContext {
  medicationName: string
  dosage?: string
  frequency?: string
  timing?: string
  category?: string
  isHighPriority: boolean
  hasSideEffects: boolean
  requiresSpecialInstructions: boolean
  lastTaken?: Date
  nextDue?: Date
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

  // Enhanced Medication confirmation responses
  medication_confirmed: {
    template: `Bagus sekali, {patientName}! 💊✅

Terima kasih sudah mengonfirmasi bahwa Anda telah minum {medicationName} {dosage}. Konsistensi seperti ini sangat penting untuk kesehatan Anda.

{medicationInstructions}

Jaga terus pola hidup sehatnya ya!

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName', 'dosage', 'medicationInstructions'],
    tone: 'friendly',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 300
  },

  medication_confirmed_simple: {
    template: `Bagus, {patientName}! 💊✅

Terima kasih sudah minum {medicationName}. Semoga lekas sembuh!

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName'],
    tone: 'friendly',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 150
  },

  medication_missed: {
    template: `Tidak apa-apa, {patientName}. 😊

Yang penting segera minum {medicationName} {dosage} ya. Jika ada kendala atau lupa, ceritakan saja kepada relawan PRIMA agar bisa membantu.

{missedMedicationInstructions}

Kesehatan Anda adalah prioritas kami!

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName', 'dosage', 'missedMedicationInstructions'],
    tone: 'empathetic',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 300
  },

  medication_reminder: {
    template: `Halo {patientName}! 💊⏰

Saatnya minum {medicationName} {dosage} sesuai jadwal ya. {timingInstructions}

Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName', 'dosage', 'timingInstructions'],
    tone: 'friendly',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 250
  },

  medication_reminder_detailed: {
    template: `Halo {patientName}! 💊⏰

{reminderHeader}

📋 *Detail Obat:*
• Nama: {medicationName}
• Dosis: {dosage}
• Frekuensi: {frequency}
• Waktu: {timing}

{specialInstructions}

Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".

💙 Tim PRIMA`,
    variables: ['patientName', 'reminderHeader', 'medicationName', 'dosage', 'frequency', 'timing', 'specialInstructions'],
    tone: 'professional',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 400
  },

  medication_side_effect_reminder: {
    template: `Halo {patientName}! 💊⏰

Saatnya minum {medicationName} {dosage}. {timingInstructions}

⚠️ *Catatan:* Jika mengalami {sideEffects}, segera hubungi relawan PRIMA.

Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName', 'dosage', 'timingInstructions', 'sideEffects'],
    tone: 'professional',
    category: 'MEDICATION',
    medicationAware: true,
    maxLength: 300
  },

  medication_help_requested: {
    template: `🤝 *Bantuan Diperlukan*

Baik {patientName}, relawan kami akan segera menghubungi Anda untuk membantu.

Apakah terkait {medicationName}? Ceritakan lebih detail ya agar kami bisa membantu dengan tepat.

💙 Tim PRIMA`,
    variables: ['patientName', 'medicationName'],
    tone: 'empathetic',
    category: 'MEDICATION',
    medicationAware: true,
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
 * Map intent to template key based on context with medication awareness
 */
function mapIntentToTemplate(intent: string, context: TemplateContext): string | null {
  switch (intent) {
    case 'verification_response':
      return context.verificationStatus === 'VERIFIED' ? 'verification_success' : 'verification_pending'

    case 'medication_confirmation':
      // Enhanced medication confirmation logic
      if (context.medicationContext) {
        if (context.medicationContext.isHighPriority) {
          return 'medication_confirmed' // Use detailed template for high priority
        }
        return 'medication_confirmed_simple' // Use simple template for regular medications
      }
      return 'medication_confirmed' // Default fallback

    case 'medication_reminder':
      // Enhanced medication reminder logic
      if (context.medicationContext) {
        if (context.medicationContext.hasSideEffects) {
          return 'medication_side_effect_reminder'
        }
        if (context.medicationContext.requiresSpecialInstructions) {
          return 'medication_reminder_detailed'
        }
      }
      return 'medication_reminder'

    case 'medication_missed':
      return 'medication_missed'

    case 'medication_help':
      return 'medication_help_requested'

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
 * Generate personalized response using template with medication awareness
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

  // Add medication-specific variables if available
  if (templateContext.medicationContext) {
    const medContext = templateContext.medicationContext
    variables.medicationName = medContext.medicationName || 'obat'
    variables.dosage = medContext.dosage || ''
    variables.frequency = medContext.frequency || ''
    variables.timing = medContext.timing || ''

    // Generate contextual instructions
    variables.timingInstructions = generateTimingInstructions(medContext.timing)
    variables.medicationInstructions = generateMedicationInstructions(medContext)
    variables.missedMedicationInstructions = generateMissedMedicationInstructions(medContext)
    variables.specialInstructions = generateSpecialInstructions(medContext)
    variables.sideEffects = medContext.hasSideEffects ? 'efek samping seperti mual atau pusing' : ''
    variables.reminderHeader = medContext.isHighPriority ?
      '⚠️ *Pengingat Obat Penting*' : '💊 *Pengingat Obat*'
  }

  // Add medication details from parsed data if available
  if (templateContext.medicationDetails) {
    const medDetails = templateContext.medicationDetails
    if (!variables.medicationName) variables.medicationName = medDetails.name
    if (!variables.dosage) variables.dosage = medDetails.dosage
    if (!variables.frequency) variables.frequency = medDetails.frequency
    if (!variables.timing) variables.timing = medDetails.timing
  }

  return fillTemplate(template, variables)
}

/**
 * Generate timing instructions based on medication timing
 */
function generateTimingInstructions(timing?: string): string {
  const timingMap: Record<string, string> = {
    'BEFORE_MEAL': 'Minum 30 menit sebelum makan',
    'WITH_MEAL': 'Minum saat makan',
    'AFTER_MEAL': 'Minum 30 menit setelah makan',
    'BEDTIME': 'Minum sebelum tidur',
    'MORNING': 'Minum di pagi hari',
    'AFTERNOON': 'Minum di siang hari',
    'EVENING': 'Minum di sore hari',
    'ANYTIME': 'Minum sesuai jadwal'
  }

  return timingMap[timing || ''] || 'Minum sesuai jadwal'
}

/**
 * Generate medication instructions based on context
 */
function generateMedicationInstructions(medContext: MedicationContext): string {
  const instructions = []

  if (medContext.category === 'CHEMOTHERAPY') {
    instructions.push('Obat kemoterapi ini sangat penting untuk pengobatan Anda.')
  }

  if (medContext.isHighPriority) {
    instructions.push('Pastikan tidak melewatkan dosis ini.')
  }

  if (medContext.requiresSpecialInstructions) {
    instructions.push('Ikuti petunjuk khusus dari dokter dengan teliti.')
  }

  return instructions.join(' ') || 'Teruskan pengobatan sesuai anjuran dokter.'
}

/**
 * Generate missed medication instructions
 */
function generateMissedMedicationInstructions(medContext: MedicationContext): string {
  const instructions = []

  if (medContext.isHighPriority) {
    instructions.push('Segera minum obat ini dan hubungi relawan jika perlu bantuan.')
  } else {
    instructions.push('Minum segera dan jangan lupa dosis berikutnya.')
  }

  if (medContext.category === 'CHEMOTHERAPY') {
    instructions.push('Kemoterapi membutuhkan konsistensi waktu yang tepat.')
  }

  return instructions.join(' ')
}

/**
 * Generate special instructions for medications
 */
function generateSpecialInstructions(medContext: MedicationContext): string {
  const instructions = []

  if (medContext.hasSideEffects) {
    instructions.push('⚠️ Perhatikan efek samping dan segera hubungi relawan jika diperlukan.')
  }

  if (medContext.requiresSpecialInstructions) {
    instructions.push('📋 Ikuti petunjuk khusus dari dokter dengan teliti.')
  }

  if (medContext.category === 'CHEMOTHERAPY') {
    instructions.push('💉 Obat kemoterapi - pastikan istirahat yang cukup setelah minum obat.')
  }

  return instructions.join('\n') || ''
}

/**
 * Get template suggestions for LLM prompt engineering with medication awareness
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
      'Tawarkan bantuan jika ada masalah',
      'Sebutkan nama obat secara spesifik',
      'Sertakan instruksi khusus jika diperlukan'
    ],
    medication_reminder: [
      'Sebutkan nama obat dan dosis dengan jelas',
      'Berikan instruksi waktu minum yang spesifik',
      'Sertakan peringatan efek samping jika ada',
      'Gunakan emoji yang sesuai untuk jenis obat',
      'Prioritaskan obat kemoterapi atau obat penting'
    ],
    medication_help: [
      'Tawarkan bantuan relawan dengan segera',
      'Tanyakan detail masalah yang dialami',
      'Sebutkan nama obat yang terkait',
      'Berikan rasa aman dan empati'
    ],
    general_inquiry: [
      'Sapa dengan ramah',
      'Tawarkan bantuan spesifik',
      'Jaga nada positif dan membantu'
    ],
    emergency: [
      'Prioritaskan keselamatan',
      'Arahkan ke bantuan profesional',
      'Jaga ketenangan dan empati',
      'Sebutkan apakah terkait obat tertentu'
    ]
  }

  return suggestions[intent] || []
}

/**
 * Get medication-aware template based on medication details
 */
export function getMedicationAwareTemplate(
  intent: string,
  medicationDetails: MedicationDetails
): ResponseTemplate | null {
  const context: MedicationContext = {
    medicationName: medicationDetails.name,
    dosage: medicationDetails.dosage,
    frequency: medicationDetails.frequency,
    timing: medicationDetails.timing,
    category: medicationDetails.category,
    isHighPriority: ['CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY'].includes(medicationDetails.category),
    hasSideEffects: (medicationDetails.sideEffects && medicationDetails.sideEffects.length > 0) || false,
    requiresSpecialInstructions: (!!medicationDetails.instructions) || false
  }

  const templateContext: TemplateContext = {
    intent,
    confidence: 1.0,
    conversationHistory: 0,
    hasActiveReminders: true,
    medicationContext: context,
    medicationDetails
  }

  return getResponseTemplate(intent, templateContext)
}

/**
 * Create medication context from medication details
 */
export function createMedicationContext(medicationDetails: MedicationDetails): MedicationContext {
  return {
    medicationName: medicationDetails.name,
    dosage: medicationDetails.dosage,
    frequency: medicationDetails.frequency,
    timing: medicationDetails.timing,
    category: medicationDetails.category,
    isHighPriority: ['CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'HORMONAL_THERAPY'].includes(medicationDetails.category),
    hasSideEffects: (medicationDetails.sideEffects && medicationDetails.sideEffects.length > 0) || false,
    requiresSpecialInstructions: (!!medicationDetails.instructions || medicationDetails.category === 'CHEMOTHERAPY') || false
  }
}