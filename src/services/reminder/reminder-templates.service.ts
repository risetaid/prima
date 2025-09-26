/**
 * Reminder Templates Service
 * Handles type-aware message formatting for different reminder types
 */

export interface ReminderMessageTemplate {
  patientName: string;
  reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  title?: string;
  description?: string;
  message: string;
  scheduledTime: string;
  metadata?: Record<string, unknown>;
}

export interface ReminderResponseTemplate {
  reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  responseType: 'CONFIRMED' | 'MISSED' | 'PENDING' | 'HELP';
  patientName: string;
  reminderTitle?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export class ReminderTemplatesService {
  /**
   * Format reminder message based on type and context
   */
  formatReminderMessage(template: ReminderMessageTemplate): string {
    const { reminderType, patientName, title, description, message, scheduledTime, metadata } = template;

    const formattedTime = this.formatTime(scheduledTime);

    switch (reminderType) {
      case 'MEDICATION':
        return this.formatMedicationReminder({
          patientName,
          medicationName: (metadata?.medicationName as string) || title || 'obat',
          dosage: metadata?.dosage as string,
          form: (metadata?.form as string) || 'tablet',
          scheduledTime: formattedTime,
          message,
        });

      case 'APPOINTMENT':
        return this.formatAppointmentReminder({
          patientName,
          appointmentType: (metadata?.appointmentType as string) || title || 'Janji Temu',
          doctorName: metadata?.doctorName as string,
          location: metadata?.location as string,
          scheduledTime: formattedTime,
          message,
        });

      case 'GENERAL':
        return this.formatGeneralReminder({
          patientName,
          title: title || 'Pengingat',
          description: description || message,
          scheduledTime: formattedTime,
          message,
          metadata,
        });

      default:
        return this.formatDefaultReminder({
          patientName,
          title: title || 'Pengingat',
          message,
          scheduledTime: formattedTime,
        });
    }
  }

  /**
   * Format response message based on reminder type and response status
   */
  formatResponseMessage(template: ReminderResponseTemplate): string {
    const { reminderType, responseType, patientName, reminderTitle, timestamp } = template;

    const formattedTime = timestamp || new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta'
    });

    switch (responseType) {
      case 'CONFIRMED':
        return this.formatConfirmedResponse(reminderType, patientName, reminderTitle, formattedTime);
      case 'MISSED':
        return this.formatMissedResponse(reminderType, patientName, reminderTitle);
      case 'PENDING':
        return this.formatPendingResponse(reminderType, patientName, reminderTitle);
      case 'HELP':
        return this.formatHelpResponse(reminderType, patientName);
      default:
        return this.formatDefaultResponse(reminderType, patientName);
    }
  }

  /**
   * Format medication-specific reminder message
   */
  private formatMedicationReminder(params: {
    patientName: string;
    medicationName: string;
    dosage?: string;
    form?: string;
    scheduledTime: string;
    message?: string;
  }): string {
    const { patientName, medicationName, dosage, message } = params;
    const icon = this.getReminderIcon('MEDICATION');

    let reminderText = `${icon} *Pengingat Obat*\n\n`;
    reminderText += `Halo ${patientName}!\n\n`;
    reminderText += `Saatnya minum ${medicationName}`;

    if (dosage) {
      reminderText += ` (${dosage})`;
    }

    reminderText += `.\n\n`;
    // Waktu dihilangkan sesuai permintaan

    if (message) {
      reminderText += `${message}\n\n`;
    }

    reminderText += `Silakan konfirmasi setelah minum obat dengan membalas:\n`;
    reminderText += `✅ *SUDAH* jika sudah diminum\n`;
    reminderText += `⏰ *BELUM* jika belum diminum\n`;
    reminderText += `🆘 *BANTUAN* jika butuh bantuan\n\n`;
    reminderText += `💙 Tim PRIMA`;

    return reminderText;
  }

  /**
   * Format appointment-specific reminder message
   */
  private formatAppointmentReminder(params: {
    patientName: string;
    appointmentType: string;
    doctorName?: string;
    location?: string;
    scheduledTime: string;
    message?: string;
  }): string {
    const { patientName, appointmentType, doctorName, location, message } = params;

    let reminderText = `📅 *Pengingat Janji Temu*\n\n`;
    reminderText += `Halo ${patientName}!\n\n`;
    reminderText += `Anda memiliki janji temu: ${appointmentType}\n`;

    if (doctorName) {
      reminderText += `Dengan: ${doctorName}\n`;
    }

    if (location) {
      reminderText += `Lokasi: ${location}\n`;
    }

    // Waktu dihilangkan sesuai permintaan

    if (message) {
      reminderText += `${message}\n\n`;
    }

    reminderText += `Silakan konfirmasi kehadiran Anda dengan membalas:\n`;
    reminderText += `✅ *HADIR* jika akan datang\n`;
    reminderText += `⏰ *TERLAMBAT* jika akan terlambat\n`;
    reminderText += `❌ *BATAL* jika tidak bisa hadir\n`;
    reminderText += `🆘 *BANTUAN* jika butuh bantuan\n\n`;
    reminderText += `💙 Tim PRIMA`;

    return reminderText;
  }

  /**
   * Format general reminder message
   */
  private formatGeneralReminder(params: {
    patientName: string;
    title: string;
    description: string;
    scheduledTime: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }): string {
    const { patientName, title, description, message } = params;

    let reminderText = `📝 *${title}*\n\n`;
    reminderText += `Halo ${patientName}!\n\n`;
    reminderText += `${description}\n\n`;
    // Waktu dihilangkan sesuai permintaan

    if (message) {
      reminderText += `${message}\n\n`;
    }

    reminderText += `Silakan konfirmasi dengan membalas:\n`;
    reminderText += `✅ *SELESAI* jika sudah dilakukan\n`;
    reminderText += `⏰ *BELUM* jika belum dilakukan\n`;
    reminderText += `🆘 *BANTUAN* jika butuh bantuan\n\n`;
    reminderText += `💙 Tim PRIMA`;

    return reminderText;
  }

  /**
   * Format default reminder message
   */
  private formatDefaultReminder(params: {
    patientName: string;
    title: string;
    message: string;
    scheduledTime: string;
  }): string {
    const { patientName, title, message } = params;

    return `📝 *${title}*\n\n` +
           `Halo ${patientName}!\n\n` +
           `${message}\n\n` +
           `Silakan konfirmasi dengan membalas:\n` +
           `✅ *SELESAI* jika sudah dilakukan\n` +
           `⏰ *BELUM* jika belum dilakukan\n` +
           `🆘 *BANTUAN* jika butuh bantuan\n\n` +
           `💙 Tim PRIMA`;
  }

  /**
   * Format confirmed response message
   */
  private formatConfirmedResponse(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    patientName: string,
    reminderTitle?: string,
    timestamp?: string
  ): string {
    let message = `Terima kasih ${patientName}! ✅\n\n`;

    switch (reminderType) {
      case 'MEDICATION':
        message += reminderTitle
          ? `${reminderTitle} sudah dikonfirmasi diminum`
          : 'Obat sudah dikonfirmasi diminum';
        break;
      case 'APPOINTMENT':
        message += reminderTitle
          ? `${reminderTitle} sudah dikonfirmasi`
          : 'Janji temu sudah dikonfirmasi';
        break;
      case 'GENERAL':
        message += reminderTitle
          ? `${reminderTitle} sudah dikonfirmasi selesai`
          : 'Pengingat sudah dikonfirmasi selesai';
        break;
    }

    if (timestamp) {
      message += ` pada ${timestamp}`;
    }

    message += '\n\n💙 Tim PRIMA';

    return message;
  }

  /**
   * Format missed/pending response message
   */
  private formatMissedResponse(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    patientName: string,
    reminderTitle?: string
  ): string {
    let message = `Baik ${patientName}, `;

    switch (reminderType) {
      case 'MEDICATION':
        message += `jangan lupa minum ${reminderTitle || 'obat'}nya ya! 💊`;
        break;
      case 'APPOINTMENT':
        message += `jangan lupa datang ke ${reminderTitle || 'janji temu'} Anda! 📅`;
        break;
      case 'GENERAL':
        message += 'jangan lupa lakukan pengingat Anda! 📝';
        break;
    }

    message += '\n\nKami akan mengingatkan lagi nanti.\n\n';
    message += '💙 Tim PRIMA';

    return message;
  }

  /**
   * Format pending response message
   */
  private formatPendingResponse(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    patientName: string,
    reminderTitle?: string
  ): string {
    return this.formatMissedResponse(reminderType, patientName, reminderTitle);
  }

  /**
   * Format help response message
   */
  private formatHelpResponse(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    patientName: string
  ): string {
    return `Baik ${patientName}, relawan kami akan segera menghubungi Anda untuk membantu. 🤝\n\n` +
           `Tunggu sebentar ya!\n\n` +
           `💙 Tim PRIMA`;
  }

  /**
   * Format default response message
   */
  private formatDefaultResponse(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    patientName: string
  ): string {
    return `Terima kasih ${patientName} atas respons Anda.\n\n` +
           `Tim PRIMA telah mencatat informasi Anda.\n\n` +
           `💙 Tim PRIMA`;
  }

  /**
   * Get icon for reminder type
   */
  private getReminderIcon(type: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL'): string {
    switch (type) {
      case 'MEDICATION':
        return '💊';
      case 'APPOINTMENT':
        return '📅';
      case 'GENERAL':
        return '📝';
      default:
        return '📝';
    }
  }

  /**
   * Format time for display
   */
  private formatTime(time: string): string {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return time;
    }
  }

  /**
   * Get reminder-specific follow-up message templates
   */
  getFollowupTemplates(type: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL'): {
    '15min': string;
    '2h': string;
    '24h': string;
  } {
    const baseTemplates = {
      '15min': '15 menit yang lalu kami mengirim pengingat',
      '2h': '2 jam yang lalu kami mengirim pengingat',
      '24h': '24 jam yang lalu kami mengirim pengingat',
    };

    const typeSpecificQuestions = {
      'MEDICATION': 'Apakah sudah diminum?',
      'APPOINTMENT': 'Apakah sudah hadir?',
      'GENERAL': 'Apakah sudah dilakukan?',
    };

    return {
      '15min': `${baseTemplates['15min']} ${typeSpecificQuestions[type]}`,
      '2h': `${baseTemplates['2h']} ${typeSpecificQuestions[type]}`,
      '24h': `${baseTemplates['24h']} Mohon konfirmasi kegiatan Anda.`,
    };
  }

  /**
   * Get clarification message for low confidence responses
   */
  getClarificationMessage(type: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL', patientName: string): string {
    const baseMessage = `Halo ${patientName}, mohon balas dengan jelas:\n\n`;

    switch (type) {
      case 'MEDICATION':
        return baseMessage + `✅ *SUDAH* jika sudah minum obat\n⏰ *BELUM* jika belum minum\n🆘 *BANTUAN* jika butuh bantuan\n\nTerima kasih! 💙 Tim PRIMA`;
      case 'APPOINTMENT':
        return baseMessage + `✅ *HADIR* jika akan datang\n⏰ *TERLAMBAT* jika akan terlambat\n❌ *BATAL* jika tidak bisa hadir\n🆘 *BANTUAN* jika butuh bantuan\n\nTerima kasih! 💙 Tim PRIMA`;
      case 'GENERAL':
        return baseMessage + `✅ *SELESAI* jika sudah dilakukan\n⏰ *BELUM* jika belum dilakukan\n🆘 *BANTUAN* jika butuh bantuan\n\nTerima kasih! 💙 Tim PRIMA`;
      default:
        return baseMessage + `✅ *YA* atau *SETUJU* untuk konfirmasi\n❌ *TIDAK* atau *TOLAK* untuk menolak\n\nTerima kasih! 💙 Tim PRIMA`;
    }
  }
}