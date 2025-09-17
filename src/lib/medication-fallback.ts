/**
 * Enhanced Medication Fallback Mechanisms
 * Provides intelligent fallback systems for missing medication data and name resolution
 */

import {
  MedicationDetails,
  MedicationSchedule,
  ParsedMedicationVariable,
} from "./medication-parser";
import { logger } from "./logger";

export interface FallbackStrategy {
  level: 1 | 2 | 3 | 4 | 5;
  description: string;
  confidence: number;
  applicable: (context: MedicationResolutionContext) => boolean;
  resolve: (context: MedicationResolutionContext) => MedicationResolutionResult;
}

export interface MedicationResolutionContext {
  patientId: string;
  originalInput: string;
  currentMedications: MedicationDetails[];
  medicationHistory: MedicationSchedule[];
  patientVariables: ParsedMedicationVariable[];
  availableData: {
    name?: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    category?: string;
  };
  resolutionAttempts: string[];
}

export interface MedicationResolutionResult {
  success: boolean;
  medicationName: string;
  confidence: number;
  strategy: string;
  fallbackLevel: number;
  suggestions?: string[];
  requiresVerification?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MedicationQualityScore {
  score: number;
  issues: string[];
  suggestions: string[];
  confidence: number;
}

export class MedicationFallbackResolver {
  private strategies: FallbackStrategy[];
  private qualityThreshold: number = 0.7;
  private maxFallbackLevel: number = 3;

  constructor() {
    this.strategies = this.initializeStrategies();
  }

  /**
   * Resolve medication name using hierarchical fallback system
   */
  resolveMedicationName(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    // Try strategies in order of preference
    for (const strategy of this.strategies) {
      if (
        strategy.applicable(context) &&
        strategy.level <= this.maxFallbackLevel
      ) {
        const result = strategy.resolve(context);
        if (result.success && result.confidence >= this.qualityThreshold) {
          return result;
        }
      }
    }

    // If no strategy succeeds, return default fallback
    return this.createDefaultFallback(context);
  }

  /**
   * Get medication suggestions based on partial input
   */
  getMedicationSuggestions(
    partialInput: string,
    currentMedications: MedicationDetails[]
  ): string[] {
    const normalizedInput = partialInput.toLowerCase().trim();
    const suggestions: string[] = [];

    // Exact match with current medications
    for (const med of currentMedications) {
      if (med.name.toLowerCase().includes(normalizedInput)) {
        suggestions.push(med.name);
      }
    }

    // Phonetic matching for common medication names
    const phoneticMatches = this.getPhoneticMatches(
      normalizedInput,
      currentMedications
    );
    suggestions.push(...phoneticMatches);

    // Generic medication suggestions based on categories
    if (normalizedInput.length < 3) {
      const genericSuggestions = this.getGenericSuggestions(normalizedInput);
      suggestions.push(...genericSuggestions);
    }

    // Remove duplicates and limit to top 5
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Validate and score medication data quality
   */
  validateMedicationQuality(
    medication: MedicationDetails
  ): MedicationQualityScore {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 1.0;

    // Check name quality
    if (!medication.name || medication.name.length < 2) {
      issues.push("Nama obat tidak valid atau terlalu pendek");
      score -= 0.3;
    } else if (
      medication.name.toLowerCase() === "obat" ||
      medication.name.toLowerCase() === "unknown"
    ) {
      issues.push("Nama obat terlalu generik");
      suggestions.push("Gunakan nama spesifik obat");
      score -= 0.2;
    }

    // Check dosage quality
    if (!medication.dosage || medication.dosage.length < 1) {
      issues.push("Dosis obat tidak valid");
      score -= 0.2;
    }

    // Check category quality
    if (medication.category === "OTHER") {
      suggestions.push(
        "Pertimbangkan untuk mengkategori obat dengan lebih spesifik"
      );
      score -= 0.1;
    }

    // Check for completeness
    if (!medication.frequency || !medication.timing) {
      suggestions.push("Tambahkan informasi frekuensi dan waktu minum obat");
      score -= 0.1;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
      confidence: score,
    };
  }

  /**
   * Generate contextual medication name when missing
   */
  generateContextualMedicationName(
    context: MedicationResolutionContext
  ): string {
    const { currentMedications, patientVariables, availableData } = context;

    // If patient has current medications, use the most recent one
    if (currentMedications.length > 0) {
      const mostRecent = currentMedications[currentMedications.length - 1];
      return mostRecent.name;
    }

    // Try to extract from patient variables
    const medicationVariable = patientVariables.find(
      (v) => v.category === "MEDICATION" && v.variableName === "obat"
    );
    if (medicationVariable) {
      return medicationVariable.variableValue;
    }

    // Use available data if provided
    if (availableData.name) {
      return availableData.name;
    }

    // Generate based on context clues
    return this.generateFromContextClues(context);
  }

  /**
   * Apply medication corrections based on common patterns
   */
  applyMedicationCorrections(medicationName: string): string {
    let corrected = medicationName.trim();

    // Common corrections
    const corrections: Record<string, string> = {
      "obat kanker": "obat kemoterapi",
      "obat kemoteraphy": "obat kemoterapi",
      "obat kemo": "obat kemoterapi",
      "pain killer": "obat penghilang rasa sakit",
      antibiotik: "antibiotik",
      vitamin: "suplemen vitamin",
    };

    for (const [incorrect, correct] of Object.entries(corrections)) {
      if (corrected.toLowerCase().includes(incorrect)) {
        corrected = corrected.replace(new RegExp(incorrect, "gi"), correct);
      }
    }

    return corrected;
  }

  // Private helper methods

  private initializeStrategies(): FallbackStrategy[] {
    return [
      {
        level: 1,
        description: "Exact match with current medications",
        confidence: 0.95,
        applicable: (context) => this.hasExactMatch(context),
        resolve: (context) => this.resolveExactMatch(context),
      },
      {
        level: 2,
        description: "Partial match with current medications",
        confidence: 0.85,
        applicable: (context) => this.hasPartialMatch(context),
        resolve: (context) => this.resolvePartialMatch(context),
      },
      {
        level: 3,
        description: "Patient variables resolution",
        confidence: 0.75,
        applicable: (context) => this.hasMedicationVariables(context),
        resolve: (context) => this.resolveFromVariables(context),
      },
      {
        level: 4,
        description: "Phonetic matching",
        confidence: 0.65,
        applicable: (context) => this.canApplyPhoneticMatching(context),
        resolve: (context) => this.resolvePhoneticMatch(context),
      },
      {
        level: 5,
        description: "Contextual generation",
        confidence: 0.5,
        applicable: () => true,
        resolve: (context) => this.resolveContextual(context),
      },
    ];
  }

  private hasExactMatch(context: MedicationResolutionContext): boolean {
    const input = context.originalInput.toLowerCase().trim();
    return context.currentMedications.some(
      (med) => med.name.toLowerCase() === input
    );
  }

  private resolveExactMatch(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    const input = context.originalInput.toLowerCase().trim();
    const medication = context.currentMedications.find(
      (med) => med.name.toLowerCase() === input
    )!;

    return {
      success: true,
      medicationName: medication.name,
      confidence: 0.95,
      strategy: "exact_match",
      fallbackLevel: 1,
      metadata: {
        source: "current_medications",
        medicationId: medication.name,
      },
    };
  }

  private hasPartialMatch(context: MedicationResolutionContext): boolean {
    const input = context.originalInput.toLowerCase().trim();
    return context.currentMedications.some(
      (med) =>
        med.name.toLowerCase().includes(input) ||
        input.includes(med.name.toLowerCase())
    );
  }

  private resolvePartialMatch(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    const input = context.originalInput.toLowerCase().trim();
    const matches = context.currentMedications.filter(
      (med) =>
        med.name.toLowerCase().includes(input) ||
        input.includes(med.name.toLowerCase())
    );

    if (matches.length === 1) {
      return {
        success: true,
        medicationName: matches[0].name,
        confidence: 0.85,
        strategy: "partial_match",
        fallbackLevel: 2,
        metadata: {
          source: "current_medications",
          matchType: "partial",
        },
      };
    }

    // Multiple matches - return suggestions
    return {
      success: true,
      medicationName: matches[0].name, // Use first match as default
      confidence: 0.7,
      strategy: "partial_match_multiple",
      fallbackLevel: 2,
      suggestions: matches.map((m) => m.name),
      requiresVerification: true,
      metadata: {
        source: "current_medications",
        matchType: "multiple",
        matchCount: matches.length,
      },
    };
  }

  private hasMedicationVariables(
    context: MedicationResolutionContext
  ): boolean {
    return context.patientVariables.some((v) => v.category === "MEDICATION");
  }

  private resolveFromVariables(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    const medicationVars = context.patientVariables.filter(
      (v) => v.category === "MEDICATION"
    );

    if (medicationVars.length === 0) {
      return this.createDefaultFallback(context);
    }

    // Find the medication name variable
    const nameVar = medicationVars.find((v) => v.variableName === "obat");
    if (nameVar) {
      return {
        success: true,
        medicationName: nameVar.variableValue,
        confidence: nameVar.confidence,
        strategy: "patient_variables",
        fallbackLevel: 3,
        metadata: {
          source: "patient_variables",
          variableConfidence: nameVar.confidence,
        },
      };
    }

    // Use the highest confidence medication variable
    const highestConfidence = medicationVars.reduce((prev, current) =>
      prev.confidence > current.confidence ? prev : current
    );

    return {
      success: true,
      medicationName: highestConfidence.variableValue,
      confidence: highestConfidence.confidence,
      strategy: "patient_variables_fallback",
      fallbackLevel: 3,
      metadata: {
        source: "patient_variables",
        variableType: highestConfidence.variableName,
      },
    };
  }

  private canApplyPhoneticMatching(
    context: MedicationResolutionContext
  ): boolean {
    return context.originalInput.length >= 3;
  }

  private resolvePhoneticMatch(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    const phoneticMatches = this.getPhoneticMatches(
      context.originalInput.toLowerCase().trim(),
      context.currentMedications
    );

    if (phoneticMatches.length > 0) {
      return {
        success: true,
        medicationName: phoneticMatches[0],
        confidence: 0.65,
        strategy: "phonetic_match",
        fallbackLevel: 4,
        suggestions: phoneticMatches,
        requiresVerification: true,
        metadata: {
          source: "phonetic_matching",
          matchCount: phoneticMatches.length,
        },
      };
    }

    return this.createDefaultFallback(context);
  }

  private resolveContextual(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    const medicationName = this.generateContextualMedicationName(context);

    return {
      success: true,
      medicationName,
      confidence: 0.5,
      strategy: "contextual_generation",
      fallbackLevel: 5,
      requiresVerification: true,
      metadata: {
        source: "contextual_generation",
        generationMethod: "context_based",
      },
    };
  }

  private createDefaultFallback(
    context: MedicationResolutionContext
  ): MedicationResolutionResult {
    logger.debug("Creating default fallback medication", {
      patientId: context.patientId,
      originalInput: context.originalInput,
    });
    return {
      success: true,
      medicationName: "obat",
      confidence: 0.3,
      strategy: "default_fallback",
      fallbackLevel: 5,
      requiresVerification: true,
      metadata: {
        source: "default",
        reason: "no_match_found",
      },
    };
  }

  private getPhoneticMatches(
    input: string,
    medications: MedicationDetails[]
  ): string[] {
    logger.debug("Getting phonetic matches", {
      input,
      medicationCount: medications.length,
    });
    const matches: string[] = [];

    // Simple phonetic matching based on common medication name patterns
    const phoneticMap: Record<string, string[]> = {
      paracetamol: ["parasetamol", "acetaminophen"],
      amoxicillin: ["amoksisilin"],
      ibuprofen: ["ibuprofen"],
      metformin: ["metformin"],
      atorvastatin: ["atorvastatin"],
    };

    for (const [canonical, variants] of Object.entries(phoneticMap)) {
      if (
        canonical.includes(input) ||
        variants.some((variant) => variant.includes(input))
      ) {
        matches.push(canonical);
      }
    }

    return matches;
  }

  private getGenericSuggestions(input: string): string[] {
    const suggestions: string[] = [];

    // Common medication categories for generic suggestions
    if (input.includes("anti") || input.includes("ant")) {
      suggestions.push("antibiotik", "antivirus", "antijamur");
    }

    if (input.includes("vit") || input.includes("vitamin")) {
      suggestions.push("vitamin C", "vitamin D", "multivitamin");
    }

    if (input.includes("pain") || input.includes("nyeri")) {
      suggestions.push("obat penghilang rasa sakit", "analgesik");
    }

    return suggestions;
  }

  private generateFromContextClues(
    context: MedicationResolutionContext
  ): string {
    const { medicationHistory, originalInput } = context;

    // If there's medication history, use the most recent
    if (medicationHistory.length > 0) {
      return medicationHistory[medicationHistory.length - 1].medicationName;
    }

    // Generate based on input analysis
    if (originalInput.toLowerCase().includes("kanker")) {
      return "obat kemoterapi";
    }

    if (originalInput.toLowerCase().includes("sakit")) {
      return "obat penghilang rasa sakit";
    }

    return "obat";
  }
}

/**
 * Factory function to create medication fallback resolver
 */
export function createMedicationFallbackResolver(): MedicationFallbackResolver {
  return new MedicationFallbackResolver();
}

/**
 * Resolve medication name using intelligent fallback system
 */
export function resolveMedicationNameWithFallback(
  patientId: string,
  originalInput: string,
  currentMedications: MedicationDetails[],
  medicationHistory: MedicationSchedule[],
  patientVariables: ParsedMedicationVariable[],
  availableData?: Partial<MedicationDetails>
): MedicationResolutionResult {
  const resolver = createMedicationFallbackResolver();
  const context: MedicationResolutionContext = {
    patientId,
    originalInput,
    currentMedications,
    medicationHistory,
    patientVariables,
    availableData: availableData || {},
    resolutionAttempts: [],
  };

  return resolver.resolveMedicationName(context);
}

/**
 * Get medication quality score with suggestions for improvement
 */
export function getMedicationQualityScore(
  medication: MedicationDetails
): MedicationQualityScore {
  const resolver = createMedicationFallbackResolver();
  return resolver.validateMedicationQuality(medication);
}
