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
    
    // Use same logic as /all endpoint to get reminder schedules with latest status
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
      }
    })

    // Count by status using same logic as /all endpoint
    const statusCounts = {
      terjadwal: 0,
      perluDiperbarui: 0,
      selesai: 0
    }

    reminderSchedules.forEach(schedule => {
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

      // Map to our counter keys
      if (status === 'scheduled') {
        statusCounts.terjadwal++
      } else if (status === 'pending') {
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