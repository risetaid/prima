import { z } from 'zod';

// ===== MEDICATION TYPES =====

export interface MedicationDetails {
  name: string;
  genericName?: string;
  category: string;
  form: string;
  dosage: string;
  dosageValue?: number;
  dosageUnit: string;
  frequency: string;
  timing: string;
  instructions?: string;
  prescribedBy?: string;
  pharmacy?: string;
  notes?: string;
  sideEffects?: string[];
  interactions?: string[];
}

export interface ParsedMedicationVariable {
  variableName: string;
  variableValue: string;
  category: 'PERSONAL' | 'MEDICAL' | 'MEDICATION' | 'CAREGIVER' | 'HOSPITAL' | 'OTHER';
  metadata?: Record<string, unknown>;
  confidence: number;
  normalizedValue?: string;
}

export interface MedicationSchedule {
  id?: string;
  patientId: string;
  medicationName: string;
  genericName?: string;
  category: string;
  form: string;
  dosage: string;
  dosageValue?: number;
  dosageUnit: string;
  frequency: string;
  timing: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  prescribedBy?: string;
  pharmacy?: string;
  notes?: string;
  reminderScheduleId?: string;
}

// ===== VALIDATION SCHEMAS =====

export const MedicationDetailsSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  category: z.enum(['CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'HORMONAL_THERAPY', 'PAIN_MANAGEMENT', 'ANTIEMETIC', 'ANTIBIOTIC', 'ANTIVIRAL', 'ANTIFUNGAL', 'SUPPLEMENT', 'OTHER']),
  form: z.enum(['TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'INFUSION', 'CREAM', 'PATCH', 'INHALER', 'SPRAY', 'OTHER']),
  dosage: z.string().min(1, 'Dosage is required'),
  dosageValue: z.number().optional(),
  dosageUnit: z.enum(['MG', 'G', 'ML', 'MCG', 'IU', 'TABLET', 'CAPSULE', 'DOSE', 'PUFF', 'DROP', 'PATCH', 'OTHER']),
  frequency: z.enum(['ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'EVERY_24_HOURS', 'EVERY_WEEK', 'EVERY_MONTH', 'AS_NEEDED', 'CUSTOM']),
  timing: z.enum(['BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'BEDTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']),
  instructions: z.string().optional(),
  prescribedBy: z.string().optional(),
  pharmacy: z.string().optional(),
  notes: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
  interactions: z.array(z.string()).optional(),
});

export const MedicationScheduleSchema = z.object({
  patientId: z.string().uuid(),
  medicationName: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  category: z.enum(['CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY', 'HORMONAL_THERAPY', 'PAIN_MANAGEMENT', 'ANTIEMETIC', 'ANTIBIOTIC', 'ANTIVIRAL', 'ANTIFUNGAL', 'SUPPLEMENT', 'OTHER']),
  form: z.enum(['TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'INFUSION', 'CREAM', 'PATCH', 'INHALER', 'SPRAY', 'OTHER']),
  dosage: z.string().min(1, 'Dosage is required'),
  dosageValue: z.number().optional(),
  dosageUnit: z.enum(['MG', 'G', 'ML', 'MCG', 'IU', 'TABLET', 'CAPSULE', 'DOSE', 'PUFF', 'DROP', 'PATCH', 'OTHER']),
  frequency: z.enum(['ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'EVERY_24_HOURS', 'EVERY_WEEK', 'EVERY_MONTH', 'AS_NEEDED', 'CUSTOM']),
  timing: z.enum(['BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'BEDTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']),
  instructions: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  prescribedBy: z.string().optional(),
  pharmacy: z.string().optional(),
  notes: z.string().optional(),
  reminderScheduleId: z.string().uuid().optional(),
});

// ===== MEDICATION PARSER FUNCTIONS =====

/**
 * Parse medication details from custom message text
 */
export function parseMedicationFromMessage(message: string): MedicationDetails | null {
  try {
    // Common Indonesian medication patterns
    const patterns = {
      name: /(?:obat|medicines?)[:\s]+([^\n,]+)/i,
      dosage: /(?:dosis|dosage)[:\s]+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|iu|tablet|capsule|kapsul|tab|cap))/i,
      frequency: /(?:frekuensi|frequency|jadwal)[:\s]+([^\n,]+)/i,
      timing: /(?:waktu|timing)[:\s]+([^\n,]+)/i,
      instructions: /(?:instruksi|instructions|petunjuk)[:\s]+([^\n]+)/i,
    };

    const medication: Partial<MedicationDetails> = {
      name: extractPattern(message, patterns.name) || '',
      category: 'OTHER',
      form: 'TABLET',
      dosage: extractPattern(message, patterns.dosage) || '',
      dosageUnit: extractDosageUnit(extractPattern(message, patterns.dosage)),
      frequency: mapFrequency(extractPattern(message, patterns.frequency)),
      timing: mapTiming(extractPattern(message, patterns.timing)),
      instructions: extractPattern(message, patterns.instructions) || undefined,
    };

    // Validate and return
    const result = MedicationDetailsSchema.safeParse(medication);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error parsing medication from message:', error);
    return null;
  }
}

/**
 * Parse patient variables from text input and categorize them
 */
export function parsePatientVariables(text: string): ParsedMedicationVariable[] {
  const variables: ParsedMedicationVariable[] = [];

  // Common variable patterns
  const patterns = [
    { name: 'nama', category: 'PERSONAL' as const, regex: /nama[:\s]+([^\n,]+)/i },
    { name: 'obat', category: 'MEDICATION' as const, regex: /obat[:\s]+([^\n,]+)/i },
    { name: 'dosis', category: 'MEDICATION' as const, regex: /dosis[:\s]+([^\n,]+)/i },
    { name: 'dokter', category: 'MEDICAL' as const, regex: /dokter[:\s]+([^\n,]+)/i },
    { name: 'rumah_sakit', category: 'HOSPITAL' as const, regex: /rumah\s+sakit|hospital[:\s]+([^\n,]+)/i },
    { name: 'penjaga', category: 'CAREGIVER' as const, regex: /penjaga|caregiver[:\s]+([^\n,]+)/i },
    { name: 'alamat', category: 'PERSONAL' as const, regex: /alamat[:\s]+([^\n,]+)/i },
    { name: 'telepon', category: 'PERSONAL' as const, regex: /telepon|phone|no.?hp[:\s]+([^\n,]+)/i },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match && match[1]) {
      variables.push({
        variableName: pattern.name,
        variableValue: match[1].trim(),
        category: pattern.category,
        confidence: calculateConfidence(pattern.name, match[1].trim()),
        normalizedValue: normalizeValue(pattern.name, match[1].trim()),
        metadata: {
          source: 'text_parsing',
          extractedAt: new Date().toISOString(),
        },
      });
    }
  }

  return variables;
}

/**
 * Create standardized medication details from structured data
 */
export function createMedicationDetails(data: Partial<MedicationDetails>): MedicationDetails {
  const defaults: MedicationDetails = {
    name: '',
    category: 'OTHER',
    form: 'TABLET',
    dosage: '',
    dosageUnit: 'MG',
    frequency: 'ONCE_DAILY',
    timing: 'ANYTIME',
  };

  const merged = { ...defaults, ...data };

  // Validate with schema
  const result = MedicationDetailsSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(`Invalid medication details: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Normalize medication variables for consistent storage
 */
export function normalizeMedicationVariables(variables: ParsedMedicationVariable[]): ParsedMedicationVariable[] {
  return variables.map(variable => ({
    ...variable,
    variableName: variable.variableName.toLowerCase().replace(/\s+/g, '_'),
    variableValue: variable.variableValue.trim(),
    normalizedValue: normalizeValue(variable.variableName, variable.variableValue),
  }));
}

/**
 * Extract medication information from patient variables
 */
export function extractMedicationFromVariables(variables: ParsedMedicationVariable[]): MedicationDetails | null {
  const medicationVars = variables.filter(v => v.category === 'MEDICATION');

  if (medicationVars.length === 0) return null;

  const details: Partial<MedicationDetails> = {};

  for (const variable of medicationVars) {
    switch (variable.variableName) {
      case 'obat':
        details.name = variable.variableValue;
        break;
      case 'dosis':
        details.dosage = variable.variableValue;
        details.dosageUnit = extractDosageUnit(variable.variableValue);
        details.dosageValue = extractDosageValue(variable.variableValue);
        break;
    }
  }

  return details.name ? createMedicationDetails(details) : null;
}

// ===== HELPER FUNCTIONS =====

function extractPattern(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractDosageUnit(dosage: string | null): string {
  if (!dosage) return 'MG';

  const unitMap: Record<string, string> = {
    'mg': 'MG',
    'g': 'G',
    'ml': 'ML',
    'mcg': 'MCG',
    'iu': 'IU',
    'tablet': 'TABLET',
    'tab': 'TABLET',
    'capsule': 'CAPSULE',
    'cap': 'CAPSULE',
    'kapsul': 'CAPSULE',
  };

  const unit = dosage.toLowerCase().match(/[a-z]+$/);
  return unit && unitMap[unit[0]] ? unitMap[unit[0]] : 'MG';
}

function extractDosageValue(dosage: string | null): number | undefined {
  if (!dosage) return undefined;

  const value = dosage.match(/(\d+(?:\.\d+)?)/);
  return value ? parseFloat(value[1]) : undefined;
}

function mapFrequency(frequency: string | null): string {
  if (!frequency) return 'ONCE_DAILY';

  const freqMap: Record<string, string> = {
    'sekali sehari': 'ONCE_DAILY',
    'dua kali sehari': 'TWICE_DAILY',
    'tiga kali sehari': 'THREE_TIMES_DAILY',
    'empat kali sehari': 'FOUR_TIMES_DAILY',
    'setiap 8 jam': 'EVERY_8_HOURS',
    'setiap 12 jam': 'EVERY_12_HOURS',
    'setiap hari': 'EVERY_24_HOURS',
    'setiap minggu': 'EVERY_WEEK',
    'setiap bulan': 'EVERY_MONTH',
    'bila perlu': 'AS_NEEDED',
    'once daily': 'ONCE_DAILY',
    'twice daily': 'TWICE_DAILY',
    'three times daily': 'THREE_TIMES_DAILY',
    'four times daily': 'FOUR_TIMES_DAILY',
    'every 8 hours': 'EVERY_8_HOURS',
    'every 12 hours': 'EVERY_12_HOURS',
    'every 24 hours': 'EVERY_24_HOURS',
    'every week': 'EVERY_WEEK',
    'every month': 'EVERY_MONTH',
    'as needed': 'AS_NEEDED',
  };

  const normalized = frequency.toLowerCase().trim();
  return freqMap[normalized] || 'CUSTOM';
}

function mapTiming(timing: string | null): string {
  if (!timing) return 'ANYTIME';

  const timingMap: Record<string, string> = {
    'sebelum makan': 'BEFORE_MEAL',
    'saat makan': 'WITH_MEAL',
    'setelah makan': 'AFTER_MEAL',
    'sebelum tidur': 'BEDTIME',
    'pagi': 'MORNING',
    'siang': 'AFTERNOON',
    'sore': 'EVENING',
    'kapan saja': 'ANYTIME',
    'before meal': 'BEFORE_MEAL',
    'with meal': 'WITH_MEAL',
    'after meal': 'AFTER_MEAL',
    'bedtime': 'BEDTIME',
    'morning': 'MORNING',
    'afternoon': 'AFTERNOON',
    'evening': 'EVENING',
    'anytime': 'ANYTIME',
  };

  const normalized = timing.toLowerCase().trim();
  return timingMap[normalized] || 'ANYTIME';
}

function calculateConfidence(variableName: string, value: string): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on value characteristics
  if (value.length > 2) confidence += 0.1;
  if (!value.includes('http')) confidence += 0.1;
  if (!value.includes('@')) confidence += 0.1;

  // Variable-specific confidence adjustments
  if (variableName === 'obat' && value.length > 3) confidence += 0.2;
  if (variableName === 'dosis' && /\d/.test(value)) confidence += 0.2;
  if (variableName === 'telepon' && /\d/.test(value)) confidence += 0.2;

  return Math.min(confidence, 1.0);
}

function normalizeValue(variableName: string, value: string): string {
  value = value.trim();

  switch (variableName) {
    case 'nama':
      return value.replace(/\s+/g, ' ').toUpperCase();
    case 'telepon':
      return value.replace(/[^\d+]/g, '');
    case 'obat':
      return value.toLowerCase();
    case 'dosis':
      return value.toLowerCase();
    default:
      return value;
  }
}

// ===== MIGRATION HELPERS =====

/**
 * Migrate existing patient variables to new format
 */
export function migratePatientVariables(oldVariables: Array<{name: string, value: string}>): ParsedMedicationVariable[] {
  return oldVariables.map(oldVar => {
    const category = determineVariableCategory(oldVar.name);

    return {
      variableName: oldVar.name.toLowerCase().replace(/\s+/g, '_'),
      variableValue: oldVar.value,
      category,
      confidence: 0.8, // High confidence for existing data
      normalizedValue: normalizeValue(oldVar.name, oldVar.value),
      metadata: {
        source: 'migration',
        originalName: oldVar.name,
        migratedAt: new Date().toISOString(),
      },
    };
  });
}

function determineVariableCategory(name: string): 'PERSONAL' | 'MEDICAL' | 'MEDICATION' | 'CAREGIVER' | 'HOSPITAL' | 'OTHER' {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('obat') || lowerName.includes('dosis') || lowerName.includes('medicine')) {
    return 'MEDICATION';
  } else if (lowerName.includes('dokter') || lowerName.includes('doctor') || lowerName.includes('diagnosis')) {
    return 'MEDICAL';
  } else if (lowerName.includes('penjaga') || lowerName.includes('caregiver') || lowerName.includes('family')) {
    return 'CAREGIVER';
  } else if (lowerName.includes('rumah sakit') || lowerName.includes('hospital') || lowerName.includes('klinik')) {
    return 'HOSPITAL';
  } else if (lowerName.includes('nama') || lowerName.includes('alamat') || lowerName.includes('telepon')) {
    return 'PERSONAL';
  } else {
    return 'OTHER';
  }
}

// ===== MEDICATION PARSER CLASS =====

export class MedicationParser {
  /**
   * Parse medication details from reminder data
   */
  static parseFromReminder(medicationName: string | undefined, customMessage?: string): MedicationDetails {
    if (customMessage) {
      const parsed = parseMedicationFromMessage(customMessage);
      if (parsed) {
        return {
          ...parsed,
          name: medicationName || parsed.name,
        };
      }
    }

    return createMedicationDetails({
      name: medicationName || 'Unknown Medication',
      category: 'OTHER',
      form: 'TABLET',
      dosage: '',
      dosageUnit: 'MG',
      frequency: 'ONCE_DAILY',
      timing: 'ANYTIME',
    });
  }

  /**
   * Parse medication details from patient variables
   */
  static parseFromVariables(variables: Array<{name: string, value: string}>): MedicationDetails | null {
    const parsedVariables = parsePatientVariables(
      variables.map(v => `${v.name}: ${v.value}`).join('\n')
    );
    return extractMedicationFromVariables(parsedVariables);
  }

  /**
   * Parse multiple medications from patient variables
   */
  static parseMultipleFromVariables(variables: Array<{name: string, value: string}>): MedicationDetails[] {
    const parsedVariables = parsePatientVariables(
      variables.map(v => `${v.name}: ${v.value}`).join('\n')
    );
    const medication = extractMedicationFromVariables(parsedVariables);
    return medication ? [medication] : [];
  }

  /**
   * Extract and categorize patient variables from text
   */
  static extractVariables(text: string): ParsedMedicationVariable[] {
    return parsePatientVariables(text);
  }

  /**
   * Normalize medication variables for consistent storage
   */
  static normalizeVariables(variables: ParsedMedicationVariable[]): ParsedMedicationVariable[] {
    return normalizeMedicationVariables(variables);
  }

  /**
   * Create standardized medication schedule data
   */
  static createSchedule(data: Partial<MedicationSchedule>): MedicationSchedule {
    const result = MedicationScheduleSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid medication schedule: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Validate medication details
   */
  static validateMedicationDetails(data: unknown): MedicationDetails | null {
    const result = MedicationDetailsSchema.safeParse(data);
    return result.success ? result.data : null;
  }

  /**
   * Migrate existing patient variables to new format
   */
  static migrateVariables(oldVariables: Array<{name: string, value: string}>): ParsedMedicationVariable[] {
    return migratePatientVariables(oldVariables);
  }
}

// ===== EXPORT TYPES =====

export type MedicationDetailsData = z.infer<typeof MedicationDetailsSchema>;
export type MedicationScheduleData = z.infer<typeof MedicationScheduleSchema>;
