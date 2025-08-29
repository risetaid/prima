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
    
    // DEBUG: Log the filter criteria
    const todayWIBStart = getWIBTodayStart()
    console.log("🔍 STATS API DEBUG - WIB Today Start:", todayWIBStart)
    
    // SCHEDULED COUNT: Reminders that haven't been delivered yet (simple logic)
    const scheduledReminders = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true,
        // Haven't been delivered yet
        reminderLogs: {
          none: {
            status: 'DELIVERED'
          }
        }
      },
      include: {
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 3
        }
      }
    })

    console.log("🔍 STATS API DEBUG - Scheduled count:", scheduledReminders.length)
    scheduledReminders.forEach(reminder => {
      console.log(`- ${reminder.startDate.toISOString()} | Logs: ${reminder.reminderLogs.length} | Latest: ${reminder.reminderLogs[0]?.status} at ${reminder.reminderLogs[0]?.sentAt}`)
    })

    // ALL REMINDERS: Get all active reminders for other status calculations
    const allReminderSchedules = await prisma.reminderSchedule.findMany({
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
      }
    })

    // Count by status using same logic as /all endpoint
    const statusCounts = {
      terjadwal: scheduledReminders.length, // Use the filtered count from scheduled query
      perluDiperbarui: 0,
      selesai: 0
    }

    // Count pending and completed from all reminders
    allReminderSchedules.forEach(schedule => {
      const latestLog = schedule.reminderLogs[0]
      const scheduleConfirmation = schedule.manualConfirmations[0]
      
      // Determine status based on proper relations (same logic as /all)
      let status = 'scheduled'

      if (latestLog) {
        const logConfirmation = latestLog.manualConfirmations[0]
        
        if (logConfirmation) {
          // This specific log has been confirmed
          status = 'completed'
        } else if (latestLog.status === 'DELIVERED') {
          // Log sent but not yet confirmed
          status = 'pending'
        }
      } else if (scheduleConfirmation) {
        // Manual confirmation without specific log
        status = 'completed'
      }

      // Only count pending and completed (scheduled already counted above)
      if (status === 'pending') {
        statusCounts.perluDiperbarui++
      } else if (status === 'completed') {
        statusCounts.selesai++
      }
    })

    const stats = {
      terjadwal: statusCounts.terjadwal,
      perluDiperbarui: statusCounts.perluDiperbarui,
      selesai: statusCounts.selesai,
      semua: statusCounts.terjadwal + statusCounts.perluDiperbarui + statusCounts.selesai
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching reminder stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}