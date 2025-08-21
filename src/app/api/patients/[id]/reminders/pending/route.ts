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
    
    // Get confirmed reminder schedule IDs to exclude
    const confirmedScheduleIds = await prisma.manualConfirmation.findMany({
      where: { 
        patientId: id,
        confirmedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: { reminderScheduleId: true }
    }).then(confirmations => 
      confirmations
        .filter(c => c.reminderScheduleId)
        .map(c => c.reminderScheduleId!)
    )
    
    // Get reminder logs that haven't been confirmed
    const pendingReminders = await prisma.reminderLog.findMany({
      where: {
        patientId: id,
        status: 'DELIVERED',
        reminderScheduleId: {
          notIn: confirmedScheduleIds
        },
        sentAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        reminderSchedule: {
          select: {
            medicationName: true,
            scheduledTime: true,
            customMessage: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    })

    // Transform to match frontend interface
    const formattedReminders = pendingReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.reminderSchedule?.medicationName || 'Obat',
      scheduledTime: reminder.reminderSchedule?.scheduledTime || '12:00',
      sentDate: reminder.sentAt.toISOString().split('T')[0],
      customMessage: reminder.reminderSchedule?.customMessage || reminder.message,
      status: 'PENDING_UPDATE'
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching pending reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}