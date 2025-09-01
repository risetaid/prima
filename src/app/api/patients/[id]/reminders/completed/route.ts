import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, desc, isNotNull, inArray } from 'drizzle-orm'
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

    // Simplified approach: Get all confirmations for this patient first
    const allConfirmations = await db
      .select({
        id: manualConfirmations.id,
        patientId: manualConfirmations.patientId,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
        medicationsMissed: manualConfirmations.medicationsMissed,
        confirmedAt: manualConfirmations.confirmedAt
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .offset(offset)
      .limit(limit)

    // Get reminder schedules and logs for these confirmations
    const scheduleIds = new Set<string>()
    const logIds = new Set<string>()
    
    allConfirmations.forEach(conf => {
      if (conf.reminderLogId) logIds.add(conf.reminderLogId)
    })

    // Get logs and their related schedules
    const relatedLogs = logIds.size > 0 ? await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        sentAt: reminderLogs.sentAt
      })
      .from(reminderLogs)
      .where(inArray(reminderLogs.id, Array.from(logIds)))
      : []

    relatedLogs.forEach(log => {
      if (log.reminderScheduleId) scheduleIds.add(log.reminderScheduleId)
    })

    // Also get schedules directly linked to confirmations (for general confirmations)
    const directSchedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.patientId, id))

    directSchedules.forEach(schedule => scheduleIds.add(schedule.id))

    // Get all related schedules
    const relatedSchedules = scheduleIds.size > 0 ? await db
      .select({
        id: reminderSchedules.id,
        medicationName: reminderSchedules.medicationName,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderSchedules)
      .where(inArray(reminderSchedules.id, Array.from(scheduleIds)))
      : []

    // Transform to match frontend interface
    const formattedReminders = allConfirmations.map(confirmation => {
      // Find related log and schedule
      const relatedLog = relatedLogs.find(log => log.id === confirmation.reminderLogId)
      const relatedSchedule = relatedSchedules.find(schedule => 
        schedule.id === relatedLog?.reminderScheduleId
      ) || directSchedules[0] // Fallback to first direct schedule

      const medicationName = relatedSchedule?.medicationName || 
                            (confirmation.medicationsMissed && confirmation.medicationsMissed.length > 0 
                              ? confirmation.medicationsMissed[0] 
                              : 'Obat')
      
      return {
        id: confirmation.id,
        medicationName,
        scheduledTime: confirmation.visitTime,
        completedDate: confirmation.visitDate.toISOString().split('T')[0],
        customMessage: relatedSchedule?.customMessage || `Minum obat ${medicationName}`,
        medicationTaken: confirmation.medicationsTaken,
        confirmedAt: convertUTCToWIBString(confirmation.confirmedAt),
        sentAt: relatedLog?.sentAt ? relatedLog.sentAt.toISOString() : null
      }
    })

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}