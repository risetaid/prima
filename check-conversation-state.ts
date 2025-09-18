import { db } from './src/db';
import { conversationStates, conversationMessages } from './src/db';
import { eq, and, gte, desc } from 'drizzle-orm';

async function checkConversationState() {
  const phoneNumber = '081333852187';

  try {
    console.log(`Checking conversation state for phone: ${phoneNumber}`);

    // Find active conversation state
    const activeStates = await db
      .select()
      .from(conversationStates)
      .where(
        and(
          eq(conversationStates.phoneNumber, phoneNumber),
          eq(conversationStates.isActive, true),
          gte(conversationStates.expiresAt, new Date())
        )
      )
      .orderBy(desc(conversationStates.updatedAt))
      .limit(1);

    if (activeStates.length === 0) {
      console.log('No active conversation state found');
      return;
    }

    const state = activeStates[0];
    console.log('Active conversation state:', {
      id: state.id,
      currentContext: state.currentContext,
      expectedResponseType: state.expectedResponseType,
      lastMessage: state.lastMessage,
      lastMessageAt: state.lastMessageAt,
      messageCount: state.messageCount,
      expiresAt: state.expiresAt,
      createdAt: state.createdAt,
    });

    // Get recent messages
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationStateId, state.id))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(10);

    console.log('\nRecent messages:');
    messages.reverse().forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.direction}] ${msg.message}`);
      console.log(`   Type: ${msg.messageType}, Intent: ${msg.intent}, Confidence: ${msg.confidence}`);
      console.log(`   Created: ${msg.createdAt}`);
      if (msg.llmModel) {
        console.log(`   LLM: ${msg.llmModel}, Tokens: ${msg.llmTokensUsed}, Cost: ${msg.llmCost}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error checking conversation state:', error);
  } finally {
    process.exit(0);
  }
}

checkConversationState();