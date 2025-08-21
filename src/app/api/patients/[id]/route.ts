import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const patient = await prisma.patient.findUnique({
      where: { id },
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
              isActive: true  // Only count logs from active schedules
            }
          },
          include: {
            reminderSchedule: true
          }
        },
        patientMedications: {
          where: { isActive: true },
          include: {
            medication: true,
            reminderSchedules: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Calculate real-time compliance rate
    const totalDeliveredReminders = patient.reminderLogs.length
    const totalConfirmations = patient.manualConfirmations.length
    
    const complianceRate = totalDeliveredReminders > 0 
      ? Math.round((totalConfirmations / totalDeliveredReminders) * 100)
      : 0

    const patientWithCompliance = {
      ...patient,
      complianceRate
    }

    return NextResponse.json(patientWithCompliance)
  } catch (error) {
    console.error('Error fetching patient:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      isActive
    } = body

    // Check if patient exists and is not soft deleted
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id,
        deletedAt: null
      }
    })

    if (!existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = await prisma.patient.update({
      where: { id },
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
        isActive
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

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Error updating patient:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Check if patient exists and is not already soft deleted
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id,
        deletedAt: null
      }
    })

    if (!existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Soft delete by setting deletedAt timestamp
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    })

    // Also deactivate all related reminders
    await prisma.reminderSchedule.updateMany({
      where: {
        patientId: id
      },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({ 
      message: 'Patient deleted successfully',
      deletedAt: patient.deletedAt 
    })
  } catch (error) {
    console.error('Error deleting patient:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}