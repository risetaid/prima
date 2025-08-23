import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessageFonnte, formatFontteNumber } from '@/lib/fonnte'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString } from '@/lib/timezone'

// Hidden backup cron endpoint - Force Fonnte provider
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return await processBackupReminders()
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return await processBackupReminders()
}

async function processBackupReminders() {
  const startTime = Date.now()
  let processedCount = 0
  let sentCount = 0
  let errorCount = 0
  const debugLogs: string[] = []

  try {
    const logMessage = `🔄 [BACKUP FONNTE] Starting backup reminder cron at ${getWIBDateString()} ${getWIBTimeString()}`
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

    console.log(`📋 [BACKUP] Found ${reminderSchedules.length} reminder schedules for today`)

    for (const schedule of reminderSchedules) {
      processedCount++
      
      try {
        // Check if it's time to send this reminder
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)

        console.log(`⏰ [BACKUP] Schedule ${schedule.id}: ${schedule.scheduledTime} - Should send: ${shouldSend}`)

        if (shouldSend) {
          const fontteNumber = formatFontteNumber(schedule.patient.phoneNumber)
          
          console.log(`📱 [BACKUP] Sending via FONNTE to ${schedule.patient.name} (${fontteNumber})`)
          
          // Force send via Fonnte
          const messageBody = schedule.customMessage || `🏥 *Pengingat Minum Obat - PRIMA*\n\nHalo ${schedule.patient.name},\n\n⏰ Saatnya minum obat:\n💊 *${schedule.medicationName}*\n\nJangan lupa minum obat sesuai jadwal ya!\n\n✅ Balas "SUDAH" jika sudah minum obat\n❌ Balas "BELUM" jika belum sempat\n\nSemoga lekas sembuh! 🙏\n\n_Pesan backup dari PRIMA - Sistem Monitoring Pasien_`
          
          const fontteResult = await sendWhatsAppMessageFonnte({
            to: fontteNumber,
            body: messageBody
          })

          const fontteLogMessage = `🔍 [BACKUP] Fonnte result for ${schedule.patient.name}: success=${fontteResult.success}, messageId=${fontteResult.messageId}, error=${fontteResult.error}, phone=${fontteNumber}`
          console.log(fontteLogMessage)
          debugLogs.push(fontteLogMessage)

          // Create reminder log with Fonnte-specific data
          await prisma.reminderLog.create({
            data: {
              reminderScheduleId: schedule.id,
              patientId: schedule.patient.id,
              sentAt: getWIBTime(),
              status: fontteResult.success ? 'DELIVERED' : 'FAILED',
              fontteMessageId: fontteResult.messageId,
              message: messageBody,
              phoneNumber: fontteNumber
            }
          })

          if (fontteResult.success) {
            sentCount++
            console.log(`✅ [BACKUP] Successfully sent reminder to ${schedule.patient.name}`)
          } else {
            errorCount++
            console.log(`❌ [BACKUP] Failed to send reminder to ${schedule.patient.name}: ${fontteResult.error}`)
          }
        }
      } catch (scheduleError) {
        errorCount++
        console.error(`❌ [BACKUP] Error processing schedule ${schedule.id}:`, scheduleError)
      }
    }

    const duration = Date.now() - startTime
    const summary = {
      success: true,
      provider: 'FONNTE_BACKUP',
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

    console.log('✅ [BACKUP] Backup cron job completed:', summary)
    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ [BACKUP] Backup cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      provider: 'FONNTE_BACKUP',
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