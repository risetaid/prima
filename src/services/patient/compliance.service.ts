// ComplianceService centralizes compliance calculations for patients
import { logger } from "@/lib/logger";
import { db, reminders, manualConfirmations } from "@/db";
import { eq, and, isNull, inArray } from "drizzle-orm";

export interface ComplianceResult {
  deliveredCount: number; // Total reminders sent
  confirmedCount: number; // Total completed reminders (automated + manual)
  complianceRate: number;
  lastCalculated: Date;
}

export interface ComplianceStats {
  totalReminders: number; // Total active reminders
  deliveredReminders: number; // Total reminders with delivery status
  confirmedReminders: number; // Total completed reminders
  pendingReminders: number; // Reminders waiting for response
  failedReminders: number; // Reminders that failed to send
  complianceRate: number;
  automatedCompletions: number; // Completions via patient text responses
  manualCompletions: number; // Completions via manual relawan entry
}

export class ComplianceService {
  /**
   * Calculate compliance rate
   * Based on completed reminders only: dipatuhi / (dipatuhi + tidakDipatuhi)
   * This matches the logic in stats API
   */
  private computeRate(dipatuhi: number, tidakDipatuhi: number): number {
    const total = dipatuhi + tidakDipatuhi;
    if (!total || total <= 0) return 0;
    const rate = Math.round((dipatuhi / total) * 100);
    return Math.max(0, Math.min(100, rate));
  }

  /**
   * Get patient completion stats (inline simplified version)
   */
  private async getPatientStats(patientId: string) {
    // Get all active reminders
    const allReminders = await db
      .select({
        id: reminders.id,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.patientId, patientId),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      );

    // Get manual confirmations
    const reminderIds = allReminders.map(r => r.id);
    const manualConfs = reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

    const manuallyConfirmedIds = new Set(manualConfs.map(c => c.reminderId));

    // Count stats
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let automated = 0;
    let manual = 0;
    let dipatuhi = 0;
    let tidakDipatuhi = 0;

    for (const reminder of allReminders) {
      const isManuallyConfirmed = manuallyConfirmedIds.has(reminder.id);

      if (reminder.confirmationStatus === 'CONFIRMED' || isManuallyConfirmed) {
        completed++;
        dipatuhi++;  // All completed reminders are considered complied
        if (isManuallyConfirmed) manual++;
        else automated++;
      } else if (reminder.status === 'FAILED') {
        failed++;
      } else if (reminder.status === 'PENDING') {
        pending++;
      }
    }

    // Currently no explicit "tidakDipatuhi" tracking
    // In future: track explicit non-compliance from volunteer reports
    tidakDipatuhi = 0;

    const total = allReminders.length;
    const complianceRate = this.computeRate(dipatuhi, tidakDipatuhi);

    return {
      totalReminders: total,
      completedReminders: completed,
      pendingReminders: pending,
      failedReminders: failed,
      automatedCompletions: automated,
      manualCompletions: manual,
      complianceRate,
    };
  }

  async getRatesMap(patientIds: string[]) {
    const results = await Promise.all(
      patientIds.map(async (patientId) => {
        const stats = await this.getPatientStats(patientId);
        return {
          patientId,
          totalReminders: stats.totalReminders,
          completedReminders: stats.completedReminders,
          complianceRate: stats.complianceRate,
        };
      })
    );

    const totalMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    const rateMap = new Map<string, number>();

    results.forEach(result => {
      totalMap.set(result.patientId, result.totalReminders);
      completedMap.set(result.patientId, result.completedReminders);
      rateMap.set(result.patientId, result.complianceRate);
    });

    return { totalMap, completedMap, rateMap };
  }

  async attachCompliance<T extends { id: string }>(
    patients: T[]
  ): Promise<(T & { complianceRate: number })[]> {
    const ids = patients.map((p) => p.id);
    const { rateMap } = await this.getRatesMap(ids);
    return patients.map((p) => ({
      ...p,
      complianceRate: rateMap.get(p.id) || 0,
    }));
  }

  async getPatientRate(patientId: string): Promise<number> {
    const stats = await this.getPatientStats(patientId);
    return stats.complianceRate;
  }

  /**
   * Calculate compliance for a single patient
   */
  async calculatePatientCompliance(
    patientId: string
  ): Promise<ComplianceResult> {
    try {
      const stats = await this.getPatientStats(patientId);

      logger.info("Compliance calculation completed", {
        patientId,
        totalReminders: stats.totalReminders,
        completedReminders: stats.completedReminders,
        complianceRate: stats.complianceRate,
        operation: "compliance_calculation",
      });

      return {
        deliveredCount: stats.totalReminders,
        confirmedCount: stats.completedReminders,
        complianceRate: stats.complianceRate,
        lastCalculated: new Date(),
      };
    } catch (error) {
      logger.error(
        "Failed to calculate patient compliance",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
        }
      );

      return {
        deliveredCount: 0,
        confirmedCount: 0,
        complianceRate: 0,
        lastCalculated: new Date(),
      };
    }
  }

  /**
   * Get detailed compliance statistics for a patient
   */
  async getPatientComplianceStats(patientId: string): Promise<ComplianceStats> {
    const stats = await this.getPatientStats(patientId);

    return {
      totalReminders: stats.totalReminders,
      deliveredReminders: stats.totalReminders - stats.failedReminders - stats.pendingReminders,
      confirmedReminders: stats.completedReminders,
      pendingReminders: stats.pendingReminders,
      failedReminders: stats.failedReminders,
      complianceRate: stats.complianceRate,
      automatedCompletions: stats.automatedCompletions,
      manualCompletions: stats.manualCompletions,
    };
  }

  /**
   * Calculate compliance for multiple patients
   */
  async calculateBulkCompliance(
    patientIds: string[]
  ): Promise<Record<string, ComplianceResult>> {
    if (!patientIds.length) {
      return {};
    }

    const results: Record<string, ComplianceResult> = {};

    for (const patientId of patientIds) {
      const stats = await this.getPatientStats(patientId);

      results[patientId] = {
        deliveredCount: stats.totalReminders,
        confirmedCount: stats.completedReminders,
        complianceRate: stats.complianceRate,
        lastCalculated: new Date(),
      };
    }

    return results;
  }

  /**
   * Get reminder status counts (simple categorization)
   */
  async getReminderStatusCounts(patientId: string): Promise<{
    terjadwal: number;
    perluDiperbarui: number;
    selesai: number;
  }> {
    const stats = await this.getPatientStats(patientId);

    // perluDiperbarui = total - completed - pending - failed
    const perluDiperbarui = stats.totalReminders - stats.completedReminders - stats.pendingReminders - stats.failedReminders;

    return {
      terjadwal: stats.pendingReminders,
      perluDiperbarui: Math.max(0, perluDiperbarui),
      selesai: stats.completedReminders,
    };
  }

  /**
   * Invalidate patient compliance cache (placeholder for future implementation)
   */
  async invalidatePatientCompliance(patientId: string): Promise<void> {
    // In a real implementation, this would invalidate Redis cache keys
    // For now, this is a no-op that doesn't throw
    logger.info("Compliance cache invalidation requested", { patientId });
  }

  /**
   * Get compliance trends over time (placeholder implementation)
   */
  async getComplianceTrends(
    patientId: string,
    days: number
  ): Promise<
    Array<{
      date: string;
      complianceRate: number;
      deliveredCount: number;
      confirmedCount: number;
    }>
  > {
    // Placeholder implementation - would query historical data
    // For now, return empty array
    logger.info("Compliance trends requested", { patientId, days });
    return [];
  }
}
