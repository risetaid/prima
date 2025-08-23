import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWIBTodayStart } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 })
  }

  try {
    // Get all reminder logs from today
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

    // Group by reminderScheduleId to see duplicates
    const logsBySchedule = todayLogs.reduce((acc, log) => {
      const scheduleId = log.reminderScheduleId || 'no-schedule'
      if (!acc[scheduleId]) {
        acc[scheduleId] = []
      }
      acc[scheduleId].push(log)
      return acc
    }, {} as Record<string, typeof todayLogs>)

    // Get all reminder schedules from today
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
            twilioMessageId: log.twilioMessageId
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