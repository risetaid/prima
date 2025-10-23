// AI General Inquiry Handler for PRIMA
// Manages health question conversations and escalations

import { getAIConversationService } from './ai-conversation.service';
import { getAIIntentService } from './ai-intent.service';
import { ConversationStateService } from '@/services/conversation-state.service';
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service';
import { logger } from '@/lib/logger';
import { EMERGENCY_ESCALATION_MESSAGE } from './ai-prompts';
import type { AIConversationContext } from '@/lib/ai-types';

export interface GeneralInquiryResult {
  success: boolean;
  action: 'answered' | 'escalated' | 'emergency' | 'error';
  message?: string;
  escalationReason?: string;
}

export class AIGeneralInquiryService {
  private aiConversationService = getAIConversationService();
  private aiIntentService = getAIIntentService();
  private conversationStateService = new ConversationStateService();
  private whatsappService = new WhatsAppService();

  /**
   * Handle general health inquiry from patient
   */
  async handleInquiry(
    message: string,
    patient: {
      id: string;
      name: string;
      phoneNumber: string;
      cancerStage?: string | null;
    },
    volunteer?: {
      id: string;
      name: string;
    }
  ): Promise<GeneralInquiryResult> {
    try {
      logger.info('Handling general inquiry', {
        patientId: patient.id,
        patientName: patient.name,
        messagePreview: message.substring(0, 100),
      });

      // 1. Quick emergency check
      if (this.aiIntentService.isEmergency(message)) {
        logger.warn('Emergency detected in general inquiry', {
          patientId: patient.id,
          message: message.substring(0, 100),
        });

        return await this.handleEmergency(message, patient, volunteer);
      }

      // 2. Get or create conversation state
      const conversationState =
        await this.conversationStateService.getOrCreateConversationState(
          patient.id,
          patient.phoneNumber,
          'general_inquiry'
        );

      // 3. Get conversation history (last 10 messages)
      const history = await this.conversationStateService.getConversationHistory(
        conversationState.id,
        10
      );

      // 4. Build conversation context
      const context: AIConversationContext = {
        patientId: patient.id,
        patientName: patient.name,
        conversationHistory: history.map((msg) => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.message,
          timestamp: msg.createdAt,
        })),
        patientContext: {
          cancerStage: patient.cancerStage || undefined,
          // Could add more context: medications, recent reminders, etc.
        },
      };

      // 5. Log incoming patient message
      await this.conversationStateService.addMessage(conversationState.id, {
        message,
        direction: 'inbound',
        messageType: 'general',
        intent: 'health_question',
        processedAt: new Date(),
      });

      // 6. Generate AI response
      const aiResponse = await this.aiConversationService.respond(message, context);

      logger.info('AI conversation response generated', {
        patientId: patient.id,
        shouldEscalate: aiResponse.shouldEscalate,
        suggestedAction: aiResponse.suggestedAction,
        responseLength: aiResponse.message.length,
        tokensUsed: aiResponse.metadata.tokensUsed,
        cost: aiResponse.metadata.cost.toFixed(6),
      });

      // 7. Handle based on suggested action
      if (aiResponse.suggestedAction === 'mark_emergency') {
        return await this.handleEmergency(message, patient, volunteer);
      }

      if (aiResponse.shouldEscalate) {
        return await this.handleEscalation(
          message,
          aiResponse.message,
          patient,
          volunteer,
          aiResponse.escalationReason
        );
      }

      // 8. Send AI response to patient
      await this.whatsappService.send(patient.phoneNumber, aiResponse.message);

      // 9. Log outgoing AI message with metadata
      await this.conversationStateService.addMessage(conversationState.id, {
        message: aiResponse.message,
        direction: 'outbound',
        messageType: 'general',
        processedAt: new Date(),
        llmResponseId: `conv_${Date.now()}`,
        llmModel: aiResponse.metadata.model,
        llmTokensUsed: aiResponse.metadata.tokensUsed,
        llmResponseTimeMs: aiResponse.metadata.responseTimeMs,
        llmCost: aiResponse.metadata.cost,
      });

      logger.info('AI response sent to patient', {
        patientId: patient.id,
        messageLength: aiResponse.message.length,
      });

      return {
        success: true,
        action: 'answered',
        message: aiResponse.message,
      };
    } catch (error) {
      logger.error('Failed to handle general inquiry', error as Error, {
        patientId: patient.id,
        message: message.substring(0, 100),
      });

      // Send fallback message to patient
      try {
        await this.whatsappService.send(
          patient.phoneNumber,
          `Maaf ${patient.name}, saya mengalami kesulitan memproses pertanyaan Anda. Relawan PRIMA akan segera membantu Anda. 💙`
        );
      } catch (sendError) {
        logger.error('Failed to send fallback message', sendError as Error, {
          patientId: patient.id,
        });
      }

      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle emergency situation
   */
  private async handleEmergency(
    message: string,
    patient: {
      id: string;
      name: string;
      phoneNumber: string;
    },
    volunteer?: {
      id: string;
      name: string;
    }
  ): Promise<GeneralInquiryResult> {
    logger.warn('🚨 EMERGENCY detected', {
      patientId: patient.id,
      patientName: patient.name,
      message: message.substring(0, 100),
    });

    try {
      // 1. Send emergency guidance to patient
      const emergencyMessage = EMERGENCY_ESCALATION_MESSAGE(patient.name);
      await this.whatsappService.send(patient.phoneNumber, emergencyMessage);

      logger.info('Emergency message sent to patient', {
        patientId: patient.id,
      });

      // 2. Create volunteer notification
      await this.createVolunteerNotification({
        patientId: patient.id,
        patientName: patient.name,
        message,
        priority: 'urgent',
        escalationReason: 'Emergency keywords detected',
        assignedVolunteerId: volunteer?.id,
      });

      return {
        success: true,
        action: 'emergency',
        escalationReason: 'Emergency keywords detected',
      };
    } catch (error) {
      logger.error('Failed to handle emergency', error as Error, {
        patientId: patient.id,
      });

      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle non-emergency escalation to volunteer
   */
  private async handleEscalation(
    originalMessage: string,
    aiResponse: string,
    patient: {
      id: string;
      name: string;
      phoneNumber: string;
    },
    volunteer?: {
      id: string;
      name: string;
    },
    escalationReason?: string
  ): Promise<GeneralInquiryResult> {
    logger.info('Escalating conversation to volunteer', {
      patientId: patient.id,
      reason: escalationReason,
    });

    try {
      // 1. Send AI response to patient (includes recommendation to contact volunteer)
      await this.whatsappService.send(patient.phoneNumber, aiResponse);

      // 2. Create volunteer notification
      await this.createVolunteerNotification({
        patientId: patient.id,
        patientName: patient.name,
        message: originalMessage,
        priority: 'high',
        escalationReason: escalationReason || 'AI recommended escalation',
        assignedVolunteerId: volunteer?.id,
      });

      return {
        success: true,
        action: 'escalated',
        escalationReason,
      };
    } catch (error) {
      logger.error('Failed to handle escalation', error as Error, {
        patientId: patient.id,
      });

      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create volunteer notification for escalation
   */
  private async createVolunteerNotification(params: {
    patientId: string;
    patientName: string;
    message: string;
    priority: 'urgent' | 'high' | 'normal';
    escalationReason: string;
    assignedVolunteerId?: string;
  }): Promise<void> {
    try {
      const { volunteerNotifications } = await import('@/db');
      const { db } = await import('@/db');

      await db.insert(volunteerNotifications).values({
        patientId: params.patientId,
        message: `${params.patientName}: ${params.message}`,
        priority: params.priority,
        status: 'pending',
        assignedVolunteerId: params.assignedVolunteerId || null,
        escalationReason: params.escalationReason,
        intent: 'health_question',
        patientContext: {
          message: params.message,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Volunteer notification created', {
        patientId: params.patientId,
        priority: params.priority,
        assignedVolunteerId: params.assignedVolunteerId,
      });
    } catch (error) {
      logger.error('Failed to create volunteer notification', error as Error, {
        patientId: params.patientId,
      });
      throw error;
    }
  }
}

// Export singleton instance
let aiGeneralInquiryServiceInstance: AIGeneralInquiryService | null = null;

export function getAIGeneralInquiryService(): AIGeneralInquiryService {
  if (!aiGeneralInquiryServiceInstance) {
    aiGeneralInquiryServiceInstance = new AIGeneralInquiryService();
  }
  return aiGeneralInquiryServiceInstance;
}

export function resetAIGeneralInquiryService(): void {
  aiGeneralInquiryServiceInstance = null;
}
