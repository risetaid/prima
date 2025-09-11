// Refactored Patient Reminders API - Uses centralized ReminderService
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { ReminderService } from '@/services/reminder/reminder.service'
import { ReminderError } from '@/services/reminder/reminder.types'

const reminderService = new ReminderService()

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
    const reminders = await reminderService.listPatientReminders(id)
    return NextResponse.json(reminders)
  } catch (error) {
    if (error instanceof ReminderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    const schedules = await reminderService.createReminder({
      patientId: id,
      message: body.message,
      time: body.time,
      selectedDates: body.selectedDates,
      customRecurrence: body.customRecurrence,
      attachedContent: body.attachedContent,
      createdById: user.id,
    })

    return NextResponse.json({
      message: 'Reminders created successfully',
      count: schedules.length,
      schedules: schedules.map(s => ({
        id: s.id,
        startDate: s.startDate,
        scheduledTime: s.scheduledTime,
      })),
      recurrenceType: body.customRecurrence ? 'custom' : 'manual',
    })
  } catch (error) {
    if (error instanceof ReminderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
