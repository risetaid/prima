import { ConversationStateService } from './src/services/conversation-state.service';
import { PatientLookupService } from './src/services/patient/patient-lookup.service';
import { logger } from './src/lib/logger';

async function resetProductionConversation() {
  const phoneNumber = '081333852187';

  try {
    console.log(`🔄 Resetting conversation state for patient: ${phoneNumber}`);

    // Find patient first
    const patientLookup = new PatientLookupService();
    const patientResult = await patientLookup.findPatientByPhone(phoneNumber);

    if (!patientResult.found || !patientResult.patient) {
      console.log('❌ Patient not found');
      return;
    }

    const patient = patientResult.patient;
    console.log(`✅ Found patient: ${patient.name} (${patient.verificationStatus})`);

    // Get conversation state service
    const conversationStateService = new ConversationStateService();

    // Find current conversation state
    const currentState = await conversationStateService.findByPhoneNumber(phoneNumber);

    if (!currentState) {
      console.log('ℹ️ No active conversation state found - creating new one');
      const newState = await conversationStateService.getOrCreateConversationState(
        patient.id,
        phoneNumber,
        'general_inquiry'
      );
      console.log(`✅ Created new conversation state: ${newState.id} (${newState.currentContext})`);
      return;
    }

    console.log(`📋 Current state: ${currentState.currentContext} (${currentState.expectedResponseType})`);

    // Switch to general_inquiry if not already
    if (currentState.currentContext !== 'general_inquiry') {
      const updatedState = await conversationStateService.switchContext(
        currentState.id,
        'general_inquiry'
      );
      console.log(`🔄 Switched context to: ${updatedState.currentContext} (${updatedState.expectedResponseType})`);
    } else {
      console.log('✅ Conversation already in general_inquiry context');
    }

    // Log the reset operation
    logger.info('Production conversation state reset completed', {
      patientId: patient.id,
      phoneNumber,
      operation: 'production_reset',
      newContext: 'general_inquiry'
    });

    console.log('🎉 Reset completed successfully!');
    console.log('📝 Patient can now send general messages and get LLM responses');

  } catch (error) {
    console.error('💥 Failed to reset conversation state:', error);
    logger.error('Production conversation reset failed', error as Error, {
      phoneNumber,
      operation: 'production_reset'
    });
  } finally {
    process.exit(0);
  }
}

// Run the reset
resetProductionConversation();