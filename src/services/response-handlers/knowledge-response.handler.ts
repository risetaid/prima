/**
 * Knowledge Base Response Handler
 * Handles general health information queries using knowledge base integration
 */

import {
  StandardResponseHandler,
  ResponseContext,
  StandardResponse,
  createSuccessResponse,
  createErrorResponse,
} from "@/services/response-handler";
import { logger } from "@/lib/logger";
import {
  knowledgeBaseService,
  KnowledgeResult,
} from "@/services/knowledge/knowledge-base.service";
import { getPromptForContext } from "@/services/llm/prompts";
import { llmService } from "@/services/llm/llm.service";
import { ConversationContext } from "@/services/llm/llm.types";

export class KnowledgeResponseHandler extends StandardResponseHandler {
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  constructor() {
    super("general_inquiry", 70);
  }

  canHandle(context: ResponseContext): boolean {
    try {
      // Simple keyword-based check for knowledge base queries
      const message = context.message.toLowerCase();
      const knowledgeKeywords = [
        "informasi",
        "kesehatan",
        "penyakit",
        "gejala",
        "pengobatan",
        "obat",
        "makanan",
        "diet",
        "olahraga",
        "tips",
        "saran",
        "arti",
        "maksud",
        "pengertian",
        "definisi",
        "cara",
        "bagaimana",
        "kenapa",
        "mengapa",
      ];

      const hasKnowledgeKeyword = knowledgeKeywords.some((keyword) =>
        message.includes(keyword)
      );
      const isHealthQuestion = this.isHealthRelatedQuestion(message);

      return hasKnowledgeKeyword && isHealthQuestion;
    } catch (error) {
      logger.error(
        "Failed to check knowledge handler suitability",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Handling knowledge base response", {
        patientId: context.patientId,
        message: context.message.substring(0, 100),
      });

      // Create a basic conversation context for knowledge query
      const conversationContext: ConversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: [],
        conversationId: context.conversationId,
      };

      // Analyze the knowledge query using specialized prompt
      const knowledgePrompt = getPromptForContext(
        "knowledge",
        conversationContext
      );
      const llmResponse = await llmService.generateResponse({
        messages: [
          { role: "system", content: knowledgePrompt.systemPrompt },
          { role: "user", content: context.message },
        ],
        maxTokens: knowledgePrompt.maxTokens,
        temperature: knowledgePrompt.temperature,
      });

      // Parse the JSON response
      let knowledgeAnalysis;
      try {
        knowledgeAnalysis = JSON.parse(llmResponse.content);
      } catch (error) {
        logger.error(
          "Failed to parse knowledge analysis JSON",
          error instanceof Error ? error : new Error(String(error)),
          { response: llmResponse.content }
        );
        return createErrorResponse(
          "Maaf, saya tidak dapat memproses pertanyaan Anda saat ini.",
          "Failed to parse knowledge analysis"
        );
      }

      // Validate that this is appropriate for knowledge base
      if (!this.isKnowledgeQueryAppropriate(knowledgeAnalysis)) {
        return createErrorResponse(
          "Query tidak sesuai untuk basis pengetahuan. " +
            (knowledgeAnalysis.needs_medical_professional
              ? "Silakan konsultasi dengan tenaga kesehatan."
              : "Silakan tanyakan tentang data kesehatan pribadi Anda."),
          "Query not appropriate for knowledge base",
          {
            patientId: context.patientId,
            emergencyDetected: knowledgeAnalysis.emergency_detected,
            escalated: knowledgeAnalysis.needs_medical_professional,
          }
        );
      }

      // Search knowledge base
      const knowledgeQuery = {
        question: context.message,
        category: knowledgeAnalysis.knowledge_category,
        language: "id" as const,
        difficulty: knowledgeAnalysis.complexity,
        includeReferences: true,
      };

      const knowledgeResults = await knowledgeBaseService.searchKnowledge(
        knowledgeQuery,
        {
          patientId: context.patientId,
          phoneNumber: context.phoneNumber,
          conversationId: context.conversationId,
          previousMessages: [],
        }
      );

      // Format the response
      const response = await this.formatKnowledgeResponse(
        knowledgeResults,
        knowledgeAnalysis,
        conversationContext
      );

      logger.info("Knowledge response generated successfully", {
        resultsCount: knowledgeResults.results.length,
        category: knowledgeAnalysis.knowledge_category,
        emergencyDetected: knowledgeAnalysis.emergency_detected,
      });

      return createSuccessResponse(
        response,
        {
          knowledgeCategory: knowledgeAnalysis.knowledge_category,
          resultsCount: knowledgeResults.results.length,
          emergencyDetected: knowledgeAnalysis.emergency_detected,
          needsMedicalProfessional:
            knowledgeAnalysis.needs_medical_professional,
          disclaimers: knowledgeAnalysis.disclaimers || [],
        },
        {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          source: "knowledge_handler",
          action: "knowledge_query",
          patientId: context.patientId,
          emergencyDetected: knowledgeAnalysis.emergency_detected,
          escalated: knowledgeAnalysis.needs_medical_professional,
        }
      );
    } catch (error) {
      logger.error(
        "Failed to handle knowledge response",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: context.patientId,
        }
      );

      return createErrorResponse(
        "Maaf, saya tidak dapat mengakses informasi kesehatan saat ini. " +
          "Silakan coba lagi nanti atau konsultasi dengan tenaga kesehatan.",
        error instanceof Error ? error.message : String(error),
        {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          source: "knowledge_handler",
          action: "error",
          patientId: context.patientId,
        }
      );
    }
  }

  /**
   * Check if intent indicates a knowledge base query
   */
  private isKnowledgeBaseIntent(intent: string): boolean {
    const knowledgeIntents = [
      "general_inquiry",
      "health_information",
      "medical_question",
      "general_health",
      "prevention_info",
      "lifestyle_advice",
    ];

    return (
      knowledgeIntents.includes(intent) ||
      intent.includes("health") ||
      intent.includes("medical") ||
      intent.includes("knowledge")
    );
  }

  /**
   * Check if message is health-related
   */
  private isHealthRelatedQuestion(message: string): boolean {
    const normalizedMessage = message.toLowerCase();

    const healthKeywords = [
      "kesehatan",
      "medis",
      "obat",
      "sakit",
      "demam",
      "nyeri",
      "batuk",
      "pilek",
      "alergi",
      "vitamin",
      "nutrisi",
      "olahraga",
      "diet",
      "tidur",
      "stres",
      "cemas",
      "infeksi",
      "virus",
      "bakteri",
      "pencegahan",
      "gejala",
      "penyakit",
      "pengobatan",
      "terapi",
    ];

    return healthKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
  }

  /**
   * Check if query requires personal data access
   */
  private requiresPersonalDataAccess(analysis: {
    data_access_required?: boolean;
    patient_data_type?: string | null;
    topic?: string;
  }): boolean {
    return Boolean(
      analysis.data_access_required === true ||
        analysis.patient_data_type !== null ||
        analysis.topic?.includes("pribadi") ||
        analysis.topic?.includes("data")
    );
  }

  /**
   * Validate if knowledge query is appropriate
   */
  private isKnowledgeQueryAppropriate(analysis: {
    appropriate_for_kb?: boolean;
    needs_medical_professional?: boolean;
    emergency_detected?: boolean;
    confidence?: number;
  }): boolean {
    return (
      analysis.appropriate_for_kb === true &&
      !analysis.needs_medical_professional &&
      !analysis.emergency_detected &&
      (analysis.confidence ?? 0) >= this.CONFIDENCE_THRESHOLD
    );
  }

  /**
   * Format knowledge response for patient
   */
  private async formatKnowledgeResponse(
    knowledgeResults: {
      results: unknown[];
      querySummary?: string;
      suggestions?: string[];
    },
    analysis: {
      emergency_detected?: boolean;
      disclaimers?: string[];
      follow_up_suggestions?: string[];
      needs_medical_professional?: boolean;
    },
    context: ConversationContext
  ): Promise<string> {
    let response = "";

    // Add emergency handling if detected
    if (analysis.emergency_detected) {
      response += "⚠️ **PERINGATAN DARURAT** ⚠️\n\n";
      response +=
        "Saya mendeteksi bahwa Anda mungkin mengalami kondisi darurat. " +
        "Segera hubungi layanan darurat (112) atau rumah sakit terdekat.\n\n";
    }

    // Add knowledge base results
    if (knowledgeResults.results.length > 0) {
      response += knowledgeBaseService.formatKnowledgeForLLM(
        knowledgeResults.results as KnowledgeResult[]
      );
    } else {
      response +=
        "Maaf, saya tidak menemukan informasi spesifik tentang pertanyaan Anda. " +
        "Namun, saya dapat memberikan beberapa informasi umum:\n\n";
      response +=
        "Untuk informasi kesehatan yang akurat dan dipersonalisasi, " +
        "sangat disarankan untuk berkonsultasi dengan tenaga kesehatan.";
    }

    // Add query summary if available
    if (knowledgeResults.querySummary) {
      response += `\n\n${knowledgeResults.querySummary}`;
    }

    // Add safety disclaimers
    const disclaimers = [
      "Informasi ini bersifat umum dan bukan pengganti nasihat medis profesional.",
      "Selalu konsultasi dengan dokter atau tenaga kesehatan untuk diagnosis dan pengobatan.",
    ];

    if (analysis.disclaimers && analysis.disclaimers.length > 0) {
      disclaimers.push(...analysis.disclaimers);
    }

    response += "\n\n**PENTING:**\n";
    disclaimers.forEach((disclaimer, index) => {
      response += `${index + 1}. ${disclaimer}\n`;
    });

    // Add suggestions if available
    if (
      knowledgeResults.suggestions &&
      knowledgeResults.suggestions.length > 0
    ) {
      response += "\n**Saran:**\n";
      knowledgeResults.suggestions.forEach(
        (suggestion: string, index: number) => {
          response += `${index + 1}. ${suggestion}\n`;
        }
      );
    }

    // Add follow-up suggestions if appropriate
    if (
      analysis.follow_up_suggestions &&
      analysis.follow_up_suggestions.length > 0
    ) {
      response += "\n**Pertanyaan terkait yang mungkin Anda minati:**\n";
      analysis.follow_up_suggestions.forEach(
        (suggestion: string, index: number) => {
          response += `${index + 1}. ${suggestion}\n`;
        }
      );
    }

    // Add escalation suggestion if needed
    if (analysis.needs_medical_professional) {
      response += "\n**Disarankan untuk:**\n";
      response += "- Konsultasi dengan dokter atau tenaga kesehatan\n";
      response += "- Pemeriksaan medis untuk diagnosis yang akurat\n";
    }

    // Personalize with patient name if available
    const patientName = context.patientInfo?.name;
    if (patientName) {
      response = `Halo ${patientName},\n\n${response}`;
    }

    return response;
  }
}

// Export singleton instance
export const knowledgeResponseHandler = new KnowledgeResponseHandler();
