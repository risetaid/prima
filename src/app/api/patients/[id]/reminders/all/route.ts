import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

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
    
    // Get all reminder schedules with their logs and confirmations
    const reminderSchedules = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true
      },
      include: {
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 1, // Latest log only
          include: {
            manualConfirmations: true // Include confirmations for this specific log
          }
        },
        manualConfirmations: {
          orderBy: { visitDate: 'desc' },
          take: 1 // Latest confirmation only
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Transform to unified format with proper status determination
    const allReminders = reminderSchedules.map(schedule => {
      const latestLog = schedule.reminderLogs[0]
      const scheduleConfirmation = schedule.manualConfirmations[0]
      
      // Determine status based on proper relations
      let status = 'scheduled'
      let reminderDate = schedule.startDate.toISOString().split('T')[0]
      let id_suffix = schedule.id

      if (latestLog) {
        const logConfirmation = latestLog.manualConfirmations[0]
        
        if (logConfirmation) {
          // This specific log has been confirmed
          status = logConfirmation.medicationsTaken ? 'completed_taken' : 'completed_not_taken'
          reminderDate = logConfirmation.visitDate.toISOString().split('T')[0]
          id_suffix = `completed-${logConfirmation.id}`
        } else if (latestLog.status === 'DELIVERED') {
          // Log sent but not yet confirmed
          status = 'pending'
          reminderDate = latestLog.sentAt.toISOString().split('T')[0]
          id_suffix = `pending-${latestLog.id}`
        }
      } else if (scheduleConfirmation) {
        // Manual confirmation without specific log
        status = scheduleConfirmation.medicationsTaken ? 'completed_taken' : 'completed_not_taken'
        reminderDate = scheduleConfirmation.visitDate.toISOString().split('T')[0]
        id_suffix = `completed-${scheduleConfirmation.id}`
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