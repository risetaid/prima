import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateFilter = searchParams.get('date')
    const pagination = createEfficientPagination(page, limit)

    // Build optimized where clause
    const whereClause: any = {
      patientId: id,
      status: 'DELIVERED',
      manualConfirmations: {
        none: {} // No manual confirmations exist for this log
      }
    }

    // Add date range filter if provided
    if (dateFilter) {
      whereClause.sentAt = createDateRangeQuery(dateFilter, '+07:00')
    }

    // Get reminder logs that are DELIVERED but don't have manual confirmation yet (optimized)
    const pendingReminders = await prisma.reminderLog.findMany({
      where: whereClause,
      include: {
        reminderSchedule: {
          select: {
            medicationName: true,
            scheduledTime: true,
            customMessage: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      ...pagination
    })

    // Transform to match frontend interface
    const formattedReminders = pendingReminders.map(reminder => ({
      id: reminder.id,
      medicationName: reminder.reminderSchedule?.medicationName || 'Obat',
      scheduledTime: reminder.reminderSchedule?.scheduledTime || '12:00',
      sentDate: reminder.sentAt.toISOString().split('T')[0],
      customMessage: reminder.reminderSchedule?.customMessage || reminder.message,
      status: 'PENDING_UPDATE'
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching pending reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}