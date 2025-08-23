import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWIBTime } from '@/lib/timezone'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  try {
    // Get the most recent reminder schedule
    const schedule = await prisma.reminderSchedule.findFirst({
      where: {
        isActive: true
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'No reminder schedule found' }, { status: 404 })
    }

    // Try to create a test log
    const testLogData = {
      reminderScheduleId: schedule.id,
      patientId: schedule.patient.id,
      sentAt: getWIBTime(),
      status: 'DELIVERED' as const,
      fonnteMessageId: 'test-' + Date.now(),
      message: 'Test message',
      phoneNumber: schedule.patient.phoneNumber
    }

    console.log('🧪 Testing log creation with data:', testLogData)

    const createdLog = await prisma.reminderLog.create({ 
      data: testLogData 
    })

    return NextResponse.json({
      success: true,
      message: 'Test log created successfully',
      createdLog: {
        id: createdLog.id,
        status: createdLog.status,
        sentAt: createdLog.sentAt.toISOString(),
        fonnteMessageId: createdLog.fonnteMessageId
      },
      testData: testLogData
    })

  } catch (error) {
    console.error('❌ Test log creation failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error,
      message: 'Failed to create test log'
    }, { status: 500 })
  }
}