import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { convertUTCToWIBString } from '@/lib/timezone'

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
    
    // Extract pagination parameters from request
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get manual confirmations for this patient
    const confirmations = await db
      .select({
        id: manualConfirmations.id,
        patientId: manualConfirmations.patientId,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
        medicationsMissed: manualConfirmations.medicationsMissed,
        confirmedAt: manualConfirmations.confirmedAt,
        notes: manualConfirmations.notes
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .offset(offset)
      .limit(limit)

    // Get associated data for each confirmation
    const completedReminders = []
    for (const confirmation of confirmations) {
      let medicationName = 'Obat'
      let customMessage = `Minum obat ${medicationName}`
      let sentAt = null

      // Get reminder log details if available
      if (confirmation.reminderLogId) {
        const logResult = await db
          .select({
            sentAt: reminderLogs.sentAt,
            reminderScheduleId: reminderLogs.reminderScheduleId
          })
          .from(reminderLogs)
          .where(eq(reminderLogs.id, confirmation.reminderLogId))
          .limit(1)

        if (logResult.length > 0) {
          sentAt = logResult[0].sentAt

          // Get schedule details if available
          if (logResult[0].reminderScheduleId) {
            const scheduleResult = await db
              .select({
                medicationName: reminderSchedules.medicationName,
                customMessage: reminderSchedules.customMessage
              })
              .from(reminderSchedules)
              .where(
                and(
                  eq(reminderSchedules.id, logResult[0].reminderScheduleId),
                  isNull(reminderSchedules.deletedAt)
                )
              )
              .limit(1)

            if (scheduleResult.length > 0) {
              medicationName = scheduleResult[0].medicationName || medicationName
              customMessage = scheduleResult[0].customMessage || customMessage
            }
          }
        }
      }

      // Use medications data from confirmation if available
      if (confirmation.medicationsTaken && Array.isArray(confirmation.medicationsTaken) && confirmation.medicationsTaken.length > 0) {
        medicationName = confirmation.medicationsTaken[0]
      } else if (confirmation.medicationsMissed && Array.isArray(confirmation.medicationsMissed) && confirmation.medicationsMissed.length > 0) {
        medicationName = confirmation.medicationsMissed[0]
      }

      completedReminders.push({
        id: confirmation.id,
        patientId: confirmation.patientId,
        reminderLogId: confirmation.reminderLogId,
        visitDate: confirmation.visitDate,
        visitTime: confirmation.visitTime,
        medicationsTaken: confirmation.medicationsTaken,
        medicationsMissed: confirmation.medicationsMissed,
        confirmedAt: confirmation.confirmedAt,
        notes: confirmation.notes,
        medicationName,
        customMessage,
        sentAt
      })
    }

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.medicationName,
      scheduledTime: reminder.visitTime,
      completedDate: reminder.visitDate.toISOString().split('T')[0],
      customMessage: reminder.customMessage,
      medicationTaken: reminder.medicationsTaken,
      confirmedAt: convertUTCToWIBString(reminder.confirmedAt),
      sentAt: reminder.sentAt ? reminder.sentAt.toISOString() : null,
      notes: reminder.notes
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}