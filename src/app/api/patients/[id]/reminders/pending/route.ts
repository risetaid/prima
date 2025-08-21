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
    // Get reminders that have been sent but need manual confirmation
    const pendingReminders = await prisma.reminderLog.findMany({
      where: {
        patientId: id,
        status: 'DELIVERED',
        // Only get reminders that don't have manual confirmation yet
        reminderSchedule: {
          manualConfirmations: {
            none: {
              visitDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }
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