// Linked Confirmation Service - Simplified stub since tables were removed
import { logger } from "@/lib/logger";

export interface LinkedConfirmation {
  id: string;
  reminderLogId: string;
  patientId: string;
  response: string | null;
  responseType: "confirmed" | "missed" | "later" | "unknown";
  confidence: number;
  linkedAt: Date;
  metadata: Record<string, unknown>;
}

export interface ConfirmationLinkResult {
  success: boolean;
  linkedConfirmation?: LinkedConfirmation;
  message: string;
  requiresFollowUp?: boolean;
}

interface PendingConfirmation {
  id: string;
  reminderScheduleId: string | null;
  sentAt: Date;
  confirmationMessage: string | null;
  message: string | null;
}

export class LinkedConfirmationService {
  constructor() {
    // Simplified constructor
  }

  /**
   * Link a patient response to the most recent pending reminder - stubbed
   */
  async linkConfirmationToReminder(
    patientId: string,
    response: string,
    conversationStateId?: string
  ): Promise<ConfirmationLinkResult> {
    const conversationContext = conversationStateId
      ? ` (conversation: ${conversationStateId})`
      : "";
    return {
      success: false,
      message: `Linked confirmation functionality disabled for patient ${patientId} with response "${response.substring(
        0,
        20
      )}..."${conversationContext}`,
    };
  }

  /**
   * Find pending confirmations for a patient - returns empty array
   */
  async findPendingConfirmations(
    patientId: string
  ): Promise<PendingConfirmation[]> {
    logger.info(`Finding pending confirmations for patient ${patientId}`);
    return [];
  }

  /**
   * Get confirmation history for a patient - returns empty array
   */
  async getConfirmationHistory(
    patientId: string,
    limit: number = 20
  ): Promise<LinkedConfirmation[]> {
    logger.info(
      `Getting confirmation history for patient ${patientId} with limit ${limit}`
    );
    return [];
  }

  /**
   * Get confirmation stats - returns empty stats
   */
  async getConfirmationStats(patientId: string) {
    logger.info(`Getting confirmation stats for patient ${patientId}`);
    return {
      totalConfirmations: 0,
      confirmedCount: 0,
      missedCount: 0,
      confirmationRate: 0,
    };
  }
}
