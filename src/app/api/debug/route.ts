import { NextRequest, NextResponse } from 'next/server'
import { db, reminderSchedules, reminderLogs, patients } from '@/db'
import { eq, and, gte, lt, desc, inArray } from 'drizzle-orm'
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

    // Get active reminder schedules for today
    const schedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        isActive: reminderSchedules.isActive
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.isActive, true),
          gte(reminderSchedules.startDate, new Date(todayWIB + 'T00:00:00.000Z')),
          lt(reminderSchedules.startDate, new Date(todayWIB + 'T23:59:59.999Z'))
        )
      )

    // Get patient details for schedules
    const patientIds = [...new Set(schedules.map(s => s.patientId))]
    const patientDetails = patientIds.length > 0 ? await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(inArray(patients.id, patientIds)) : []

    // Get delivered logs for today
    const scheduleIds = schedules.map(s => s.id)
    const deliveredLogs = scheduleIds.length > 0 ? await db
      .select({
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status
      })
      .from(reminderLogs)
      .where(
        and(
          inArray(reminderLogs.reminderScheduleId, scheduleIds),
          eq(reminderLogs.status, 'DELIVERED')
        )
      ) : []

    // Create patient and delivered logs lookup maps
    const patientMap = new Map()
    patientDetails.forEach(patient => {
      patientMap.set(patient.id, patient)
    })

    const deliveredSet = new Set(deliveredLogs.map(log => log.reminderScheduleId))

    // Filter schedules that haven't been delivered
    const undeliveredSchedules = schedules.filter(schedule => 
      !deliveredSet.has(schedule.id)
    )

    const debugInfo = {
      currentWIBTime: `${todayWIB} ${currentTimeWIB}`,
      todayWIBDate: todayWIB,
      totalSchedulesFound: undeliveredSchedules.length,
      schedules: undeliveredSchedules.map(schedule => {
        const scheduleDate = schedule.startDate.toISOString().split('T')[0]
        const shouldSend = shouldSendReminderNow(scheduleDate, schedule.scheduledTime)
        const patient = patientMap.get(schedule.patientId)
        
        return {
          id: schedule.id,
          patientName: patient?.name || 'Unknown',
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
    const todayStart = getWIBTodayStart()
    
    // Get today's logs
    const todayLogsData = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        patientId: reminderLogs.patientId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
        fonnteMessageId: reminderLogs.fonnteMessageId
      })
      .from(reminderLogs)
      .where(gte(reminderLogs.sentAt, todayStart))
      .orderBy(desc(reminderLogs.sentAt))

    // Get reminder schedule and patient details
    const scheduleIds = [...new Set(todayLogsData.map(log => log.reminderScheduleId).filter((id): id is string => id !== null))]
    const patientIds = [...new Set(todayLogsData.map(log => log.patientId))]

    const scheduleDetails = scheduleIds.length > 0 ? await db
      .select({
        id: reminderSchedules.id,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        isActive: reminderSchedules.isActive
      })
      .from(reminderSchedules)
      .where(inArray(reminderSchedules.id, scheduleIds)) : []

    const patientDetails = patientIds.length > 0 ? await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(inArray(patients.id, patientIds)) : []

    // Create lookup maps
    const scheduleMap = new Map()
    scheduleDetails.forEach(schedule => {
      scheduleMap.set(schedule.id, schedule)
    })

    const patientMap = new Map()
    patientDetails.forEach(patient => {
      patientMap.set(patient.id, patient)
    })

    // Group logs by schedule
    const logsBySchedule = todayLogsData.reduce((acc, log) => {
      const scheduleId = log.reminderScheduleId || 'no-schedule'
      if (!acc[scheduleId]) {
        acc[scheduleId] = []
      }
      acc[scheduleId].push({
        ...log,
        reminderSchedule: scheduleMap.get(log.reminderScheduleId),
        patient: patientMap.get(log.patientId)
      })
      return acc
    }, {} as Record<string, any[]>)

    // Get today's schedules
    const todayEndTime = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const todaySchedulesData = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime,
        isActive: reminderSchedules.isActive,
        startDate: reminderSchedules.startDate
      })
      .from(reminderSchedules)
      .where(
        and(
          gte(reminderSchedules.startDate, todayStart),
          lt(reminderSchedules.startDate, todayEndTime)
        )
      )

    // Get logs count for each schedule
    const scheduleLogCounts = new Map()
    const scheduleDeliveredStatus = new Map()
    
    todayLogsData.forEach(log => {
      const scheduleId = log.reminderScheduleId
      if (scheduleId) {
        const currentCount = scheduleLogCounts.get(scheduleId) || 0
        scheduleLogCounts.set(scheduleId, currentCount + 1)
        
        if (log.status === 'DELIVERED') {
          scheduleDeliveredStatus.set(scheduleId, true)
        }
      }
    })

    return NextResponse.json({
      success: true,
      debug: {
        totalLogsToday: todayLogsData.length,
        totalSchedulesToday: todaySchedulesData.length,
        logsBySchedule: Object.entries(logsBySchedule).map(([scheduleId, logs]) => ({
          scheduleId,
          logCount: logs.length,
          patientName: logs[0]?.patient?.name,
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
        schedulesWithLogs: todaySchedulesData.map(schedule => {
          const patient = patientMap.get(schedule.patientId)
          const logCount = scheduleLogCounts.get(schedule.id) || 0
          const shouldBeFiltered = scheduleDeliveredStatus.get(schedule.id) || false
          
          return {
            scheduleId: schedule.id,
            patientName: patient?.name || 'Unknown',
            medicationName: schedule.medicationName,
            scheduledTime: schedule.scheduledTime,
            isActive: schedule.isActive,
            logCount,
            shouldBeFiltered
          }
        })
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