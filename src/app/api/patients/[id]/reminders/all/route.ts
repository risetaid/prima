import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, desc } from 'drizzle-orm'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get all active reminder schedules first (optimized approach)
    const allReminderSchedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true)
        )
      )
      .orderBy(desc(reminderSchedules.startDate))
      .offset(offset)
      .limit(limit)

    // Get latest logs for each schedule (separate query for better performance)
    const latestLogs: { id: string; reminderScheduleId: string | null; status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'; sentAt: Date | null }[] = []
    for (const schedule of allReminderSchedules) {
      const logs = await db
        .select({
          id: reminderLogs.id,
          reminderScheduleId: reminderLogs.reminderScheduleId,
          status: reminderLogs.status,
          sentAt: reminderLogs.sentAt
        })
        .from(reminderLogs)
        .where(eq(reminderLogs.reminderScheduleId, schedule.id))
        .orderBy(desc(reminderLogs.sentAt))
        .limit(1)

      if (logs.length > 0) {
        latestLogs.push(logs[0])
      }
    }

    // Get manual confirmations for each schedule
    const scheduleConfirmations: { id: string; patientId: string; reminderLogId: string | null; visitDate: Date | null; medicationsTaken: boolean }[] = []
    for (const schedule of allReminderSchedules) {
      const confirmations = await db
        .select({
          id: manualConfirmations.id,
          patientId: manualConfirmations.patientId,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate,
          medicationsTaken: manualConfirmations.medicationsTaken
        })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.patientId, schedule.patientId))
        .orderBy(desc(manualConfirmations.visitDate))
        .limit(1)

      if (confirmations.length > 0) {
        scheduleConfirmations.push(confirmations[0])
      }
    }

    // Get log confirmations for specific logs
    const logConfirmations: { id: string; reminderLogId: string | null; visitDate: Date | null; medicationsTaken: boolean }[] = []
    for (const log of latestLogs) {
      const confirmations = await db
        .select({
          id: manualConfirmations.id,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate,
          medicationsTaken: manualConfirmations.medicationsTaken
        })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.reminderLogId, log.id))
        .limit(1)

      if (confirmations.length > 0) {
        logConfirmations.push(confirmations[0])
      }
    }

    // Transform results to unified format (using Drizzle data with same logic)
    const allReminders = allReminderSchedules.map(schedule => {
      // Find latest log for this schedule
      const latestLog = latestLogs.find(log => log.reminderScheduleId === schedule.id)
      // Find schedule confirmation for this patient
      const scheduleConfirmation = scheduleConfirmations.find(conf => conf.patientId === schedule.patientId)
      
      // Determine status based on proper relations
      let status = 'scheduled'
      let reminderDate = schedule.startDate.toISOString().split('T')[0]
      let id_suffix = schedule.id

      if (latestLog) {
        // Find log confirmation for this specific log
        const logConfirmation = logConfirmations.find(conf => conf.reminderLogId === latestLog.id)
        
        if (logConfirmation) {
          // This specific log has been confirmed
          status = logConfirmation.medicationsTaken ? 'completed_taken' : 'completed_not_taken'
          reminderDate = logConfirmation.visitDate ? logConfirmation.visitDate.toISOString().split('T')[0] : schedule.startDate.toISOString().split('T')[0]
          id_suffix = `completed-${logConfirmation.id}`
        } else if (latestLog.status === 'DELIVERED') {
          // Log sent but not yet confirmed
          status = 'pending'
          reminderDate = latestLog.sentAt ? latestLog.sentAt.toISOString().split('T')[0] : schedule.startDate.toISOString().split('T')[0]
          id_suffix = `pending-${latestLog.id}`
        }
      } else if (scheduleConfirmation) {
        // Manual confirmation without specific log
        status = scheduleConfirmation.medicationsTaken ? 'completed_taken' : 'completed_not_taken'
        reminderDate = scheduleConfirmation.visitDate ? scheduleConfirmation.visitDate.toISOString().split('T')[0] : schedule.startDate.toISOString().split('T')[0]
        id_suffix = `completed-${scheduleConfirmation.id}`
      }

      return {
        id: `${status}-${id_suffix}`,
        medicationName: schedule.medicationName,
        scheduledTime: schedule.scheduledTime,
        reminderDate,
        customMessage: schedule.customMessage,
        status
      }
    })

    return NextResponse.json(allReminders)
  } catch (error) {
    console.error('Error fetching all reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}