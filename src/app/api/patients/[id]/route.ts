import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { db, patients, users, manualConfirmations, reminderLogs, reminderSchedules } from '@/db'
import { eq, and, isNull, count, sql } from 'drizzle-orm'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL, invalidatePatientCache } from '@/lib/cache'
import { unauthorizedError, validationError, notFoundError, internalError } from '@/lib/api-error'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return unauthorizedError()
    }

    const { id } = await params

    // Validate patient ID
    if (!id || typeof id !== 'string') {
      return validationError('Invalid patient ID')
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
      return notFoundError('Patient not found')
    }

    const patientData = patientResult[0]

    // Additional null check for patientData
    if (!patientData) {
      return notFoundError('Patient data not found')
    }
    
    // Get manual confirmations count (for display only, not used in compliance calculation)
    const oldConfirmationsResult = await db
      .select({ count: count() })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id))

    const totalConfirmations = oldConfirmationsResult[0]?.count || 0

    // Get delivered reminders count (basic calculation without reactivation filtering for now)
    let totalDeliveredReminders = 0
    try {
      const deliveredResult = await db
        .select({ count: count() })
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.patientId, id),
            eq(reminderLogs.status, 'DELIVERED')
          )
        )
      totalDeliveredReminders = deliveredResult?.[0]?.count ? Number(deliveredResult[0].count) : 0
    } catch (error) {
      console.error('Error fetching delivered reminders count:', error)
      totalDeliveredReminders = 0
    }

    // Get confirmations count
    let totalConfirmationsFiltered = 0
    try {
      const confirmationsResult = await db
        .select({ count: count() })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, id))
      totalConfirmationsFiltered = confirmationsResult?.[0]?.count ? Number(confirmationsResult[0].count) : 0
    } catch (error) {
      console.error('Error fetching confirmations count:', error)
      totalConfirmationsFiltered = 0
    }

    // Calculate compliance rate
    const complianceRate = totalDeliveredReminders > 0
      ? Math.round((totalConfirmationsFiltered / totalDeliveredReminders) * 100)
      : 0

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
      manualConfirmations: [], // Simplified for now
      reminderLogs: [], // Simplified for now
      patientMedications: [], // Simplified for now
      complianceRate
    }

    // Cache the patient data
    await setCachedData(cacheKey, patient, CACHE_TTL.PATIENT)

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Error fetching patient:', error)
    return internalError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return unauthorizedError()
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
      return notFoundError('Patient not found')
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
    console.error('Error updating patient:', error)
    return internalError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return unauthorizedError()
    }

    const { id } = await params
    
    // Check if patient exists and is not already soft deleted
    const existingPatientResult = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1)

    if (existingPatientResult.length === 0) {
      return notFoundError('Patient not found')
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
    console.error('Error deleting patient:', error)
    return internalError(error)
  }
}