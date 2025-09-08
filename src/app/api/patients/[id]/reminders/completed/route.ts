import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations } from '@/db'
import { eq, desc, inArray, isNull, and } from 'drizzle-orm'
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

    // Optimized single query with proper joins
    const completedReminders = await db
      .select({
        // Confirmation fields
        id: manualConfirmations.id,
        patientId: manualConfirmations.patientId,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        medicationsTaken: manualConfirmations.medicationsTaken,
        medicationsMissed: manualConfirmations.medicationsMissed,
        confirmedAt: manualConfirmations.confirmedAt,
        notes: manualConfirmations.notes,
        // Schedule fields (joined)
        medicationName: reminderSchedules.medicationName,
        customMessage: reminderSchedules.customMessage,
        // Log fields (joined)
        sentAt: reminderLogs.sentAt
      })
      .from(manualConfirmations)
      .leftJoin(reminderLogs, 
        eq(manualConfirmations.reminderLogId, reminderLogs.id)
      )
      .leftJoin(reminderSchedules, 
        and(
          eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
          isNull(reminderSchedules.deletedAt) // Soft delete filter
        )
      )
      .where(eq(manualConfirmations.patientId, id))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .offset(offset)
      .limit(limit)

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(reminder => {
      const medicationName = reminder.medicationName || 
                            (reminder.medicationsMissed && reminder.medicationsMissed.length > 0 
                              ? reminder.medicationsMissed[0] 
                              : 'Obat')
      
      return {
        id: reminder.id,
        medicationName,
        scheduledTime: reminder.visitTime,
        completedDate: reminder.visitDate.toISOString().split('T')[0],
        customMessage: reminder.customMessage || `Minum obat ${medicationName}`,
        medicationTaken: reminder.medicationsTaken,
        confirmedAt: convertUTCToWIBString(reminder.confirmedAt),
        sentAt: reminder.sentAt ? reminder.sentAt.toISOString() : null,
        notes: reminder.notes
      }
    })

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}