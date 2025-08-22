import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shouldSendReminderNow, getWIBTime, getWIBDateString, getWIBTimeString } from '@/lib/timezone'

export async function GET() {
  try {
    const nowWIB = getWIBTime()
    const todayWIB = getWIBDateString()
    const currentTimeWIB = getWIBTimeString()

    // Get all active reminder schedules for today
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
    return NextResponse.json({ error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}