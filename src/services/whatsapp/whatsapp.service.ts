// WhatsApp Messaging Service - centralizes WA message building and sending
import { 
  sendWhatsAppMessage, 
  formatWhatsAppNumber,
  WhatsAppMessage,
  WhatsAppMessageResult,
  createVerificationPoll,
  createMedicationPoll,
  createFollowUpPoll
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
   * Send poll message via WhatsApp
   */
  async sendPoll(pollMessage: WhatsAppMessage): Promise<WhatsAppMessageResult> {
    const formatted = formatWhatsAppNumber(pollMessage.to)
    return await sendWhatsAppMessage({ ...pollMessage, to: formatted })
  }

  /**
   * Send verification poll to patient
   */
  async sendVerificationPoll(phoneNumber: string, patientName: string): Promise<WhatsAppMessageResult> {
    const pollMessage = createVerificationPoll(patientName)
    pollMessage.to = phoneNumber
    return await this.sendPoll(pollMessage)
  }

  /**
   * Send medication reminder with poll options
   */
  async sendMedicationPoll(
    phoneNumber: string, 
    patientName: string, 
    medicationName: string, 
    dosage: string, 
    time: string,
    attachments?: ValidatedContent[]
  ): Promise<WhatsAppMessageResult> {
    const pollMessage = createMedicationPoll(patientName, medicationName, dosage, time)
    
    // Add content attachments if provided
    if (attachments && attachments.length > 0) {
      pollMessage.body = this.buildMessage(pollMessage.body, attachments)
    }
    
    pollMessage.to = phoneNumber
    return await this.sendPoll(pollMessage)
  }

  /**
   * Send follow-up poll (15 minutes after initial reminder)
   */
  async sendFollowUpPoll(phoneNumber: string, patientName: string): Promise<WhatsAppMessageResult> {
    const pollMessage = createFollowUpPoll(patientName)
    pollMessage.to = phoneNumber
    return await this.sendPoll(pollMessage)
  }

  /**
   * Send acknowledgment message after poll response
   */
  async sendAck(phoneNumber: string, message: string): Promise<WhatsAppMessageResult> {
    return await this.send(phoneNumber, message)
  }

  /**
   * Build medication reminder message with poll for manual sending
   */
  buildMedicationReminderWithPoll(
    patientName: string,
    medicationName: string,
    dosage: string,
    time: string,
    attachments: ValidatedContent[]
  ): WhatsAppMessage {
    const pollMessage = createMedicationPoll(patientName, medicationName, dosage, time)
    
    // Add content attachments
    if (attachments && attachments.length > 0) {
      pollMessage.body = this.buildMessage(pollMessage.body, attachments)
    }
    
    return pollMessage
  }
}


