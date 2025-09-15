// WhatsApp Messaging Service - centralizes WA message building and sending
import { 
  sendWhatsAppMessage, 
  formatWhatsAppNumber,
  WhatsAppMessageResult
} from '@/lib/fonnte'
import { ValidatedContent } from '@/services/reminder/reminder.types'

export class WhatsAppService {
  getContentPrefix(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case 'article':
        return '📚 Baca juga:'
      case 'video':
        return '🎥 Tonton juga:'
      default:
        return '📖 Lihat juga:'
    }
  }

  getContentIcon(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case 'article':
        return '📄'
      case 'video':
        return '🎥'
      default:
        return '📖'
    }
  }

  buildMessage(baseMessage: string, attachments: ValidatedContent[]): string {
    if (!attachments || attachments.length === 0) return baseMessage

    let message = baseMessage
    const contentByType: Record<string, ValidatedContent[]> = {}

    for (const content of attachments) {
      const type = content.type?.toLowerCase() || 'other'
      if (!contentByType[type]) contentByType[type] = []
      contentByType[type].push(content)
    }

    for (const contentType of Object.keys(contentByType)) {
      const contents = contentByType[contentType]
      message += `\n\n${this.getContentPrefix(contentType)}`
      for (const c of contents) {
        const icon = this.getContentIcon(c.type)
        message += `\n${icon} ${c.title}`
        message += `\n   ${c.url}`
      }
    }

    message += '\n\n💙 Tim PRIMA'
    return message
  }

  async send(toPhoneNumber: string, message: string) {
    const formatted = formatWhatsAppNumber(toPhoneNumber)
    return await sendWhatsAppMessage({ to: formatted, body: message })
  }


  /**
   * Send verification message to patient (text-based, not poll)
   */
  async sendVerificationMessage(phoneNumber: string, patientName: string): Promise<WhatsAppMessageResult> {
    const message = `🏥 *PRIMA - Verifikasi WhatsApp*

Halo ${patientName}!

Apakah Anda bersedia menerima pengingat kesehatan dari PRIMA melalui WhatsApp?

*Balas dengan salah satu:*
✅ YA / SETUJU / BOLEH
❌ TIDAK / TOLAK

Pesan ini akan kadaluarsa dalam 48 jam.

Terima kasih! 💙 Tim PRIMA`

    return await this.send(phoneNumber, message)
  }



  /**
   * Send follow-up message (15 minutes after initial reminder)
   */
  async sendFollowUpMessage(phoneNumber: string, patientName: string): Promise<WhatsAppMessageResult> {
    const message = `⏰ *Follow-up: Pengingat Kesehatan*

Halo ${patientName}!

Apakah sudah menyelesaikan rutinitas kesehatan?

*Balas dengan:*
✅ SUDAH / SELESAI
⏰ BELUM (butuh waktu lebih)
🆘 BANTUAN (butuh bantuan relawan)

💙 Tim PRIMA`

    return await this.send(phoneNumber, message)
  }

  /**
   * Send acknowledgment message after response
   */
  async sendAck(phoneNumber: string, message: string): Promise<WhatsAppMessageResult> {
    return await this.send(phoneNumber, message)
  }
}


