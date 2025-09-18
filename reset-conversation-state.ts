import { ConversationStateService } from './src/services/conversation-state.service';

async function resetConversationState() {
  const phoneNumber = '081333852187';

  try {
    console.log(`Resetting conversation state for phone: ${phoneNumber}`);

    const conversationStateService = new ConversationStateService();

    // Find the current conversation state
    const currentState = await conversationStateService.findByPhoneNumber(phoneNumber);

    if (!currentState) {
      console.log('No active conversation state found');
      return;
    }

    console.log('Current state:', {
      id: currentState.id,
      context: currentState.currentContext,
      lastMessage: currentState.lastMessage,
    });

    // Switch to general_inquiry context
    const updatedState = await conversationStateService.switchContext(
      currentState.id,
      'general_inquiry'
    );

    console.log('Updated state:', {
      id: updatedState.id,
      context: updatedState.currentContext,
      expiresAt: updatedState.expiresAt,
    });

  } catch (error) {
    console.error('Error resetting conversation state:', error);
  } finally {
    process.exit(0);
  }
}

resetConversationState();