// Database helper functions for reminder operations
// Type-safe utilities for common reminder patterns

import { db, reminders, reminderLogs, manualConfirmations } from '@/db';
import { eq, and, gte, lte, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import type {
  Reminder,
  ReminderLog,
  ManualConfirmation,
  ReminderLogCreateInput,
  ManualConfirmationCreateInput
} from '@/lib/reminder-types';
import { getWIBTime } from '@/lib/timezone';

export class ReminderHelpers {
  // Query helpers
  static async getActiveRemindersByPatient(patientId: string): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )
      .orderBy(asc(reminders.startDate));
  }

  static async getRemindersByType(
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL',
    options?: {
      patientId?: string;
      isActive?: boolean;
      status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
      limit?: number;
    }
  ): Promise<Reminder[]> {
    const conditions = [eq(reminders.reminderType, reminderType)];

    if (options?.patientId) {
      conditions.push(eq(reminders.patientId, options.patientId));
    }
    if (options?.isActive !== undefined) {
      conditions.push(eq(reminders.isActive, options.isActive));
    }
    if (options?.status) {
      conditions.push(eq(reminders.status, options.status));
    }

    conditions.push(isNull(reminders.deletedAt));

    const query = db
      .select()
      .from(reminders)
      .where(and(...conditions))
      .orderBy(desc(reminders.createdAt));

    if (options?.limit) {
      return query.limit(options.limit);
    }

    return query;
  }

  static async getTodaysReminders(): Promise<Reminder[]> {
    const today = getWIBTime();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return db
      .select()
      .from(reminders)
      .where(
        and(
          gte(reminders.startDate, todayStart),
          lte(reminders.startDate, todayEnd),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )
      .orderBy(asc(reminders.scheduledTime));
  }

  static async getRemindersNeedingFollowup(): Promise<Reminder[]> {
    const now = getWIBTime();
    const followupThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, 'SENT'),
          lte(reminders.sentAt, followupThreshold),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt),
          sql`${reminders.confirmationStatus} IS NULL OR ${reminders.confirmationStatus} = 'PENDING'`
        )
      )
      .orderBy(asc(reminders.sentAt));
  }

  // Log helpers
  static async createReminderLog(data: ReminderLogCreateInput): Promise<ReminderLog> {
    const logData = {
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    const [log] = await db
      .insert(reminderLogs)
      .values(logData)
      .returning();

    return log;
  }

  static async getReminderLogs(reminderId: string): Promise<ReminderLog[]> {
    return db
      .select()
      .from(reminderLogs)
      .where(eq(reminderLogs.reminderId, reminderId))
      .orderBy(desc(reminderLogs.timestamp));
  }

  static async getPatientReminderHistory(
    patientId: string,
    options?: {
      limit?: number;
      action?: string;
      since?: string;
    }
  ): Promise<ReminderLog[]> {
    const conditions = [eq(reminderLogs.patientId, patientId)];

    if (options?.action) {
      conditions.push(eq(reminderLogs.action, options.action));
    }
    if (options?.since) {
      conditions.push(gte(reminderLogs.timestamp, new Date(options.since)));
    }

    const query = db
      .select()
      .from(reminderLogs)
      .where(and(...conditions))
      .orderBy(desc(reminderLogs.timestamp));

    if (options?.limit) {
      return query.limit(options.limit);
    }

    return query;
  }

  // Manual confirmation helpers
  static async createManualConfirmation(data: ManualConfirmationCreateInput): Promise<ManualConfirmation> {
    const confirmationData = {
      ...data,
      visitDate: data.visitDate ? new Date(data.visitDate) : null,
    };

    const [confirmation] = await db
      .insert(manualConfirmations)
      .values(confirmationData)
      .returning();

    return confirmation;
  }

  static async getManualConfirmationsByPatient(
    patientId: string,
    options?: {
      limit?: number;
      reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
    }
  ): Promise<ManualConfirmation[]> {
    const conditions = [eq(manualConfirmations.patientId, patientId)];

    if (options?.reminderType) {
      conditions.push(eq(manualConfirmations.reminderType, options.reminderType));
    }

    const query = db
      .select()
      .from(manualConfirmations)
      .where(and(...conditions))
      .orderBy(desc(manualConfirmations.confirmedAt));

    if (options?.limit) {
      return query.limit(options.limit);
    }

    return query;
  }

  // Status update helpers
  static async updateReminderStatus(
    reminderId: string,
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED',
    options?: {
      sentAt?: Date;
      fonnteMessageId?: string;
      confirmationStatus?: string;
      confirmationResponse?: string;
    }
  ): Promise<Reminder | undefined> {
    const updateData: Record<string, unknown> = { 
      status, 
      updatedAt: new Date()
    };

    if (options?.sentAt) {
      updateData.sentAt = options.sentAt;
    }
    if (options?.fonnteMessageId) {
      updateData.fonnteMessageId = options.fonnteMessageId;
    }
    if (options?.confirmationStatus) {
      updateData.confirmationStatus = options.confirmationStatus;
    }
    if (options?.confirmationResponse) {
      updateData.confirmationResponse = options.confirmationResponse;
    }

    const [updated] = await db
      .update(reminders)
      .set(updateData)
      .where(eq(reminders.id, reminderId))
      .returning();

    return updated;
  }

  static async markReminderConfirmed(
    reminderId: string,
    response?: string
  ): Promise<Reminder | undefined> {
    const now = new Date();

    const [updated] = await db
      .update(reminders)
      .set({
        confirmationStatus: 'CONFIRMED',
        confirmationResponseAt: now,
        confirmationResponse: response,
        updatedAt: now,
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    if (updated) {
      // Log the confirmation
      await this.createReminderLog({
        reminderId,
        patientId: updated.patientId,
        action: 'CONFIRMED',
        actionType: 'MANUAL',
        response,
        timestamp: now.toISOString(),
        metadata: { confirmation_type: 'PATIENT_RESPONSE' },
      });
    }

    return updated;
  }

  // Analytics helpers - simplified with ComplianceService
  static async getReminderStats(patientId?: string): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    pending: number;
    complianceRate: number;
  }> {
    // Import here to avoid circular dependency
    const { ComplianceService } = await import("@/services/patient/compliance.service");
    const complianceService = new ComplianceService();

    if (patientId) {
      // Use ComplianceService for specific patient
      const stats = await complianceService.getPatientComplianceStats(patientId);

      return {
        total: stats.totalReminders,
        active: stats.totalReminders - stats.failedReminders,
        completed: stats.confirmedReminders,
        failed: stats.failedReminders,
        pending: stats.pendingReminders,
        complianceRate: stats.complianceRate,
      };
    } else {
      // For global stats, simple aggregation
      const conditions = [isNull(reminders.deletedAt)];
      const allReminders = await db
        .select({
          id: reminders.id,
          isActive: reminders.isActive,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus,
        })
        .from(reminders)
        .where(and(...conditions));

      // Get manual confirmations for all reminders
      const reminderIds = allReminders.map(r => r.id);
      const manualConfs = reminderIds.length > 0
        ? await db
            .select({ reminderId: manualConfirmations.reminderId })
            .from(manualConfirmations)
            .where(inArray(manualConfirmations.reminderId, reminderIds))
        : [];

      const manuallyConfirmedIds = new Set(manualConfs.map(c => c.reminderId));

      const total = allReminders.length;
      const active = allReminders.filter(r => r.isActive).length;
      const completed = allReminders.filter(r =>
        r.confirmationStatus === 'CONFIRMED' || manuallyConfirmedIds.has(r.id)
      ).length;
      const failed = allReminders.filter(r => r.status === 'FAILED').length;
      const pending = allReminders.filter(r => r.status === 'PENDING').length;
      const complianceRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        active,
        completed,
        failed,
        pending,
        complianceRate,
      };
    }
  }

  static async getReminderTypeStats(): Promise<Record<string, {
    total: number;
    active: number;
    completed: number;
  }>> {
    // Get all reminders with completion status
    const allReminders = await db
      .select({
        id: reminders.id,
        reminderType: reminders.reminderType,
        isActive: reminders.isActive,
        confirmationStatus: reminders.confirmationStatus,
      })
      .from(reminders)
      .where(isNull(reminders.deletedAt));

    // Get manual confirmations
    const reminderIds = allReminders.map(r => r.id);
    const manualConfs = reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

    const manuallyConfirmedIds = new Set(manualConfs.map(c => c.reminderId));

    // Group by reminder type
    const remindersByType = new Map<string, typeof allReminders>();
    allReminders.forEach(reminder => {
      if (!remindersByType.has(reminder.reminderType)) {
        remindersByType.set(reminder.reminderType, []);
      }
      remindersByType.get(reminder.reminderType)!.push(reminder);
    });

    // Calculate stats for each type
    const stats: Record<string, { total: number; active: number; completed: number }> = {};

    for (const [reminderType, typeReminders] of remindersByType.entries()) {
      const total = typeReminders.length;
      const active = typeReminders.filter(r => r.isActive).length;
      const completed = typeReminders.filter(r =>
        r.confirmationStatus === 'CONFIRMED' || manuallyConfirmedIds.has(r.id)
      ).length;

      stats[reminderType] = {
        total,
        active,
        completed,
      };
    }

    return stats;
  }

  // Batch operations
  static async deactivateRemindersByPatient(patientId: string): Promise<void> {
    await db
      .update(reminders)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      );
  }

  static async processPendingReminders(): Promise<Reminder[]> {
    const now = getWIBTime();
    const readyReminders = await db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, 'PENDING'),
          lte(reminders.startDate, now),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      )
      .orderBy(asc(reminders.scheduledTime));

    return readyReminders;
  }
}