import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, notExists, desc } from 'drizzle-orm'
import { getWIBTodayStart } from '@/lib/timezone'
import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

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
    
    // Try to get from cache first
    const cacheKey = CACHE_KEYS.reminderStats(id)
    const cachedStats = await getCachedData(cacheKey)
    
    if (cachedStats) {
      return NextResponse.json(cachedStats)
    }
    
    // DEBUG: Log the filter criteria
    const todayWIBStart = getWIBTodayStart()
    
    // SCHEDULED COUNT: Reminders that haven't been delivered yet (optimized with subquery)
    const scheduledReminderIds = await db
      .select({ id: reminderSchedules.id })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true),
          // Haven't been delivered yet - use notExists for efficiency
          notExists(
            db.select()
              .from(reminderLogs)
              .where(
                and(
                  eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                  eq(reminderLogs.status, 'DELIVERED')
                )
              )
          )
        )
      )

    // Get full details for scheduled reminders with recent logs
    const scheduledReminders = await db
      .select({
        id: reminderSchedules.id,
        startDate: reminderSchedules.startDate,
        // We'll fetch logs separately for better performance
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true),
          notExists(
            db.select()
              .from(reminderLogs)
              .where(
                and(
                  eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                  eq(reminderLogs.status, 'DELIVERED')
                )
              )
          )
        )
      )

    // ALL REMINDERS: Get all active reminders for other status calculations
    // First get all active reminder schedules
    const allReminderSchedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        startDate: reminderSchedules.startDate
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true)
        )
      )

    // Get latest logs for each schedule (separate query for better performance)
    const latestLogs: any[] = []
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
    const scheduleConfirmations: any[] = []
    for (const schedule of allReminderSchedules) {
      const confirmations = await db
        .select({
          id: manualConfirmations.id,
          patientId: manualConfirmations.patientId,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate
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
    const logConfirmations: any[] = []
    for (const log of latestLogs) {
      const confirmations = await db
        .select({
          id: manualConfirmations.id,
          reminderLogId: manualConfirmations.reminderLogId,
          visitDate: manualConfirmations.visitDate
        })
        .from(manualConfirmations)
        .where(eq(manualConfirmations.reminderLogId, log.id))
        .limit(1)

      if (confirmations.length > 0) {
        logConfirmations.push(confirmations[0])
      }
    }

    // Count by status using same logic as /all endpoint
    const statusCounts = {
      terjadwal: scheduledReminders.length, // Use the filtered count from scheduled query
      perluDiperbarui: 0,
      selesai: 0
    }

    // Count pending and completed from all reminders
    allReminderSchedules.forEach(schedule => {
      // Find latest log for this schedule
      const latestLog = latestLogs.find(log => log.reminderScheduleId === schedule.id)
      // Find schedule confirmation for this patient
      const scheduleConfirmation = scheduleConfirmations.find(conf => conf.patientId === schedule.patientId)
      
      // Determine status based on proper relations (same logic as /all)
      let status = 'scheduled'

      if (latestLog) {
        // Find log confirmation for this specific log
        const logConfirmation = logConfirmations.find(conf => conf.reminderLogId === latestLog.id)
        
        if (logConfirmation) {
          // This specific log has been confirmed
          status = 'completed'
        } else if (latestLog.status === 'DELIVERED') {
          // Log sent but not yet confirmed
          status = 'pending'
        }
      } else if (scheduleConfirmation) {
        // Manual confirmation without specific log
        status = 'completed'
      }

      // Only count pending and completed (scheduled already counted above)
      if (status === 'pending') {
        statusCounts.perluDiperbarui++
      } else if (status === 'completed') {
        statusCounts.selesai++
      }
    })

    const stats = {
      terjadwal: statusCounts.terjadwal,
      perluDiperbarui: statusCounts.perluDiperbarui,
      selesai: statusCounts.selesai,
      semua: statusCounts.terjadwal + statusCounts.perluDiperbarui + statusCounts.selesai
    }

    // Cache the stats with shorter TTL since they change more frequently
    await setCachedData(cacheKey, stats, CACHE_TTL.REMINDER_STATS)

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}