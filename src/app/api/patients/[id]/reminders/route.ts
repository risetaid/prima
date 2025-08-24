import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { sendUniversalWhatsApp } from '@/lib/fonnte'
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
  console.log('=== POST REMINDER ENDPOINT HIT ===')
  try {
    const user = await getCurrentUser()
    console.log('user:', user?.id)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const requestBody = await request.json()
    console.log('requestBody:', requestBody)
    const { message, interval, time, startDate, totalReminders } = requestBody

    if (!message || !interval || !time || !startDate || !totalReminders) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Create multiple reminder schedules based on totalReminders
    const reminderSchedules = []
    const isDaily = interval.toLowerCase() === 'harian'
    const incrementDays = isDaily ? 1 : 7 // Daily: +1 day, Weekly: +7 days

    for (let i = 0; i < totalReminders; i++) {
      const currentStartDate = new Date(startDate)
      currentStartDate.setDate(currentStartDate.getDate() + (i * incrementDays))

      const reminderSchedule = await prisma.reminderSchedule.create({
        data: {
          patientId: id,
          medicationName: extractMedicationName(message),
          scheduledTime: time,
          frequency: isDaily ? 'DAILY' : 'WEEKLY',
          startDate: currentStartDate,
          endDate: currentStartDate, // Each schedule has its own single date
          isActive: true,
          customMessage: message,
          createdById: user.id
        }
      })

      reminderSchedules.push(reminderSchedule)
    }

    // Debug logging
    console.log('=== REMINDER CREATION DEBUG ===')
    console.log('Created', totalReminders, 'reminder schedules')
    console.log('startDate:', startDate)
    console.log('time:', time)
    console.log('currentWIBDate:', getWIBDateString())
    console.log('currentWIBTime:', getWIBTimeString())
    console.log('=== END DEBUG ===')

    // Check if any of today's reminders should be sent now
    for (const schedule of reminderSchedules) {
      const scheduleDate = schedule.startDate.toISOString().split('T')[0]
      
      if (shouldSendReminderNow(scheduleDate, time)) {
        console.log('Sending immediate reminder for date:', scheduleDate)
        
        // Send via universal sender (respects WHATSAPP_PROVIDER)
        const result = await sendUniversalWhatsApp(patient.phoneNumber, message)
        const provider = process.env.WHATSAPP_PROVIDER || 'fonnte'

        // Log the reminder with appropriate provider field
        const logData: any = {
          reminderScheduleId: schedule.id,
          patientId: id,
          sentAt: getWIBTime(),
          status: result.success ? 'DELIVERED' : 'FAILED',
          message: message,
          phoneNumber: patient.phoneNumber
        }

        // Store message ID based on provider
        if (provider === 'fonnte') {
          logData.fonnteMessageId = result.messageId
        } else {
          logData.twilioMessageId = result.messageId
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
      }))
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