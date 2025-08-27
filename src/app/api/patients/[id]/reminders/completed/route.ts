import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { convertUTCToWIBString } from '@/lib/timezone'

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
    
    // Get reminder schedules with their latest confirmations (same logic as /all endpoint)
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
            manualConfirmations: {
              orderBy: { confirmedAt: 'desc' },
              take: 1 // Latest confirmation for this log
            }
          }
        },
        manualConfirmations: {
          orderBy: { confirmedAt: 'desc' },
          take: 1 // Latest confirmation for this schedule
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Filter only schedules that have confirmations and extract completed ones
    const completedReminders = reminderSchedules
      .map(schedule => {
        const latestLog = schedule.reminderLogs[0]
        const scheduleConfirmation = schedule.manualConfirmations[0]
        
        // Check if we have a confirmation (either via log or direct schedule confirmation)
        let confirmation = null
        if (latestLog && latestLog.manualConfirmations[0]) {
          confirmation = latestLog.manualConfirmations[0]
        } else if (scheduleConfirmation) {
          confirmation = scheduleConfirmation
        }
        
        // Return only if we have a confirmation (completed reminder)
        if (confirmation) {
          return {
            confirmation,
            schedule,
            latestLog
          }
        }
        return null
      })
      .filter(item => item !== null) // Remove null entries
      .sort((a, b) => new Date(b.confirmation.confirmedAt).getTime() - new Date(a.confirmation.confirmedAt).getTime()) // Sort by confirmation time desc

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(item => {
      const { confirmation, schedule, latestLog } = item
      
      // Get original custom message from reminder schedule
      const originalMessage = schedule.customMessage
      const medicationName = schedule.medicationName || 
                            (confirmation.medicationsMissed.length > 0 ? confirmation.medicationsMissed[0] : 'candesartan')
      
      return {
        id: confirmation.id,
        medicationName,
        scheduledTime: confirmation.visitTime, // This is already in HH:MM format from manual confirmation
        completedDate: confirmation.visitDate.toISOString().split('T')[0],
        customMessage: originalMessage || `Minum obat ${medicationName}`,
        medicationTaken: confirmation.medicationsTaken,
        confirmedAt: convertUTCToWIBString(confirmation.confirmedAt),
        sentAt: latestLog?.sentAt 
          ? latestLog.sentAt.toISOString()
          : null
      }
    })

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}