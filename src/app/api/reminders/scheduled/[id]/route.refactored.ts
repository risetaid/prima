// Refactored Scheduled Reminder API - Uses centralized ReminderService
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { ReminderService } from '@/services/reminder/reminder.service'
import { ReminderError } from '@/services/reminder/reminder.types'

const reminderService = new ReminderService()

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
    const body = await request.json()

    const updated = await reminderService.updateReminder(
      id,
      {
        reminderTime: body.reminderTime,
        customMessage: body.customMessage,
        attachedContent: body.attachedContent,
      },
      user.id
    )

    return NextResponse.json({
      message: 'Reminder updated successfully',
      reminder: {
        id: updated.id,
        scheduledTime: updated.scheduledTime,
        customMessage: updated.customMessage,
        attachedContent: updated.attachedContent,
      },
    })
  } catch (error) {
    if (error instanceof ReminderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
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
    const result = await reminderService.deleteReminder(id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ReminderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error deleting reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
