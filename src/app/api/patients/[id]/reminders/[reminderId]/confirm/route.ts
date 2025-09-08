import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderLogs, reminderSchedules, manualConfirmations } from '@/db'
import { eq, and } from 'drizzle-orm'

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

    // Get the reminder log using separate queries
    const reminderLog = await db
      .select({
        id: reminderLogs.id,
        patientId: reminderLogs.patientId,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        message: reminderLogs.message,
        status: reminderLogs.status
      })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.id, logId),
          eq(reminderLogs.patientId, id)
        )
      )
      .limit(1)

    if (reminderLog.length === 0) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const logData = reminderLog[0]

    // Get reminder schedule details (if reminderScheduleId exists)
    let reminderSchedule: any[] = []
    if (logData.reminderScheduleId) {
      reminderSchedule = await db
        .select({
          id: reminderSchedules.id,
          medicationName: reminderSchedules.medicationName,
          dosage: reminderSchedules.dosage
        })
        .from(reminderSchedules)
        .where(eq(reminderSchedules.id, logData.reminderScheduleId))
        .limit(1)
    }

    // Check if this ReminderLog is already confirmed
    const existingConfirmation = await db
      .select({
        id: manualConfirmations.id
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.reminderLogId, logId))
      .limit(1)

    if (existingConfirmation.length > 0) {
      return NextResponse.json({ error: 'Reminder already confirmed' }, { status: 400 })
    }

    // Create manual confirmation with proper relations
    const newManualConfirmation = await db
      .insert(manualConfirmations)
      .values({
        patientId: id,
        volunteerId: user.id,
        reminderScheduleId: logData.reminderScheduleId,
        reminderLogId: logId,  // Link to specific ReminderLog
        visitDate: new Date(),
        visitTime: new Date().toTimeString().slice(0, 5), // HH:MM format
        medicationsTaken: medicationTaken,
        medicationsMissed: medicationTaken ? [] : [reminderSchedule.length > 0 ? reminderSchedule[0].medicationName : 'Obat'],
        patientCondition: 'FAIR', // Default, could be made dynamic
        symptomsReported: [],
        notes: `Manual confirmation for reminder: ${logData.message}`,
        followUpNeeded: !medicationTaken,
        followUpNotes: medicationTaken ? null : 'Patient did not take medication as scheduled'
      })
      .returning({
        id: manualConfirmations.id,
        patientId: manualConfirmations.patientId,
        volunteerId: manualConfirmations.volunteerId,
        reminderScheduleId: manualConfirmations.reminderScheduleId,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
        medicationsMissed: manualConfirmations.medicationsMissed,
        patientCondition: manualConfirmations.patientCondition,
        symptomsReported: manualConfirmations.symptomsReported,
        notes: manualConfirmations.notes,
        followUpNeeded: manualConfirmations.followUpNeeded,
        followUpNotes: manualConfirmations.followUpNotes,
        confirmedAt: manualConfirmations.confirmedAt
      })

    return NextResponse.json(newManualConfirmation[0])
  } catch (error) {
    console.error('Error confirming reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}