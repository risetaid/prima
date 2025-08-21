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
    
    // Get all active reminder schedules to analyze their status
    const reminderSchedules = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id,
        isActive: true
      },
      include: {
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            manualConfirmations: true
          }
        },
        manualConfirmations: {
          orderBy: { visitDate: 'desc' },
          take: 1
        }
      }
    })

    // Count each status type
    let scheduledCount = 0
    let pendingCount = 0  
    let completedCount = 0

    reminderSchedules.forEach(schedule => {
      const latestLog = schedule.reminderLogs[0]
      const scheduleConfirmation = schedule.manualConfirmations[0]
      
      if (latestLog) {
        const logConfirmation = latestLog.manualConfirmations[0]
        
        if (logConfirmation) {
          completedCount++
        } else if (latestLog.status === 'DELIVERED') {
          pendingCount++
        } else {
          scheduledCount++
        }
      } else if (scheduleConfirmation) {
        completedCount++
      } else {
        scheduledCount++
      }
    })

    const stats = {
      terjadwal: scheduledCount,
      perluDiperbarui: pendingCount,
      selesai: completedCount,
      semua: scheduledCount + pendingCount + completedCount
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching reminder stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}