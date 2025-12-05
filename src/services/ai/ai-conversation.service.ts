// AI Conversation Service for PRIMA
// Handles multi-turn health conversations with patient context

import { getAIClient } from "./ai-client";
import {
  CONVERSATION_SYSTEM_PROMPT,
  buildConversationPrompt,
} from "./ai-prompts";
import { logger } from "@/lib/logger";
import { formatForWhatsApp } from "@/lib/gowa";
import type {
  AIConversationContext,
  AIConversationResponse,
} from "@/lib/ai-types";

export class AIConversationService {
  private aiClient = getAIClient();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.AI_CONVERSATION_ENABLED === "true";

    logger.info("AI Conversation Service initialized", {
      enabled: this.enabled,
    });
  }

  /**
   * Generate conversational response to patient message
   * Uses patient context and conversation history for natural dialogue
   */
  async respond(
    message: string,
    context: AIConversationContext
  ): Promise<AIConversationResponse> {
    if (!this.enabled) {
      logger.info("AI conversation disabled, returning default response");
      return this.createDefaultResponse(
        "Maaf, saat ini saya tidak dapat menjawab pertanyaan. Silakan hubungi relawan PRIMA untuk bantuan.",
        false
      );
    }

    try {
      logger.info("Generating AI conversation response", {
        patientId: context.patientId,
        patientName: context.patientName,
        messageLength: message.length,
        messagePreview: message.substring(0, 50),
        hasHistory: context.conversationHistory.length > 0,
        historyCount: context.conversationHistory.length,
      });

      const startTime = Date.now();

      // Transform patientContext to match expected format
      const transformedPatientContext = context.patientContext
        ? {
            cancerStage: context.patientContext.cancerStage,
            currentMedications: context.patientContext.currentMedications,
            recentReminders: context.patientContext.recentReminders?.map(
              (r) => r.message
            ),
          }
        : undefined;

      // Build conversation prompt with full context
      const userPrompt = buildConversationPrompt(message, {
        patientName: context.patientName,
        conversationHistory: context.conversationHistory,
        patientContext: transformedPatientContext,
      });

      // Call Claude API
      const { content, usage } = await this.aiClient.sendMessage({
        systemPrompt: CONVERSATION_SYSTEM_PROMPT.system,
        userMessage: userPrompt,
        temperature: 0.5, // Slightly higher for natural conversation
        maxTokens: 1024, // Allow longer responses for explanations
      });

      const latencyMs = Date.now() - startTime;

      // Format response for WhatsApp (convert Markdown to WA format)
      const formattedContent = formatForWhatsApp(content);

      // Analyze response for escalation needs
      const shouldEscalate = this.detectEscalation(formattedContent, message);
      const escalationReason = shouldEscalate
        ? this.extractEscalationReason(formattedContent, message)
        : undefined;

      // Determine suggested action
      const suggestedAction = this.determineSuggestedAction(
        formattedContent,
        message,
        shouldEscalate
      );

      const response: AIConversationResponse = {
        message: formattedContent,
        shouldEscalate,
        escalationReason,
        suggestedAction,
        metadata: {
          tokensUsed: usage.totalTokens,
          responseTimeMs: latencyMs,
          model: usage.model,
          cost: usage.cost,
        },
      };

      logger.info("AI conversation response generated", {
        patientId: context.patientId,
        responseLength: formattedContent.length,
        shouldEscalate,
        suggestedAction,
        latencyMs,
        tokensUsed: usage.totalTokens,
        cost: usage.cost.toFixed(6),
      });

      return response;
    } catch (error) {
      logger.error(
        "Failed to generate AI conversation response",
        error as Error,
        {
          patientId: context.patientId,
          message: message.substring(0, 100),
        }
      );

      // Return safe fallback response
      return this.createDefaultResponse(
        "Maaf, saya mengalami kesulitan memproses pertanyaan Anda. Silakan hubungi relawan PRIMA untuk bantuan lebih lanjut.",
        true,
        "AI conversation error"
      );
    }
  }

  /**
   * Detect if response indicates need for human escalation
   * Looks for keywords and patterns in AI response
   */
  private detectEscalation(
    aiResponse: string,
    patientMessage: string
  ): boolean {
    const response = aiResponse.toLowerCase();
    const message = patientMessage.toLowerCase();

    // AI explicitly mentions escalation
    if (
      response.includes("hubungi dokter") ||
      response.includes("konsultasi dokter") ||
      response.includes("segera ke rumah sakit") ||
      response.includes("emergency") ||
      response.includes("darurat") ||
      response.includes("hubungi relawan")
    ) {
      return true;
    }

    // Emergency keywords in patient message
    const emergencyKeywords = [
      "darurat",
      "sesak nafas",
      "sesak napas",
      "muntah darah",
      "pusing parah",
      "pingsan",
      "demam tinggi",
      "nyeri dada",
      "kejang",
      "tidak sadar",
    ];

    if (emergencyKeywords.some((keyword) => message.includes(keyword))) {
      return true;
    }

    // Complex medical questions requiring professional judgment
    const complexKeywords = [
      "dosis",
      "ganti obat",
      "stop obat",
      "alergi",
      "reaksi obat",
      "hasil lab",
      "hasil tes",
    ];

    if (complexKeywords.some((keyword) => message.includes(keyword))) {
      return true;
    }

    return false;
  }

  /**
   * Extract reason for escalation from context
   */
  private extractEscalationReason(
    aiResponse: string,
    patientMessage: string
  ): string {
    const response = aiResponse.toLowerCase();
    const message = patientMessage.toLowerCase();

    // Emergency situations
    if (
      message.includes("sesak nafas") ||
      message.includes("sesak napas") ||
      message.includes("muntah darah")
    ) {
      return "Potential medical emergency detected";
    }

    // Complex medical questions
    if (
      message.includes("dosis") ||
      message.includes("ganti obat") ||
      message.includes("stop obat")
    ) {
      return "Medical decision requiring professional judgment";
    }

    // Patient expressing distress
    if (
      message.includes("sakit sekali") ||
      message.includes("parah banget") ||
      message.includes("ga tahan")
    ) {
      return "Patient expressing significant distress";
    }

    // AI recommends escalation
    if (
      response.includes("hubungi dokter") ||
      response.includes("konsultasi")
    ) {
      return "AI recommends professional consultation";
    }

    return "Conversation requires human attention";
  }

  /**
   * Determine suggested action based on response
   */
  private determineSuggestedAction(
    aiResponse: string,
    patientMessage: string,
    shouldEscalate: boolean
  ): "send_message" | "notify_volunteer" | "mark_emergency" {
    if (shouldEscalate) {
      const message = patientMessage.toLowerCase();

      // True emergency
      if (
        message.includes("darurat") ||
        message.includes("sesak nafas") ||
        message.includes("muntah darah") ||
        message.includes("pingsan")
      ) {
        return "mark_emergency";
      }

      // Needs volunteer attention but not immediate emergency
      return "notify_volunteer";
    }

    // Normal conversation
    return "send_message";
  }

  /**
   * Create default response when AI is disabled or errors
   */
  private createDefaultResponse(
    message: string,
    shouldEscalate: boolean,
    escalationReason?: string
  ): AIConversationResponse {
    return {
      message,
      shouldEscalate,
      escalationReason,
      suggestedAction: shouldEscalate ? "notify_volunteer" : "send_message",
      metadata: {
        tokensUsed: 0,
        responseTimeMs: 0,
        model: "fallback",
        cost: 0,
      },
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      aiClientStats: this.aiClient.getUsageStats(),
    };
  }
}

// Export singleton instance
let aiConversationServiceInstance: AIConversationService | null = null;

export function getAIConversationService(): AIConversationService {
  if (!aiConversationServiceInstance) {
    aiConversationServiceInstance = new AIConversationService();
  }
  return aiConversationServiceInstance;
}

export function resetAIConversationService(): void {
  aiConversationServiceInstance = null;
}
