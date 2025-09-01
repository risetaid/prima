import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderLogs, reminderSchedules, manualConfirmations } from '@/db'
import { eq, and, desc, gte, lte, notExists } from 'drizzle-orm'

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
    
    // Extract pagination and date filter parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateFilter = searchParams.get('date')
    const offset = (page - 1) * limit

    // Build where conditions with Drizzle
    const whereConditions = [
      eq(reminderLogs.patientId, id),
      eq(reminderLogs.status, 'DELIVERED'),
      // No manual confirmations exist for this log
      notExists(
        db.select()
          .from(manualConfirmations)
          .where(eq(manualConfirmations.reminderLogId, reminderLogs.id))
      )
    ]

    // Add date range filter if provided (simplified)
    if (dateFilter) {
      const date = new Date(dateFilter)
      const startOfDay = new Date(date)
      startOfDay.setUTCHours(17, 0, 0, 0) // 17:00 UTC = 00:00 WIB (UTC+7)
      
      const endOfDay = new Date(date)
      endOfDay.setUTCHours(16, 59, 59, 999) // 16:59 UTC next day = 23:59 WIB
      endOfDay.setDate(endOfDay.getDate() + 1)

      whereConditions.push(gte(reminderLogs.sentAt, startOfDay))
      whereConditions.push(lte(reminderLogs.sentAt, endOfDay))
    }

    // Get reminder logs that are DELIVERED but don't have manual confirmation yet
    const pendingReminders = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        sentAt: reminderLogs.sentAt,
        message: reminderLogs.message,
        // Schedule fields
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderLogs)
      .leftJoin(reminderSchedules, eq(reminderLogs.reminderScheduleId, reminderSchedules.id))
      .where(and(...whereConditions))
      .orderBy(desc(reminderLogs.sentAt))
      .offset(offset)
      .limit(limit)

    // Transform to match frontend interface
    const formattedReminders = pendingReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.medicationName || 'Obat',
      scheduledTime: reminder.scheduledTime || '12:00',
      sentDate: reminder.sentAt.toISOString().split('T')[0],
      customMessage: reminder.customMessage || reminder.message,
      status: 'PENDING_UPDATE'
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching pending reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}