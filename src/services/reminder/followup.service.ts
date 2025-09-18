// Reminder Followup Service - Simplified stub since followup tables were removed

// Basic followup interface for backwards compatibility
export interface ReminderFollowup {
  id: string;
  patientId: string;
  status: string;
  message: string;
  scheduledAt: Date;
}

export interface NewReminderFollowup {
  patientId: string;
  message: string;
  scheduledAt: Date;
}

export class FollowupService {
  constructor() {
    // Simplified constructor
  }

  /**
   * Schedule a 15-minute followup for a reminder log - stubbed since table was removed
   */
  async schedule15MinuteFollowup(
    reminderId: string,
    followupType: "REMINDER_CONFIRMATION" | "MEDICATION_COMPLIANCE" | "SYMPTOM_CHECK" | "GENERAL_WELLBEING" = "REMINDER_CONFIRMATION"
  ): Promise<ReminderFollowup> {
    // Followup tables were removed from schema
    // Return a basic stub response
    return {
      id: 'stub-id',
      patientId: reminderId, // Use reminderId to avoid unused variable warning
      status: 'DISABLED',
      message: `Followup functionality disabled for ${followupType}`,
      scheduledAt: new Date()
    };
  }

  /**
   * Get pending followups - returns empty array since table was removed
   */
  async processPendingFollowups(): Promise<void> {
    // No-op since table was removed
  }

  /**
   * Process followup response - stubbed
   */
  async processFollowupResponse(
    patientId: string,
    phoneNumber: string,
    message: string,
    followupId: string
  ): Promise<{
    processed: boolean;
    emergencyDetected: boolean;
    response: string;
    escalated: boolean;
  }> {
    return {
      processed: false,
      emergencyDetected: false,
      response: `Followup functionality disabled for patient ${patientId} (${phoneNumber}) - message: ${message.substring(0, 20)}... followupId: ${followupId}`,
      escalated: false
    };
  }

  /**
   * Get followup metrics - returns empty stats
   */
  async getFollowupStats(patientId?: string): Promise<Record<string, number>> {
    // Return stats with patientId context if provided
    const context = patientId ? `for patient ${patientId}` : 'globally';
    console.log(`Getting followup stats ${context}`);
    return {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0
    };
  }

  /**
   * Cancel followup - stubbed
   */
  async cancelFollowup(followupId: string): Promise<void> {
    // No-op since table was removed
    console.log(`Would cancel followup ${followupId} if table existed`);
  }
}