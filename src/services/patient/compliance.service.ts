// ComplianceService centralizes compliance calculations for patients
// Optimized: Batch queries to avoid N+1 problem
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

// Internal type for batch processing
interface PatientStatsInternal {
  totalReminders: number;
  completedReminders: number;
  pendingReminders: number;
  failedReminders: number;
  automatedCompletions: number;
  manualCompletions: number;
  complianceRate: number;
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
   * Batch fetch all reminders and confirmations for multiple patients
   * Optimized: 2 queries total instead of 2N queries
   */
  private async getBatchPatientStats(patientIds: string[]): Promise<Map<string, PatientStatsInternal>> {
    if (!patientIds.length) {
      return new Map();
    }

    // Single query for all reminders across all patients
    const allReminders = await db
      .select({
        id: reminders.id,
        patientId: reminders.patientId,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
      })
      .from(reminders)
      .where(
        and(
          inArray(reminders.patientId, patientIds),
          eq(reminders.isActive, true),
          isNull(reminders.deletedAt)
        )
      );

    // Single query for all manual confirmations
    const reminderIds = allReminders.map(r => r.id);
    const manualConfs = reminderIds.length > 0
      ? await db
          .select({ reminderId: manualConfirmations.reminderId })
          .from(manualConfirmations)
          .where(inArray(manualConfirmations.reminderId, reminderIds))
      : [];

    const manuallyConfirmedIds = new Set(manualConfs.map(c => c.reminderId));

    // Group reminders by patient and calculate stats in memory
    const statsMap = new Map<string, PatientStatsInternal>();

    // Initialize all patients with zero stats
    for (const patientId of patientIds) {
      statsMap.set(patientId, {
        totalReminders: 0,
        completedReminders: 0,
        pendingReminders: 0,
        failedReminders: 0,
        automatedCompletions: 0,
        manualCompletions: 0,
        complianceRate: 0,
      });
    }

    // Process all reminders in single pass
    for (const reminder of allReminders) {
      const stats = statsMap.get(reminder.patientId)!;
      stats.totalReminders++;

      const isManuallyConfirmed = manuallyConfirmedIds.has(reminder.id);

      if (reminder.confirmationStatus === 'CONFIRMED' || isManuallyConfirmed) {
        stats.completedReminders++;
        if (isManuallyConfirmed) {
          stats.manualCompletions++;
        } else {
          stats.automatedCompletions++;
        }
      } else if (reminder.status === 'FAILED') {
        stats.failedReminders++;
      } else if (reminder.status === 'PENDING') {
        stats.pendingReminders++;
      }
    }

    // Calculate compliance rates
    for (const stats of statsMap.values()) {
      stats.complianceRate = this.computeRate(stats.completedReminders, 0);
    }

    return statsMap;
  }

  /**
   * Get patient completion stats (single patient - uses batch internally)
   */
  private async getPatientStats(patientId: string): Promise<PatientStatsInternal> {
    const statsMap = await this.getBatchPatientStats([patientId]);
    return statsMap.get(patientId) || {
      totalReminders: 0,
      completedReminders: 0,
      pendingReminders: 0,
      failedReminders: 0,
      automatedCompletions: 0,
      manualCompletions: 0,
      complianceRate: 0,
    };
  }

  /**
   * Optimized: Get rates for multiple patients with only 2 DB queries
   */
  async getRatesMap(patientIds: string[]) {
    const statsMap = await this.getBatchPatientStats(patientIds);

    const totalMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    const rateMap = new Map<string, number>();

    for (const [patientId, stats] of statsMap) {
      totalMap.set(patientId, stats.totalReminders);
      completedMap.set(patientId, stats.completedReminders);
      rateMap.set(patientId, stats.complianceRate);
    }

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
