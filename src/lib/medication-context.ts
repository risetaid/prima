/**
 * Medication Context Building Utilities
 * Provides intelligent context building for medication-aware templates and responses
 */

import { MedicationDetails, MedicationSchedule, ParsedMedicationVariable } from './medication-parser'
import { MedicationContext } from '@/services/llm/response-templates'

export interface MedicationContextBuilder {
  patientId: string
  medicationHistory: MedicationSchedule[]
  currentMedications: MedicationDetails[]
  patientVariables: ParsedMedicationVariable[]
  preferences: MedicationPreferences
}

export interface MedicationContextBuilderClass {
  buildContext(medicationDetails: MedicationDetails): MedicationContext
  buildComprehensiveContext(medicationDetails: MedicationDetails): ContextualMedicationInfo
  getReminderContext(medicationName: string): ContextualMedicationInfo | null
  generateMedicationMessage(medicationDetails: MedicationDetails, intent: string): {
    header: string
    instructions: string
    warnings: string
    followUp: string
  }
  getPersonalizedInstructions(medicationDetails: MedicationDetails): string
}

export interface MedicationPreferences {
  language: 'id' | 'en'
  detailLevel: 'simple' | 'detailed' | 'comprehensive'
  reminderStyle: 'friendly' | 'professional' | 'urgent'
  includeSideEffects: boolean
  includeInstructions: boolean
}

export interface ContextualMedicationInfo {
  medicationName: string
  dosage: string
  frequency: string
  timing: string
  category: string
  isHighPriority: boolean
  hasSideEffects: boolean
  requiresSpecialInstructions: boolean
  lastTaken?: Date
  nextDue?: Date
  adherenceRate?: number
  missedDoses?: number
  totalDoses?: number
  interactions?: string[]
  contraindications?: string[]
}

export class MedicationContextBuilderImpl implements MedicationContextBuilderClass {
  private builder: MedicationContextBuilder

  constructor(builder: MedicationContextBuilder) {
    this.builder = builder
  }

  /**
   * Build medication context for template usage
   */
  buildContext(medicationDetails: MedicationDetails): MedicationContext {
    const context: MedicationContext = {
      medicationName: medicationDetails.name,
      dosage: medicationDetails.dosage,
      frequency: medicationDetails.frequency,
      timing: medicationDetails.timing,
      category: medicationDetails.category,
      isHighPriority: this.isHighPriorityMedication(medicationDetails),
      hasSideEffects: this.hasSignificantSideEffects(medicationDetails) || false,
      requiresSpecialInstructions: this.requiresSpecialInstructions(medicationDetails) || false,
    }

    // Add schedule information if available
    const schedule = this.getCurrentSchedule(medicationDetails.name)
    if (schedule) {
      context.lastTaken = this.getLastTakenDate(schedule)
      context.nextDue = this.getNextDueDate(schedule)
    }

    return context
  }

  /**
   * Build comprehensive medication context for advanced templates
   */
  buildComprehensiveContext(medicationDetails: MedicationDetails): ContextualMedicationInfo {
    const baseContext = this.buildContext(medicationDetails)
    const adherence = this.calculateAdherence(medicationDetails.name)

    return {
      medicationName: baseContext.medicationName,
      dosage: baseContext.dosage || '',
      frequency: baseContext.frequency || '',
      timing: baseContext.timing || '',
      category: baseContext.category || '',
      isHighPriority: baseContext.isHighPriority,
      hasSideEffects: baseContext.hasSideEffects,
      requiresSpecialInstructions: baseContext.requiresSpecialInstructions,
      lastTaken: baseContext.lastTaken,
      nextDue: baseContext.nextDue,
      adherenceRate: adherence.rate,
      missedDoses: adherence.missed,
      totalDoses: adherence.total,
      interactions: this.getPotentialInteractions(medicationDetails),
      contraindications: this.getContraindications(medicationDetails),
    }
  }

  /**
   * Get contextual medication information for reminder generation
   */
  getReminderContext(medicationName: string): ContextualMedicationInfo | null {
    const medicationDetails = this.getMedicationDetails(medicationName)
    if (!medicationDetails) return null

    return this.buildComprehensiveContext(medicationDetails)
  }

  /**
   * Generate medication-specific message content based on context
   */
  generateMedicationMessage(medicationDetails: MedicationDetails, intent: string): {
    header: string
    instructions: string
    warnings: string
    followUp: string
  } {
    const context = this.buildComprehensiveContext(medicationDetails)
    const preferences = this.builder.preferences

    let header = ''
    let instructions = ''
    let warnings = ''
    let followUp = ''

    // Generate header based on priority
    if (context.isHighPriority) {
      header = '⚠️ *Pengingat Obat Penting*'
    } else {
      header = '💊 *Pengingat Obat*'
    }

    // Generate instructions based on detail level
    if (preferences.detailLevel === 'simple') {
      instructions = `Saatnya minum ${context.medicationName} ${context.dosage}`
    } else if (preferences.detailLevel === 'detailed') {
      instructions = `Saatnya minum ${context.medicationName} ${context.dosage}\nFrekuensi: ${context.frequency}\nWaktu: ${this.formatTiming(context.timing)}`
    } else {
      instructions = `Saatnya minum ${context.medicationName} ${context.dosage}\nFrekuensi: ${context.frequency}\nWaktu: ${this.formatTiming(context.timing)}\nKategori: ${this.formatCategory(context.category)}`
    }

    // Add warnings if needed
    if (context.hasSideEffects && preferences.includeSideEffects) {
      warnings = '⚠️ Perhatikan efek samping dan segera hubungi relawan jika diperlukan.'
    }

    if (context.interactions && context.interactions.length > 0) {
      warnings += '\n⚠️ Hindari interaksi dengan obat lain tanpa konsultasi.'
    }

    // Generate follow-up based on intent
    if (intent === 'reminder') {
      followUp = 'Apakah sudah minum obatnya? Balas "SUDAH" atau "BELUM".'
    } else if (intent === 'confirmation') {
      followUp = 'Terima kasih sudah mengonfirmasi. Jaga kesehatan Anda!'
    } else if (intent === 'missed') {
      followUp = 'Segera minum obat Anda. Jangan lupa dosis berikutnya.'
    }

    return {
      header,
      instructions,
      warnings,
      followUp,
    }
  }

  /**
   * Get personalized medication instructions
   */
  getPersonalizedInstructions(medicationDetails: MedicationDetails): string {
    const context = this.buildComprehensiveContext(medicationDetails)
    const instructions: string[] = []

    // Base instructions
    instructions.push(this.formatTiming(context.timing))

    // Category-specific instructions
    if (context.category === 'CHEMOTHERAPY') {
      instructions.push('Pastikan istirahat yang cukup setelah minum obat')
      instructions.push('Minum banyak air untuk membantu pemulihan')
    }

    // Side effect instructions
    if (context.hasSideEffects) {
      instructions.push('Perhatikan efek samping dan segera hubungi relawan jika diperlukan')
    }

    // Adherence-based instructions
    if (context.adherenceRate && context.adherenceRate < 0.8) {
      instructions.push('Penting untuk menjaga konsistensi pengobatan')
    }

    return instructions.join('. ')
  }

  // Private helper methods

  private isHighPriorityMedication(medication: MedicationDetails): boolean {
    const highPriorityCategories = [
      'CHEMOTHERAPY',
      'TARGETED_THERAPY',
      'IMMUNOTHERAPY',
      'HORMONAL_THERAPY',
      'PAIN_MANAGEMENT'
    ]
    return highPriorityCategories.includes(medication.category)
  }

  private hasSignificantSideEffects(medication: MedicationDetails): boolean {
    if (!medication.sideEffects) return false

    const severeSideEffects = [
      'mual berat',
      'muntah',
      'demam tinggi',
      'sesak napas',
      'ruam parah',
      'pusing berat',
      'nyeri dada'
    ]

    return medication.sideEffects.some(effect =>
      severeSideEffects.some(severe => effect.toLowerCase().includes(severe))
    )
  }

  private requiresSpecialInstructions(medication: MedicationDetails): boolean {
    return (
      medication.category === 'CHEMOTHERAPY' ||
      medication.category === 'TARGETED_THERAPY' ||
      !!medication.instructions ||
      this.hasSignificantSideEffects(medication)
    )
  }

  private getCurrentSchedule(medicationName: string): MedicationSchedule | null {
    return this.builder.medicationHistory.find(med =>
      med.medicationName.toLowerCase().includes(medicationName.toLowerCase())
    ) || null
  }

  private getLastTakenDate(_schedule: MedicationSchedule): Date | undefined {
    // This would typically be calculated from reminder logs
    // For now, return undefined to indicate no data
    return undefined
  }

  private getNextDueDate(_schedule: MedicationSchedule): Date | undefined {
    // This would typically be calculated from the schedule
    // For now, return undefined to indicate no data
    return undefined
  }

  private calculateAdherence(_medicationName: string): { rate: number; missed: number; total: number } {
    // This would typically be calculated from reminder logs
    // For now, return default values
    return { rate: 0.8, missed: 2, total: 10 }
  }

  private getPotentialInteractions(_medication: MedicationDetails): string[] {
    // This would typically check against a database of drug interactions
    // For now, return empty array
    return []
  }

  private getContraindications(_medication: MedicationDetails): string[] {
    // This would typically check against a database of contraindications
    // For now, return empty array
    return []
  }

  private getMedicationDetails(medicationName: string): MedicationDetails | null {
    return this.builder.currentMedications.find(med =>
      med.name.toLowerCase().includes(medicationName.toLowerCase())
    ) || null
  }

  private formatTiming(timing: string): string {
    const timingMap: Record<string, string> = {
      'BEFORE_MEAL': 'Minum 30 menit sebelum makan',
      'WITH_MEAL': 'Minum saat makan',
      'AFTER_MEAL': 'Minum 30 menit setelah makan',
      'BEDTIME': 'Minum sebelum tidur',
      'MORNING': 'Minum di pagi hari',
      'AFTERNOON': 'Minum di siang hari',
      'EVENING': 'Minum di sore hari',
      'ANYTIME': 'Minum sesuai jadwal'
    }

    return timingMap[timing] || 'Minum sesuai jadwal'
  }

  private formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'CHEMOTHERAPY': 'Kemoterapi',
      'TARGETED_THERAPY': 'Terapi Target',
      'IMMUNOTHERAPY': 'Imunoterapi',
      'HORMONAL_THERAPY': 'Terapi Hormonal',
      'PAIN_MANAGEMENT': 'Pengelolaan Nyeri',
      'ANTIEMETIC': 'Anti Mual',
      'ANTIBIOTIC': 'Antibiotik',
      'ANTIVIRAL': 'Antivirus',
      'ANTIFUNGAL': 'Antijamur',
      'SUPPLEMENT': 'Suplemen',
      'OTHER': 'Lainnya'
    }

    return categoryMap[category] || category
  }
}

/**
 * Factory function to create medication context builder
 */
export function createMedicationContextBuilder(builder: MedicationContextBuilder): MedicationContextBuilderClass {
  return new MedicationContextBuilderImpl(builder)
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
): MedicationContextBuilder {
  const defaultPreferences: MedicationPreferences = {
    language: 'id',
    detailLevel: 'detailed',
    reminderStyle: 'friendly',
    includeSideEffects: true,
    includeInstructions: true,
    ...preferences,
  }

  const builderData: MedicationContextBuilder = {
    patientId,
    medicationHistory,
    currentMedications,
    patientVariables,
    preferences: defaultPreferences,
  }

  return createMedicationContextBuilder(builderData)
}