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

    logger.info('Starting conversation cleanup process')

    try {
      // Import dependencies
      const { db, conversationStates, conversationMessages } = await import('@/db')
      const { and, lt, eq, isNull, count } = await import('drizzle-orm')
      
       // Cleanup parameters
       const INACTIVE_CUTOFF = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      
      let expiredStatesCount = 0
      let deletedMessagesCount = 0
      let inactiveStatesCount = 0
      
      // Step 1: Clean up expired conversation states (past expiresAt)
      logger.info('Cleaning up expired conversation states')
      const expiredStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(
          and(
            lt(conversationStates.expiresAt, new Date()),
            isNull(conversationStates.deletedAt)
          )
        )
      
       for (const state of expiredStates) {
         // Delete messages first (hard delete since no deletedAt column)
         const messagesResult = await db
           .delete(conversationMessages)
           .where(eq(conversationMessages.conversationStateId, state.id))
           .returning({ id: conversationMessages.id })

         deletedMessagesCount += messagesResult.length
        
        // Soft delete conversation state
        await db
          .update(conversationStates)
          .set({ 
            deletedAt: new Date(),
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(conversationStates.id, state.id))
        
        expiredStatesCount++
      }
      
      // Step 2: Clean up old inactive conversations (30+ days old, no recent activity)
      logger.info('Cleaning up old inactive conversations')
      const inactiveStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(
          and(
            lt(conversationStates.updatedAt, INACTIVE_CUTOFF),
            eq(conversationStates.isActive, false),
            isNull(conversationStates.deletedAt)
          )
        )
        .limit(100) // Process max 100 at a time
      
       for (const state of inactiveStates) {
         // Delete messages first (hard delete since no deletedAt column)
         const messagesResult = await db
           .delete(conversationMessages)
           .where(eq(conversationMessages.conversationStateId, state.id))
           .returning({ id: conversationMessages.id })

         deletedMessagesCount += messagesResult.length
        
        // Soft delete conversation state
        await db
          .update(conversationStates)
          .set({ 
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(conversationStates.id, state.id))
        
        inactiveStatesCount++
      }
      
       // Get summary stats
       const [activeCount, totalMessages] = await Promise.all([
         db.select({ count: count() })
           .from(conversationStates)
           .where(isNull(conversationStates.deletedAt)),
         db.select({ count: count() })
           .from(conversationMessages)
       ])
      
      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        cleanup: {
          expiredStatesDeleted: expiredStatesCount,
          inactiveStatesDeleted: inactiveStatesCount,
          messagesDeleted: deletedMessagesCount,
          totalStatesDeleted: expiredStatesCount + inactiveStatesCount
        },
        remaining: {
          activeConversationStates: activeCount[0]?.count || 0,
          totalMessages: totalMessages[0]?.count || 0
        },
        message: `Cleaned up ${expiredStatesCount + inactiveStatesCount} conversation states and ${deletedMessagesCount} messages`
      }
      
      logger.info('Conversation cleanup completed successfully', { value: result })
      return NextResponse.json(result)
      
    } catch (error) {
      logger.error('Conversation cleanup failed', error as Error)
      return NextResponse.json({
        success: false,
        error: 'Cleanup process failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

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