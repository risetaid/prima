import { NextRequest, NextResponse } from 'next/server'
import { db, reminderSchedules, patients, reminderLogs } from '@/db'
import { eq, and, gte, lte, notExists, count } from 'drizzle-orm'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString, getWIBTodayStart } from '@/lib/timezone'
import { whatsappRateLimiter } from '@/lib/rate-limiter'

// Helper function to create date range for WIB timezone (equivalent to createDateRangeQuery)
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

// GET endpoint for Vercel Cron Functions
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron with secret
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return await processReminders()
}

// POST endpoint for manual trigger during development/testing
export async function POST(request: NextRequest) {
  // Always require auth in production
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return await processReminders()
}

async function processReminders() {
  const startTime = Date.now()
  let processedCount = 0
  let sentCount = 0
  let errorCount = 0
  const debugLogs: string[] = []

  try {
    const logMessage = `🔄 Starting reminder cron job at ${getWIBDateString()} ${getWIBTimeString()}`
    console.log(logMessage)
    debugLogs.push(logMessage)

    // Get all active reminder schedules for today
    const todayWIB = getWIBDateString()

    // Use batch processing for better memory management
    const batchSize = 50 // Process in batches to prevent memory issues

    // First, get count to determine if we need batch processing
    const { startOfDay, endOfDay } = createWIBDateRange(todayWIB)
    const todayStart = getWIBTodayStart()
    
    // Count reminder schedules that haven't been delivered today yet
    const totalCountResult = await db
      .select({ count: count() })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.isActive, true),
          gte(reminderSchedules.startDate, startOfDay),
          lte(reminderSchedules.startDate, endOfDay),
          // Haven't been delivered today yet (using notExists for efficiency)
          notExists(
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
    
    const totalCount = totalCountResult[0]?.count || 0

    console.log(`📊 Found ${totalCount} reminder schedules to potentially process`)

    let reminderSchedulesToProcess: any[] = []
    if (totalCount > batchSize) {
      // Process in batches to prevent memory overload
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const batch = await db
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
              gte(reminderSchedules.startDate, startOfDay),
              lte(reminderSchedules.startDate, endOfDay),
              notExists(
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
          .offset(skip)
          .limit(batchSize)
          .orderBy(reminderSchedules.scheduledTime) // Process by time order

        // Transform to match Prisma structure
        const formattedBatch = batch.map(item => ({
          id: item.id,
          patientId: item.patientId,
          medicationName: item.medicationName,
          scheduledTime: item.scheduledTime,
          startDate: item.startDate,
          customMessage: item.customMessage,
          patient: {
            id: item.patientId,
            name: item.patientName,
            phoneNumber: item.patientPhoneNumber
          }
        }))
        
        reminderSchedulesToProcess.push(...formattedBatch)
        
        // Small delay between batches to prevent database overload
        if (skip + batchSize < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    } else {
      // Small dataset, process all at once
      const allSchedules = await db
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
            gte(reminderSchedules.startDate, startOfDay),
            lte(reminderSchedules.startDate, endOfDay),
            notExists(
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
        .orderBy(reminderSchedules.scheduledTime)

      // Transform to match Prisma structure
      reminderSchedulesToProcess = allSchedules.map(item => ({
        id: item.id,
        patientId: item.patientId,
        medicationName: item.medicationName,
        scheduledTime: item.scheduledTime,
        startDate: item.startDate,
        customMessage: item.customMessage,
        patient: {
          id: item.patientId,
          name: item.patientName,
          phoneNumber: item.patientPhoneNumber
        }
      }))
    }

    console.log(`📋 Found ${reminderSchedulesToProcess.length} reminder schedules for today`)

    for (const schedule of reminderSchedulesToProcess) {
      processedCount++
      
      try {
        // Check if it's time to send this reminder
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)

        console.log(`⏰ Schedule ${schedule.id}: ${schedule.scheduledTime} - Should send: ${shouldSend}`)

        if (shouldSend) {
          // Validate phone number exists
          if (!schedule.patient.phoneNumber) {
            console.error(`📱 Skipping reminder for ${schedule.patient.name}: No phone number`)
            errorCount++
            continue
          }
          
          // Check rate limit before sending
          const rateLimitKey = 'whatsapp_cron' // Use single key for cron job
          if (!whatsappRateLimiter.isAllowed(rateLimitKey)) {
            console.warn(`🚫 Rate limit exceeded for WhatsApp API. Remaining: ${whatsappRateLimiter.getRemainingRequests(rateLimitKey)}`)
            errorCount++
            continue
          }
          
          console.log(`📱 Sending reminder to ${schedule.patient.name} via FONNTE`)
          
          try {
            // Send WhatsApp message via Fonnte with phone validation
            const messageBody = schedule.customMessage || `Halo ${schedule.patient.name}, jangan lupa minum obat ${schedule.medicationName} pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`
            const formattedNumber = formatWhatsAppNumber(schedule.patient.phoneNumber)
            
            const result = await sendWhatsAppMessage({
              to: formattedNumber,
              body: messageBody
            })

            const providerLogMessage = `🔍 FONNTE result for ${schedule.patient.name}: success=${result.success}, messageId=${result.messageId}, error=${result.error}`
            console.log(providerLogMessage)
            debugLogs.push(providerLogMessage)

            // Create reminder log
            const status: 'DELIVERED' | 'FAILED' = result.success ? 'DELIVERED' : 'FAILED'
            const logData = {
              reminderScheduleId: schedule.id,
              patientId: schedule.patient.id,
              sentAt: getWIBTime(),
              status: status,
              message: messageBody,
              phoneNumber: schedule.patient.phoneNumber,
              fonnteMessageId: result.messageId
            }

            console.log(`🔍 Attempting to create log with data:`, JSON.stringify({
              ...logData,
              sentAt: logData.sentAt.toISOString()
            }, null, 2))

            // Create reminder log with error handling
            try {
              const createdLogResult = await db.insert(reminderLogs).values(logData).returning()
              const createdLog = createdLogResult[0]
              console.log(`📝 Created log for ${schedule.patient.name}: ${createdLog.id}`)
            } catch (logError) {
              console.error(`❌ Failed to create reminder log for ${schedule.patient.name}:`, logError)
              console.error(`❌ Log data that failed:`, logData)
              errorCount++
              continue // Skip to next schedule
            }

            if (result.success) {
              sentCount++
              console.log(`✅ Successfully sent reminder to ${schedule.patient.name}`)
            } else {
              errorCount++
              console.log(`❌ Failed to send reminder to ${schedule.patient.name}: ${result.error}`)
            }
          } catch (phoneError) {
            console.error(`❌ Phone validation error for ${schedule.patient.name}: ${phoneError}`)
            errorCount++
            continue
          }
        }
      } catch (scheduleError) {
        errorCount++
        console.error(`❌ Error processing schedule ${schedule.id}:`, scheduleError)
      }
    }

    const duration = Date.now() - startTime
    const summary = {
      success: true,
      message: sentCount > 0 
        ? `✅ Cron completed: ${sentCount} reminders sent successfully` 
        : `📋 Cron completed: No reminders needed at this time`,
      execution: {
        timestamp: new Date().toISOString(),
        wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
        duration: `${duration}ms`,
        provider: 'FONNTE'
      },
      results: {
        schedulesFound: reminderSchedulesToProcess.length,
        schedulesProcessed: processedCount,
        messagesSent: sentCount,
        errors: errorCount,
        successRate: processedCount > 0 && sentCount >= 0 ? `${Math.round((sentCount / processedCount) * 100)}%` : '0%'
      },
      details: debugLogs.length > 0 ? debugLogs : ['No detailed logs available']
    }

    console.log('✅ Cron job completed:', summary)
    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ Cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
      stats: {
        processed: processedCount,
        sent: sentCount,
        errors: errorCount + 1
      }
    }, { status: 500 })
  }
}
