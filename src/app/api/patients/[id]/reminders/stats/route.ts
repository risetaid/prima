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
    // Get reminder statistics for the patient
    const [scheduledCount, pendingCount, completedCount] = await Promise.all([
      // Scheduled (future reminders)
      prisma.reminderSchedule.count({
        where: {
          patientId: id,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      }),

      // Pending (sent but need manual confirmation)
      prisma.reminderLog.count({
        where: {
          patientId: id,
          status: 'DELIVERED',
          // Add condition for logs that need manual confirmation
        }
      }),

      // Completed (manually confirmed)
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