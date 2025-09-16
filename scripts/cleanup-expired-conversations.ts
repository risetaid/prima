/**
 * Cleanup Expired Conversations Script
 * This script runs periodically to clean up expired conversation states
 * and associated messages to maintain database performance
 */

import { db } from '@/db'
import { conversationStates, conversationMessages } from '@/db'
import { eq, and, lt, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

class ConversationCleanupService {
  /**
   * Clean up expired conversation states and their messages
   */
  async cleanupExpiredConversations(): Promise<{
    expiredStatesCount: number
    deletedMessagesCount: number
  }> {
    const cutoffDate = new Date()

    try {
      logger.info('Starting cleanup of expired conversations', { cutoffDate })

      // First, get all expired conversation state IDs
      const expiredStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.isActive, false),
            lt(conversationStates.expiresAt, cutoffDate)
          )
        )

      const expiredStateIds = expiredStates.map(state => state.id)

      if (expiredStateIds.length === 0) {
        logger.info('No expired conversations to clean up')
        return { expiredStatesCount: 0, deletedMessagesCount: 0 }
      }

      logger.info(`Found ${expiredStateIds.length} expired conversation states to clean up`)

      // Delete associated messages first (due to foreign key constraint)
      const deletedMessagesResult = await db
        .delete(conversationMessages)
        .where(sql`${conversationMessages.conversationStateId} IN ${expiredStateIds}`)
        .returning()

      // Delete the conversation states
      const deletedStatesResult = await db
        .delete(conversationStates)
        .where(sql`${conversationStates.id} IN ${expiredStateIds}`)
        .returning()

      const result = {
        expiredStatesCount: deletedStatesResult.length,
        deletedMessagesCount: deletedMessagesResult.length
      }

      logger.info('Successfully cleaned up expired conversations', result)

      return result
    } catch (error) {
      logger.error('Failed to cleanup expired conversations', error as Error)
      throw error
    }
  }

  /**
   * Clean up old inactive conversations (older than specified days)
   */
  async cleanupOldInactiveConversations(daysOld: number = 30): Promise<{
    deletedStatesCount: number
    deletedMessagesCount: number
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    try {
      logger.info('Starting cleanup of old inactive conversations', { daysOld, cutoffDate })

      // Get old inactive conversation state IDs
      const oldStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.isActive, false),
            lt(conversationStates.updatedAt, cutoffDate)
          )
        )

      const oldStateIds = oldStates.map(state => state.id)

      if (oldStateIds.length === 0) {
        logger.info('No old inactive conversations to clean up')
        return { deletedStatesCount: 0, deletedMessagesCount: 0 }
      }

      logger.info(`Found ${oldStateIds.length} old inactive conversation states to clean up`)

      // Delete associated messages first
      const deletedMessagesResult = await db
        .delete(conversationMessages)
        .where(sql`${conversationMessages.conversationStateId} IN ${oldStateIds}`)
        .returning()

      // Delete the conversation states
      const deletedStatesResult = await db
        .delete(conversationStates)
        .where(sql`${conversationStates.id} IN ${oldStateIds}`)
        .returning()

      const result = {
        deletedStatesCount: deletedStatesResult.length,
        deletedMessagesCount: deletedMessagesResult.length
      }

      logger.info('Successfully cleaned up old inactive conversations', result)

      return result
    } catch (error) {
      logger.error('Failed to cleanup old inactive conversations', error as Error)
      throw error
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalActiveConversations: number
    totalInactiveConversations: number
    expiredConversations: number
    totalMessages: number
    averageMessagesPerConversation: number
  }> {
    try {
      // Count active conversations
      const activeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationStates)
        .where(eq(conversationStates.isActive, true))

      // Count inactive conversations
      const inactiveCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationStates)
        .where(eq(conversationStates.isActive, false))

      // Count expired conversations
      const expiredCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.isActive, true),
            lt(conversationStates.expiresAt, new Date())
          )
        )

      // Count total messages
      const messagesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)

      // Calculate average messages per conversation
      const totalConversations = (activeCount[0]?.count || 0) + (inactiveCount[0]?.count || 0)
      const averageMessages = totalConversations > 0
        ? (messagesCount[0]?.count || 0) / totalConversations
        : 0

      return {
        totalActiveConversations: activeCount[0]?.count || 0,
        totalInactiveConversations: inactiveCount[0]?.count || 0,
        expiredConversations: expiredCount[0]?.count || 0,
        totalMessages: messagesCount[0]?.count || 0,
        averageMessagesPerConversation: Math.round(averageMessages * 100) / 100
      }
    } catch (error) {
      logger.error('Failed to get cleanup stats', error as Error)
      throw error
    }
  }
}

// Main execution function
async function main() {
  const cleanupService = new ConversationCleanupService()

  try {
    console.log('🚀 Starting conversation cleanup process...')

    // Get stats before cleanup
    console.log('\n📊 Pre-cleanup statistics:')
    const preStats = await cleanupService.getCleanupStats()
    console.table(preStats)

    // Clean up expired conversations
    console.log('\n🧹 Cleaning up expired conversations...')
    const expiredCleanup = await cleanupService.cleanupExpiredConversations()
    console.log(`✅ Cleaned up ${expiredCleanup.expiredStatesCount} expired states and ${expiredCleanup.deletedMessagesCount} messages`)

    // Clean up old inactive conversations (older than 30 days)
    console.log('\n🗂️  Cleaning up old inactive conversations...')
    const oldCleanup = await cleanupService.cleanupOldInactiveConversations(30)
    console.log(`✅ Cleaned up ${oldCleanup.deletedStatesCount} old states and ${oldCleanup.deletedMessagesCount} messages`)

    // Get stats after cleanup
    console.log('\n📊 Post-cleanup statistics:')
    const postStats = await cleanupService.getCleanupStats()
    console.table(postStats)

    console.log('\n🎉 Conversation cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Conversation cleanup failed:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script execution failed:', error)
      process.exit(1)
    })
}

export { ConversationCleanupService }