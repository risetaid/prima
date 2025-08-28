import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, getUserPatients } from '@/lib/auth-utils'
import { validateBirthDate, validateAndParseDate } from '@/lib/date-validator'
import { validateString, validateBoolean } from '@/lib/type-validator'
import { WhereClauseBuilder, createEfficientPagination } from '@/lib/query-optimizer'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.canAccessDashboard) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get patients assigned to current user only (unless admin)
    let patients
    if (user.role === 'ADMIN') {
      // Admin can see all patients
      const { searchParams } = new URL(request.url)
      const includeDeleted = searchParams.get('includeDeleted') === 'true'
      const status = searchParams.get('status')
      const search = searchParams.get('search')

      // Use optimized where clause builder
      const whereBuilder = new WhereClauseBuilder()
      
      if (!includeDeleted) {
        whereBuilder.addCondition({ deletedAt: null })
      }

      if (status === 'active') {
        whereBuilder.addCondition({ isActive: true })
        whereBuilder.addCondition({ deletedAt: null })
      } else if (status === 'inactive') {
        whereBuilder.addCondition({
          OR: [
            { isActive: false },
            { deletedAt: { not: null } }
          ]
        })
      }

      if (search) {
        whereBuilder.addSearch(search, ['name', 'phoneNumber'])
      }

      const whereClause = whereBuilder.build()

      // Extract pagination parameters
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const pagination = createEfficientPagination(page, limit)

      // Fetch patients with basic data first
      const allPatients = await prisma.patient.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          address: true,
          birthDate: true,
          diagnosisDate: true,
          cancerStage: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          notes: true,
          photoUrl: true,
          isActive: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          assignedVolunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ],
        ...pagination
      })

      // Get compliance rates in a separate optimized query
      const patientIds = allPatients.map(p => p.id)
      const complianceData = await prisma.$queryRaw`
        SELECT 
          p.id,
          COUNT(DISTINCT rl.id) as delivered_reminders,
          COUNT(DISTINCT mc.id) as confirmations
        FROM patients p
        LEFT JOIN reminder_logs rl ON rl.patient_id = p.id 
          AND rl.status = 'DELIVERED'
        LEFT JOIN manual_confirmations mc ON mc.patient_id = p.id
        WHERE p.id = ANY(${patientIds}::uuid[])
        GROUP BY p.id
      `

      // Create a map for quick lookup of compliance data
      const complianceMap = new Map()
      if (Array.isArray(complianceData)) {
        complianceData.forEach((row: any) => {
          const deliveredReminders = parseInt(row.delivered_reminders) || 0
          const confirmations = parseInt(row.confirmations) || 0
          const complianceRate = deliveredReminders > 0 
            ? Math.round((confirmations / deliveredReminders) * 100)
            : 0
          complianceMap.set(row.id, complianceRate)
        })
      }

      patients = allPatients.map(patient => ({
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
        assignedVolunteer: patient.assignedVolunteer,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }))
    } else {
      // Member can only see their own patients
      patients = await getUserPatients(user.id)
    }

    return NextResponse.json(patients)
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
      const volunteerExists = await prisma.user.findUnique({
        where: { id: assignedVolunteerId },
        select: { id: true, isActive: true }
      })
      
      if (!volunteerExists) {
        return NextResponse.json(
          { error: 'Assigned volunteer does not exist' },
          { status: 400 }
        )
      }
      
      if (!volunteerExists.isActive) {
        return NextResponse.json(
          { error: 'Assigned volunteer is not active' },
          { status: 400 }
        )
      }
    }

    const patient = await prisma.patient.create({
      data: {
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
      },
      include: {
        assignedVolunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}