import { NextRequest, NextResponse } from 'next/server'
import { verificationAnalytics } from '@/lib/verification-analytics'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timeSeries = searchParams.get('timeSeries') === 'true'

    logger.info('Admin verification analytics request', { 
      startDate, 
      endDate, 
      timeSeries 
    })

    let start: Date
    let end: Date

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
    } else {
      // Default to last 30 days
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - 30)
    }

    if (timeSeries) {
      const timeSeriesData = await verificationAnalytics.getTimeSeriesData(start, end)
      return NextResponse.json({
        timeSeries: timeSeriesData,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      })
    } else {
      const analytics = await verificationAnalytics.getAnalytics(start, end)
      return NextResponse.json(analytics)
    }
  } catch (error) {
    logger.error('Failed to fetch verification analytics', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}