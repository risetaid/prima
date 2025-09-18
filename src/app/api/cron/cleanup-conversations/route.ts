/**
 * Cron Job: Cleanup Expired Conversations
 * DISABLED: This endpoint is disabled because conversation tables were removed in schema cleanup
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('Unauthorized cron job attempt', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('Conversation cleanup requested but DISABLED - tables removed in schema cleanup')

    const result = {
      success: false,
      disabled: true,
      reason: 'Conversation tables were removed during schema cleanup',
      timestamp: new Date().toISOString(),
      message: 'This functionality is no longer available'
    }

    logger.info('Conversation cleanup disabled', result)

    return NextResponse.json(result)

  } catch (error) {
    logger.error('Conversation cleanup failed', error as Error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests for manual cleanup triggers
  return GET(request)
}