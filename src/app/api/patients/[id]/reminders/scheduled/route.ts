import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, patients, reminderLogs, reminderContentAttachments, patientVariables } from '@/db'
import { eq, and, desc, asc, gte, lte, inArray, isNull } from 'drizzle-orm'
import { getWIBTime } from '@/lib/timezone'
import { invalidateCache, CACHE_KEYS } from '@/lib/cache'
import { MedicationParser } from '@/lib/medication-parser'

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
    const offset = (page - 1) * limit

    // Build conditions array with soft delete filter
    const conditions = [
      eq(reminderSchedules.patientId, id),
      eq(reminderSchedules.isActive, true),
      isNull(reminderSchedules.deletedAt) // Critical: soft delete filter
    ]

    // Add date range filter if provided for startDate - use consistent timezone logic
    if (dateFilter) {
      // Use the same helper function as cron and instant send for consistency
      function createWIBDateRange(dateString: string) {
        const date = new Date(dateString)
        const startOfDay = new Date(date)
        startOfDay.setUTCHours(17, 0, 0, 0) // 17:00 UTC = 00:00 WIB (UTC+7)
        
        const endOfDay = new Date(date)
        endOfDay.setUTCHours(16, 59, 59, 999) // 16:59 UTC next day = 23:59 WIB (UTC+7)
        endOfDay.setDate(endOfDay.getDate() + 1)
        
        return { startOfDay, endOfDay }
      }
      
      const { startOfDay, endOfDay } = createWIBDateRange(dateFilter)
      conditions.push(
        gte(reminderSchedules.startDate, startOfDay),
        lte(reminderSchedules.startDate, endOfDay)
      )
    }

    // Build base query for scheduled reminders
    const baseQuery = db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        endDate: reminderSchedules.endDate,
        customMessage: reminderSchedules.customMessage,
        isActive: reminderSchedules.isActive,
        createdAt: reminderSchedules.createdAt,
        updatedAt: reminderSchedules.updatedAt
      })
      .from(reminderSchedules)
      .where(and(...conditions))

    // Execute query with pagination
    const scheduledReminders = await baseQuery
      .orderBy(asc(reminderSchedules.startDate))
      .limit(limit)
      .offset(offset)

    // Get patient details for reminders
    const patientIds = [...new Set(scheduledReminders.map(r => r.patientId))]
    const patientDetails = patientIds.length > 0 ? await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(inArray(patients.id, patientIds)) : []

    // Get reminder logs for debugging (latest 5 per reminder)
    const reminderIds = scheduledReminders.map(r => r.id)
    const recentLogs = reminderIds.length > 0 ? await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
      })
      .from(reminderLogs)
      .where(inArray(reminderLogs.reminderScheduleId, reminderIds))
      .orderBy(desc(reminderLogs.sentAt))
      .limit(reminderIds.length * 5) : []

    // Get content attachments for reminders
    const contentAttachments = reminderIds.length > 0 ? await db
      .select({
        id: reminderContentAttachments.id,
        reminderScheduleId: reminderContentAttachments.reminderScheduleId,
        contentType: reminderContentAttachments.contentType,
        contentId: reminderContentAttachments.contentId,
        contentTitle: reminderContentAttachments.contentTitle,
        contentUrl: reminderContentAttachments.contentUrl,
        attachmentOrder: reminderContentAttachments.attachmentOrder,
      })
      .from(reminderContentAttachments)
      .where(inArray(reminderContentAttachments.reminderScheduleId, reminderIds))
      .orderBy(asc(reminderContentAttachments.attachmentOrder)) : []

    // Create lookup maps
    const patientMap = new Map()
    patientDetails.forEach(patient => {
      patientMap.set(patient.id, patient)
    })

    const logsMap = new Map()
    recentLogs.forEach(log => {
      if (!logsMap.has(log.reminderScheduleId)) {
        logsMap.set(log.reminderScheduleId, [])
      }
      logsMap.get(log.reminderScheduleId).push(log)
    })

    const contentAttachmentsMap = new Map()
    contentAttachments.forEach(attachment => {
      if (!contentAttachmentsMap.has(attachment.reminderScheduleId)) {
        contentAttachmentsMap.set(attachment.reminderScheduleId, [])
      }
      contentAttachmentsMap.get(attachment.reminderScheduleId).push({
        id: attachment.contentId,
        type: attachment.contentType,
        title: attachment.contentTitle,
        url: attachment.contentUrl,
        slug: attachment.contentUrl.split('/').pop(), // Extract slug from URL
        order: attachment.attachmentOrder
      })
    })

    // DEBUG: Log the filter criteria first

    // Filter out reminders that have already been sent (SENT or DELIVERED)
    const filteredReminders = scheduledReminders.filter(reminder => {
      const logs = logsMap.get(reminder.id) || []
      const hasSentOrDeliveredLog = logs.some((log: { status: string }) => ['SENT', 'DELIVERED'].includes(log.status))
      return !hasSentOrDeliveredLog
    })

    // DEBUG: Log what we found after filtering

    // Get medication details for all reminders
    const medicationDetailsMap = new Map()
    for (const reminder of filteredReminders) {
      try {
        // Get patient variables to extract medication information
        const variables = await db
          .select({
            variableName: patientVariables.variableName,
            variableValue: patientVariables.variableValue,
            variableCategory: patientVariables.variableCategory
          })
          .from(patientVariables)
          .where(
            and(
              eq(patientVariables.patientId, reminder.patientId),
              eq(patientVariables.isActive, true),
              eq(patientVariables.variableCategory, 'MEDICATION')
            )
          )

        // Convert to format expected by MedicationParser
        const variableArray = variables.map(v => ({
          name: v.variableName,
          value: v.variableValue
        }))

        // Parse medication details from variables
        const medicationDetails = MedicationParser.parseFromVariables(variableArray)
        medicationDetailsMap.set(reminder.id, medicationDetails)
      } catch (error) {
        console.warn(`Failed to get medication details for reminder ${reminder.id}:`, error)
        medicationDetailsMap.set(reminder.id, null)
      }
    }

    // Transform to match frontend interface
    const formattedReminders = filteredReminders.map(reminder => ({
      id: reminder.id,
      scheduledTime: reminder.scheduledTime,
      nextReminderDate: reminder.startDate.toISOString().split('T')[0],
      customMessage: reminder.customMessage,
      patient: patientMap.get(reminder.patientId) || null,
      reminderLogs: logsMap.get(reminder.id) || [],
      attachedContent: contentAttachmentsMap.get(reminder.id) || [],
      medicationDetails: medicationDetailsMap.get(reminder.id) || null
    }))

    return NextResponse.json(formattedReminders)
  } catch {
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

    // Soft delete multiple scheduled reminders by setting deletedAt timestamp
    const deleteResult = await db
      .update(reminderSchedules)
      .set({
        deletedAt: getWIBTime(),
        isActive: false,
        updatedAt: getWIBTime()
      })
      .where(
        and(
          inArray(reminderSchedules.id, reminderIds),
          eq(reminderSchedules.patientId, id),
          eq(reminderSchedules.isActive, true)
        )
      )
      .returning({
        id: reminderSchedules.id
      })

    // Invalidate cache after bulk deletion
    await invalidateCache(CACHE_KEYS.reminderStats(id))

    return NextResponse.json({
      success: true,
      message: 'Reminders berhasil dihapus',
      deletedCount: deleteResult.length
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
