import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/twilio'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString } from '@/lib/timezone'

// GET endpoint for Vercel Cron Functions
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron with secret
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return await processReminders()
}

// POST endpoint for manual trigger during development/testing
export async function POST(request: NextRequest) {
  // For development/testing - no auth required in dev mode
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    const reminderSchedules = await prisma.reminderSchedule.findMany({
      where: {
        isActive: true,
        startDate: {
          gte: new Date(todayWIB + 'T00:00:00.000Z'),
          lt: new Date(todayWIB + 'T23:59:59.999Z')
        },
        // Only get schedules that don't have DELIVERED logs yet
        reminderLogs: {
          none: {
            status: 'DELIVERED'
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
      }
    })

    console.log(`📋 Found ${reminderSchedules.length} reminder schedules for today`)

    for (const schedule of reminderSchedules) {
      processedCount++
      
      try {
        // Check if it's time to send this reminder
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)

        console.log(`⏰ Schedule ${schedule.id}: ${schedule.scheduledTime} - Should send: ${shouldSend}`)

        if (shouldSend) {
          const whatsappNumber = formatWhatsAppNumber(schedule.patient.phoneNumber)
          
          console.log(`📱 Sending reminder to ${schedule.patient.name} (${whatsappNumber})`)
          
          // Send WhatsApp message
          const twilioResult = await sendWhatsAppMessage({
            to: whatsappNumber,
            body: schedule.customMessage || `Halo ${schedule.patient.name}, jangan lupa minum obat ${schedule.medicationName} pada waktu yang tepat. Kesehatan Anda adalah prioritas kami.`
          })

          const twilioLogMessage = `🔍 Twilio result for ${schedule.patient.name}: success=${twilioResult.success}, messageId=${twilioResult.messageId}, error=${twilioResult.error}, phone=${whatsappNumber}`
          console.log(twilioLogMessage)
          debugLogs.push(twilioLogMessage)

          // Create reminder log
          await prisma.reminderLog.create({
            data: {
              reminderScheduleId: schedule.id,
              patientId: schedule.patient.id,
              sentAt: getWIBTime(),
              status: twilioResult.success ? 'DELIVERED' : 'FAILED',
              twilioMessageId: twilioResult.messageId,
              message: schedule.customMessage || `Reminder untuk ${schedule.medicationName}`,
              phoneNumber: whatsappNumber
            }
          })

          if (twilioResult.success) {
            sentCount++
            console.log(`✅ Successfully sent reminder to ${schedule.patient.name}`)
          } else {
            errorCount++
            console.log(`❌ Failed to send reminder to ${schedule.patient.name}: ${twilioResult.error}`)
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
      timestamp: new Date().toISOString(),
      wibTime: `${getWIBDateString()} ${getWIBTimeString()}`,
      duration: `${duration}ms`,
      stats: {
        processed: processedCount,
        sent: sentCount,
        errors: errorCount,
        total_schedules: reminderSchedules.length
      },
      debugLogs: debugLogs
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