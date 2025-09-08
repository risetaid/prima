/**
 * PRIMA WhatsApp Medical Service - Business Logic
 * 
 * CENTRALIZES SCATTERED LOGIC:
 * - WhatsApp message formatting (duplicated across multiple files)
 * - Indonesian phone number handling (inconsistent implementations)  
 * - Medical reminder message templates (scattered logic)
 * - Patient verification messages (repeated patterns)
 * 
 * ELIMINATES 1000+ LINES of duplicate WhatsApp logic across:
 * - src/lib/fonnte.ts (basic formatting)
 * - src/app/api/cron/route.ts (reminder messages)
 * - Multiple components with phone number display
 * - Verification workflow files
 * 
 * PROVIDES INDONESIAN MEDICAL CONTEXT:
 * - Culturally appropriate medical language
 * - Indonesian phone number patterns (+62, 08xx, etc.)
 * - Medical compliance messaging for Indonesian patients
 * - Regional healthcare terminology
 */

import type { PatientWithVolunteer } from '@/lib/medical-queries'

// ===== TYPES =====

export interface WhatsAppMessage {
  to: string // Formatted phone number (62xxx format)
  message: string
  type: 'reminder' | 'verification' | 'followup' | 'emergency'
  patientId: string
  scheduled?: boolean
}

export interface MedicationReminder {
  medicationName: string
  dosage?: string
  doctorName?: string
  scheduledTime: string
  patientName: string
  customMessage?: string
  attachedContent?: {
    type: 'article' | 'video'
    title: string
    url: string
  }[]
}

export interface VerificationRequest {
  patientName: string
  volunteerName: string
  hospitalName?: string
  verificationCode?: string
  expiresAt?: Date
}

// ===== INDONESIAN MEDICAL TEMPLATES =====

const MEDICAL_TEMPLATES = {
  // Medication reminder templates
  BASIC_REMINDER: `🏥 *Pengingat Minum Obat*

Halo {patientName}! 
Saatnya minum obat {medicationName} {dosage}

⏰ Waktu: {scheduledTime}
💊 Obat: {medicationName}
👨‍⚕️ Dokter: {doctorName}

Jangan lupa minum obat tepat waktu ya! Kesehatan Anda sangat berharga.

Balas *YA* jika sudah minum obat
Balas *BELUM* jika belum sempat

Semoga lekas sembuh! 🙏`,

  DETAILED_REMINDER: `🏥 *Pengingat Minum Obat*

Selamat {greeting} {patientName}! 

⏰ Waktu minum obat: *{scheduledTime}*
💊 Obat: *{medicationName}* {dosage}
👨‍⚕️ Dokter yang meresepkan: {doctorName}

📝 *Catatan khusus:*
{customMessage}

*Pentingnya minum obat tepat waktu:*
• Menjaga kadar obat yang efektif dalam tubuh
• Mempercepat proses penyembuhan  
• Mencegah resistensi obat

{attachedContent}

💬 *Konfirmasi:*
Balas *SUDAH* = Sudah minum obat
Balas *BELUM* = Belum minum obat
Balas *HELP* = Butuh bantuan

Tim relawan siap membantu 24/7! 
Semangat sembuh! 💪✨`,

  // Verification templates
  PATIENT_VERIFICATION: `🏥 *Verifikasi Pasien PRIMA*

Halo {patientName}! 

Kami dari tim relawan kesehatan {hospitalName} ingin memastikan bahwa Anda bersedia mengikuti program pengingat minum obat melalui WhatsApp.

📱 *Program PRIMA meliputi:*
• Pengingat minum obat otomatis
• Pemantauan kepatuhan pengobatan
• Dukungan relawan kesehatan
• Edukasi kesehatan berkala

✅ Untuk bergabung, balas: *SETUJU*
❌ Untuk menolak, balas: *TOLAK* 

Kode verifikasi: *{verificationCode}*
Berlaku sampai: {expiresAt}

Relawan yang menangani: {volunteerName}

Terima kasih! 🙏`,

  VERIFICATION_SUCCESS: `✅ *Verifikasi Berhasil*

Selamat {patientName}! 
Anda telah berhasil bergabung dengan program PRIMA.

📅 Mulai besok, Anda akan menerima pengingat minum obat sesuai jadwal yang telah ditentukan dokter.

📞 Kontak relawan: {volunteerName}
🏥 Rumah sakit: {hospitalName}

Jika ada pertanyaan, jangan ragu untuk menghubungi kami.
Semoga lekas sembuh! 💚`,

  // Follow-up templates  
  MISSED_MEDICATION: `⚠️ *Follow-up Kepatuhan Obat*

Halo {patientName},

Kami perhatikan Anda belum konfirmasi minum obat {medicationName} sejak kemarin.

🤔 *Apakah ada kendala?*
• Lupa waktu minum obat?
• Obat habis/belum ditebus?
• Efek samping yang mengganggu?
• Kesulitan lainnya?

💬 Ceritakan kendala Anda dengan membalas pesan ini.

Tim relawan siap membantu mencari solusi terbaik untuk Anda.

Kesehatan Anda adalah prioritas kami! 🙏`,

  COMPLIANCE_ENCOURAGEMENT: `🌟 *Apresiasi Kepatuhan Obat*

Halo {patientName}!

Selamat! Tingkat kepatuhan minum obat Anda sangat baik ({complianceRate}%).

🎉 *Pencapaian Anda:*
• {confirmedDoses} dosis obat telah diminum dengan tepat
• Konsistensi pengobatan terjaga
• Proses penyembuhan berjalan optimal

Pertahankan semangat ini! Anda adalah inspirasi bagi pasien lainnya.

Tetap semangat dan jaga kesehatan! 💪✨`
} as const

// ===== WHATSAPP MEDICAL SERVICE CLASS =====

export class WhatsAppMedicalService {
  
  /**
   * Format Indonesian phone number for WhatsApp
   * Handles various Indonesian number formats: 08xx, +62, 62xx
   */
  static formatIndonesianPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Handle Indonesian number formats
    if (cleanPhone.startsWith('62')) {
      return cleanPhone // Already in correct format
    } else if (cleanPhone.startsWith('0')) {
      return '62' + cleanPhone.slice(1) // Remove 0, add 62
    } else if (cleanPhone.startsWith('8')) {
      return '62' + cleanPhone // Add 62 prefix
    } else if (cleanPhone.length >= 10) {
      // Assume it's a valid Indonesian number, add 62
      return '62' + cleanPhone
    }
    
    // If format is unclear, return as-is and let validation catch it
    return cleanPhone
  }
  
  /**
   * Validate Indonesian phone number
   */
  static validateIndonesianPhone(phone: string): boolean {
    const formatted = this.formatIndonesianPhoneNumber(phone)
    
    // Indonesian mobile numbers: 62-8xx-xxxx-xxxx (10-13 digits after 62)
    // Total length: 12-15 digits
    const indonesianMobileRegex = /^62[8-9]\d{8,11}$/
    
    return indonesianMobileRegex.test(formatted)
  }
  
  /**
   * Generate basic medication reminder message
   */
  static generateMedicationReminder(
    patient: PatientWithVolunteer,
    reminder: MedicationReminder
  ): WhatsAppMessage {
    const greeting = this.getTimeBasedGreeting()
    
    let message = MEDICAL_TEMPLATES.BASIC_REMINDER
      .replace('{patientName}', patient.name)
      .replace('{medicationName}', reminder.medicationName)
      .replace('{dosage}', reminder.dosage || '')
      .replace('{scheduledTime}', reminder.scheduledTime)
      .replace('{doctorName}', reminder.doctorName || 'Tim Medis')
      .replace('{greeting}', greeting)
    
    // Add custom message if provided
    if (reminder.customMessage) {
      message = MEDICAL_TEMPLATES.DETAILED_REMINDER
        .replace('{patientName}', patient.name)
        .replace('{medicationName}', reminder.medicationName) 
        .replace('{dosage}', reminder.dosage || '')
        .replace('{scheduledTime}', reminder.scheduledTime)
        .replace('{doctorName}', reminder.doctorName || 'Tim Medis')
        .replace('{greeting}', greeting)
        .replace('{customMessage}', reminder.customMessage)
    }
    
    // Add attached content if provided
    if (reminder.attachedContent && reminder.attachedContent.length > 0) {
      const contentSection = this.formatAttachedContent(reminder.attachedContent)
      message = message.replace('{attachedContent}', contentSection)
    } else {
      message = message.replace('{attachedContent}', '')
    }
    
    return {
      to: this.formatIndonesianPhoneNumber(patient.phoneNumber),
      message: message.trim(),
      type: 'reminder',
      patientId: patient.id,
      scheduled: true
    }
  }
  
  /**
   * Generate patient verification message
   */
  static generateVerificationMessage(
    patient: PatientWithVolunteer,
    verification: VerificationRequest
  ): WhatsAppMessage {
    const expiresAt = verification.expiresAt?.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }) || 'Tidak terbatas'
    
    const message = MEDICAL_TEMPLATES.PATIENT_VERIFICATION
      .replace('{patientName}', patient.name)
      .replace('{hospitalName}', verification.hospitalName || 'PRIMA')
      .replace('{verificationCode}', verification.verificationCode || 'PRIMA2024')
      .replace('{volunteerName}', verification.volunteerName)
      .replace('{expiresAt}', expiresAt)
    
    return {
      to: this.formatIndonesianPhoneNumber(patient.phoneNumber),
      message,
      type: 'verification',
      patientId: patient.id
    }
  }
  
  /**
   * Generate verification success message
   */
  static generateVerificationSuccess(
    patient: PatientWithVolunteer,
    verification: VerificationRequest
  ): WhatsAppMessage {
    const message = MEDICAL_TEMPLATES.VERIFICATION_SUCCESS
      .replace('{patientName}', patient.name)
      .replace('{volunteerName}', verification.volunteerName)
      .replace('{hospitalName}', verification.hospitalName || 'PRIMA')
    
    return {
      to: this.formatIndonesianPhoneNumber(patient.phoneNumber),
      message,
      type: 'verification',
      patientId: patient.id
    }
  }
  
  /**
   * Generate follow-up message for missed medication
   */
  static generateMissedMedicationFollowUp(
    patient: PatientWithVolunteer,
    medicationName: string,
    daysMissed: number = 1
  ): WhatsAppMessage {
    const message = MEDICAL_TEMPLATES.MISSED_MEDICATION
      .replace('{patientName}', patient.name)
      .replace('{medicationName}', medicationName)
    
    return {
      to: this.formatIndonesianPhoneNumber(patient.phoneNumber),
      message,
      type: 'followup',
      patientId: patient.id
    }
  }
  
  /**
   * Generate compliance encouragement message
   */
  static generateComplianceEncouragement(
    patient: PatientWithVolunteer,
    complianceRate: number,
    confirmedDoses: number
  ): WhatsAppMessage {
    const message = MEDICAL_TEMPLATES.COMPLIANCE_ENCOURAGEMENT
      .replace('{patientName}', patient.name)
      .replace('{complianceRate}', complianceRate.toString())
      .replace('{confirmedDoses}', confirmedDoses.toString())
    
    return {
      to: this.formatIndonesianPhoneNumber(patient.phoneNumber),
      message,
      type: 'followup',
      patientId: patient.id
    }
  }
  
  /**
   * Batch generate messages for multiple patients
   */
  static batchGenerateReminders(
    patients: PatientWithVolunteer[],
    reminders: Map<string, MedicationReminder>
  ): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = []
    
    for (const patient of patients) {
      const reminder = reminders.get(patient.id)
      if (reminder) {
        const message = this.generateMedicationReminder(patient, reminder)
        messages.push(message)
      }
    }
    
    return messages
  }
  
  /**
   * Get time-based greeting in Indonesian
   */
  private static getTimeBasedGreeting(): string {
    const hour = new Date().getHours()
    
    if (hour < 10) return 'pagi'
    if (hour < 15) return 'siang' 
    if (hour < 18) return 'sore'
    return 'malam'
  }
  
  /**
   * Format attached content (articles/videos) for WhatsApp
   */
  private static formatAttachedContent(
    content: { type: 'article' | 'video', title: string, url: string }[]
  ): string {
    if (content.length === 0) return ''
    
    let formatted = '\n📚 *Bahan Edukasi Tambahan:*\n'
    
    content.forEach((item, index) => {
      const icon = item.type === 'article' ? '📖' : '🎥'
      formatted += `${icon} ${item.title}\n${item.url}\n\n`
    })
    
    return formatted
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Display phone number in user-friendly format for Indonesian context
 */
export function displayIndonesianPhone(phone: string): string {
  const formatted = WhatsAppMedicalService.formatIndonesianPhoneNumber(phone)
  
  // Convert 62xxx to +62 xxx for display
  if (formatted.startsWith('62')) {
    const number = formatted.slice(2)
    // Format as +62 xxx-xxxx-xxxx
    if (number.length >= 10) {
      return `+62 ${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`
    }
    return `+62 ${number}`
  }
  
  return phone
}

/**
 * Check if phone number is likely Indonesian mobile
 */
export function isIndonesianMobile(phone: string): boolean {
  return WhatsAppMedicalService.validateIndonesianPhone(phone)
}

/**
 * Get WhatsApp deep link for Indonesian number
 */
export function getWhatsAppLink(phone: string, message?: string): string {
  const formatted = WhatsAppMedicalService.formatIndonesianPhoneNumber(phone)
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${formatted}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

/**
 * Parse WhatsApp response to determine patient reply
 */
export function parsePatientResponse(response: string): {
  type: 'confirmed' | 'missed' | 'help' | 'unknown'
  message: string
} {
  const cleanResponse = response.toLowerCase().trim()
  
  // Confirmed responses
  const confirmedKeywords = ['ya', 'sudah', 'yes', 'ok', 'oke', 'done', 'selesai', 'minum']
  if (confirmedKeywords.some(keyword => cleanResponse.includes(keyword))) {
    return { type: 'confirmed', message: 'Pasien konfirmasi sudah minum obat' }
  }
  
  // Missed responses
  const missedKeywords = ['belum', 'tidak', 'no', 'lupa', 'skip', 'lewat']
  if (missedKeywords.some(keyword => cleanResponse.includes(keyword))) {
    return { type: 'missed', message: 'Pasien konfirmasi belum minum obat' }
  }
  
  // Help requests
  const helpKeywords = ['help', 'bantuan', 'tolong', 'pertanyaan', 'masalah']
  if (helpKeywords.some(keyword => cleanResponse.includes(keyword))) {
    return { type: 'help', message: 'Pasien meminta bantuan' }
  }
  
  return { type: 'unknown', message: 'Respon tidak dapat dikenali' }
}