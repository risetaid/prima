import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { shouldSendReminderNow, getWIBTime, getWIBTimeString, getWIBDateString } from '@/lib/timezone'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Get reminders for patient
    const reminders = await prisma.reminderSchedule.findMany({
      where: {
        patientId: id
      },
      include: {
        patient: {
          select: {
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const requestBody = await request.json()
    const { message, time, selectedDates, customRecurrence } = requestBody

    if (!message || !time) {
      return NextResponse.json({ error: 'Missing required fields: message and time' }, { status: 400 })
    }

    // Validate input based on recurrence type
    if (customRecurrence) {
      if (!customRecurrence.frequency || !customRecurrence.interval) {
        return NextResponse.json({ error: 'Invalid custom recurrence configuration' }, { status: 400 })
      }
    } else {
      if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
        return NextResponse.json({ error: 'Missing required field: selectedDates' }, { status: 400 })
      }
    }

    // Verify patient exists and get phone number
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phoneNumber: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // User is already available from getCurrentUser()

    // Generate dates based on recurrence type
    let datesToSchedule: string[] = []
    
    if (customRecurrence) {
      datesToSchedule = generateRecurrenceDates(customRecurrence)
    } else {
      datesToSchedule = selectedDates
    }

    // Create reminder schedules for each date
    const reminderSchedules = []

    for (const dateString of datesToSchedule) {
      const reminderDate = new Date(dateString)
      
      const reminderSchedule = await prisma.reminderSchedule.create({
        data: {
          patientId: id,
          medicationName: extractMedicationName(message),
          scheduledTime: time,
          frequency: customRecurrence ? 'CUSTOM_RECURRENCE' : 'CUSTOM',
          startDate: reminderDate,
          endDate: reminderDate, // Each schedule has its own single date
          isActive: true,
          customMessage: message,
          createdById: user.id
        }
      })

      reminderSchedules.push(reminderSchedule)
    }

    // Debug logging
    console.log('=== REMINDER CREATION DEBUG ===')
    console.log('Created', datesToSchedule.length, 'reminder schedules')
    console.log('datesToSchedule:', datesToSchedule)
    console.log('customRecurrence:', customRecurrence)
    console.log('time:', time)
    console.log('currentWIBDate:', getWIBDateString())
    console.log('currentWIBTime:', getWIBTimeString())
    console.log('=== END DEBUG ===')

    // Check if any of today's reminders should be sent now
    for (const schedule of reminderSchedules) {
      const scheduleDate = schedule.startDate.toISOString().split('T')[0]
      
      if (shouldSendReminderNow(scheduleDate, time)) {
        console.log('Sending immediate reminder for date:', scheduleDate)
        
        // Send via Fonnte
        const result = await sendWhatsAppMessage({
          to: formatWhatsAppNumber(patient.phoneNumber),
          body: message
        })

        // Log the reminder
        const logData = {
          reminderScheduleId: schedule.id,
          patientId: id,
          sentAt: getWIBTime(),
          status: result.success ? 'DELIVERED' : 'FAILED',
          message: message,
          phoneNumber: patient.phoneNumber,
          fonnteMessageId: result.messageId
        }

        await prisma.reminderLog.create({ data: logData })
        
        break // Only send one immediate reminder
      }
    }

    return NextResponse.json({ 
      message: 'Reminders created successfully',
      count: reminderSchedules.length,
      schedules: reminderSchedules.map(s => ({
        id: s.id,
        startDate: s.startDate,
        scheduledTime: s.scheduledTime
      })),
      recurrenceType: customRecurrence ? 'custom' : 'manual'
    })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractMedicationName(message: string): string {
  // Simple extraction - look for common medication keywords
  const words = message.toLowerCase().split(' ')
  const medicationKeywords = ['obat', 'candesartan', 'paracetamol', 'amoxicillin', 'metformin']
  
  for (const word of words) {
    if (medicationKeywords.some(keyword => word.includes(keyword))) {
      return word
    }
  }
  
  return 'Obat'
}

function calculateEndDate(startDate: string, interval: string, totalReminders: number): Date {
  const start = new Date(startDate)
  const daysToAdd = interval.toLowerCase() === 'harian' 
    ? totalReminders - 1  // Daily: add days
    : (totalReminders - 1) * 7  // Weekly: add weeks
  
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + daysToAdd)
  
  return endDate
}

function generateRecurrenceDates(customRecurrence: any): string[] {
  const dates: string[] = []
  const today = new Date()
  const startDate = new Date(today)
  
  // Calculate end date based on end type
  let endDate: Date
  if (customRecurrence.endType === 'never') {
    // Generate for next 365 days (1 year)
    endDate = new Date(today)
    endDate.setFullYear(endDate.getFullYear() + 1)
  } else if (customRecurrence.endType === 'on' && customRecurrence.endDate) {
    endDate = new Date(customRecurrence.endDate)
  } else if (customRecurrence.endType === 'after' && customRecurrence.occurrences) {
    // We'll calculate this dynamically
    endDate = new Date(today)
    endDate.setFullYear(endDate.getFullYear() + 1) // Temporary end date
  } else {
    // Default to 30 days
    endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30)
  }
  
  let currentDate = new Date(startDate)
  let occurrenceCount = 0
  const maxOccurrences = customRecurrence.endType === 'after' ? customRecurrence.occurrences : 1000
  
  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    let shouldInclude = false
    
    if (customRecurrence.frequency === 'day') {
      shouldInclude = true
    } else if (customRecurrence.frequency === 'week') {
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const currentDayName = dayNames[dayOfWeek]
      shouldInclude = customRecurrence.daysOfWeek.includes(currentDayName)
    } else if (customRecurrence.frequency === 'month') {
      // For monthly, include if it's the same day of month as start date
      shouldInclude = currentDate.getDate() === startDate.getDate()
    }
    
    if (shouldInclude) {
      dates.push(currentDate.toISOString().split('T')[0])
      occurrenceCount++
    }
    
    // Move to next date based on frequency and interval
    if (customRecurrence.frequency === 'day') {
      currentDate.setDate(currentDate.getDate() + customRecurrence.interval)
    } else if (customRecurrence.frequency === 'week') {
      currentDate.setDate(currentDate.getDate() + 1) // Check every day for weekly
    } else if (customRecurrence.frequency === 'month') {
      currentDate.setMonth(currentDate.getMonth() + customRecurrence.interval)
    }
  }
  
  return dates
}