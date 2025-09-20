/**
 * Cleanup Expired Conversations Script
 * DISABLED: Conversation tables removed in schema cleanup
 * This script is no longer functional due to schema simplification
 */

import { logger } from "@/lib/logger";

class ConversationCleanupService {
  /**
   * Clean up expired conversation states and their messages
   * DISABLED: Returns empty results since conversation tables were removed
   */
  async cleanupExpiredConversations(): Promise<{
    expiredStatesCount: number;
    deletedMessagesCount: number;
  }> {
    logger.info(
      "Conversation cleanup disabled - tables removed in schema cleanup"
    );

    return {
      expiredStatesCount: 0,
      deletedMessagesCount: 0,
    };
  }

  /**
   * Clean up old inactive conversations (older than specified days)
   * DISABLED: Returns empty results since conversation tables were removed
   */
  async cleanupOldInactiveConversations(daysOld: number = 30): Promise<{
    deletedStatesCount: number;
    deletedMessagesCount: number;
  }> {
    logger.info(
      "Old conversation cleanup disabled - tables removed in schema cleanup",
      { daysOld }
    );

    return {
      deletedStatesCount: 0,
      deletedMessagesCount: 0,
    };
  }

  /**
   * Get cleanup statistics
   * DISABLED: Returns empty stats since conversation tables were removed
   */
  async getCleanupStats(): Promise<{
    totalActiveConversations: number;
    totalInactiveConversations: number;
    expiredConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
  }> {
    logger.info(
      "Conversation stats disabled - tables removed in schema cleanup"
    );

    return {
      totalActiveConversations: 0,
      totalInactiveConversations: 0,
      expiredConversations: 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
    };
  }
}

// Main execution function
async function main() {
  const cleanupService = new ConversationCleanupService();

  try {
    logger.info("🚫 Conversation cleanup is DISABLED");
    logger.info(
      "Reason: Conversation tables were removed during schema cleanup"
    );

    // Get stats (will return empty)
    logger.info("\n📊 Statistics (disabled):");
    const stats = await cleanupService.getCleanupStats();
    logger.info("Stats:", { stats });

    logger.info("\nℹ️  No cleanup performed - functionality disabled");
  } catch (error) {
    logger.error(
      "❌ Conversation cleanup failed:",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("Script execution failed:", error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    });
}

export { ConversationCleanupService };
