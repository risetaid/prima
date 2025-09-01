import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, patients } from '@/db'
import { eq } from 'drizzle-orm'
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
    const reminderScheduleResult = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage,
        medicationName: reminderSchedules.medicationName
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1)

    if (reminderScheduleResult.length === 0) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const reminderSchedule = reminderScheduleResult[0]

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
    const updatedReminderResult = await db
      .update(reminderSchedules)
      .set({
        scheduledTime: reminderTime,
        customMessage: customMessage,
        medicationName: extractMedicationName(customMessage),
        updatedAt: getWIBTime()
      })
      .where(eq(reminderSchedules.id, id))
      .returning({
        id: reminderSchedules.id,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage,
        medicationName: reminderSchedules.medicationName
      })

    const updatedReminder = updatedReminderResult[0]

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if reminder exists
    const reminderScheduleResult = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.id, id))
      .limit(1)

    if (reminderScheduleResult.length === 0) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const reminder = reminderScheduleResult[0]

    // Soft delete by setting isActive to false
    await db
      .update(reminderSchedules)
      .set({
        isActive: false,
        updatedAt: getWIBTime()
      })
      .where(eq(reminderSchedules.id, id))

    return NextResponse.json({
      success: true,
      message: 'Reminder berhasil dihapus',
      deletedReminder: {
        id: reminder.id,
        medicationName: reminder.medicationName,
        scheduledTime: reminder.scheduledTime
      }
    })

  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}