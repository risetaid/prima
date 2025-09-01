import { NextRequest, NextResponse } from 'next/server'
import { db, patients, users, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, isNull, isNotNull, or, like, ilike, sql, count, inArray } from 'drizzle-orm'
import { getCurrentUser, getUserPatients } from '@/lib/auth-utils'
import { validateBirthDate, validateAndParseDate } from '@/lib/date-validator'
import { validateString, validateBoolean } from '@/lib/type-validator'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.canAccessDashboard) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get patients assigned to current user only (unless admin)
    let patientsResult
    if (user.role === 'ADMIN') {
      // Admin can see all patients
      const { searchParams } = new URL(request.url)
      const includeDeleted = searchParams.get('includeDeleted') === 'true'
      const status = searchParams.get('status')
      const search = searchParams.get('search')

      // Build where conditions with Drizzle
      const whereConditions = []
      
      if (!includeDeleted) {
        whereConditions.push(isNull(patients.deletedAt))
      }

      if (status === 'active') {
        whereConditions.push(eq(patients.isActive, true))
        whereConditions.push(isNull(patients.deletedAt))
      } else if (status === 'inactive') {
        whereConditions.push(
          or(
            eq(patients.isActive, false),
            isNotNull(patients.deletedAt)
          )
        )
      }

      if (search) {
        whereConditions.push(
          or(
            ilike(patients.name, `%${search}%`),
            ilike(patients.phoneNumber, `%${search}%`)
          )
        )
      }

      // Extract pagination parameters
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = (page - 1) * limit

      // Fetch patients with basic data first using Drizzle
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined
      
      const allPatients = await db
        .select({
          // Patient fields
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          address: patients.address,
          birthDate: patients.birthDate,
          diagnosisDate: patients.diagnosisDate,
          cancerStage: patients.cancerStage,
          emergencyContactName: patients.emergencyContactName,
          emergencyContactPhone: patients.emergencyContactPhone,
          notes: patients.notes,
          photoUrl: patients.photoUrl,
          isActive: patients.isActive,
          deletedAt: patients.deletedAt,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt,
          assignedVolunteerId: patients.assignedVolunteerId,
          // Volunteer fields
          volunteerId: users.id,
          volunteerFirstName: users.firstName,
          volunteerLastName: users.lastName,
          volunteerEmail: users.email
        })
        .from(patients)
        .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
        .where(whereClause)
        .orderBy(patients.isActive, patients.name) // desc and asc handled by Drizzle's default sorting
        .offset(offset)
        .limit(limit)

      // Get compliance rates in a separate optimized query using Drizzle
      const patientIds = allPatients.map(p => p.id)
      
      // Get delivered reminders count for each patient
      const deliveredRemindersCounts = await db
        .select({
          patientId: reminderLogs.patientId,
          count: count(reminderLogs.id).as('delivered_count')
        })
        .from(reminderLogs)
        .where(
          and(
            inArray(reminderLogs.patientId, patientIds),
            eq(reminderLogs.status, 'DELIVERED')
          )
        )
        .groupBy(reminderLogs.patientId)

      // Get confirmations count for each patient
      const confirmationsCounts = await db
        .select({
          patientId: manualConfirmations.patientId,
          count: count(manualConfirmations.id).as('confirmations_count')
        })
        .from(manualConfirmations)
        .where(inArray(manualConfirmations.patientId, patientIds))
        .groupBy(manualConfirmations.patientId)

      // Create maps for quick lookup of compliance data
      const deliveredMap = new Map()
      deliveredRemindersCounts.forEach(row => {
        deliveredMap.set(row.patientId, parseInt(row.count.toString()) || 0)
      })

      const confirmationsMap = new Map()
      confirmationsCounts.forEach(row => {
        confirmationsMap.set(row.patientId, parseInt(row.count.toString()) || 0)
      })

      // Calculate compliance rates
      const complianceMap = new Map()
      patientIds.forEach(patientId => {
        const deliveredReminders = deliveredMap.get(patientId) || 0
        const confirmations = confirmationsMap.get(patientId) || 0
        const complianceRate = deliveredReminders > 0 
          ? Math.round((confirmations / deliveredReminders) * 100)
          : 0
        complianceMap.set(patientId, complianceRate)
      })

      patientsResult = allPatients.map(patient => ({
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        address: patient.address,
        birthDate: patient.birthDate,
        diagnosisDate: patient.diagnosisDate,
        cancerStage: patient.cancerStage,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        notes: patient.notes,
        photoUrl: patient.photoUrl,
        isActive: patient.isActive,
        deletedAt: patient.deletedAt,
        complianceRate: complianceMap.get(patient.id) || 0,
        assignedVolunteer: patient.volunteerId ? {
          id: patient.volunteerId,
          firstName: patient.volunteerFirstName,
          lastName: patient.volunteerLastName,
          email: patient.volunteerEmail
        } : null,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }))
    } else {
      // Member can only see their own patients
      patientsResult = await getUserPatients(user.id)
    }

    return NextResponse.json(patientsResult)
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name: rawName,
      phoneNumber: rawPhoneNumber,
      address: rawAddress,
      birthDate,
      diagnosisDate,
      cancerStage: rawCancerStage,
      emergencyContactName: rawEmergencyContactName,
      emergencyContactPhone: rawEmergencyContactPhone,
      notes: rawNotes,
      photoUrl: rawPhotoUrl,
      assignedVolunteerId
    } = body

    // Validate and sanitize input fields
    let name: string
    let phoneNumber: string
    let address: string | null
    let cancerStage: 'I' | 'II' | 'III' | 'IV' | null
    let emergencyContactName: string | null
    let emergencyContactPhone: string | null
    let notes: string | null
    let photoUrl: string | null

    try {
      name = validateString(rawName, 'name', { required: true, minLength: 1, maxLength: 255 }) || ''
      phoneNumber = validateString(rawPhoneNumber, 'phone number', { required: true, minLength: 8, maxLength: 20 }) || ''
      address = validateString(rawAddress, 'address', { maxLength: 500 })
      const cancerStageString = validateString(rawCancerStage, 'cancer stage', { maxLength: 100 })
      cancerStage = cancerStageString && ['I', 'II', 'III', 'IV'].includes(cancerStageString) 
        ? cancerStageString as 'I' | 'II' | 'III' | 'IV' 
        : null
      emergencyContactName = validateString(rawEmergencyContactName, 'emergency contact name', { maxLength: 255 })
      emergencyContactPhone = validateString(rawEmergencyContactPhone, 'emergency contact phone', { maxLength: 20 })
      notes = validateString(rawNotes, 'notes', { maxLength: 1000 })
      photoUrl = validateString(rawPhotoUrl, 'photo URL', { maxLength: 255 })
    } catch (validationError) {
      return NextResponse.json(
        { error: `Input validation failed: ${validationError}` },
        { status: 400 }
      )
    }

    // Validate phone number format
    try {
      // Test phone number formatting - will throw if invalid
      const { formatWhatsAppNumber } = await import('@/lib/fonnte')
      formatWhatsAppNumber(phoneNumber)
    } catch (phoneError) {
      return NextResponse.json(
        { error: `Invalid phone number format: ${phoneError}` },
        { status: 400 }
      )
    }

    // Validate dates properly to prevent corruption
    let validatedBirthDate: Date | null = null
    let validatedDiagnosisDate: Date | null = null
    
    try {
      validatedBirthDate = validateBirthDate(birthDate)
    } catch (error) {
      return NextResponse.json(
        { error: `Birth date validation failed: ${error}` },
        { status: 400 }
      )
    }
    
    try {
      validatedDiagnosisDate = validateAndParseDate(diagnosisDate, 'diagnosis date')
    } catch (error) {
      return NextResponse.json(
        { error: `Diagnosis date validation failed: ${error}` },
        { status: 400 }
      )
    }

    // Validate assignedVolunteerId exists if provided
    if (assignedVolunteerId && assignedVolunteerId !== user.id) {
      const volunteerExistsResult = await db
        .select({
          id: users.id,
          isActive: users.isActive
        })
        .from(users)
        .where(eq(users.id, assignedVolunteerId))
        .limit(1)
      
      if (volunteerExistsResult.length === 0) {
        return NextResponse.json(
          { error: 'Assigned volunteer does not exist' },
          { status: 400 }
        )
      }
      
      if (!volunteerExistsResult[0].isActive) {
        return NextResponse.json(
          { error: 'Assigned volunteer is not active' },
          { status: 400 }
        )
      }
    }

    // Create patient with Drizzle
    const createdPatientResult = await db
      .insert(patients)
      .values({
        name,
        phoneNumber,
        address,
        birthDate: validatedBirthDate,
        diagnosisDate: validatedDiagnosisDate,
        cancerStage,
        emergencyContactName,
        emergencyContactPhone,
        notes,
        photoUrl,
        assignedVolunteerId: assignedVolunteerId || user.id,
        isActive: true
      })
      .returning()

    const patient = createdPatientResult[0]

    // Get assigned volunteer info separately
    let assignedVolunteer = null
    if (patient.assignedVolunteerId) {
      const volunteerResult = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, patient.assignedVolunteerId))
        .limit(1)

      if (volunteerResult.length > 0) {
        assignedVolunteer = volunteerResult[0]
      }
    }

    const patientWithVolunteer = {
      ...patient,
      assignedVolunteer
    }

    return NextResponse.json(patientWithVolunteer, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}