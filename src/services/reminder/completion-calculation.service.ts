// Unified Completion Calculation Service
// Standardizes reminder completion logic across all endpoints

import { db, reminders, manualConfirmations } from '@/db';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export interface CompletionStatus {
  isCompleted: boolean;
  completionType: 'AUTOMATED' | 'MANUAL' | 'NONE';
  confirmationStatus: 'CONFIRMED' | 'MISSED' | 'PENDING' | 'NONE';
  confirmedAt?: Date;
  confirmationResponse?: string;
  responseSource?: 'PATIENT_TEXT' | 'MANUAL_ENTRY' | 'SYSTEM';
}

export interface ReminderCompletionResult {
  reminderId: string;
  status: CompletionStatus;
  reminderType: string;
  scheduledTime: string;
  message?: string;
  sentAt?: Date;
  patientResponse?: string;
  manualConfirmation?: {
    confirmedAt: Date;
    volunteerId: string;
    notes?: string;
  };
}

export interface PatientCompletionStats {
  patientId: string;
  totalReminders: number;
  completedReminders: number;
  automatedCompletions: number;
  manualCompletions: number;
  pendingReminders: number;
  failedReminders: number;
  complianceRate: number;
  lastCalculated: Date;
}

export class CompletionCalculationService {
  /**
   * Determine if a reminder is completed based on standardized logic
   * A reminder is considered completed if:
   * 1. It has confirmationStatus = 'CONFIRMED' (automated via patient response)
   * 2. It has a manual confirmation entry (manual by relawan)
   */
  static async getReminderCompletion(reminderId: string): Promise<CompletionStatus> {
    try {
      // Get the reminder details
      const [reminder] = await db
        .select({
          id: reminders.id,
          confirmationStatus: reminders.confirmationStatus,
          confirmationResponse: reminders.confirmationResponse,
          confirmationResponseAt: reminders.confirmationResponseAt,
          status: reminders.status,
          sentAt: reminders.sentAt,
        })
        .from(reminders)
        .where(eq(reminders.id, reminderId))
        .limit(1);

      if (!reminder) {
        return {
          isCompleted: false,
          completionType: 'NONE',
          confirmationStatus: 'NONE',
        };
      }

      // Check for manual confirmation
      const [manualConfirmation] = await db
        .select({
          id: manualConfirmations.id,
          confirmedAt: manualConfirmations.confirmedAt,
          volunteerId: manualConfirmations.volunteerId,
        })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.reminderId, reminderId))
        .limit(1);

      // Determine completion status
      if (manualConfirmation) {
        return {
          isCompleted: true,
          completionType: 'MANUAL',
          confirmationStatus: 'CONFIRMED',
          confirmedAt: manualConfirmation.confirmedAt,
          responseSource: 'MANUAL_ENTRY',
        };
      }

      // Check automated confirmation via patient response
      if (reminder.confirmationStatus === 'CONFIRMED') {
        return {
          isCompleted: true,
          completionType: 'AUTOMATED',
          confirmationStatus: 'CONFIRMED',
          confirmedAt: reminder.confirmationResponseAt || undefined,
          confirmationResponse: reminder.confirmationResponse || undefined,
          responseSource: 'PATIENT_TEXT',
        };
      }

      // Check if it's marked as missed
      if (reminder.confirmationStatus === 'MISSED') {
        return {
          isCompleted: false,
          completionType: 'NONE',
          confirmationStatus: 'MISSED',
          confirmedAt: reminder.confirmationResponseAt || undefined,
          confirmationResponse: reminder.confirmationResponse || undefined,
          responseSource: 'PATIENT_TEXT',
        };
      }

      // Default to pending
      return {
        isCompleted: false,
        completionType: 'NONE',
        confirmationStatus: reminder.confirmationStatus || 'PENDING',
      };

    } catch (error) {
      logger.error('Failed to get reminder completion', error as Error, {
        reminderId,
        operation: 'get_reminder_completion',
      });

      // Return safe default on error
      return {
        isCompleted: false,
        completionType: 'NONE',
        confirmationStatus: 'NONE',
      };
    }
  }

  /**
   * Get completion status for multiple reminders
   */
  static async getRemindersCompletion(reminderIds: string[]): Promise<Record<string, CompletionStatus>> {
    if (!reminderIds.length) return {};

    try {
      const results: Record<string, CompletionStatus> = {};

      // Get all reminders with their details
      const reminderData = await db
        .select({
          id: reminders.id,
          confirmationStatus: reminders.confirmationStatus,
          confirmationResponse: reminders.confirmationResponse,
          confirmationResponseAt: reminders.confirmationResponseAt,
          status: reminders.status,
          sentAt: reminders.sentAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.isActive, true),
            isNull(reminders.deletedAt)
          )
        );

      // Get all manual confirmations for these reminders
      const manualConfirmationsData = await db
        .select({
          reminderId: manualConfirmations.reminderId,
          confirmedAt: manualConfirmations.confirmedAt,
          volunteerId: manualConfirmations.volunteerId,
        })
        .from(manualConfirmations)
        .where(
          sql`${manualConfirmations.reminderId} = ANY(${sql.placeholder('reminderIds')})`
        );

      // Create a map of manual confirmations
      const manualConfirmationMap = new Map(
        manualConfirmationsData.map(mc => [mc.reminderId, mc])
      );

      // Process each reminder
      for (const reminder of reminderData) {
        const manualConfirmation = manualConfirmationMap.get(reminder.id);

        if (manualConfirmation) {
          results[reminder.id] = {
            isCompleted: true,
            completionType: 'MANUAL',
            confirmationStatus: 'CONFIRMED',
            confirmedAt: manualConfirmation.confirmedAt,
            responseSource: 'MANUAL_ENTRY',
          };
        } else if (reminder.confirmationStatus === 'CONFIRMED') {
          results[reminder.id] = {
            isCompleted: true,
            completionType: 'AUTOMATED',
            confirmationStatus: 'CONFIRMED',
            confirmedAt: reminder.confirmationResponseAt || undefined,
            confirmationResponse: reminder.confirmationResponse || undefined,
            responseSource: 'PATIENT_TEXT',
          };
        } else if (reminder.confirmationStatus === 'MISSED') {
          results[reminder.id] = {
            isCompleted: false,
            completionType: 'NONE',
            confirmationStatus: 'MISSED',
            confirmedAt: reminder.confirmationResponseAt || undefined,
            confirmationResponse: reminder.confirmationResponse || undefined,
            responseSource: 'PATIENT_TEXT',
          };
        } else {
          results[reminder.id] = {
            isCompleted: false,
            completionType: 'NONE',
            confirmationStatus: reminder.confirmationStatus || 'PENDING',
          };
        }
      }

      return results;

    } catch (error) {
      logger.error('Failed to get reminders completion', error as Error, {
        reminderIds,
        operation: 'get_reminders_completion',
      });

      // Return empty map on error
      return {};
    }
  }

  /**
   * Get patient completion statistics using standardized logic
   */
  static async getPatientCompletionStats(patientId: string): Promise<PatientCompletionStats> {
    try {
      // Get all active reminders for the patient
      const allReminders = await db
        .select({
          id: reminders.id,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus,
          sentAt: reminders.sentAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            eq(reminders.isActive, true),
            isNull(reminders.deletedAt)
          )
        );

      // Get all manual confirmations for the patient
      await db
        .select({ count: sql`COUNT(*)` })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId))
        .then(result => Number(result[0]?.count || 0));

      // Calculate statistics using standardized completion logic
      let completedReminders = 0;
      let automatedCompletions = 0;
      let manualCompletions = 0;
      let pendingReminders = 0;
      let failedReminders = 0;

      // Get manual confirmation IDs for this patient
      const manualConfirmationReminderIds = await db
        .select({ reminderId: manualConfirmations.reminderId })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId))
        .then(results => results.map(r => r.reminderId));

      for (const reminder of allReminders) {
        const hasManualConfirmation = manualConfirmationReminderIds.includes(reminder.id);
        const hasAutomatedConfirmation = reminder.confirmationStatus === 'CONFIRMED';

        if (hasManualConfirmation) {
          completedReminders++;
          manualCompletions++;
        } else if (hasAutomatedConfirmation) {
          completedReminders++;
          automatedCompletions++;
        } else if (reminder.status === 'FAILED') {
          failedReminders++;
        } else {
          pendingReminders++;
        }
      }

      const totalReminders = allReminders.length;
      const complianceRate = totalReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0;

      return {
        patientId,
        totalReminders,
        completedReminders,
        automatedCompletions,
        manualCompletions,
        pendingReminders,
        failedReminders,
        complianceRate,
        lastCalculated: new Date(),
      };

    } catch (error) {
      logger.error('Failed to get patient completion stats', error as Error, {
        patientId,
        operation: 'get_patient_completion_stats',
      });

      // Return empty stats on error
      return {
        patientId,
        totalReminders: 0,
        completedReminders: 0,
        automatedCompletions: 0,
        manualCompletions: 0,
        pendingReminders: 0,
        failedReminders: 0,
        complianceRate: 0,
        lastCalculated: new Date(),
      };
    }
  }

  /**
   * Get reminders with completion status for status categorization
   * Returns counts for TERJADWAL, PERLU_DIPERBARUI, SELESAI
   */
  static async getReminderStatusCounts(patientId: string): Promise<{
    terjadwal: number;
    perluDiperbarui: number;
    selesai: number;
  }> {
    try {
      // Get all active reminders for the patient
      const allReminders = await db
        .select({
          id: reminders.id,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus,
          sentAt: reminders.sentAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            eq(reminders.isActive, true),
            isNull(reminders.deletedAt)
          )
        );

      // Get all manual confirmations for the patient
      const manualConfirmationReminderIds = await db
        .select({ reminderId: manualConfirmations.reminderId })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId))
        .then(results => results.map(r => r.reminderId));

      let terjadwal = 0;
      let perluDiperbarui = 0;
      let selesai = 0;

      for (const reminder of allReminders) {
        const hasManualConfirmation = manualConfirmationReminderIds.includes(reminder.id);
        const hasAutomatedConfirmation = reminder.confirmationStatus === 'CONFIRMED';

        if (hasManualConfirmation || hasAutomatedConfirmation) {
          // Completed - SELESAI
          selesai++;
        } else if (reminder.status === 'FAILED') {
          // Failed - still TERJADWAL (will be retried)
          terjadwal++;
        } else if (reminder.sentAt && (reminder.status === 'SENT' || reminder.status === 'DELIVERED')) {
          // Sent but not confirmed - needs update
          perluDiperbarui++;
        } else {
          // Not sent yet or unknown status - scheduled
          terjadwal++;
        }
      }

      return { terjadwal, perluDiperbarui, selesai };

    } catch (error) {
      logger.error('Failed to get reminder status counts', error as Error, {
        patientId,
        operation: 'get_reminder_status_counts',
      });

      // Return zero counts on error
      return { terjadwal: 0, perluDiperbarui: 0, selesai: 0 };
    }
  }

  /**
   * Get completed reminders for a patient using standardized logic
   */
  static async getCompletedReminders(patientId: string, options?: {
    limit?: number;
    offset?: number;
    includeManual?: boolean;
    includeAutomated?: boolean;
  }): Promise<ReminderCompletionResult[]> {
    try {
      const {
        limit = 50,
        offset = 0,
        includeManual = true,
        includeAutomated = true,
      } = options || {};

      // Get all active reminders for the patient
      const allReminders = await db
        .select({
          id: reminders.id,
          reminderType: reminders.reminderType,
          scheduledTime: reminders.scheduledTime,
          message: reminders.message,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus,
          confirmationResponse: reminders.confirmationResponse,
          confirmationResponseAt: reminders.confirmationResponseAt,
          sentAt: reminders.sentAt,
          startDate: reminders.startDate,
          endDate: reminders.endDate,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            eq(reminders.isActive, true),
            isNull(reminders.deletedAt)
          )
        )
        .orderBy(desc(reminders.startDate))
        .limit(limit + offset); // Get more for filtering

      // Get all manual confirmations for the patient
      const manualConfirmationsData = await db
        .select({
          reminderId: manualConfirmations.reminderId,
          confirmedAt: manualConfirmations.confirmedAt,
          volunteerId: manualConfirmations.volunteerId,
          notes: manualConfirmations.notes,
        })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, patientId));

      // Create a map of manual confirmations
      const manualConfirmationMap = new Map(
        manualConfirmationsData.map(mc => [mc.reminderId, mc])
      );

      const completedReminders: ReminderCompletionResult[] = [];

      for (const reminder of allReminders) {
        const manualConfirmation = manualConfirmationMap.get(reminder.id);
        const isAutomatedCompleted = reminder.confirmationStatus === 'CONFIRMED';

        if ((manualConfirmation && includeManual) || (isAutomatedCompleted && includeAutomated)) {
          const completionStatus = await this.getReminderCompletion(reminder.id);

          completedReminders.push({
            reminderId: reminder.id,
            status: completionStatus,
            reminderType: reminder.reminderType || 'GENERAL',
            scheduledTime: reminder.scheduledTime,
            message: reminder.message || undefined,
            sentAt: reminder.sentAt || undefined,
            patientResponse: reminder.confirmationResponse || undefined,
            manualConfirmation: manualConfirmation ? {
              confirmedAt: manualConfirmation.confirmedAt,
              volunteerId: manualConfirmation.volunteerId,
              notes: manualConfirmation.notes || undefined,
            } : undefined,
          });
        }
      }

      // Apply pagination
      return completedReminders.slice(offset, offset + limit);

    } catch (error) {
      logger.error('Failed to get completed reminders', error as Error, {
        patientId,
        options,
        operation: 'get_completed_reminders',
      });

      // Return empty array on error
      return [];
    }
  }
}