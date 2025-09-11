import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db, patients, users, manualConfirmations, reminderLogs, reminderSchedules, patientMedications, medications } from '@/db'
import { eq, and, isNull, count, desc } from 'drizzle-orm'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL, invalidatePatientCache } from '@/lib/cache'
import { createErrorResponse, handleApiError } from '@/lib/api-utils'
import { ComplianceService } from '@/lib/compliance-service'
import { withRateLimit } from '@/middleware/rate-limit'

export const GET = withRateLimit(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, undefined, 'AUTHENTICATION_ERROR')
    }

    const { id } = await params

    // Validate patient ID
    if (!id || typeof id !== 'string') {
      return createErrorResponse('Invalid patient ID', 400, undefined, 'VALIDATION_ERROR')
    }
    
    // Try to get from cache first
    const cacheKey = CACHE_KEYS.patient(id)
    const cachedPatient = await getCachedData(cacheKey)
    
    if (cachedPatient) {
      return NextResponse.json(cachedPatient)
    }
    
    // Get patient with assigned volunteer
    const patientResult = await db
      .select({
        // Patient fields
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        address: patients.address,
        birthDate: patients.birthDate,
        diagnosisDate: patients.diagnosisDate,
        cancerStage: patients.cancerStage,
        assignedVolunteerId: patients.assignedVolunteerId,
        emergencyContactName: patients.emergencyContactName,
        emergencyContactPhone: patients.emergencyContactPhone,
        notes: patients.notes,
        isActive: patients.isActive,
        deletedAt: patients.deletedAt,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        photoUrl: patients.photoUrl,
        // Verification fields
        verificationStatus: patients.verificationStatus,
        verificationSentAt: patients.verificationSentAt,
        verificationResponseAt: patients.verificationResponseAt,
        verificationMessage: patients.verificationMessage,
        verificationAttempts: patients.verificationAttempts,
        verificationExpiresAt: patients.verificationExpiresAt,
        // Volunteer fields
        volunteerId: users.id,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerEmail: users.email,
        volunteerRole: users.role
      })
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(eq(patients.id, id))
      .limit(1)

    if (!patientResult || patientResult.length === 0) {
      return createErrorResponse('Patient not found', 404, undefined, 'NOT_FOUND_ERROR')
    }

    const patientData = patientResult[0]

    // Additional null check for patientData
    if (!patientData) {
      return createErrorResponse('Patient data not found', 404, undefined, 'NOT_FOUND_ERROR')
    }
    
    // Manual confirmations are now fetched with full data below

    // Use optimized compliance service
    const complianceData = await ComplianceService.calculatePatientCompliance(id)
    const complianceRate = complianceData.complianceRate

    // Fetch manual confirmations (limit to recent 10 for performance)
    const manualConfirmationsData = await db
      .select({
        id: manualConfirmations.id,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
        patientCondition: manualConfirmations.patientCondition,
        notes: manualConfirmations.notes,
        confirmedAt: manualConfirmations.confirmedAt,
        volunteerId: manualConfirmations.volunteerId,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName
      })
      .from(manualConfirmations)
      .leftJoin(users, eq(manualConfirmations.volunteerId, users.id))
      .where(eq(manualConfirmations.patientId, id))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .limit(10)

    // Fetch recent reminder logs (limit to recent 10 for performance)
    const reminderLogsData = await db
      .select({
        id: reminderLogs.id,
        message: reminderLogs.message,
        sentAt: reminderLogs.sentAt,
        status: reminderLogs.status,
        medicationName: reminderSchedules.medicationName,
        dosage: reminderSchedules.dosage
      })
      .from(reminderLogs)
      .leftJoin(reminderSchedules, eq(reminderLogs.reminderScheduleId, reminderSchedules.id))
      .where(eq(reminderLogs.patientId, id))
      .orderBy(desc(reminderLogs.sentAt))
      .limit(10)

    // Fetch patient medications
    const patientMedicationsData = await db
      .select({
        id: patientMedications.id,
        medicationName: medications.name,
        dosage: patientMedications.dosage,
        frequency: patientMedications.frequency,
        instructions: patientMedications.instructions,
        startDate: patientMedications.startDate,
        endDate: patientMedications.endDate,
        isActive: patientMedications.isActive,
        createdAt: patientMedications.createdAt
      })
      .from(patientMedications)
      .leftJoin(medications, eq(patientMedications.medicationId, medications.id))
      .where(
        and(
          eq(patientMedications.patientId, id),
          eq(patientMedications.isActive, true)
        )
      )
      .orderBy(desc(patientMedications.createdAt))

    // Structure the response to match Prisma format
    const patient = {
      id: patientData.id,
      name: patientData.name,
      phoneNumber: patientData.phoneNumber,
      address: patientData.address,
      birthDate: patientData.birthDate,
      diagnosisDate: patientData.diagnosisDate,
      cancerStage: patientData.cancerStage,
      assignedVolunteerId: patientData.assignedVolunteerId,
      emergencyContactName: patientData.emergencyContactName,
      emergencyContactPhone: patientData.emergencyContactPhone,
      notes: patientData.notes,
      isActive: patientData.isActive,
      deletedAt: patientData.deletedAt,
      createdAt: patientData.createdAt,
      updatedAt: patientData.updatedAt,
      photoUrl: patientData.photoUrl,
      // Verification fields
      verificationStatus: patientData.verificationStatus,
      verificationSentAt: patientData.verificationSentAt,
      verificationResponseAt: patientData.verificationResponseAt,
      verificationMessage: patientData.verificationMessage,
      verificationAttempts: patientData.verificationAttempts,
      verificationExpiresAt: patientData.verificationExpiresAt,
      // Individual volunteer fields
      volunteerId: patientData.volunteerId,
      volunteerFirstName: patientData.volunteerFirstName,
      volunteerLastName: patientData.volunteerLastName,
      volunteerEmail: patientData.volunteerEmail,
      volunteerRole: patientData.volunteerRole,
      // Volunteer object
      assignedVolunteer: patientData.volunteerId ? {
        id: patientData.volunteerId,
        firstName: patientData.volunteerFirstName,
        lastName: patientData.volunteerLastName,
        email: patientData.volunteerEmail,
        role: patientData.volunteerRole
      } : null,
      manualConfirmations: manualConfirmationsData.map(confirmation => ({
        id: confirmation.id,
        visitDate: confirmation.visitDate,
        visitTime: confirmation.visitTime,
        medicationsTaken: confirmation.medicationsTaken,
        patientCondition: confirmation.patientCondition,
        notes: confirmation.notes,
        confirmedAt: confirmation.confirmedAt,
        volunteer: confirmation.volunteerId ? {
          id: confirmation.volunteerId,
          firstName: confirmation.volunteerFirstName,
          lastName: confirmation.volunteerLastName
        } : null
      })),
      reminderLogs: reminderLogsData.map(log => ({
        id: log.id,
        message: log.message,
        sentAt: log.sentAt,
        status: log.status,
        medicationName: log.medicationName,
        dosage: log.dosage
      })),
      patientMedications: patientMedicationsData.map(medication => ({
        id: medication.id,
        medicationName: medication.medicationName,
        dosage: medication.dosage,
        frequency: medication.frequency,
        instructions: medication.instructions,
        startDate: medication.startDate,
        endDate: medication.endDate,
        isActive: medication.isActive,
        createdAt: medication.createdAt
      })),
      complianceRate
    }

    // Cache the patient data
    await setCachedData(cacheKey, patient, CACHE_TTL.PATIENT)

    return NextResponse.json(patient)
  } catch (error) {
    return handleApiError(error, 'fetching patient')
  }
}, 'GENERAL')

export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, undefined, 'AUTHENTICATION_ERROR')
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      phoneNumber,
      address,
      birthDate,
      diagnosisDate,
      cancerStage,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      isActive,
      photoUrl
    } = body

    // Check if patient exists and is not soft deleted
    const existingPatientResult = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1)

    if (existingPatientResult.length === 0) {
      return createErrorResponse('Patient not found', 404, undefined, 'NOT_FOUND_ERROR')
    }

    // Update patient (simplified response for now)
    await db
      .update(patients)
      .set({
        name,
        phoneNumber,
        address,
        birthDate: birthDate ? new Date(birthDate) : null,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
        cancerStage,
        emergencyContactName,
        emergencyContactPhone,
        notes,
        isActive,
        photoUrl,
        updatedAt: new Date()
      })
      .where(eq(patients.id, id))

    // Get updated patient
    const updatedPatientResult = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1)

    const patient = updatedPatientResult[0]

    // Invalidate patient cache after update
    await invalidatePatientCache(id)

    return NextResponse.json(patient)
  } catch (error) {
    return handleApiError(error, 'updating patient')
  }
}, 'GENERAL')

export const DELETE = withRateLimit(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, undefined, 'AUTHENTICATION_ERROR')
    }

    const { id } = await params
    
    // Check if patient exists and is not already soft deleted
    const existingPatientResult = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1)

    if (existingPatientResult.length === 0) {
      return createErrorResponse('Patient not found', 404, undefined, 'NOT_FOUND_ERROR')
    }

    const deleteTime = new Date()

    // Soft delete by setting deletedAt timestamp
    await db
      .update(patients)
      .set({
        deletedAt: deleteTime,
        isActive: false,
        updatedAt: deleteTime
      })
      .where(eq(patients.id, id))

    // Also deactivate all related reminders
    await db
      .update(reminderSchedules)
      .set({
        isActive: false,
        updatedAt: deleteTime
      })
      .where(eq(reminderSchedules.patientId, id))

    // Invalidate patient cache after deletion
    await invalidatePatientCache(id)

    return NextResponse.json({ 
      message: 'Patient deleted successfully',
      deletedAt: deleteTime
    })
  } catch (error) {
    return handleApiError(error, 'deleting patient')
  }
}, 'GENERAL')