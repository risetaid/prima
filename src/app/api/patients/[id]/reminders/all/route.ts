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
    // Get all types of reminders and combine them
    const [scheduledReminders, pendingLogs, completedConfirmations] = await Promise.all([
      // Scheduled reminders
      prisma.reminderSchedule.findMany({
        where: {
          patientId: id,
          isActive: true
        }
      }),

      // Pending reminder logs
      prisma.reminderLog.findMany({
        where: {
          patientId: id,
          status: 'DELIVERED'
        },
        include: {
          reminderSchedule: true
        }
      }),

      // Completed manual confirmations
      prisma.manualConfirmation.findMany({
        where: {
          patientId: id
        }
      })
    ])

    // Transform and combine all reminders
    const allReminders = [
      // Scheduled reminders
      ...scheduledReminders.map(reminder => ({
        id: `scheduled-${reminder.id}`,
        medicationName: reminder.medicationName,
        scheduledTime: reminder.scheduledTime,
        reminderDate: reminder.startDate.toISOString().split('T')[0],
        customMessage: reminder.customMessage,
        status: 'scheduled' as const,
        sortDate: reminder.startDate
      })),

      // Pending logs
      ...pendingLogs.map(log => ({
        id: `pending-${log.id}`,
        medicationName: log.reminderSchedule?.medicationName || 'Obat',
        scheduledTime: log.reminderSchedule?.scheduledTime || '12:00',
        reminderDate: log.sentAt.toISOString().split('T')[0],
        customMessage: log.reminderSchedule?.customMessage || log.message,
        status: 'pending' as const,
        sortDate: log.sentAt
      })),

      // Completed confirmations
      ...completedConfirmations.map(confirmation => ({
        id: `completed-${confirmation.id}`,
        medicationName: confirmation.medicationsMissed.length > 0 
          ? confirmation.medicationsMissed[0] 
          : 'candesartan',
        scheduledTime: confirmation.visitTime,
        reminderDate: confirmation.visitDate.toISOString().split('T')[0],
        customMessage: `Minum obat ${confirmation.medicationsMissed.length > 0 
          ? confirmation.medicationsMissed[0] 
          : 'candesartan'}`,
        status: confirmation.medicationsTaken 
          ? 'completed_taken' as const
          : 'completed_not_taken' as const,
        sortDate: confirmation.visitDate
      }))
    ]

    // Sort by date (most recent first)
    const sortedReminders = allReminders.sort((a, b) => 
      new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
    )

    // Remove sortDate from response
    const responseReminders = sortedReminders.map(({ sortDate, ...reminder }) => reminder)

    return NextResponse.json(responseReminders)
  } catch (error) {
    console.error('Error fetching all reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}