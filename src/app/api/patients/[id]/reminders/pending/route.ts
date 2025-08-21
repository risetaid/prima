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
    
    // Get reminder logs that are DELIVERED but don't have manual confirmation yet
    const pendingReminders = await prisma.reminderLog.findMany({
      where: {
        patientId: id,
        status: 'DELIVERED',
        // Use the new relation to exclude confirmed logs
        manualConfirmations: {
          none: {} // No manual confirmations exist for this log
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