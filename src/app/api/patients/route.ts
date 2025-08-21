import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const status = searchParams.get('status') // 'active', 'inactive', 'all'
    const search = searchParams.get('search')

    const whereClause: any = {}

    // Soft delete filter
    if (!includeDeleted) {
      whereClause.deletedAt = null
    }

    // Status filter
    if (status === 'active') {
      whereClause.isActive = true
      whereClause.deletedAt = null
    } else if (status === 'inactive') {
      whereClause.OR = [
        { isActive: false },
        { deletedAt: { not: null } }
      ]
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } }
      ]
    }

    const patients = await prisma.patient.findMany({
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
        patientMetrics: {
          orderBy: { metricDate: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    const patientsWithCompliance = patients.map(patient => {
      const latestMetric = patient.patientMetrics[0]
      const complianceRate = latestMetric?.complianceRate || 0

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
        isActive: patient.isActive,
        deletedAt: patient.deletedAt,
        complianceRate: Math.round(complianceRate),
        assignedVolunteer: patient.assignedVolunteer,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }
    })

    return NextResponse.json(patientsWithCompliance)
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
    const { userId } = await auth()
    
    if (!userId) {
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
      assignedVolunteerId
    } = body

    // Validate required fields
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      )
    }

    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
        assignedVolunteerId: assignedVolunteerId || currentUser.id,
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