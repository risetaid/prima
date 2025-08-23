import { NextRequest, NextResponse } from 'next/server'
import { shouldSendReminderNow, getWIBTimeString, getWIBDateString } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  const currentWIBTime = getWIBTimeString()
  const currentWIBDate = getWIBDateString()
  
  // Test various timing scenarios
  const testScenarios = [
    { scheduledTime: '14:00', description: 'Exactly on time' },
    { scheduledTime: '14:01', description: '1 minute late' },
    { scheduledTime: '14:05', description: '5 minutes late' },
    { scheduledTime: '14:10', description: '10 minutes late' },
    { scheduledTime: '14:11', description: '11 minutes late (should not send)' },
    { scheduledTime: '13:59', description: '1 minute early (should not send)' },
  ]

  // Simulate current time as 14:10 for testing
  const simulatedCurrentTime = '14:10'
  
  const results = testScenarios.map(scenario => {
    // Parse times
    const [currentHour, currentMinute] = simulatedCurrentTime.split(':').map(Number)
    const [scheduledHour, scheduledMinute] = scenario.scheduledTime.split(':').map(Number)
    
    const currentTotalMinutes = currentHour * 60 + currentMinute
    const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
    const timeDifference = currentTotalMinutes - scheduledTotalMinutes
    
    const shouldSend = timeDifference >= 0 && timeDifference <= 10
    
    return {
      ...scenario,
      timeDifference,
      shouldSend,
      status: shouldSend ? '✅ SEND' : '❌ SKIP'
    }
  })

  return NextResponse.json({
    success: true,
    currentWIBTime,
    currentWIBDate,
    simulatedTime: simulatedCurrentTime,
    configuration: {
      windowMinutes: 10,
      cronInterval: '3 minutes (FastCron)',
      provider: 'Fonnte (primary)',
      note: '10-minute window provides buffer for 3-minute cron interval'
    },
    testResults: results,
    summary: {
      totalTests: results.length,
      shouldSend: results.filter(r => r.shouldSend).length,
      shouldSkip: results.filter(r => !r.shouldSend).length
    }
  })
}