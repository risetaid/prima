/**
 * Medication Context Building Utilities
 * Provides intelligent context building for medication-aware templates and responses
 */

import {
  MedicationDetails,
  MedicationSchedule,
  ParsedMedicationVariable,
} from "./medication-parser";
import { MedicationContext } from "@/services/llm/response-templates";
import { db } from "@/db";
import { reminders, manualConfirmations } from "@/db/schema";
import { eq, and, desc, gte, sql, SQL } from "drizzle-orm";
import { logger } from "./logger";

export interface MedicationContextBuilder {
  patientId: string;
  medicationHistory: MedicationSchedule[];
  currentMedications: MedicationDetails[];
  patientVariables: ParsedMedicationVariable[];
  preferences: MedicationPreferences;
}

export interface MedicationContextBuilderClass {
  buildContext(
    medicationDetails: MedicationDetails
  ): Promise<MedicationContext>;
  buildComprehensiveContext(
    medicationDetails: MedicationDetails
  ): Promise<ContextualMedicationInfo>;
  getReminderContext(
    medicationName: string
  ): Promise<ContextualMedicationInfo | null>;
  generateMedicationMessage(
    medicationDetails: MedicationDetails,
    intent: string
  ): Promise<{
    header: string;
    instructions: string;
    warnings: string;
    followUp: string;
  }>;
  getPersonalizedInstructions(
    medicationDetails: MedicationDetails
  ): Promise<string>;
}

export interface MedicationPreferences {
  language: "id" | "en";
  detailLevel: "simple" | "detailed" | "comprehensive";
  reminderStyle: "friendly" | "professional" | "urgent";
  includeSideEffects: boolean;
  includeInstructions: boolean;
}

export interface ContextualMedicationInfo {
  medicationName: string;
  dosage: string;
  frequency: string;
  timing: string;
  category: string;
  isHighPriority: boolean;
  hasSideEffects: boolean;
  requiresSpecialInstructions: boolean;
  lastTaken?: Date;
  nextDue?: Date;
  adherenceRate?: number;
  missedDoses?: number;
  totalDoses?: number;
  interactions?: string[];
  contraindications?: string[];
}

export class MedicationContextBuilderImpl
  implements MedicationContextBuilderClass
{
  private builder: MedicationContextBuilder;

  constructor(builder: MedicationContextBuilder) {
    this.builder = builder;
  }

  /**
   * Build medication context for template usage
   */
  async buildContext(
    medicationDetails: MedicationDetails
  ): Promise<MedicationContext> {
    const context: MedicationContext = {
      medicationName: medicationDetails.name,
      dosage: medicationDetails.dosage,
      frequency: medicationDetails.frequency,
      timing: medicationDetails.timing,
      category: medicationDetails.category,
      isHighPriority: this.isHighPriorityMedication(medicationDetails),
      hasSideEffects:
        this.hasSignificantSideEffects(medicationDetails) || false,
      requiresSpecialInstructions:
        this.requiresSpecialInstructions(medicationDetails) || false,
    };

    // Add schedule information if available
    const schedule = this.getCurrentSchedule(medicationDetails.name);
    if (schedule) {
      context.lastTaken = await this.getLastTakenDate(medicationDetails.name);
      context.nextDue = await this.getNextDueDate(medicationDetails.name);
    }

    return context;
  }

  /**
   * Build comprehensive medication context for advanced templates
   */
  async buildComprehensiveContext(
    medicationDetails: MedicationDetails
  ): Promise<ContextualMedicationInfo> {
    const baseContext = await this.buildContext(medicationDetails);
    const adherence = await this.calculateAdherence(medicationDetails);

    return {
      medicationName: baseContext.medicationName,
      dosage: baseContext.dosage || "",
      frequency: baseContext.frequency || "",
      timing: baseContext.timing || "",
      category: baseContext.category || "",
      isHighPriority: baseContext.isHighPriority,
      hasSideEffects: baseContext.hasSideEffects,
      requiresSpecialInstructions: baseContext.requiresSpecialInstructions,
      lastTaken: baseContext.lastTaken,
      nextDue: baseContext.nextDue,
      adherenceRate: adherence.rate,
      missedDoses: adherence.missed,
      totalDoses: adherence.total,
      interactions: await this.getPotentialInteractions(medicationDetails),
      contraindications: await this.getContraindications(medicationDetails),
    };
  }

  /**
   * Get contextual medication information for reminder generation
   */
  async getReminderContext(
    medicationName: string
  ): Promise<ContextualMedicationInfo | null> {
    const medicationDetails = this.getMedicationDetails(medicationName);
    if (!medicationDetails) return null;

    return this.buildComprehensiveContext(medicationDetails);
  }

  /**
   * Generate medication-specific message content based on context
   */
  async generateMedicationMessage(
    medicationDetails: MedicationDetails,
    intent: string
  ): Promise<{
    header: string;
    instructions: string;
    warnings: string;
    followUp: string;
  }> {
    const context = await this.buildComprehensiveContext(medicationDetails);
    const preferences = this.builder.preferences;

    let header = "";
    let instructions = "";
    let warnings = "";
    let followUp = "";

    // Generate header based on priority
    if (context.isHighPriority) {
      header = "⚠️ *Pengingat Obat Penting*";
    } else {
      header = "💊 *Pengingat Obat*";
    }

    // Generate instructions based on detail level
    if (preferences.detailLevel === "simple") {
      instructions = `Saatnya minum ${context.medicationName} ${context.dosage}`;
    } else if (preferences.detailLevel === "detailed") {
      instructions = `Saatnya minum ${context.medicationName} ${
        context.dosage
      }\nFrekuensi: ${context.frequency}\nWaktu: ${this.formatTiming(
        context.timing
      )}`;
    } else {
      instructions = `Saatnya minum ${context.medicationName} ${
        context.dosage
      }\nFrekuensi: ${context.frequency}\nWaktu: ${this.formatTiming(
        context.timing
      )}\nKategori: ${this.formatCategory(context.category)}`;
    }

    // Add warnings if needed
    if (context.hasSideEffects && preferences.includeSideEffects) {
      warnings =
        "⚠️ Perhatikan efek samping dan segera hubungi relawan jika diperlukan.";
    }

    if (context.interactions && context.interactions.length > 0) {
      warnings += "\n⚠️ Hindari interaksi dengan obat lain tanpa konsultasi.";
    }

    // Generate follow-up based on intent
    if (intent === "reminder") {
      followUp = 'Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".';
    } else if (intent === "confirmation") {
      followUp = "Terima kasih sudah mengonfirmasi. Jaga kesehatan Anda!";
    } else if (intent === "missed") {
      followUp = "Segera minum obat Anda. Jangan lupa dosis berikutnya.";
    }

    return {
      header,
      instructions,
      warnings,
      followUp,
    };
  }

  /**
   * Get personalized medication instructions
   */
  async getPersonalizedInstructions(
    medicationDetails: MedicationDetails
  ): Promise<string> {
    const context = await this.buildComprehensiveContext(medicationDetails);
    const instructions: string[] = [];

    // Base instructions
    instructions.push(this.formatTiming(context.timing));

    // Category-specific instructions
    if (context.category === "CHEMOTHERAPY") {
      instructions.push("Pastikan istirahat yang cukup setelah minum obat");
      instructions.push("Minum banyak air untuk membantu pemulihan");
    }

    // Side effect instructions
    if (context.hasSideEffects) {
      instructions.push(
        "Perhatikan efek samping dan segera hubungi relawan jika diperlukan"
      );
    }

    // Adherence-based instructions
    if (context.adherenceRate && context.adherenceRate < 0.8) {
      instructions.push("Penting untuk menjaga konsistensi pengobatan");
    }

    return instructions.join(". ");
  }

  // Private helper methods

  private buildWhereConditions(
    patientId: string,
    schedule: MedicationSchedule,
    additionalConditions: SQL[] = []
  ): SQL {
    const conditions = [
      eq(reminders.patientId, patientId),
      ...additionalConditions,
    ];

    // Note: The new schema doesn't have reminderScheduleId in reminders table
    // We'll need to match by medication details instead
    if (schedule.medicationName) {
      conditions.push(
        sql`${reminders.medicationDetails}::jsonb ->> 'name' = ${schedule.medicationName}`
      );
    }

    const result = and(...conditions);
    return result || sql`true`;
  }

  private buildManualConfirmationsWhereConditions(
    patientId: string,
    schedule: MedicationSchedule,
    additionalConditions: SQL[] = []
  ): SQL {
    const conditions = [
      eq(manualConfirmations.patientId, patientId),
      ...additionalConditions,
    ];

    // Note: The new schema doesn't have reminderScheduleId in manualConfirmations table
    // We'll need to match by medication names in the medicationsTaken array
    if (schedule.medicationName) {
      conditions.push(
        sql`${schedule.medicationName} = ANY(${manualConfirmations.medicationsTaken})`
      );
    }

    const result = and(...conditions);
    return result || sql`true`;
  }

  private isHighPriorityMedication(medication: MedicationDetails): boolean {
    const highPriorityCategories = [
      "CHEMOTHERAPY",
      "TARGETED_THERAPY",
      "IMMUNOTHERAPY",
      "HORMONAL_THERAPY",
      "PAIN_MANAGEMENT",
    ];
    return highPriorityCategories.includes(medication.category);
  }

  private hasSignificantSideEffects(medication: MedicationDetails): boolean {
    if (!medication.sideEffects) return false;

    const severeSideEffects = [
      "mual berat",
      "muntah",
      "demam tinggi",
      "sesak napas",
      "ruam parah",
      "pusing berat",
      "nyeri dada",
    ];

    return medication.sideEffects.some((effect) =>
      severeSideEffects.some((severe) => effect.toLowerCase().includes(severe))
    );
  }

  private requiresSpecialInstructions(medication: MedicationDetails): boolean {
    return (
      medication.category === "CHEMOTHERAPY" ||
      medication.category === "TARGETED_THERAPY" ||
      !!medication.instructions ||
      this.hasSignificantSideEffects(medication)
    );
  }

  private getCurrentSchedule(
    medicationName: string
  ): MedicationSchedule | null {
    return (
      this.builder.medicationHistory.find((med) =>
        med.medicationName.toLowerCase().includes(medicationName.toLowerCase())
      ) || null
    );
  }

  private getCurrentScheduleForMedication(
    medicationName?: string
  ): MedicationSchedule | null {
    if (!medicationName) return null;
    return (
      this.builder.medicationHistory.find((med) =>
        med.medicationName.toLowerCase().includes(medicationName.toLowerCase())
      ) || null
    );
  }

  private async getLastTakenDate(
    medicationName: string
  ): Promise<Date | undefined> {
    try {
      const schedule = this.getCurrentScheduleForMedication(medicationName);
      if (!schedule) return undefined;

      // First, check manual confirmations for medications taken
      const manualConfirmationsResult = await db
        .select({
          confirmedAt: manualConfirmations.confirmedAt,
        })
        .from(manualConfirmations)
        .where(
          this.buildManualConfirmationsWhereConditions(this.builder.patientId, schedule)
        )
        .orderBy(desc(manualConfirmations.confirmedAt))
        .limit(1);

      // Also check reminders table for confirmed responses
      const remindersResult = await db
        .select({
          confirmationResponseAt: reminders.confirmationResponseAt,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, this.builder.patientId),
            eq(reminders.confirmationStatus, "CONFIRMED"),
            sql`${reminders.medicationDetails}::jsonb ->> 'name' = ${medicationName}`
          )
        )
        .orderBy(desc(reminders.confirmationResponseAt))
        .limit(1);

      // Return the most recent date from either source
      const manualDate = manualConfirmationsResult[0]?.confirmedAt;
      const reminderDate = remindersResult[0]?.confirmationResponseAt;

      if (manualDate && reminderDate) {
        return manualDate > reminderDate ? manualDate : reminderDate;
      }

      return manualDate || reminderDate || undefined;
    } catch (error) {
      logger.error(
        "Failed to get last taken date",
        error instanceof Error ? error : new Error(String(error)),
        {
          medicationName,
          patientId: this.builder.patientId,
          operation: "getLastTakenDate",
        }
      );
      return undefined;
    }
  }

  private async getNextDueDate(
    medicationName: string
  ): Promise<Date | undefined> {
    try {
      const schedule = this.getCurrentScheduleForMedication(medicationName);
      if (!schedule) return undefined;

      const now = new Date();

      // Calculate next dose based on frequency
      const frequencyMap: Record<string, number> = {
        ONCE_DAILY: 24,
        TWICE_DAILY: 12,
        THREE_TIMES_DAILY: 8,
        FOUR_TIMES_DAILY: 6,
        EVERY_8_HOURS: 8,
        EVERY_12_HOURS: 12,
        EVERY_24_HOURS: 24,
        EVERY_WEEK: 24 * 7,
        EVERY_MONTH: 24 * 30,
        AS_NEEDED: 0,
        CUSTOM: 24, // Default for custom
      };

      const hoursBetweenDoses = frequencyMap[schedule.frequency] || 24;
      if (hoursBetweenDoses === 0) return undefined; // AS_NEEDED medications

      // Get the last administration time
      const lastTaken = await this.getLastTakenDate(medicationName);

      if (lastTaken) {
        const nextDue = new Date(
          lastTaken.getTime() + hoursBetweenDoses * 60 * 60 * 1000
        );
        return nextDue > now
          ? nextDue
          : new Date(now.getTime() + hoursBetweenDoses * 60 * 60 * 1000);
      } else {
        // No previous doses, calculate from start date or current time
        const startDate = new Date(schedule.startDate);
        const nextDue =
          startDate > now
            ? startDate
            : new Date(now.getTime() + hoursBetweenDoses * 60 * 60 * 1000);
        return nextDue;
      }
    } catch (error) {
      logger.error(
        "Failed to calculate next due date",
        error instanceof Error ? error : new Error(String(error)),
        {
          medicationName,
          patientId: this.builder.patientId,
          operation: "getNextDueDate",
        }
      );
      return undefined;
    }
  }

  private async calculateAdherence(
    medicationDetails: MedicationDetails
  ): Promise<{ rate: number; missed: number; total: number }> {
    try {
      const schedule = this.getCurrentScheduleForMedication(
        medicationDetails.name
      );
      if (!schedule) return { rate: 0, missed: 0, total: 0 };

      // Get reminders for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const remindersData = await db
        .select({
          id: reminders.id,
          status: reminders.status,
          confirmationStatus: reminders.confirmationStatus,
          sentAt: reminders.sentAt,
          startDate: reminders.startDate,
          medicationDetails: reminders.medicationDetails,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, this.builder.patientId),
            gte(reminders.startDate, thirtyDaysAgo),
            sql`${reminders.medicationDetails}::jsonb ->> 'name' = ${medicationDetails.name}`
          )
        );

      // Also check manual confirmations for additional adherence data
      const manualConfirmationsData = await db
        .select({
          id: manualConfirmations.id,
          confirmedAt: manualConfirmations.confirmedAt,
          medicationsTaken: manualConfirmations.medicationsTaken,
        })
        .from(manualConfirmations)
        .where(
          and(
            eq(manualConfirmations.patientId, this.builder.patientId),
            gte(manualConfirmations.confirmedAt, thirtyDaysAgo),
            sql`${medicationDetails.name} = ANY(${manualConfirmations.medicationsTaken})`
          )
        );

      // Build a Set of unique keys from reminders to avoid double-counting
      const reminderKeys = new Set<string>();
      remindersData.forEach((reminder) => {
        const timestamp = reminder.sentAt || reminder.startDate;
        const key = `${this.builder.patientId}|${timestamp.toISOString()}|${medicationDetails.name}|${reminder.id}`;
        reminderKeys.add(key);
      });

      // Calculate adherence from both sources
      let takenCount = 0;
      let totalCount = 0;

      // Count from reminders
      remindersData.forEach((reminder) => {
        totalCount++;
        if (reminder.confirmationStatus === "CONFIRMED") {
          takenCount++;
        }
      });

      // Count from manual confirmations, but skip those that match reminders
      manualConfirmationsData.forEach((confirmation) => {
        // Check if this manual confirmation matches any reminder
        const isDuplicate = this.isDuplicateConfirmation(
          confirmation,
          remindersData,
          reminderKeys,
          medicationDetails.name
        );

        if (!isDuplicate) {
          takenCount++;
          totalCount++;
        }
      });

      const missedCount = totalCount - takenCount;
      const adherenceRate = totalCount > 0 ? takenCount / totalCount : 0;

      return {
        rate: adherenceRate,
        missed: missedCount,
        total: totalCount,
      };
    } catch (error) {
      logger.error(
        "Failed to calculate adherence",
        error instanceof Error ? error : new Error(String(error)),
        {
          medicationName: medicationDetails.name,
          patientId: this.builder.patientId,
          operation: "calculateAdherence",
        }
      );
      return { rate: 0, missed: 0, total: 0 };
    }
  }

  /**
    * Check if a manual confirmation is a duplicate of a reminder
    */
  private isDuplicateConfirmation(
    confirmation: { confirmedAt: Date; id: string },
    reminders: Array<{
      sentAt: Date | null;
      startDate: Date;
      id: string;
    }>,
    reminderKeys: Set<string>,
    medicationName: string
  ): boolean {
    // First check by exact key match
    const confirmationKey = `${
      this.builder.patientId
    }|${confirmation.confirmedAt.toISOString()}|${medicationName}|${confirmation.id}`;
    if (reminderKeys.has(confirmationKey)) {
      return true;
    }

    // Check for timestamp-based matching with tolerance (±2 minutes)
    const toleranceMs = 2 * 60 * 1000; // 2 minutes in milliseconds

    for (const reminder of reminders) {
      const reminderTimestamp = reminder.sentAt || reminder.startDate;

      // Check if timestamps are within tolerance
      const timeDiff = Math.abs(
        confirmation.confirmedAt.getTime() - reminderTimestamp.getTime()
      );
      if (timeDiff <= toleranceMs) {
        return true;
      }
    }

    return false;
  }

  private async getPotentialInteractions(
    medicationDetails: MedicationDetails
  ): Promise<string[]> {
    try {
      const interactions: string[] = [];

      // Get all current medications for the patient
      const currentMeds = this.builder.currentMedications.filter(
        (med) => med.name.toLowerCase() !== medicationDetails.name.toLowerCase()
      );

      // Basic interaction detection logic
      // TODO: Replace with proper drug interaction database integration

      // Common chemotherapy drug interactions
      if (medicationDetails.category === "CHEMOTHERAPY") {
        const chemoInteractions = currentMeds.filter(
          (med) =>
            med.category === "ANTIBIOTIC" ||
            med.category === "ANTIVIRAL" ||
            med.category === "ANTIFUNGAL"
        );

        chemoInteractions.forEach((med) => {
          interactions.push(
            `Potensial interaksi dengan ${med.name} - dapat meningkatkan risiko toksisitas`
          );
        });
      }

      // Blood thinner interactions
      const bloodThinners = ["warfarin", "aspirin", "clopidogrel", "heparin"];
      if (
        bloodThinners.some((thinner) =>
          medicationDetails.name.toLowerCase().includes(thinner)
        )
      ) {
        const nsaids = currentMeds.filter(
          (med) =>
            med.name.toLowerCase().includes("ibuprofen") ||
            med.name.toLowerCase().includes("naproxen") ||
            med.name.toLowerCase().includes("diclofenac")
        );

        nsaids.forEach((med) => {
          interactions.push(
            `Potensial interaksi dengan ${med.name} - meningkatkan risiko perdarahan`
          );
        });
      }

      // Check for duplicate medications
      const duplicates = currentMeds.filter(
        (med) =>
          med.genericName &&
          medicationDetails.genericName &&
          med.genericName.toLowerCase() ===
            medicationDetails.genericName.toLowerCase()
      );

      duplicates.forEach((med) => {
        interactions.push(
          `Duplikasi obat dengan ${med.name} - risiko overdosis`
        );
      });

      return interactions;
    } catch (error) {
      logger.error(
        "Failed to get potential interactions",
        error instanceof Error ? error : new Error(String(error)),
        {
          medicationName: medicationDetails.name,
          patientId: this.builder.patientId,
          operation: "getPotentialInteractions",
        }
      );
      return [];
    }
  }

  private async getContraindications(
    medicationDetails: MedicationDetails
  ): Promise<string[]> {
    try {
      const contraindications: string[] = [];

      // Get patient variables for medical history
      const patientVars = this.builder.patientVariables;

      // Basic contraindication detection logic
      // TODO: Replace with proper contraindication database integration

      // Check for allergies in patient variables
      const allergies = patientVars.filter(
        (v) =>
          v.variableName.toLowerCase().includes("alergi") ||
          v.variableName.toLowerCase().includes("allergy")
      );

      allergies.forEach((allergy) => {
        if (
          allergy.variableValue
            .toLowerCase()
            .includes(medicationDetails.name.toLowerCase())
        ) {
          contraindications.push(`Alergi terhadap ${medicationDetails.name}`);
        }
      });

      // Chemotherapy contraindications
      if (medicationDetails.category === "CHEMOTHERAPY") {
        // Check for pregnancy
        const pregnancyVars = patientVars.filter(
          (v) =>
            v.variableName.toLowerCase().includes("hamil") ||
            v.variableName.toLowerCase().includes("pregnant")
        );

        if (pregnancyVars.length > 0) {
          contraindications.push(
            "Kemoterapi umumnya dikontraindikasikan selama kehamilan"
          );
        }

        // Check for severe liver/kidney conditions
        const liverVars = patientVars.filter(
          (v) =>
            v.variableName.toLowerCase().includes("hati") ||
            v.variableName.toLowerCase().includes("liver")
        );

        const kidneyVars = patientVars.filter(
          (v) =>
            v.variableName.toLowerCase().includes("ginjal") ||
            v.variableName.toLowerCase().includes("kidney")
        );

        if (liverVars.length > 0 || kidneyVars.length > 0) {
          contraindications.push(
            "Hati-hati dengan kemoterapi pada gangguan hati atau ginjal berat"
          );
        }
      }

      // NSAID contraindications
      const nsaidNames = ["ibuprofen", "naproxen", "diclofenac", "aspirin"];
      if (
        nsaidNames.some((nsaid) =>
          medicationDetails.name.toLowerCase().includes(nsaid)
        )
      ) {
        const stomachVars = patientVars.filter(
          (v) =>
            v.variableName.toLowerCase().includes("maag") ||
            v.variableName.toLowerCase().includes("lambung") ||
            v.variableName.toLowerCase().includes("stomach")
        );

        if (stomachVars.length > 0) {
          contraindications.push(
            "NSAID dikontraindikasikan pada riwayat maag atau tukak lambung"
          );
        }
      }

      return contraindications;
    } catch (error) {
      logger.error(
        "Failed to get contraindications",
        error instanceof Error ? error : new Error(String(error)),
        {
          medicationName: medicationDetails.name,
          patientId: this.builder.patientId,
          operation: "getContraindications",
        }
      );
      return [];
    }
  }

  private getMedicationDetails(
    medicationName: string
  ): MedicationDetails | null {
    return (
      this.builder.currentMedications.find((med) =>
        med.name.toLowerCase().includes(medicationName.toLowerCase())
      ) || null
    );
  }

  private formatTiming(timing: string): string {
    const timingMap: Record<string, string> = {
      BEFORE_MEAL: "Minum 30 menit sebelum makan",
      WITH_MEAL: "Minum saat makan",
      AFTER_MEAL: "Minum 30 menit setelah makan",
      BEDTIME: "Minum sebelum tidur",
      MORNING: "Minum di pagi hari",
      AFTERNOON: "Minum di siang hari",
      EVENING: "Minum di sore hari",
      ANYTIME: "Minum sesuai jadwal",
    };

    return timingMap[timing] || "Minum sesuai jadwal";
  }

  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      CHEMOTHERAPY: "Kemoterapi",
      TARGETED_THERAPY: "Terapi Target",
      IMMUNOTHERAPY: "Imunoterapi",
      HORMONAL_THERAPY: "Terapi Hormonal",
      PAIN_MANAGEMENT: "Pengelolaan Nyeri",
      ANTIEMETIC: "Anti Mual",
      ANTIBIOTIC: "Antibiotik",
      ANTIVIRAL: "Antivirus",
      ANTIFUNGAL: "Antijamur",
      SUPPLEMENT: "Suplemen",
      OTHER: "Lainnya",
    };

    return categoryMap[category] || category;
  }
}

/**
 * Factory function to create medication context builder
 */
export function createMedicationContextBuilder(
  builder: MedicationContextBuilder
): MedicationContextBuilderClass {
  return new MedicationContextBuilderImpl(builder);
}

/**
 * Build context from patient data and medication history
 */
export function buildMedicationContextFromPatient(
  patientId: string,
  currentMedications: MedicationDetails[],
  medicationHistory: MedicationSchedule[],
  patientVariables: ParsedMedicationVariable[],
  preferences?: Partial<MedicationPreferences>
): MedicationContextBuilderClass {
  const defaultPreferences: MedicationPreferences = {
    language: "id",
    detailLevel: "detailed",
    reminderStyle: "friendly",
    includeSideEffects: true,
    includeInstructions: true,
    ...preferences,
  };

  const builderData: MedicationContextBuilder = {
    patientId,
    medicationHistory,
    currentMedications,
    patientVariables,
    preferences: defaultPreferences,
  };

  return createMedicationContextBuilder(builderData);
}
