import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString, getWIBTodayStart } from '@/lib/timezone'
import { whatsappRateLimiter } from '@/lib/rate-limiter'
import { createDateRangeQuery } from '@/lib/query-optimizer'

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
    const totalCount = await prisma.reminderSchedule.count({
      where: {
        isActive: true,
        startDate: createDateRangeQuery(todayWIB, '+07:00'),
        reminderLogs: {
          none: {
            AND: [
              { status: 'DELIVERED' },
              { 
                sentAt: {
                  gte: getWIBTodayStart()
                }
              }
            ]
          }
        }
      }
    })

    console.log(`📊 Found ${totalCount} reminder schedules to potentially process`)

    let reminderSchedules: any[] = []
    if (totalCount > batchSize) {
      // Process in batches to prevent memory overload
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const batch = await prisma.reminderSchedule.findMany({
          where: {
            isActive: true,
            startDate: createDateRangeQuery(todayWIB, '+07:00'),
            reminderLogs: {
              none: {
                AND: [
                  { status: 'DELIVERED' },
                  { 
                    sentAt: {
                      gte: getWIBTodayStart()
                    }
                  }
                ]
              }
            }
          },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phoneNumber: true
              }
            }
          },
          skip,
          take: batchSize,
          orderBy: { scheduledTime: 'asc' } // Process by time order
        })
        reminderSchedules.push(...batch)
        
        // Small delay between batches to prevent database overload
        if (skip + batchSize < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    } else {
      // Small dataset, process all at once
      reminderSchedules = await prisma.reminderSchedule.findMany({
        where: {
          isActive: true,
          startDate: createDateRangeQuery(todayWIB, '+07:00'),
          reminderLogs: {
            none: {
              AND: [
                { status: 'DELIVERED' },
                { 
                  sentAt: {
                    gte: getWIBTodayStart()
                  }
                }
              ]
            }
          }
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          }
        },
        orderBy: { scheduledTime: 'asc' }
      })
    }

    console.log(`📋 Found ${reminderSchedules.length} reminder schedules for today`)

    for (const schedule of reminderSchedules) {
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
              const createdLog = await prisma.reminderLog.create({ data: logData })
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
        schedulesFound: reminderSchedules.length,
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
