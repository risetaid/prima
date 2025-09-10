import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, patients, reminderLogs, reminderContentAttachments } from '@/db'
import { eq, and, isNull, gte, lte, inArray } from 'drizzle-orm'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { getWIBTime, getWIBDateString, getWIBTimeString, shouldSendReminderNow, getWIBTodayStart } from '@/lib/timezone'
// Rate limiter temporarily disabled

// Helper function to create date range for WIB timezone (same as cron)
function createWIBDateRange(dateString: string) {
  const date = new Date(dateString)
  // Start of day in WIB (00:00:00)
  const startOfDay = new Date(date)
  startOfDay.setUTCHours(17, 0, 0, 0) // 17:00 UTC = 00:00 WIB (UTC+7)
  
  // End of day in WIB (23:59:59.999)
  const endOfDay = new Date(date)
  endOfDay.setUTCHours(16, 59, 59, 999) // 16:59 UTC next day = 23:59 WIB (UTC+7)
  endOfDay.setDate(endOfDay.getDate() + 1)
  
  return { startOfDay, endOfDay }
}

// Helper function to generate enhanced WhatsApp message with content links
function generateEnhancedMessage(originalMessage: string, contentAttachments: Array<{id: string, type: 'article' | 'video', title: string, url: string}>) {
  if (contentAttachments.length === 0) {
    return originalMessage
  }
  
  let enhancedMessage = originalMessage
  
  // Add content section
  enhancedMessage += '\n\n📚 Baca juga:'
  
  contentAttachments.forEach(content => {
    const icon = content.type === 'article' ? '📄' : '🎥'
    enhancedMessage += `\n${icon} ${content.title}: ${content.url}`
  })
  
  enhancedMessage += '\n\n💙 Tim PRIMA'
  
  return enhancedMessage
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // All authenticated users can send instant reminders to their assigned patients

    const startTime = Date.now()
    let processedCount = 0
    let sentCount = 0
    let errorCount = 0
    const debugLogs: string[] = []

    // Build patient filter based on role
    const patientConditions = [isNull(patients.deletedAt)]
    if (user.role === 'ADMIN' || user.role === 'MEMBER') {
      // Both ADMIN and MEMBER can only send to patients they manage
      patientConditions.push(eq(patients.assignedVolunteerId, user.id))
    }
    const patientFilter = patientConditions.length > 1 ? and(...patientConditions) : patientConditions[0]

    // Get reminder schedules for today and past dates (aligned with cron job logic)
    const todayWIB = getWIBDateString()
    const { endOfDay } = createWIBDateRange(todayWIB)
    const todayStart = getWIBTodayStart()

    const activeReminders = await db
      .select({
        // Schedule fields
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        customMessage: reminderSchedules.customMessage,
        // Patient fields
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber
      })
      .from(reminderSchedules)
      .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
      .where(
        and(
          eq(reminderSchedules.isActive, true),
          lte(reminderSchedules.startDate, endOfDay), // Include today and past dates
          patientFilter,
          isNull(reminderSchedules.deletedAt),
          // Exclude reminders already sent today (prevent duplicates)
          isNull(
            db.select()
              .from(reminderLogs)
              .where(
                and(
                  eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
                  eq(reminderLogs.status, 'DELIVERED'),
                  gte(reminderLogs.sentAt, todayStart)
                )
              )
          )
        )
      )

    // Get content attachments for all today's reminders
    const reminderIds = activeReminders.map(r => r.id)
    const contentAttachmentsMap = new Map()
    
    if (reminderIds.length > 0) {
      const contentAttachments = await db
        .select({
          reminderScheduleId: reminderContentAttachments.reminderScheduleId,
          contentType: reminderContentAttachments.contentType,
          contentTitle: reminderContentAttachments.contentTitle,
          contentUrl: reminderContentAttachments.contentUrl,
        })
        .from(reminderContentAttachments)
        .where(inArray(reminderContentAttachments.reminderScheduleId, reminderIds))

      // Create content attachments map
      contentAttachments.forEach(attachment => {
        if (!contentAttachmentsMap.has(attachment.reminderScheduleId)) {
          contentAttachmentsMap.set(attachment.reminderScheduleId, [])
        }
        contentAttachmentsMap.get(attachment.reminderScheduleId).push({
          id: attachment.reminderScheduleId,
          type: attachment.contentType,
          title: attachment.contentTitle,
          url: attachment.contentUrl
        })
      })
    }

    const logMessage = `🚀 Starting instant send for ${activeReminders.length} reminders at ${getWIBDateString()} ${getWIBTimeString()}`
    debugLogs.push(logMessage)

    // Process reminders with time-based filtering and duplicate prevention
    for (const reminder of activeReminders) {
      processedCount++

      try {
        // Validate phone number exists
        if (!reminder.patientPhoneNumber || !reminder.patientName) {
          errorCount++
          debugLogs.push(`❌ Skipped reminder ${reminder.id}: Missing patient data`)
          continue
        }

        // Check if it's time to send this reminder (time-based filtering)
        const scheduleDate = reminder.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, reminder.scheduledTime)

        debugLogs.push(`📅 Processing ${reminder.patientName} (${reminder.scheduledTime}) - Date: ${scheduleDate}`)
        debugLogs.push(`⏰ Current time: ${getWIBTimeString()}, Scheduled: ${reminder.scheduledTime}, Should send: ${shouldSend}`)

        if (!shouldSend) {
          debugLogs.push(`⏰ Reminder ${reminder.patientName} not due yet - skipping`)
          continue
        }

        // Rate limiting temporarily disabled

        try {
          // Generate basic message
          const basicMessage = reminder.customMessage || 
            `Halo ${reminder.patientName}, jangan lupa minum obat ${reminder.medicationName} pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`
          
          // Get content attachments for this reminder and enhance message
          const attachments = contentAttachmentsMap.get(reminder.id) || []
          const messageBody = generateEnhancedMessage(basicMessage, attachments)
          
          const formattedNumber = formatWhatsAppNumber(reminder.patientPhoneNumber)
          
          // Send WhatsApp message
          const result = await sendWhatsAppMessage({
            to: formattedNumber,
            body: messageBody
          })

          debugLogs.push(`📱 WhatsApp result for ${reminder.patientName}: success=${result.success}, messageId=${result.messageId}`)

           // Create reminder log
           const status: 'DELIVERED' | 'FAILED' = result.success ? 'DELIVERED' : 'FAILED'
           const logData = {
             reminderScheduleId: reminder.id,
             patientId: reminder.patientId,
             sentAt: getWIBTime(),
             status: status,
             message: messageBody,
             phoneNumber: reminder.patientPhoneNumber,
             fonnteMessageId: result.messageId,
             notes: `Instant send by ${user.role} - ${getWIBDateString()} ${getWIBTimeString()}`
           }

          await db.insert(reminderLogs).values(logData)

          if (result.success) {
            sentCount++
            debugLogs.push(`✅ Reminder sent to ${reminder.patientName}`)
          } else {
            errorCount++
            debugLogs.push(`❌ Failed to send reminder to ${reminder.patientName}: ${result.error}`)
          }
        } catch (sendError) {
          errorCount++
          debugLogs.push(`❌ Error sending to ${reminder.patientName}: ${sendError}`)
        }

        // Small delay to prevent overwhelming the WhatsApp API
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (reminderError) {
        errorCount++
        debugLogs.push(`❌ Error processing reminder ${reminder.id}: ${reminderError}`)
      }
    }

    const duration = Date.now() - startTime
    const summary = {
      success: true,
      message: sentCount > 0 
        ? `✅ Instant send completed: ${sentCount} reminders sent successfully` 
        : `📋 Instant send completed: No active reminders found`,
      execution: {
        timestamp: new Date().toISOString(),
        wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
        duration: `${duration}ms`,
        provider: 'FONNTE',
        triggeredBy: user.email || user.id
      },
      results: {
        remindersFound: activeReminders.length,
        remindersProcessed: processedCount,
        messagesSent: sentCount,
        errors: errorCount,
        successRate: processedCount > 0 ? `${Math.round((sentCount / processedCount) * 100)}%` : '0%'
      },
      details: debugLogs
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Error in instant send all reminders:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      wibTime: `${getWIBDateString()} ${getWIBTimeString()}`
    }, { status: 500 })
  }
}