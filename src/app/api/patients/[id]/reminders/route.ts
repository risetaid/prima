import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, reminderSchedules, reminderLogs } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'
import { shouldSendReminderNow, getWIBTime, getWIBTimeString, getWIBDateString } from '@/lib/timezone'
import { whatsappRateLimiter } from '@/lib/rate-limiter'

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
    
    // Get reminders for patient with patient info
    const reminders = await db
      .select({
        // Reminder fields
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        dosage: reminderSchedules.dosage,
        doctorName: reminderSchedules.doctorName,
        scheduledTime: reminderSchedules.scheduledTime,
        frequency: reminderSchedules.frequency,
        startDate: reminderSchedules.startDate,
        endDate: reminderSchedules.endDate,
        customMessage: reminderSchedules.customMessage,
        isActive: reminderSchedules.isActive,
        createdById: reminderSchedules.createdById,
        createdAt: reminderSchedules.createdAt,
        updatedAt: reminderSchedules.updatedAt,
        // Patient fields
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber
      })
      .from(reminderSchedules)
      .leftJoin(patients, eq(reminderSchedules.patientId, patients.id))
      .where(eq(reminderSchedules.patientId, id))
      .orderBy(desc(reminderSchedules.createdAt))

    // Format response to match Prisma structure
    const formattedReminders = reminders.map(reminder => ({
      id: reminder.id,
      patientId: reminder.patientId,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      doctorName: reminder.doctorName,
      scheduledTime: reminder.scheduledTime,
      frequency: reminder.frequency,
      startDate: reminder.startDate,
      endDate: reminder.endDate,
      customMessage: reminder.customMessage,
      isActive: reminder.isActive,
      createdById: reminder.createdById,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
      patient: {
        name: reminder.patientName,
        phoneNumber: reminder.patientPhoneNumber
      }
    }))

    return NextResponse.json(formattedReminders)
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
      
      // Prevent infinite loop - interval must be positive
      if (customRecurrence.interval <= 0) {
        return NextResponse.json({ error: 'Recurrence interval must be greater than 0' }, { status: 400 })
      }
      
      // Prevent excessive occurrences
      if (customRecurrence.occurrences && customRecurrence.occurrences > 1000) {
        return NextResponse.json({ error: 'Maximum 1000 occurrences allowed' }, { status: 400 })
      }
    } else {
      if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
        return NextResponse.json({ error: 'Missing required field: selectedDates' }, { status: 400 })
      }
    }

    // Verify patient exists and get phone number
    const patientResult = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1)

    if (patientResult.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = patientResult[0]

    // User is already available from getCurrentUser()

    // Generate dates based on recurrence type
    let datesToSchedule: string[] = []
    
    if (customRecurrence) {
      datesToSchedule = generateRecurrenceDates(customRecurrence)
    } else {
      datesToSchedule = selectedDates
    }

    // Create reminder schedules for each date
    const createdSchedules = []

    for (const dateString of datesToSchedule) {
      const reminderDate = new Date(dateString)
      
      // Validate date is not invalid
      if (isNaN(reminderDate.getTime())) {
        console.error('Invalid date in datesToSchedule:', dateString)
        continue // Skip invalid dates
      }
      
      const reminderScheduleResult = await db
        .insert(reminderSchedules)
        .values({
          patientId: id,
          medicationName: extractMedicationName(message),
          scheduledTime: time,
          frequency: customRecurrence ? 'CUSTOM_RECURRENCE' : 'CUSTOM',
          startDate: reminderDate,
          endDate: reminderDate, // Each schedule has its own single date
          isActive: true,
          customMessage: message,
          createdById: user.id
        })
        .returning()

      const reminderSchedule = reminderScheduleResult[0]

      createdSchedules.push(reminderSchedule)
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
    for (const schedule of createdSchedules) {
      const scheduleDate = schedule.startDate.toISOString().split('T')[0]
      
      if (shouldSendReminderNow(scheduleDate, time)) {
        console.log('Sending immediate reminder for date:', scheduleDate)
        
        // Check rate limit before sending immediate reminder
        const rateLimitKey = `user_${user.id}` // Per-user rate limiting
        if (!whatsappRateLimiter.isAllowed(rateLimitKey)) {
          console.warn(`🚫 Rate limit exceeded for user ${user.id}. Skipping immediate send.`)
          // Don't break, just skip immediate send but still create the schedule
        } else {
          // Send via Fonnte
          const result = await sendWhatsAppMessage({
            to: formatWhatsAppNumber(patient.phoneNumber),
            body: message
          })

          // Log the reminder
          const status: 'DELIVERED' | 'FAILED' = result.success ? 'DELIVERED' : 'FAILED'
          const logData = {
            reminderScheduleId: schedule.id,
            patientId: id,
            sentAt: getWIBTime(),
            status: status,
            message: message,
            phoneNumber: patient.phoneNumber,
            fonnteMessageId: result.messageId
          }

          await db.insert(reminderLogs).values(logData)
        }
        
        break // Only send one immediate reminder
      }
    }

    return NextResponse.json({ 
      message: 'Reminders created successfully',
      count: createdSchedules.length,
      schedules: createdSchedules.map(s => ({
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
  if (!message || typeof message !== 'string') {
    return 'Obat' // Safe default
  }

  // Clean and normalize the message
  const cleanMessage = message.trim().toLowerCase()
  if (cleanMessage.length === 0) {
    return 'Obat'
  }
  
  // Enhanced extraction - look for common medication patterns
  const words = cleanMessage.split(/\s+/)
  const medicationKeywords = [
    'obat', 'tablet', 'kapsul', 'sirup',
    // Common Indonesian medications
    'candesartan', 'paracetamol', 'amoxicillin', 'metformin', 
    'amlodipine', 'aspirin', 'atorvastatin', 'captopril',
    'dexamethasone', 'furosemide', 'insulin', 'omeprazole'
  ]
  
  // Look for medication keywords
  for (const word of words) {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[^\w]/g, '')
    if (cleanWord.length < 3) continue // Skip very short words
    
    if (medicationKeywords.some(keyword => cleanWord.includes(keyword))) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1) // Capitalize
    }
  }
  
  // Fallback: look for words after "obat" or "minum"
  const obatIndex = words.findIndex(word => word.includes('obat') || word.includes('minum'))
  if (obatIndex !== -1 && obatIndex + 1 < words.length) {
    const nextWord = words[obatIndex + 1].replace(/[^\w]/g, '')
    if (nextWord.length >= 3) {
      return nextWord.charAt(0).toUpperCase() + nextWord.slice(1)
    }
  }
  
  return 'Obat' // Safe default
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
  // Safe type coercion to prevent string/invalid numbers
  const maxOccurrences = customRecurrence.endType === 'after' 
    ? Math.max(1, parseInt(customRecurrence.occurrences) || 1)  // Ensure positive integer
    : 1000
  
  // Add safety counter to prevent infinite loops and memory issues
  let loopCounter = 0
  const maxLoops = 10000 // Safety limit
  
  while (currentDate <= endDate && occurrenceCount < maxOccurrences && loopCounter < maxLoops) {
    loopCounter++
    let shouldInclude = false
    
    if (customRecurrence.frequency === 'day') {
      shouldInclude = true
    } else if (customRecurrence.frequency === 'week') {
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const currentDayName = dayNames[dayOfWeek]
      
      // Safe array access with bounds check
      if (customRecurrence.daysOfWeek && Array.isArray(customRecurrence.daysOfWeek)) {
        shouldInclude = customRecurrence.daysOfWeek.includes(currentDayName)
      } else {
        // Default to current day if daysOfWeek is invalid
        shouldInclude = true
      }
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