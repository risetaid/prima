import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let whereClause: any = {
      isActive: true
    }

    // Filter by status if provided
    if (status && status !== 'semua') {
      if (status === 'terjadwal') {
        whereClause.reminderLogs = {
          none: {
            status: { in: ['SENT', 'DELIVERED'] }
          }
        }
      } else if (status === 'perlu-diperbarui') {
        whereClause.reminderLogs = {
          some: {
            status: 'FAILED'
          }
        }
      } else if (status === 'selesai') {
        whereClause.reminderLogs = {
          some: {
            status: { in: ['SENT', 'DELIVERED'] }
          }
        }
      }
    }

    const reminders = await prisma.reminderSchedule.findMany({
      where: whereClause,
      include: {
        patientMedication: {
          include: {
            patient: true,
            medication: true
          }
        },
        reminderLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const remindersWithStatus = reminders.map(reminder => {
      const latestLog = reminder.reminderLogs[0]
      let status = 'terjadwal'
      
      if (latestLog) {
        if (latestLog.status === 'FAILED') {
          status = 'perlu-diperbarui'
        } else if (['SENT', 'DELIVERED'].includes(latestLog.status)) {
          status = 'selesai'
        }
      }

      return {
        id: reminder.id,
        messageTemplate: reminder.messageTemplate,
        timeOfDay: reminder.timeOfDay,
        daysOfWeek: reminder.daysOfWeek,
        educationLink: reminder.educationLink,
        isActive: reminder.isActive,
        status,
        patient: reminder.patientMedication.patient,
        medication: reminder.patientMedication.medication,
        latestLog,
        createdAt: reminder.createdAt,
        createdBy: reminder.createdByUser
      }
    })

    return NextResponse.json(remindersWithStatus)
  } catch (error) {
    console.error('Error fetching reminders:', error)
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
      patientMedicationId,
      messageTemplate,
      timeOfDay,
      interval,
      educationLink,
      daysOfWeek
    } = body

    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate required fields
    if (!patientMedicationId || !messageTemplate || !timeOfDay) {
      return NextResponse.json(
        { error: 'Patient medication, message template, and time are required' },
        { status: 400 }
      )
    }

    // Check if patient medication exists
    const patientMedication = await prisma.patientMedication.findUnique({
      where: { id: patientMedicationId },
      include: { patient: true }
    })

    if (!patientMedication) {
      return NextResponse.json(
        { error: 'Patient medication not found' },
        { status: 404 }
      )
    }

    // Default days of week for daily reminders
    let reminderDaysOfWeek = daysOfWeek || [1, 2, 3, 4, 5, 6, 7]

    // Adjust days based on interval
    if (interval === 'Mingguan') {
      reminderDaysOfWeek = [1] // Only Monday
    }

    const reminder = await prisma.reminderSchedule.create({
      data: {
        patientMedicationId,
        messageTemplate,
        timeOfDay,
        daysOfWeek: reminderDaysOfWeek,
        educationLink,
        isActive: true,
        createdBy: currentUser.id
      },
      include: {
        patientMedication: {
          include: {
            patient: true,
            medication: true
          }
        }
      }
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}