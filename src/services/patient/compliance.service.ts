// ComplianceService centralizes compliance calculations for patients
// Now uses standardized CompletionCalculationService for consistency
import { logger } from "@/lib/logger";
import { CompletionCalculationService } from "@/services/reminder/completion-calculation.service";

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
   * Calculate compliance rate using standardized completion logic
   */
  private computeRate(totalReminders: number, completedReminders: number): number {
    if (!totalReminders || totalReminders <= 0) return 0;
    const rate = Math.round((completedReminders / totalReminders) * 100);
    return Math.max(0, Math.min(100, rate));
  }

  async getRatesMap(patientIds: string[]) {
    const results = await Promise.all(
      patientIds.map(async (patientId) => {
        const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);
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
    const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);
    return stats.complianceRate;
  }

  /**
   * Calculate compliance for a single patient using standardized logic
   */
  async calculatePatientCompliance(
    patientId: string
  ): Promise<ComplianceResult> {
    try {
      const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);

      logger.info("Compliance calculation completed", {
        patientId,
        totalReminders: stats.totalReminders,
        completedReminders: stats.completedReminders,
        complianceRate: stats.complianceRate,
        operation: "compliance_calculation",
      });

      return {
        deliveredCount: stats.totalReminders, // Total reminders
        confirmedCount: stats.completedReminders, // Completed reminders
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

      // Return zero values on error
      return {
        deliveredCount: 0,
        confirmedCount: 0,
        complianceRate: 0,
        lastCalculated: new Date(),
      };
    }
  }

  /**
   * Get detailed compliance statistics for a patient using standardized logic
   */
  async getPatientComplianceStats(patientId: string): Promise<ComplianceStats> {
    const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);

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
   * Calculate compliance for multiple patients using standardized logic
   */
  async calculateBulkCompliance(
    patientIds: string[]
  ): Promise<Record<string, ComplianceResult>> {
    if (!patientIds.length) {
      return {};
    }

    const results: Record<string, ComplianceResult> = {};

    for (const patientId of patientIds) {
      const stats = await CompletionCalculationService.getPatientCompletionStats(patientId);

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
   * Get reminder status counts using standardized logic
   */
  async getReminderStatusCounts(patientId: string): Promise<{
    terjadwal: number;
    perluDiperbarui: number;
    selesai: number;
  }> {
    return await CompletionCalculationService.getReminderStatusCounts(patientId);
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
