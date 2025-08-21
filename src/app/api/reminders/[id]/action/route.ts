import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body // 'ya' or 'tidak'

    if (!['ya', 'tidak'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "ya" or "tidak"' },
        { status: 400 }
      )
    }

    // Find the reminder
    const reminder = await prisma.reminderSchedule.findUnique({
      where: { id },
      include: {
        patient: true
      }
    })

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    // Create or update the latest reminder log
    const latestLog = await prisma.reminderLog.findFirst({
      where: { reminderScheduleId: id },
      orderBy: { createdAt: 'desc' }
    })

    if (latestLog) {
      // Update existing log
      await prisma.reminderLog.update({
        where: { id: latestLog.id },
        data: {
          status: action === 'ya' ? 'DELIVERED' : 'SENT',
          patientResponse: action === 'ya' ? 'Dipatuhi' : 'Tidak dipatuhi',
          responseReceivedAt: new Date()
        }
      })
    } else {
      // Create new log entry
      await prisma.reminderLog.create({
        data: {
          reminderScheduleId: id,
          patientId: reminder.patientId,
          message: `Pengingat minum obat ${reminder.medicationName}`,
          phoneNumber: reminder.patient?.phoneNumber || '',
          sentAt: new Date(),
          status: action === 'ya' ? 'DELIVERED' : 'SENT',
          patientResponse: action === 'ya' ? 'Dipatuhi' : 'Tidak dipatuhi',
          responseReceivedAt: new Date()
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      action,
      message: `Status updated to ${action === 'ya' ? 'dipatuhi' : 'tidak dipatuhi'}` 
    })
  } catch (error) {
    console.error('Error updating reminder action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}