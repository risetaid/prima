import { NextRequest, NextResponse } from 'next/server'
import { requireApprovedUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireApprovedUser()
    const { reminderTime } = await request.json()

    if (!reminderTime) {
      return NextResponse.json(
        { error: 'Reminder time is required' },
        { status: 400 }
      )
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(reminderTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format.' },
        { status: 400 }
      )
    }

    const reminderId = params.id

    // Check if reminder exists and user has access
    const existingReminder = await prisma.reminderSchedule.findFirst({
      where: {
        id: reminderId,
        patient: {
          assignedVolunteerId: user.role === 'ADMIN' ? undefined : user.id,
          deletedAt: null
        }
      }
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      )
    }

    // Update reminder time
    const updatedReminder = await prisma.reminderSchedule.update({
      where: { id: reminderId },
      data: { 
        reminderTime: reminderTime,
        updatedAt: new Date()
      },
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

    return NextResponse.json({
      success: true,
      message: 'Reminder time updated successfully',
      reminder: updatedReminder
    })

  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireApprovedUser()
    const reminderId = params.id

    // Check if reminder exists and user has access
    const existingReminder = await prisma.reminderSchedule.findFirst({
      where: {
        id: reminderId,
        patient: {
          assignedVolunteerId: user.role === 'ADMIN' ? undefined : user.id,
          deletedAt: null
        }
      }
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.reminderSchedule.update({
      where: { id: reminderId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    )
  }
}