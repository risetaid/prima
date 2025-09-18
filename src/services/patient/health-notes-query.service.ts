/**
 * Health Notes Query Service
 * Handles natural language queries for patient health notes with intelligent filtering
 */

import { db, healthNotes } from "@/db";
import { eq, and, isNull, gte, lte, desc, ilike, or, sql } from "drizzle-orm";
import { gt } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { HealthNoteDTO } from "@/services/patient/patient.types";

export interface HealthNotesQuery {
  timeRange?: "hari_ini" | "minggu_ini" | "bulan_ini" | "semuanya" | "kustom";
  keywords?: string[];
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface HealthNotesQueryResult {
  notes: HealthNoteDTO[];
  totalCount: number;
  timeRange: string;
  keywords: string[];
  querySummary: string;
}

export class HealthNotesQueryService {
  /**
   * Execute natural language health notes query
   */
  async queryHealthNotes(
    patientId: string,
    query: HealthNotesQuery
  ): Promise<HealthNotesQueryResult> {
    try {
      logger.info("Executing health notes query", {
        patientId,
        timeRange: query.timeRange,
        keywords: query.keywords,
        limit: query.limit
      });

      // Build date filter based on time range
      const { startDate, endDate } = this.buildDateFilter(query.timeRange, query.startDate, query.endDate);

      // Build database query with all filters
      const whereConditions = [
        eq(healthNotes.patientId, patientId),
        isNull(healthNotes.deletedAt)
      ];

      // Add date filters
      if (startDate) {
        whereConditions.push(gte(healthNotes.noteDate, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(healthNotes.noteDate, endDate));
      }

      // Add keyword filters
      if (query.keywords && query.keywords.length > 0) {
        const keywordConditions = query.keywords.map(keyword =>
          ilike(healthNotes.note, `%${keyword}%`)
        );
        whereConditions.push(or(...keywordConditions));
      }

      // Build and execute query
      const notes = await db
        .select({
          id: healthNotes.id,
          patientId: healthNotes.patientId,
          note: healthNotes.note,
          noteDate: healthNotes.noteDate,
          recordedBy: healthNotes.recordedBy,
          createdAt: healthNotes.createdAt,
          updatedAt: healthNotes.updatedAt
        })
        .from(healthNotes)
        .where(and(...whereConditions))
        .orderBy(desc(healthNotes.noteDate))
        .limit(query.limit || 10);

      // Get total count for this query
      const totalCount = await this.getQueryCount(patientId, query);

      // Generate query summary
      const querySummary = this.generateQuerySummary(query, notes.length, totalCount);

      logger.info("Health notes query completed", {
        patientId,
        notesFound: notes.length,
        totalCount,
        timeRange: query.timeRange
      });

      return {
        notes: notes.map(note => ({
          id: note.id,
          patientId: note.patientId,
          note: note.note,
          noteDate: note.noteDate,
          recordedBy: note.recordedBy,
          recordedByUser: null, // Will be populated if needed
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        })),
        totalCount,
        timeRange: query.timeRange || "semuanya",
        keywords: query.keywords || [],
        querySummary
      };

    } catch (error) {
      logger.error("Failed to execute health notes query", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        query
      });
      throw error;
    }
  }

  /**
   * Parse natural language query into structured query
   */
  parseNaturalLanguageQuery(message: string): HealthNotesQuery {
    const normalizedMessage = message.toLowerCase();
    const query: HealthNotesQuery = {
      limit: 10
    };

    // Parse time range
    if (normalizedMessage.includes("hari ini")) {
      query.timeRange = "hari_ini";
    } else if (normalizedMessage.includes("minggu ini")) {
      query.timeRange = "minggu_ini";
    } else if (normalizedMessage.includes("bulan ini")) {
      query.timeRange = "bulan_ini";
    } else if (normalizedMessage.includes("semua") || normalizedMessage.includes("seluruh")) {
      query.timeRange = "semuanya";
    }

    // Parse keywords from common patterns
    const keywordPatterns = [
      /tentang\s+([a-zA-Z0-9\s]+)/,
      /mengenai\s+([a-zA-Z0-9\s]+)/,
      / tentang ([a-zA-Z0-9\s]+)/,
      /kondisi\s+([a-zA-Z0-9\s]+)/,
      /gejala\s+([a-zA-Z0-9\s]+)/
    ];

    for (const pattern of keywordPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        query.keywords = match[1].trim().split(/\s+/).filter(Boolean);
        break;
      }
    }

    // Extract direct health terms if no keywords found
    if (!query.keywords) {
      const healthTerms = [
        "demam", "mual", "pusing", "nyeri", "sakit", "batuk", "pilek",
        "sesak", "lemas", "capek", "alergi", "ruam", "gatal", "muntah",
        "diare", "sembelit", "nafsu makan", "tidur", "kontrol", "cek",
        "dokter", "rs", "rumah sakit", "obat", "vitamin", "suplemen"
      ];

      const foundTerms = healthTerms.filter(term => normalizedMessage.includes(term));
      if (foundTerms.length > 0) {
        query.keywords = foundTerms;
      }
    }

    // Parse limit
    const limitMatch = normalizedMessage.match(/(\d+)\s*(catatan|note|terakhir|akhir)/);
    if (limitMatch) {
      query.limit = Math.min(parseInt(limitMatch[1]), 50); // Cap at 50
    }

    return query;
  }

  /**
   * Build date filter based on time range
   */
  private buildDateFilter(
    timeRange?: string,
    customStartDate?: Date,
    customEndDate?: Date
  ): { startDate?: Date; endDate?: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const WIB_OFFSET = 7 * 60 * 60 * 1000; // WIB is UTC+7

    // Adjust to WIB
    const todayWIB = new Date(today.getTime() + WIB_OFFSET);

    switch (timeRange) {
      case "hari_ini":
        const startToday = new Date(todayWIB);
        const endToday = new Date(todayWIB);
        endToday.setDate(endToday.getDate() + 1);
        return { startDate: startToday, endDate: endToday };

      case "minggu_ini":
        const startOfWeek = new Date(todayWIB);
        startOfWeek.setDate(todayWIB.getDate() - todayWIB.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return { startDate: startOfWeek, endDate: endOfWeek };

      case "bulan_ini":
        const startOfMonth = new Date(todayWIB.getFullYear(), todayWIB.getMonth(), 1);
        const endOfMonth = new Date(todayWIB.getFullYear(), todayWIB.getMonth() + 1, 1);
        return { startDate: startOfMonth, endDate: endOfMonth };

      case "kustom":
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };

      case "semuanya":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }

  /**
   * Get total count for query
   */
  private async getQueryCount(patientId: string, query: HealthNotesQuery): Promise<number> {
    try {
      const { startDate, endDate } = this.buildDateFilter(query.timeRange);

      const whereConditions = [
        eq(healthNotes.patientId, patientId),
        isNull(healthNotes.deletedAt)
      ];

      if (startDate) {
        whereConditions.push(gte(healthNotes.noteDate, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(healthNotes.noteDate, endDate));
      }

      if (query.keywords && query.keywords.length > 0) {
        const keywordConditions = query.keywords.map(keyword =>
          ilike(healthNotes.note, `%${keyword}%`)
        );
        whereConditions.push(or(...keywordConditions));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(healthNotes)
        .where(and(...whereConditions));

      return result[0]?.count || 0;

    } catch (error) {
      logger.error("Failed to get query count", error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Generate human-readable query summary
   */
  private generateQuerySummary(query: HealthNotesQuery, foundCount: number, totalCount: number): string {
    const timeRangeText = {
      "hari_ini": "hari ini",
      "minggu_ini": "minggu ini",
      "bulan_ini": "bulan ini",
      "semuanya": "semua waktu",
      "kustom": "periode kustom"
    }[query.timeRange || "semuanya"];

    const keywordText = query.keywords && query.keywords.length > 0
      ? ` dengan kata kunci: ${query.keywords.join(", ")}`
      : "";

    return `Ditemukan ${foundCount} catatan${keywordText} dari ${totalCount} total catatan ${timeRangeText}`;
  }

  /**
   * Format health notes for LLM consumption
   */
  formatNotesForLLM(notes: HealthNoteDTO[]): string {
    if (notes.length === 0) {
      return "Tidak ada catatan kesehatan yang ditemukan untuk periode ini.";
    }

    const formattedNotes = notes.map((note, index) => {
      const date = new Date(note.noteDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      return `${index + 1}. ${date}: ${note.note}`;
    }).join('\n');

    return `Catatan Kesehatan:\n${formattedNotes}`;
  }

  /**
   * Get recent health summary for quick overview
   */
  async getRecentHealthSummary(patientId: string, days: number = 7): Promise<string> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentNotes = await this.queryHealthNotes(patientId, {
        timeRange: "kustom",
        startDate,
        endDate,
        limit: 5
      });

      if (recentNotes.notes.length === 0) {
        return `Tidak ada catatan kesehatan dalam ${days} hari terakhir.`;
      }

      // Extract key health indicators
      const healthIndicators = this.extractHealthIndicators(recentNotes.notes);

      const summary = `Ringkasan Kesehatan ${days} Hari Terakhir:\n` +
        `- Total catatan: ${recentNotes.notes.length}\n` +
        (healthIndicators.symptoms.length > 0 ? `- Gejala tercatat: ${healthIndicators.symptoms.join(", ")}\n` : "") +
        (healthIndicators.medications.length > 0 ? `- Obat disebut: ${healthIndicators.medications.join(", ")}\n` : "") +
        (healthIndicators.activities.length > 0 ? `- Aktivitas: ${healthIndicators.activities.join(", ")}\n` : "") +
        `- Catatan terakhir: ${new Date(recentNotes.notes[0].noteDate).toLocaleDateString('id-ID')}`;

      return summary;

    } catch (error) {
      logger.error("Failed to get recent health summary", error instanceof Error ? error : new Error(String(error)));
      return "Maaf, tidak dapat mengambil ringkasan kesehatan saat ini.";
    }
  }

  /**
   * Extract health indicators from notes
   */
  private extractHealthIndicators(notes: HealthNoteDTO[]): {
    symptoms: string[];
    medications: string[];
    activities: string[];
  } {
    const symptoms = new Set<string>();
    const medications = new Set<string>();
    const activities = new Set<string>();

    const symptomKeywords = ["demam", "mual", "pusing", "nyeri", "sakit", "batuk", "pilek", "sesak", "lemas"];
    const medicationKeywords = ["obat", "vitamin", "suplemen", "tablet", "kapsul", "sirup"];
    const activityKeywords = ["kontrol", "cek", "dokter", "rs", "olahraga", "istirahat"];

    for (const note of notes) {
      const text = note.note.toLowerCase();

      for (const keyword of symptomKeywords) {
        if (text.includes(keyword)) {
          symptoms.add(keyword);
        }
      }

      for (const keyword of medicationKeywords) {
        if (text.includes(keyword)) {
          medications.add(keyword);
        }
      }

      for (const keyword of activityKeywords) {
        if (text.includes(keyword)) {
          activities.add(keyword);
        }
      }
    }

    return {
      symptoms: Array.from(symptoms),
      medications: Array.from(medications),
      activities: Array.from(activities)
    };
  }
}

// Export singleton instance
export const healthNotesQueryService = new HealthNotesQueryService();