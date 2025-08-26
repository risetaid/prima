import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getWIBTime } from '@/lib/timezone'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { reminderTime, customMessage } = await request.json()

    if (!reminderTime || !customMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the reminder schedule
    const reminderSchedule = await prisma.reminderSchedule.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      }
    })

    if (!reminderSchedule) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    // Extract medication name from custom message
    function extractMedicationName(message: string): string {
      const words = message.toLowerCase().split(' ')
      const medicationKeywords = ['obat', 'candesartan', 'paracetamol', 'amoxicillin', 'metformin']
      
      for (const word of words) {
        if (medicationKeywords.some(keyword => word.includes(keyword))) {
          return word
        }
      }
      
      return 'Obat'
    }

    // Update the reminder schedule
    const updatedReminder = await prisma.reminderSchedule.update({
      where: { id },
      data: {
        scheduledTime: reminderTime,
        customMessage: customMessage,
        medicationName: extractMedicationName(customMessage),
        updatedAt: getWIBTime()
      }
    })

    return NextResponse.json({
      message: 'Reminder updated successfully',
      reminder: {
        id: updatedReminder.id,
        scheduledTime: updatedReminder.scheduledTime,
        customMessage: updatedReminder.customMessage,
        medicationName: updatedReminder.medicationName
      }
    })
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}