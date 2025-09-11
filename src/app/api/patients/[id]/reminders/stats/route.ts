import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, desc, isNull, inArray } from 'drizzle-orm'
import { getWIBTodayStart } from '@/lib/timezone'
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

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

    // Check for cache invalidation request
    const { searchParams } = new URL(request.url)
    const invalidate = searchParams.get('invalidate') === 'true'

    // Try to get from cache first (unless invalidating)
    const cacheKey = CACHE_KEYS.reminderStats(id)
    if (!invalidate) {
      const cachedStats = await getCachedData(cacheKey)
      if (cachedStats) {
        return NextResponse.json(cachedStats)
      }
    } else {
      // Invalidate cache when requested
      await invalidateCache(cacheKey)
    }
    
    // DEBUG: Log the filter criteria
    const todayWIBStart = getWIBTodayStart()
    
    // Get all active reminder schedules for this patient
    const allSchedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        startDate: reminderSchedules.startDate,
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true),
          isNull(reminderSchedules.deletedAt)
        )
      )

    // Get all reminder logs for these schedules
    const allLogs = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt
      })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, id),
          inArray(reminderLogs.status, ['DELIVERED', 'FAILED'])
        )
      )
      .orderBy(desc(reminderLogs.sentAt))

    // Get all manual confirmations for this patient
    const allConfirmations = await db
      .select({
        id: manualConfirmations.id,
        reminderLogId: manualConfirmations.reminderLogId,
        reminderScheduleId: manualConfirmations.reminderScheduleId,
        visitDate: manualConfirmations.visitDate
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id))

    // Initialize counters
    let terjadwal = 0
    let perluDiperbarui = 0
    let selesai = 0

    // Process each individual log to determine its status
    for (const log of allLogs) {
      // Check if this specific log has been confirmed
      const logConfirmation = allConfirmations.find(conf => conf.reminderLogId === log.id)

      if (logConfirmation) {
        // Log has been confirmed - completed
        selesai++
      } else if (log.status === 'DELIVERED') {
        // Log sent but not confirmed - needs update
        perluDiperbarui++
      } else if (log.status === 'FAILED') {
        // Log failed - still scheduled (will be retried)
        terjadwal++
      } else {
        // Unknown status - treat as scheduled
        terjadwal++
      }
    }

    // Add schedules that have no logs yet
    for (const schedule of allSchedules) {
      const hasLogs = allLogs.some(log => log.reminderScheduleId === schedule.id)
      if (!hasLogs) {
        terjadwal++
      }
    }

    const stats = {
      terjadwal,
      perluDiperbarui,
      selesai,
      semua: terjadwal + perluDiperbarui + selesai
    }

    // Cache the stats with shorter TTL since they change more frequently
    await setCachedData(cacheKey, stats, CACHE_TTL.REMINDER_STATS)

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
