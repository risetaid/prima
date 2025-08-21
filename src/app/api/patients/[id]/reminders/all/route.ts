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
    
    // Get all reminder schedules with their logs and confirmations
    const reminderSchedules = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true
      },
      include: {
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 1 // Latest log only
        },
        manualConfirmations: {
          orderBy: { visitDate: 'desc' },
          take: 1 // Latest confirmation only
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Transform to unified format
    const allReminders = reminderSchedules.map(schedule => {
      const latestLog = schedule.reminderLogs[0]
      const latestConfirmation = schedule.manualConfirmations[0]
      
      // Determine status based on what's available and recency
      let status = 'scheduled'
      let reminderDate = schedule.startDate.toISOString().split('T')[0]
      let id_suffix = schedule.id

      // Check if there's a recent confirmation (within last 7 days)
      const recentConfirmation = latestConfirmation && 
        latestConfirmation.confirmedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      if (recentConfirmation) {
        status = latestConfirmation.medicationsTaken ? 'completed_taken' : 'completed_not_taken'
        reminderDate = latestConfirmation.visitDate.toISOString().split('T')[0]
        id_suffix = `completed-${latestConfirmation.id}`
      } else if (latestLog && latestLog.status === 'DELIVERED' && 
                 latestLog.sentAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        // Only show as pending if sent recently and no recent confirmation
        status = 'pending'
        reminderDate = latestLog.sentAt.toISOString().split('T')[0]
        id_suffix = `pending-${latestLog.id}`
      }

      return {
        id: `${status}-${id_suffix}`,
        medicationName: schedule.medicationName,
        scheduledTime: schedule.scheduledTime,
        reminderDate,
        customMessage: schedule.customMessage,
        status
      }
    })

    return NextResponse.json(allReminders)
  } catch (error) {
    console.error('Error fetching all reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}