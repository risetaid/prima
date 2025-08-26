import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString, getWIBTodayStart } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const debugType = searchParams.get('type') || 'cron'

  if (debugType === 'cron') {
    return await debugCron()
  } else if (debugType === 'logs') {
    return await debugReminderLogs()
  }

  return NextResponse.json({ 
    error: 'Invalid debug type. Use ?type=cron or ?type=logs' 
  }, { status: 400 })
}

async function debugCron() {
  try {
    const nowWIB = getWIBTime()
    const todayWIB = getWIBDateString()
    const currentTimeWIB = getWIBTimeString()

    const reminderSchedules = await prisma.reminderSchedule.findMany({
      where: {
        isActive: true,
        startDate: {
          gte: new Date(todayWIB + 'T00:00:00.000Z'),
          lt: new Date(todayWIB + 'T23:59:59.999Z')
        },
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

    const debugInfo = {
      currentWIBTime: `${todayWIB} ${currentTimeWIB}`,
      todayWIBDate: todayWIB,
      totalSchedulesFound: reminderSchedules.length,
      schedules: reminderSchedules.map(schedule => {
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)
        
        return {
          id: schedule.id,
          patientName: schedule.patient.name,
          medicationName: schedule.medicationName,
          scheduledTime: schedule.scheduledTime,
          startDate: scheduleDate,
          shouldSendNow: shouldSend,
          timeComparison: {
            currentTime: currentTimeWIB,
            scheduledTime: schedule.scheduledTime,
            dateBased: scheduleDate === todayWIB ? 'SAME_DATE' : 'DIFFERENT_DATE'
          }
        }
      })
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Debug cron error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function debugReminderLogs() {
  try {
    const todayLogs = await prisma.reminderLog.findMany({
      where: {
        sentAt: {
          gte: getWIBTodayStart()
        }
      },
      include: {
        reminderSchedule: {
          select: {
            id: true,
            medicationName: true,
            scheduledTime: true,
            isActive: true
          }
        },
        patient: {
          select: {
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    })

    const logsBySchedule = todayLogs.reduce((acc, log) => {
      const scheduleId = log.reminderScheduleId || 'no-schedule'
      if (!acc[scheduleId]) {
        acc[scheduleId] = []
      }
      acc[scheduleId].push(log)
      return acc
    }, {} as Record<string, typeof todayLogs>)

    const todaySchedules = await prisma.reminderSchedule.findMany({
      where: {
        startDate: {
          gte: getWIBTodayStart(),
          lt: new Date(new Date(getWIBTodayStart()).getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        reminderLogs: {
          where: {
            sentAt: {
              gte: getWIBTodayStart()
            }
          }
        },
        patient: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      debug: {
        totalLogsToday: todayLogs.length,
        totalSchedulesToday: todaySchedules.length,
        logsBySchedule: Object.entries(logsBySchedule).map(([scheduleId, logs]) => ({
          scheduleId,
          logCount: logs.length,
          patientName: logs[0]?.patient.name,
          medicationName: logs[0]?.reminderSchedule?.medicationName,
          duplicates: logs.length > 1,
          logDetails: logs.map(log => ({
            id: log.id,
            status: log.status,
            sentAt: log.sentAt.toISOString(),
            fonnteMessageId: log.fonnteMessageId,
            provider: 'FONNTE'
          }))
        })),
        schedulesWithLogs: todaySchedules.map(schedule => ({
          scheduleId: schedule.id,
          patientName: schedule.patient.name,
          medicationName: schedule.medicationName,
          scheduledTime: schedule.scheduledTime,
          isActive: schedule.isActive,
          logCount: schedule.reminderLogs.length,
          shouldBeFiltered: schedule.reminderLogs.some(log => log.status === 'DELIVERED')
        }))
      }
    })

  } catch (error) {
    console.error('Debug reminder logs error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}