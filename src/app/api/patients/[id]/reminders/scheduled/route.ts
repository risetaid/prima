import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getWIBTodayStart } from '@/lib/timezone'
import { createEfficientPagination, createDateRangeQuery } from '@/lib/query-optimizer'

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
    const limit = parseInt(searchParams.get('limit') || '30')
    const dateFilter = searchParams.get('date')
    const pagination = createEfficientPagination(page, limit)

    // Build optimized where clause
    const todayWIBStart = getWIBTodayStart()
    const whereClause: any = {
      patientId: id,
      isActive: true,
      // Haven't been delivered yet
      reminderLogs: {
        none: {
          status: 'DELIVERED'
        }
      }
    }

    // Add date range filter if provided for startDate
    if (dateFilter) {
      whereClause.startDate = createDateRangeQuery(dateFilter, '+07:00')
    }

    // DEBUG: Log the filter criteria first
    console.log("🔍 SCHEDULED API DEBUG - Filter criteria:")
    console.log("Today WIB start:", todayWIBStart)
    console.log("whereClause:", JSON.stringify(whereClause, null, 2))

    // Get scheduled reminders - those that haven't been sent yet or don't have delivery logs today (optimized)
    const scheduledReminders = await prisma.reminderSchedule.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            name: true,
            phoneNumber: true
          }
        },
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 5 // Get latest logs for debugging
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      ...pagination
    })

    // DEBUG: Log what we found
    console.log("🔍 SCHEDULED API DEBUG - Found reminders:", scheduledReminders.length)
    scheduledReminders.forEach(reminder => {
      console.log(`- ${reminder.startDate.toISOString()} | Logs: ${reminder.reminderLogs.length} | Latest: ${reminder.reminderLogs[0]?.status} at ${reminder.reminderLogs[0]?.sentAt}`)
    })

    // Transform to match frontend interface
    const formattedReminders = scheduledReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.medicationName,
      scheduledTime: reminder.scheduledTime,
      nextReminderDate: reminder.startDate.toISOString().split('T')[0],
      customMessage: reminder.customMessage
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching scheduled reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { reminderIds } = await request.json()

    if (!reminderIds || !Array.isArray(reminderIds)) {
      return NextResponse.json({ error: 'Invalid reminderIds' }, { status: 400 })
    }

    // Delete multiple scheduled reminders
    await prisma.reminderSchedule.deleteMany({
      where: {
        id: { in: reminderIds },
        patientId: id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scheduled reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}