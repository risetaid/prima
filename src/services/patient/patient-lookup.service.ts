// Patient Lookup Service - Find patients by phone number with fallback formats
// Handles Indonesian phone number variations and patient matching

import { db } from '@/db'
import { patients } from '@/db'
import { eq, or, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { generatePhoneAlternatives } from '@/lib/phone-utils'
import { sanitizeForAudit } from '@/lib/phi-mask'

export interface PatientLookupResult {
  found: boolean
  patient?: {
    id: string
    name: string
    phoneNumber: string
    verificationStatus: string
    isActive: boolean
    cancerStage?: string | null
    assignedVolunteerId?: string | null
  }
  alternatives?: string[]
  error?: string
}

// Common select fields for patient lookup queries
const PATIENT_SELECT_FIELDS = {
  id: patients.id,
  name: patients.name,
  phoneNumber: patients.phoneNumber,
  verificationStatus: patients.verificationStatus,
  isActive: patients.isActive,
  cancerStage: patients.cancerStage,
  assignedVolunteerId: patients.assignedVolunteerId
} as const

export class PatientLookupService {
  /**
   * Find patient by phone number with fallback formats
   */
  async findPatientByPhone(phoneNumber: string): Promise<PatientLookupResult> {
    try {
      // Generate alternative phone number formats
      const alternatives = generatePhoneAlternatives(phoneNumber)

      logger.info('Looking up patient by phone', sanitizeForAudit({
        originalPhone: phoneNumber,
        alternativesCount: alternatives.length
      }))

      // Try to find PENDING patient first (for webhook processing) - ONLY ACTIVE
      let patientResult = await db
        .select(PATIENT_SELECT_FIELDS)
        .from(patients)
        .where(and(
          eq(patients.phoneNumber, phoneNumber),
          eq(patients.verificationStatus, 'PENDING'),
          eq(patients.isActive, true)
        ))
        .limit(1)

      // If no PENDING patient found, try VERIFIED patients - ONLY ACTIVE
      if (!patientResult.length) {
        patientResult = await db
          .select(PATIENT_SELECT_FIELDS)
          .from(patients)
          .where(and(
            eq(patients.phoneNumber, phoneNumber),
            eq(patients.verificationStatus, 'VERIFIED'),
            eq(patients.isActive, true)
          ))
          .limit(1)
      }

      // If still not found, try any status (fallback) - ONLY ACTIVE
      if (!patientResult.length) {
        patientResult = await db
          .select(PATIENT_SELECT_FIELDS)
          .from(patients)
          .where(and(
            eq(patients.phoneNumber, phoneNumber),
            eq(patients.isActive, true)
          ))
          .limit(1)
      }

      // If not found, try alternative formats (prioritize PENDING)
      if (!patientResult.length && alternatives.length > 0) {
        const whereClause = or(
          ...alternatives.map(alt => eq(patients.phoneNumber, alt))
        )

        // Try PENDING patients with alternative phone formats first - ONLY ACTIVE
        patientResult = await db
          .select(PATIENT_SELECT_FIELDS)
          .from(patients)
          .where(and(
            whereClause,
            eq(patients.verificationStatus, 'PENDING'),
            eq(patients.isActive, true)
          ))
          .limit(1)

        // If no PENDING found, try VERIFIED - ONLY ACTIVE
        if (!patientResult.length) {
          patientResult = await db
            .select(PATIENT_SELECT_FIELDS)
            .from(patients)
            .where(and(
              whereClause,
              eq(patients.verificationStatus, 'VERIFIED'),
              eq(patients.isActive, true)
            ))
            .limit(1)
        }

        // Final fallback - any status - ONLY ACTIVE
        if (!patientResult.length) {
          patientResult = await db
            .select(PATIENT_SELECT_FIELDS)
            .from(patients)
            .where(and(
              whereClause,
              eq(patients.isActive, true)
            ))
            .limit(1)
        }
      }

      if (patientResult.length > 0) {
        const patient = patientResult[0]

        logger.info('Patient found by phone lookup', sanitizeForAudit({
          id: patient.id,
          name: patient.name,
          originalPhone: phoneNumber,
          matchedPhone: patient.phoneNumber
        }))

        return {
          found: true,
          patient: {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            verificationStatus: patient.verificationStatus,
            isActive: patient.isActive,
            cancerStage: patient.cancerStage,
            assignedVolunteerId: patient.assignedVolunteerId
          }
        }
      }

      // Patient not found
      logger.info('Patient not found by phone lookup', sanitizeForAudit({
        phoneNumber,
        alternativesCount: alternatives.length
      }))

      return {
        found: false,
        alternatives
      }
    } catch (error) {
      logger.error('Patient lookup failed', error as Error, sanitizeForAudit({ phoneNumber }))
      return {
        found: false,
        error: 'Database lookup failed'
      }
    }
  }

  /**
   * Create a new patient record (for onboarding)
   */
  async createPatientForOnboarding(
    phoneNumber: string,
    name?: string,
    additionalData?: Partial<{
      address: string
      birthDate: Date
      diagnosisDate: Date
      cancerStage: "I" | "II" | "III" | "IV"
      assignedVolunteerId: string
      doctorName: string
      hospitalName: string
      emergencyContactName: string
      emergencyContactPhone: string
      notes: string
      photoUrl: string
    }>
  ): Promise<PatientLookupResult> {
    try {
      const patientData = {
        name: name || `Patient ${phoneNumber.slice(-4)}`,
        phoneNumber,
        verificationStatus: 'PENDING' as const,
        isActive: true,
        ...additionalData
      }

      const newPatient = await db
        .insert(patients)
        .values(patientData)
        .returning(PATIENT_SELECT_FIELDS)

      if (newPatient.length > 0) {
        const patient = newPatient[0]

        logger.info('Created new patient for onboarding', sanitizeForAudit({
          id: patient.id,
          phone: phoneNumber,
          name: patient.name
        }))

        return {
          found: true,
          patient: {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            verificationStatus: patient.verificationStatus,
            isActive: patient.isActive,
            cancerStage: patient.cancerStage,
            assignedVolunteerId: patient.assignedVolunteerId
          }
        }
      }

      throw new Error('Failed to create patient record')
    } catch (error) {
      logger.error('Failed to create patient for onboarding', error as Error, {
        ...sanitizeForAudit({
          phoneNumber,
          name
        }),
      })
      return {
        found: false,
        error: 'Failed to create patient record'
      }
    }
  }

  /**
   * Find or create patient for onboarding
   */
  async findOrCreatePatientForOnboarding(
    phoneNumber: string,
    name?: string
  ): Promise<PatientLookupResult> {
    // First try to find existing patient
    const lookupResult = await this.findPatientByPhone(phoneNumber)

    if (lookupResult.found) {
      return lookupResult
    }

    // If not found, create new patient
    return await this.createPatientForOnboarding(phoneNumber, name)
  }

  /**
   * Update patient information
   */
  async updatePatientInfo(
    patientId: string,
    updates: Partial<{
      name: string
      address: string
      emergencyContactName: string
      emergencyContactPhone: string
      notes: string
    }>
  ): Promise<boolean> {
    try {
      await db
        .update(patients)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(patients.id, patientId))

      logger.info('Updated patient information', sanitizeForAudit({
        id: patientId,
        updatedFields: Object.keys(updates)
      }))

      return true
    } catch (error) {
      logger.error('Failed to update patient information', error as Error, sanitizeForAudit({
        id: patientId,
        updates
      }))
      return false
    }
  }
}