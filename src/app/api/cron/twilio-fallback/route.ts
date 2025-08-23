import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/twilio'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString } from '@/lib/timezone'

// Fallback cron endpoint - Force Twilio provider (if Fonnte blocked)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return await processTwilioFallback()
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return await processTwilioFallback()
}

async function processTwilioFallback() {
  const startTime = Date.now()
  let processedCount = 0
  let sentCount = 0
  let errorCount = 0
  const debugLogs: string[] = []

  try {
    const logMessage = `🔄 [TWILIO FALLBACK] Starting Twilio fallback cron at ${getWIBDateString()} ${getWIBTimeString()}`
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

    console.log(`📋 [FALLBACK] Found ${reminderSchedules.length} reminder schedules for today`)

    for (const schedule of reminderSchedules) {
      processedCount++
      
      try {
        // Check if it's time to send this reminder
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)

        console.log(`⏰ [FALLBACK] Schedule ${schedule.id}: ${schedule.scheduledTime} - Should send: ${shouldSend}`)

        if (shouldSend) {
          const whatsappNumber = formatWhatsAppNumber(schedule.patient.phoneNumber)
          
          console.log(`📱 [FALLBACK] Sending via TWILIO to ${schedule.patient.name} (${whatsappNumber})`)
          
          // Force send via Twilio
          const messageBody = schedule.customMessage || `🏥 *Pengingat Minum Obat - PRIMA*\n\nHalo ${schedule.patient.name},\n\n⏰ Saatnya minum obat:\n💊 *${schedule.medicationName}*\n\nJangan lupa minum obat sesuai jadwal ya!\n\n✅ Balas "SUDAH" jika sudah minum obat\n❌ Balas "BELUM" jika belum sempat\n\nSemoga lekas sembuh! 🙏\n\n_Pesan fallback dari PRIMA - Sistem Monitoring Pasien_`
          
          const twilioResult = await sendWhatsAppMessage({
            to: whatsappNumber,
            body: messageBody
          })

          const twilioLogMessage = `🔍 [FALLBACK] Twilio result for ${schedule.patient.name}: success=${twilioResult.success}, messageId=${twilioResult.messageId}, error=${twilioResult.error}, phone=${whatsappNumber}`
          console.log(twilioLogMessage)
          debugLogs.push(twilioLogMessage)

          // Create reminder log with Twilio-specific data
          await prisma.reminderLog.create({
            data: {
              reminderScheduleId: schedule.id,
              patientId: schedule.patient.id,
              sentAt: getWIBTime(),
              status: twilioResult.success ? 'DELIVERED' : 'FAILED',
              twilioMessageId: twilioResult.messageId,
              message: messageBody,
              phoneNumber: whatsappNumber
            }
          })

          if (twilioResult.success) {
            sentCount++
            console.log(`✅ [FALLBACK] Successfully sent reminder to ${schedule.patient.name}`)
          } else {
            errorCount++
            console.log(`❌ [FALLBACK] Failed to send reminder to ${schedule.patient.name}: ${twilioResult.error}`)
          }
        }
      } catch (scheduleError) {
        errorCount++
        console.error(`❌ [FALLBACK] Error processing schedule ${schedule.id}:`, scheduleError)
      }
    }

    const duration = Date.now() - startTime
    const summary = {
      success: true,
      provider: 'TWILIO_FALLBACK',
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

    console.log('✅ [FALLBACK] Twilio fallback cron job completed:', summary)
    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ [FALLBACK] Twilio fallback cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      provider: 'TWILIO_FALLBACK',
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