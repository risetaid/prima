import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { medicationTaken, reminderLogId } = await request.json()

    if (typeof medicationTaken !== 'boolean') {
      return NextResponse.json({ error: 'medicationTaken must be boolean' }, { status: 400 })
    }

    const { id, reminderId } = await params
    
    // Use reminderLogId from request body if provided, otherwise use reminderId from URL
    const logId = reminderLogId || reminderId

    // Get the reminder log to find the related schedule
    const reminderLog = await prisma.reminderLog.findUnique({
      where: { 
        id: logId,
        patientId: id
      },
      include: {
        reminderSchedule: true
      }
    })

    if (!reminderLog) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    // Check if this ReminderLog is already confirmed
    const existingConfirmation = await prisma.manualConfirmation.findFirst({
      where: {
        reminderLogId: logId
      }
    })

    if (existingConfirmation) {
      return NextResponse.json({ error: 'Reminder already confirmed' }, { status: 400 })
    }

    // Create manual confirmation with proper relations
    const manualConfirmation = await prisma.manualConfirmation.create({
      data: {
        patientId: id,
        volunteerId: user.id,
        reminderScheduleId: reminderLog.reminderScheduleId,
        reminderLogId: logId,  // Link to specific ReminderLog
        visitDate: new Date(),
        visitTime: new Date().toTimeString().slice(0, 5), // HH:MM format
        medicationsTaken: medicationTaken,
        medicationsMissed: medicationTaken ? [] : [reminderLog.reminderSchedule?.medicationName || 'Obat'],
        patientCondition: 'FAIR', // Default, could be made dynamic
        symptomsReported: [],
        notes: `Manual confirmation for reminder: ${reminderLog.message}`,
        followUpNeeded: !medicationTaken,
        followUpNotes: medicationTaken ? null : 'Patient did not take medication as scheduled'
      }
    })

    return NextResponse.json(manualConfirmation)
  } catch (error) {
    console.error('Error confirming reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}