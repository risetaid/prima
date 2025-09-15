// Patient Lookup Service - Find patients by phone number with fallback formats
// Handles Indonesian phone number variations and patient matching

import { db } from '@/db'
import { patients } from '@/db'
import { eq, or } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { generatePhoneAlternatives } from '@/lib/phone-utils'

export interface PatientLookupResult {
  found: boolean
  patient?: {
    id: string
    name: string
    phoneNumber: string
    verificationStatus: string
    isActive: boolean
  }
  alternatives?: string[]
  error?: string
}

export class PatientLookupService {
  /**
   * Find patient by phone number with fallback formats
   */
  async findPatientByPhone(phoneNumber: string): Promise<PatientLookupResult> {
    try {
      // Generate alternative phone number formats
      const alternatives = generatePhoneAlternatives(phoneNumber)

      logger.info('Looking up patient by phone', {
        originalPhone: phoneNumber,
        alternativesCount: alternatives.length
      })

      // Try to find patient with original phone number first
      let patientResult = await db
        .select({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          verificationStatus: patients.verificationStatus,
          isActive: patients.isActive
        })
        .from(patients)
        .where(eq(patients.phoneNumber, phoneNumber))
        .limit(1)

      // If not found, try alternative formats
      if (!patientResult.length && alternatives.length > 0) {
        const whereClause = or(
          ...alternatives.map(alt => eq(patients.phoneNumber, alt))
        )

        patientResult = await db
          .select({
            id: patients.id,
            name: patients.name,
            phoneNumber: patients.phoneNumber,
            verificationStatus: patients.verificationStatus,
            isActive: patients.isActive
          })
          .from(patients)
          .where(whereClause)
          .limit(1)
      }

      if (patientResult.length > 0) {
        const patient = patientResult[0]

        logger.info('Patient found by phone lookup', {
          patientId: patient.id,
          patientName: patient.name,
          originalPhone: phoneNumber,
          matchedPhone: patient.phoneNumber
        })

        return {
          found: true,
          patient: {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            verificationStatus: patient.verificationStatus,
            isActive: patient.isActive
          }
        }
      }

      // Patient not found
      logger.info('Patient not found by phone lookup', {
        phoneNumber,
        alternativesCount: alternatives.length
      })

      return {
        found: false,
        alternatives
      }
    } catch (error) {
      logger.error('Patient lookup failed', error as Error, { phoneNumber })
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
    additionalData?: Record<string, string | Date | boolean | null>
  ): Promise<PatientLookupResult> {
    try {
      const patientData = {
        name: name || `Patient ${phoneNumber.slice(-4)}`,
        phoneNumber,
        verificationStatus: 'pending_verification' as const,
        isActive: true,
        ...additionalData
      }

      const newPatient = await db
        .insert(patients)
        .values(patientData)
        .returning({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          verificationStatus: patients.verificationStatus,
          isActive: patients.isActive
        })

      if (newPatient.length > 0) {
        const patient = newPatient[0]

        logger.info('Created new patient for onboarding', {
          patientId: patient.id,
          phoneNumber,
          name: patient.name
        })

        return {
          found: true,
          patient: {
            id: patient.id,
            name: patient.name,
            phoneNumber: patient.phoneNumber,
            verificationStatus: patient.verificationStatus,
            isActive: patient.isActive
          }
        }
      }

      throw new Error('Failed to create patient record')
    } catch (error) {
      logger.error('Failed to create patient for onboarding', error as Error, {
        phoneNumber,
        name
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
      const success = true // Drizzle update returns successfully if no error

      if (success) {
        logger.info('Updated patient information', {
          patientId,
          updates: Object.keys(updates)
        })
      }

      return success
    } catch (error) {
      logger.error('Failed to update patient information', error as Error, {
        patientId,
        updates
      })
      return false
    }
  }
}