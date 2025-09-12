// ComplianceService centralizes compliance calculations for patients
import { PatientRepository } from "./patient.repository";
import { logger } from "@/lib/logger";

export interface ComplianceResult {
  deliveredCount: number; // Now represents "totalConfirmed" (completed reminders)
  confirmedCount: number; // Now represents "takenCount" (medications actually taken)
  complianceRate: number;
  lastCalculated: Date;
}

export interface ComplianceStats {
  totalReminders: number; // Now represents "totalConfirmed" (completed reminders)
  deliveredReminders: number; // Now represents "totalConfirmed" (completed reminders)
  confirmedReminders: number; // Now represents "takenCount" (medications actually taken)
  pendingConfirmations: number; // Now represents unconfirmed reminders (not applicable in simplified logic)
  complianceRate: number;
  averageResponseTime?: number;
}

export class ComplianceService {
  private repo: PatientRepository;
  constructor() {
    this.repo = new PatientRepository();
  }

  // Compute compliance rate = confirmations / delivered * 100 (integer percent)
  private computeRate(delivered: number, confirmations: number): number {
    if (!delivered || delivered <= 0) return 0;
    const rate = Math.round((confirmations / delivered) * 100);
    return Math.max(0, Math.min(100, rate));
  }

  async getRatesMap(patientIds: string[]) {
    const complianceData = await this.repo.getCompletedComplianceCounts(
      patientIds
    );

    const deliveredMap = new Map<string, number>();
    const confirmationsMap = new Map<string, number>();
    const rateMap = new Map<string, number>();

    for (const data of complianceData) {
      const totalConfirmed = data.totalConfirmed;
      const takenCount = data.takenCount;
      const complianceRate = this.computeRate(totalConfirmed, takenCount);

      deliveredMap.set(data.patientId, totalConfirmed); // Now represents "completed/confirmed"
      confirmationsMap.set(data.patientId, takenCount); // Now represents "taken"
      rateMap.set(data.patientId, complianceRate);
    }

    return { deliveredMap, confirmationsMap, rateMap };
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
    const { rateMap } = await this.getRatesMap([patientId]);
    return rateMap.get(patientId) || 0;
  }

  /**
   * Calculate compliance for a single patient
   */
  async calculatePatientCompliance(
    patientId: string
  ): Promise<ComplianceResult> {
    try {
      const { deliveredMap, confirmationsMap, rateMap } =
        await this.getRatesMap([patientId]);

      const deliveredCount = deliveredMap.get(patientId) || 0;
      const confirmedCount = confirmationsMap.get(patientId) || 0;
      const complianceRate = rateMap.get(patientId) || 0;

      logger.info("Compliance calculation completed", {
        patientId,
        deliveredCount,
        confirmedCount,
        complianceRate,
        operation: "compliance_calculation",
      });

      return {
        deliveredCount,
        confirmedCount,
        complianceRate,
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
   * Get detailed compliance statistics for a patient
   */
  async getPatientComplianceStats(patientId: string): Promise<ComplianceStats> {
    const compliance = await this.calculatePatientCompliance(patientId);

    // Simplified stats - only count completed reminders
    return {
      totalReminders: compliance.deliveredCount, // Total confirmed reminders
      deliveredReminders: compliance.deliveredCount, // Total confirmed reminders
      confirmedReminders: compliance.confirmedCount, // Medications actually taken
      pendingConfirmations: 0, // Not applicable in simplified logic
      complianceRate: compliance.complianceRate,
      averageResponseTime: undefined, // Not applicable in simplified logic
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

    const { deliveredMap, confirmationsMap, rateMap } = await this.getRatesMap(
      patientIds
    );
    const results: Record<string, ComplianceResult> = {};

    for (const patientId of patientIds) {
      const deliveredCount = deliveredMap.get(patientId) || 0;
      const confirmedCount = confirmationsMap.get(patientId) || 0;
      const complianceRate = rateMap.get(patientId) || 0;

      results[patientId] = {
        deliveredCount,
        confirmedCount,
        complianceRate,
        lastCalculated: new Date(),
      };
    }

    return results;
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
