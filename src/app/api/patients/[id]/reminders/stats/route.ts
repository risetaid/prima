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
    
    // Count each type directly with same logic as individual endpoints
    const [scheduledCount, pendingCount, completedCount] = await Promise.all([
      // Scheduled: No DELIVERED logs yet
      prisma.reminderSchedule.count({
        where: {
          patientId: id,
          isActive: true,
          reminderLogs: {
            none: {
              status: 'DELIVERED'
            }
          }
        }
      }),

      // Pending: DELIVERED logs without manual confirmations
      prisma.reminderLog.count({
        where: {
          patientId: id,
          status: 'DELIVERED',
          manualConfirmations: {
            none: {}
          }
        }
      }),

      // Completed: All manual confirmations
      prisma.manualConfirmation.count({
        where: {
          patientId: id
        }
      })
    ])

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