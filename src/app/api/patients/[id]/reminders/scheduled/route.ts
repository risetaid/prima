import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getWIBTodayStart } from '@/lib/timezone'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Get scheduled reminders - those that haven't been sent yet or don't have delivery logs today
    const scheduledReminders = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true,
        // Only include schedules that don't have DELIVERED logs yet today (WIB timezone)
        reminderLogs: {
          none: {
            status: 'DELIVERED',
            sentAt: {
              gte: getWIBTodayStart()
            }
          }
        }
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
    const user = await getCurrentUser()
    if (!user) {
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