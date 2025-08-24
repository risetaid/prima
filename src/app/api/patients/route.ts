import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, getUserPatients } from '@/lib/auth-utils'

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

      const whereClause: any = {}

      if (!includeDeleted) {
        whereClause.deletedAt = null
      }

      if (status === 'active') {
        whereClause.isActive = true
        whereClause.deletedAt = null
      } else if (status === 'inactive') {
        whereClause.OR = [
          { isActive: false },
          { deletedAt: { not: null } }
        ]
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } }
        ]
      }

      const allPatients = await prisma.patient.findMany({
        where: whereClause,
        include: {
          assignedVolunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          manualConfirmations: true,
          reminderLogs: {
            where: { 
              status: 'DELIVERED',
              reminderSchedule: {
                isActive: true
              }
            },
            include: {
              reminderSchedule: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ]
      })

      patients = allPatients.map(patient => {
        const totalDeliveredReminders = patient.reminderLogs.length
        const totalConfirmations = patient.manualConfirmations.length
        
        const complianceRate = totalDeliveredReminders > 0 
          ? Math.round((totalConfirmations / totalDeliveredReminders) * 100)
          : 0

        return {
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
          complianceRate,
          assignedVolunteer: patient.assignedVolunteer,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt
        }
      })
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
      name,
      phoneNumber,
      address,
      birthDate,
      diagnosisDate,
      cancerStage,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      photoUrl,
      assignedVolunteerId
    } = body

    // Validate required fields
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      )
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        phoneNumber,
        address,
        birthDate: birthDate ? new Date(birthDate) : null,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
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