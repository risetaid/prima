import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, desc, inArray } from 'drizzle-orm'

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

    // Get all reminder logs for this patient (show all individual logs, not just latest per schedule)
    const allReminderLogs = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
        message: reminderLogs.message,
        // Join with schedule data
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderLogs)
      .leftJoin(reminderSchedules,
        and(
          eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
          eq(reminderSchedules.isActive, true)
        )
      )
      .where(eq(reminderLogs.patientId, id))
      .orderBy(desc(reminderLogs.sentAt))
      .offset(offset)
      .limit(limit)

    // Get all manual confirmations for the logs we retrieved
    const logIds = allReminderLogs.map(log => log.id)
    const allConfirmations = logIds.length > 0 ? await db
      .select({
        id: manualConfirmations.id,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate
      })
      .from(manualConfirmations)
      .where(inArray(manualConfirmations.reminderLogId, logIds)) : []

    // Transform results to unified format (show all individual logs)
    const allReminders = allReminderLogs.map(log => {
      // Find confirmation for this specific log
      const confirmation = allConfirmations.find(conf => conf.reminderLogId === log.id)

      // Determine status based on log and confirmation
      let status = 'scheduled'
      let reminderDate = log.sentAt ? log.sentAt.toISOString().split('T')[0] : (log.startDate ? log.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      let id_suffix = log.id

      if (confirmation) {
        // This specific log has been confirmed
        status = 'completed'
        reminderDate = confirmation.visitDate ? confirmation.visitDate.toISOString().split('T')[0] : reminderDate
        id_suffix = `completed-${confirmation.id}`
      } else if (log.status === 'DELIVERED') {
        // Log sent but not yet confirmed
        status = 'pending'
        id_suffix = `pending-${log.id}`
      } else if (log.status === 'FAILED') {
        // Log failed
        status = 'scheduled'
        id_suffix = `failed-${log.id}`
      }

      return {
        id: `${status}-${id_suffix}`,
        scheduledTime: log.scheduledTime || '12:00',
        reminderDate,
        customMessage: log.customMessage || log.message,
        status
      }
    })

    return NextResponse.json(allReminders)
  } catch (error) {
    console.error('Error fetching all reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
