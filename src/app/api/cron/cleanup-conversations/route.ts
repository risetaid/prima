/**
 * Cron Job: Cleanup Expired Conversations
 * This endpoint is called by a cron job to clean up expired conversation states
 * and associated messages to maintain database performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConversationCleanupService } from '../../../../../scripts/cleanup-expired-conversations'
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

    logger.info('Starting scheduled conversation cleanup')

    const cleanupService = new ConversationCleanupService()

    // Get stats before cleanup
    const preStats = await cleanupService.getCleanupStats()

    // Clean up expired conversations
    const expiredCleanup = await cleanupService.cleanupExpiredConversations()

    // Clean up old inactive conversations (older than 30 days)
    const oldCleanup = await cleanupService.cleanupOldInactiveConversations(30)

    // Get stats after cleanup
    const postStats = await cleanupService.getCleanupStats()

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      preCleanup: preStats,
      cleanupResults: {
        expiredConversations: expiredCleanup,
        oldInactiveConversations: oldCleanup
      },
      postCleanup: postStats,
      totalCleaned: {
        states: expiredCleanup.expiredStatesCount + oldCleanup.deletedStatesCount,
        messages: expiredCleanup.deletedMessagesCount + oldCleanup.deletedMessagesCount
      }
    }

    logger.info('Conversation cleanup completed', result)

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