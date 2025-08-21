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
    // Get scheduled reminders for patient
    const scheduledReminders = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        patient: {
          select: {
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    // Transform to match frontend interface
    const formattedReminders = scheduledReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.medicationName,
      scheduledTime: reminder.scheduledTime,
      nextReminderDate: reminder.startDate.toISOString().split('T')[0],
      customMessage: reminder.customMessage
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching scheduled reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { reminderIds } = await request.json()

    if (!reminderIds || !Array.isArray(reminderIds)) {
      return NextResponse.json({ error: 'Invalid reminderIds' }, { status: 400 })
    }

    // Delete multiple scheduled reminders
    await prisma.reminderSchedule.deleteMany({
      where: {
        id: { in: reminderIds },
        patientId: id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scheduled reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}