import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, patients, reminderLogs } from '@/db'
import { eq, and, isNull } from 'drizzle-orm'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { getWIBTime, getWIBDateString, getWIBTimeString } from '@/lib/timezone'
import { whatsappRateLimiter } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to send all reminders (admin level)
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Access denied. Only administrators can send instant reminders to all patients.' 
      }, { status: 403 })
    }

    const startTime = Date.now()
    let processedCount = 0
    let sentCount = 0
    let errorCount = 0
    const debugLogs: string[] = []

    // Build patient filter based on role
    const patientConditions = [isNull(patients.deletedAt)]
    if (user.role === 'ADMIN') {
      // Admins can only send to patients they manage
      patientConditions.push(eq(patients.assignedVolunteerId, user.id))
    }
    const patientFilter = patientConditions.length > 1 ? and(...patientConditions) : patientConditions[0]

    // Get all active reminder schedules for managed patients
    const activeReminders = await db
      .select({
        // Schedule fields
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
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
          patientFilter,
          isNull(reminderSchedules.deletedAt)
        )
      )

    const logMessage = `🚀 Starting instant send for ${activeReminders.length} reminders at ${getWIBDateString()} ${getWIBTimeString()}`
    debugLogs.push(logMessage)

    // Process reminders with rate limiting
    const rateLimitKey = `instant_send_${user.id}`
    
    for (const reminder of activeReminders) {
      processedCount++
      
      try {
        // Validate phone number exists
        if (!reminder.patientPhoneNumber || !reminder.patientName) {
          errorCount++
          debugLogs.push(`❌ Skipped reminder ${reminder.id}: Missing patient data`)
          continue
        }

        // Check rate limit
        if (!whatsappRateLimiter.isAllowed(rateLimitKey)) {
          debugLogs.push(`🚫 Rate limit exceeded. Remaining: ${whatsappRateLimiter.getRemainingRequests(rateLimitKey)}`)
          errorCount++
          continue
        }

        try {
          // Generate message
          const messageBody = reminder.customMessage || 
            `Halo ${reminder.patientName}, jangan lupa minum obat ${reminder.medicationName} pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`
          
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
            notes: 'Instant send by admin'
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