/**
 * Medication Query Service
 * Handles natural language queries for patient medication information with intelligent filtering
 */

import { db, reminders } from "@/db";
import { eq, and, isNull, desc, gte, sql } from "drizzle-orm";
import { MedicationDetails } from "@/lib/medication-parser";
import { logger } from "@/lib/logger";

export interface MedicationQuery {
  timeRange?: "hari_ini" | "minggu_ini" | "bulan_ini" | "semuanya" | "aktif" | "selesai";
  medicationName?: string;
  limit?: number;
  includeCompleted?: boolean;
  includeInfo?: boolean;
}

export interface MedicationQueryResult {
  medications: MedicationInfo[];
  totalCount: number;
  timeRange: string;
  querySummary: string;
  hasActiveMedications: boolean;
}

export interface MedicationInfo {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  scheduledTimes?: string[];
  additionalInfo?: Record<string, unknown>;
  reminderCount?: number;
  lastReminder?: Date;
}

export class MedicationQueryService {
  /**
   * Execute natural language medication query
   */
  async queryMedications(
    patientId: string,
    query: MedicationQuery
  ): Promise<MedicationQueryResult> {
    try {
      logger.info("Executing medication query", {
        patientId,
        timeRange: query.timeRange,
        medicationName: query.medicationName,
        limit: query.limit,
        includeCompleted: query.includeCompleted
      });

      // Build database query with all filters
      const whereConditions = [
        eq(reminders.patientId, patientId),
        isNull(reminders.deletedAt),
        eq(reminders.reminderType, "MEDICATION")
      ];

      // Apply status filter
      if (query.timeRange === "aktif") {
        whereConditions.push(eq(reminders.isActive, true));
      } else if (query.timeRange === "selesai" || !query.includeCompleted) {
        whereConditions.push(eq(reminders.isActive, true));
      }

      // Apply medication name filter
      if (query.medicationName) {
        whereConditions.push(
          sql`${reminders.medicationDetails}::jsonb ->> 'name' ILIKE ${`%${query.medicationName}%`}`
        );
      }

      // Apply time-based filtering
      const now = new Date();
      if (query.timeRange === "hari_ini") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        whereConditions.push(gte(reminders.startDate, today));
      } else if (query.timeRange === "minggu_ini") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        whereConditions.push(gte(reminders.startDate, weekAgo));
      } else if (query.timeRange === "bulan_ini") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        whereConditions.push(gte(reminders.startDate, monthAgo));
      }

      // Build and execute query
      const medicationRecords = await db
        .select({
          id: reminders.id,
          patientId: reminders.patientId,
          medicationDetails: reminders.medicationDetails,
          startDate: reminders.startDate,
          endDate: reminders.endDate,
          isActive: reminders.isActive,
          createdAt: reminders.createdAt,
          updatedAt: reminders.updatedAt
        })
        .from(reminders)
        .where(and(...whereConditions))
        .orderBy(desc(reminders.isActive), desc(reminders.startDate))
        .limit(query.limit || 10);

      // Get total count
      const totalCount = await this.getQueryCount(patientId, query);

      // Transform to MedicationInfo
      const medicationsInfo: MedicationInfo[] = medicationRecords.map(record => {
        const medicationDetails = record.medicationDetails as MedicationDetails | null;
        return {
          id: record.id,
          medicationName: medicationDetails?.name || "Unknown",
          dosage: medicationDetails?.dosage || "Unknown",
          frequency: medicationDetails?.frequency || "Unknown",
          instructions: medicationDetails?.instructions || undefined,
          startDate: record.startDate,
          endDate: record.endDate || undefined,
          isActive: record.isActive
        };
      });

      // Generate query summary
      const querySummary = this.generateQuerySummary(query, medicationsInfo.length, totalCount);

      logger.info("Medication query completed", {
        patientId,
        medicationsFound: medicationsInfo.length,
        totalCount,
        timeRange: query.timeRange
      });

      return {
        medications: medicationsInfo,
        totalCount,
        timeRange: query.timeRange || "semuanya",
        querySummary,
        hasActiveMedications: medicationsInfo.some(m => m.isActive)
      };

    } catch (error) {
      logger.error("Failed to execute medication query", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        query
      });
      throw error;
    }
  }

  /**
   * Parse natural language query into structured query
   */
  parseNaturalLanguageQuery(message: string): MedicationQuery {
    const normalizedMessage = message.toLowerCase();
    const query: MedicationQuery = {
      limit: 10,
      includeCompleted: false
    };

    // Parse time range
    if (normalizedMessage.includes("hari ini")) {
      query.timeRange = "hari_ini";
    } else if (normalizedMessage.includes("minggu ini")) {
      query.timeRange = "minggu_ini";
    } else if (normalizedMessage.includes("bulan ini")) {
      query.timeRange = "bulan_ini";
    } else if (normalizedMessage.includes("aktif") || normalizedMessage.includes("sedang berjalan")) {
      query.timeRange = "aktif";
    } else if (normalizedMessage.includes("selesai") || normalizedMessage.includes("lesai")) {
      query.timeRange = "selesai";
      query.includeCompleted = true;
    } else if (normalizedMessage.includes("semua") || normalizedMessage.includes("seluruh")) {
      query.timeRange = "semuanya";
      query.includeCompleted = true;
    }

    // Parse medication name
    const medicationPatterns = [
      /obat\s+([a-zA-Z0-9\s]+)/,
      /medicasi\s+([a-zA-Z0-9\s]+)/,
      /tentang\s+([a-zA-Z0-9\s]+)\s*(obat|medicasi)?/,
      /([a-zA-Z0-9\s]+)\s*(obat|medicasi)/
    ];

    for (const pattern of medicationPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        query.medicationName = match[1].trim();
        break;
      }
    }

    // Parse information requests
    if (normalizedMessage.includes("informasi") ||
        normalizedMessage.includes("detail") ||
        normalizedMessage.includes("penjelasan")) {
      query.includeInfo = true;
    }

    // Parse limit
    const limitMatch = normalizedMessage.match(/(\d+)\s*(obat|medicasi|terakhir|akhir)/);
    if (limitMatch) {
      query.limit = Math.min(parseInt(limitMatch[1]), 50); // Cap at 50
    }

    return query;
  }

  /**
   * Get detailed medication information for a specific medication
   */
  async getMedicationDetails(patientId: string, medicationId: string): Promise<MedicationInfo | null> {
    try {
      const medication = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.id, medicationId),
            eq(reminders.patientId, patientId),
            eq(reminders.reminderType, "MEDICATION"),
            isNull(reminders.deletedAt)
          )
        )
        .limit(1);

      if (!medication.length) {
        return null;
      }

      const record = medication[0];
      const medicationDetails = record.medicationDetails as MedicationDetails | null;
      return {
        id: record.id,
        medicationName: medicationDetails?.name || "Unknown",
        dosage: medicationDetails?.dosage || "Unknown",
        frequency: medicationDetails?.frequency || "Unknown",
        instructions: medicationDetails?.instructions || undefined,
        startDate: record.startDate,
        endDate: record.endDate || undefined,
        isActive: record.isActive
      };
    } catch (error) {
      logger.error("Failed to get medication details", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        medicationId
      });
      throw error;
    }
  }

  /**
   * Get total count for query
   */
  private async getQueryCount(patientId: string, query: MedicationQuery): Promise<number> {
    try {
      const whereConditions = [
        eq(reminders.patientId, patientId),
        isNull(reminders.deletedAt),
        eq(reminders.reminderType, "MEDICATION")
      ];

      // Apply same filters as main query
      if (query.timeRange === "aktif") {
        whereConditions.push(eq(reminders.isActive, true));
      } else if (query.timeRange === "selesai" || !query.includeCompleted) {
        whereConditions.push(eq(reminders.isActive, true));
      }

      if (query.medicationName) {
        whereConditions.push(
          sql`${reminders.medicationDetails}::jsonb ->> 'name' ILIKE ${`%${query.medicationName}%`}`
        );
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(reminders)
        .where(and(...whereConditions));

      return result[0]?.count || 0;

    } catch (error) {
      logger.error("Failed to get medication query count", error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Generate human-readable query summary
   */
  private generateQuerySummary(query: MedicationQuery, foundCount: number, totalCount: number): string {
    const timeRangeText = {
      "hari_ini": "hari ini",
      "minggu_ini": "minggu ini",
      "bulan_ini": "bulan ini",
      "semuanya": "semua waktu",
      "aktif": "yang masih aktif",
      "selesai": "yang sudah selesai"
    }[query.timeRange || "semuanya"];

    const medicationText = query.medicationName
      ? ` untuk "${query.medicationName}"`
      : "";

    const infoText = query.includeInfo
      ? " dengan informasi detail"
      : "";

    return `Ditemukan ${foundCount} obat${medicationText}${infoText} dari ${totalCount} total obat ${timeRangeText}`;
  }

  /**
   * Format medications for LLM consumption
   */
  formatMedicationsForLLM(medications: MedicationInfo[]): string {
    if (medications.length === 0) {
      return "Tidak ada obat yang ditemukan untuk periode ini.";
    }

    const formattedMeds = medications.map((med, index) => {
      const startDate = new Date(med.startDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const statusText = med.isActive ? "Aktif" : "Selesai";
      const scheduleText = ''; // scheduledTimes not available in current schema

      return `${index + 1}. ${med.medicationName} - ${med.dosage}, ${med.frequency}${scheduleText}\n` +
             `   Status: ${statusText} | Mulai: ${startDate}` +
             (med.instructions ? `\n   Catatan: ${med.instructions}` : '');
    }).join('\n\n');

    return `Informasi Obat:\n${formattedMeds}`;
  }

  /**
   * Get medication schedule summary
   */
  async getMedicationScheduleSummary(patientId: string): Promise<string> {
    try {
      const activeMeds = await this.queryMedications(patientId, {
        timeRange: "aktif",
        limit: 50
      });

      if (activeMeds.medications.length === 0) {
        return "Tidak ada jadwal obat aktif saat ini.";
      }

      // Schedule grouping not available - scheduledTimes not in current schema
      const scheduleMap = new Map<string, string[]>();

      // Format schedule summary
      const sortedTimes = Array.from(scheduleMap.keys()).sort();
      const scheduleLines = sortedTimes.map(time => {
        const meds = scheduleMap.get(time)!;
        return `${time}: ${meds.join(', ')}`;
      });

      return `Jadwal Obat Hari Ini:\n${scheduleLines.join('\n')}`;

    } catch (error) {
      logger.error("Failed to get medication schedule summary", error instanceof Error ? error : new Error(String(error)));
      return "Maaf, tidak dapat mengambil jadwal obat saat ini.";
    }
  }

  /**
   * Get medication compliance summary
   */
  async getMedicationComplianceSummary(patientId: string, days: number = 7): Promise<string> {
    try {
      // This would integrate with reminder logs to calculate compliance
      // For now, provide a basic summary
      const activeMeds = await this.queryMedications(patientId, {
        timeRange: "aktif",
        limit: 50
      });

      if (activeMeds.medications.length === 0) {
        return "Tidak ada obat aktif untuk dipantau kepatuhannya.";
      }

      const totalMeds = activeMeds.medications.length;
      const avgReminders = activeMeds.medications.reduce((sum, med) => sum + (med.reminderCount || 0), 0) / totalMeds;

      return `Ringkasan Kepatuhan Obat (${days} hari terakhir):\n` +
             `- Total obat aktif: ${totalMeds}\n` +
             `- Rata-rata pengingat: ${avgReminders.toFixed(1)}/obat\n` +
             `- Status: ${totalMeds > 0 ? 'Dipantau' : 'Tidak aktif'}`;
    } catch (error) {
      logger.error("Failed to get medication compliance summary", error instanceof Error ? error : new Error(String(error)));
      return "Maaf, tidak dapat mengambil ringkasan kepatuhan obat.";
    }
  }
}

// Export singleton instance
export const medicationQueryService = new MedicationQueryService();