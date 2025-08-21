import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active reminders
    const reminders = await prisma.reminderSchedule.findMany({
      where: { isActive: true },
      include: {
        reminderLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    let terjadwal = 0
    let perluDiperbarui = 0
    let selesai = 0

    reminders.forEach(reminder => {
      const latestLog = reminder.reminderLogs[0]
      
      if (!latestLog) {
        terjadwal++
      } else if (latestLog.status === 'FAILED') {
        perluDiperbarui++
      } else if (['SENT', 'DELIVERED'].includes(latestLog.status)) {
        selesai++
      } else {
        terjadwal++
      }
    })

    const stats = {
      terjadwal,
      perluDiperbarui,
      selesai,
      total: reminders.length
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching reminder stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}