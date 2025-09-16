// Message Processor Service - Advanced NLP for Indonesian WhatsApp responses
// Handles natural language processing, context awareness, and intelligent response classification

import { llmService } from "./llm/llm.service";
import {
  ConversationContext,
  LLMRequest,
  ProcessedLLMResponse,
} from "./llm/llm.types";
import { PatientContextService } from "./patient/patient-context.service";
import {
  ConversationStateService,
  ConversationMessageData,
} from "./conversation-state.service";
import { WhatsAppService } from "./whatsapp/whatsapp.service";
import { safetyFilterService } from "./llm/safety-filter";
import { logger } from "@/lib/logger";

export interface MessageContext {
  patientId: string;
  phoneNumber: string;
  message: string;
  timestamp: Date;
  conversationState?: ConversationState;
  previousMessages?: MessageHistory[];
  patientName?: string;
  verificationStatus?: string;
  activeReminders?: unknown[];
  fullPatientContext?: FullPatientContext;
}

export interface MessageHistory {
  message: string;
  timestamp: Date;
  direction: "inbound" | "outbound";
  type: "verification" | "reminder" | "confirmation" | "general";
}

export interface ConversationState {
  id: string;
  patientId: string;
  currentContext:
    | "verification"
    | "reminder_confirmation"
    | "general_inquiry"
    | "emergency";
  expectedResponseType?: "yes_no" | "confirmation" | "text" | "number";
  relatedEntityId?: string; // reminder_log_id, verification_id, etc.
  stateData?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedMessage {
  intent: MessageIntent;
  confidence: number;
  entities: MessageEntity[];
  response: RecommendedResponse;
  context: MessageContext;
  requiresHumanIntervention: boolean;
}

export interface MessageIntent {
  primary:
    | "accept"
    | "decline"
    | "confirm_taken"
    | "confirm_missed"
    | "confirm_later"
    | "unsubscribe"
    | "inquiry"
    | "emergency"
    | "unknown";
  secondary?: string[];
  sentiment: "positive" | "negative" | "neutral";
  confidence?: number;
}

export interface MessageEntity {
  type: "time" | "date" | "symptom" | "emergency_level";
  value: string;
  confidence: number;
  position: { start: number; end: number };
}

export interface RecommendedResponse {
  type: "auto_reply" | "human_intervention" | "escalation";
  message?: string;
  actions: ResponseAction[];
  priority: "low" | "medium" | "high" | "urgent";
}

export interface ResponseAction {
  type:
    | "update_patient_status"
    | "log_confirmation"
    | "send_followup"
    | "notify_volunteer"
    | "create_manual_confirmation";
  data: Record<string, unknown>;
}

export interface FullPatientContext {
  patient: {
    id: string;
    name: string;
    phoneNumber: string;
    verificationStatus: string;
    isActive: boolean;
    assignedVolunteerId?: string;
    cancerStage?: string;
    diagnosisDate?: Date;
    doctorName?: string;
    hospitalName?: string;
    birthDate?: Date;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    photoUrl?: string;
    lastReactivatedAt?: Date;
  };
  todaysReminders: Array<{
    id: string;
    scheduledTime: string;
    frequency: string;
    medicationName?: string;
    customMessage?: string;
    isCompleted?: boolean;
    lastCompletedAt?: Date;
  }>;
  activeReminders: Array<{
    id: string;
    scheduledTime: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    customMessage?: string;
    createdAt: Date;
  }>;
  medicalHistory: {
    diagnosisDate?: Date;
    cancerStage?: string;
    doctorName?: string;
    hospitalName?: string;
    symptoms?: Array<{
      symptom: string;
      severity?: string;
      notedDate: Date;
      notes?: string;
    }>;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      startDate?: Date;
      notes?: string;
    }>;
  };
  recentHealthNotes: Array<{
    id: string;
    note: string;
    noteDate: Date;
    recordedBy: string;
    createdAt: Date;
  }>;
  patientVariables: Array<{
    name: string;
    value: string;
    isActive: boolean;
  }>;
  recentConversationHistory: Array<{
    id: string;
    message: string;
    direction: "inbound" | "outbound";
    messageType: string;
    intent?: string;
    confidence?: number;
    createdAt: Date;
  }>;
  conversationState?: {
    id: string;
    currentContext: string;
    expectedResponseType?: string;
    lastMessage?: string;
    lastMessageAt?: Date;
    messageCount: number;
  };
}

export class MessageProcessorService {
  private patientContextService: PatientContextService;
  private conversationStateService: ConversationStateService;
  private whatsAppService: WhatsAppService;

  constructor() {
    this.patientContextService = new PatientContextService();
    this.conversationStateService = new ConversationStateService();
    this.whatsAppService = new WhatsAppService();
  }

  // Confidence threshold for LLM responses
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly LOW_CONFIDENCE_THRESHOLD = 0.3;

  /**
   * Determine if message needs intent detection based on keywords and context
   */
  private shouldUseIntentDetection(
    message: string,
    conversationState: ConversationState,
    context: MessageContext
  ): boolean {
    // Always use intent detection for verification and reminder contexts
    if (
      conversationState.currentContext === "verification" ||
      conversationState.currentContext === "reminder_confirmation"
    ) {
      return true;
    }

    // Use intent detection for messages containing verification/confirmation keywords
    const verificationKeywords = ["ya", "tidak", "iya", "yes", "no"];
    const confirmationKeywords = ["sudah", "belum", "udh", "blm"];

    const hasVerificationKeywords = verificationKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
    const hasConfirmationKeywords = confirmationKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    // Use intent detection if message contains relevant keywords
    return hasVerificationKeywords || hasConfirmationKeywords;
  }

  // Indonesian keyword mappings for fallback (kept for emergency cases)
  private readonly ACCEPT_KEYWORDS = [
    "ya",
    "iya",
    "yes",
    "y",
    "ok",
    "oke",
    "baik",
    "setuju",
    "mau",
    "ingin",
    "terima",
    "siap",
    "bisa",
    "boleh",
    "sudah siap",
    "sudah oke",
    "sudah baik",
  ];

  private readonly DECLINE_KEYWORDS = [
    "tidak",
    "no",
    "n",
    "ga",
    "gak",
    "engga",
    "enggak",
    "tolak",
    "nanti",
    "besok",
    "belum",
    "ga mau",
    "ga bisa",
    "ga siap",
    "belum siap",
  ];

  private readonly CONFIRMATION_TAKEN_KEYWORDS = [
    "sudah",
    "udh",
    "sudah selesai",
    "udh selesai",
    "sudah lakukan",
    "udh lakukan",
    "selesai",
    "telah selesai",
    "sudah lakukan",
    "done",
    "selesai",
    "sudah selesai",
  ];

  private readonly CONFIRMATION_MISSED_KEYWORDS = [
    "belum",
    "blm",
    "belum selesai",
    "blm selesai",
    "belum lakukan",
    "lupa",
    "lupa lakukan",
    "skip",
    "lewat",
    "ga lakukan",
    "tidak lakukan",
    "belum lakukan",
  ];

  private readonly CONFIRMATION_LATER_KEYWORDS = [
    "nanti",
    "bentaran",
    "sebentar",
    "tunggu",
    "wait",
    "later",
    "tunggu sebentar",
    "nanti dulu",
    "belum saatnya",
    "masih ada waktu",
  ];

  private readonly UNSUBSCRIBE_KEYWORDS = [
    "berhenti",
    "stop",
    "cancel",
    "batal",
    "keluar",
    "hapus",
    "unsubscribe",
    "cabut",
    "stop dulu",
    "berhenti dulu",
    "tidak mau lagi",
    "sudah cukup",
  ];

  private readonly EMERGENCY_KEYWORDS = [
    "darurat",
    "emergency",
    "sakit",
    "mual",
    "muntah",
    "alergi",
    "sesak",
    "nyeri",
    "sakit kepala",
    "demam",
    "panas",
    "gawat",
    "tolong",
    "help",
  ];

  private readonly INQUIRY_KEYWORDS = [
    "tanya",
    "pertanyaan",
    "bagaimana",
    "gimana",
    "kenapa",
    "kok",
    "mengapa",
    "info",
    "informasi",
    "bantuan",
    "help",
    "tolong",
    "mau tanya",
  ];

  /**
   * Map LLM intent to internal intent types
   */
  private mapLLMIntentToInternal(llmIntent: string): MessageIntent["primary"] {
    switch (llmIntent) {
      case "verification_response":
        return "accept"; // Will be refined based on YA/TIDAK in response generation
      case "medication_confirmation":
        return "confirm_taken"; // Will be refined based on SUDAH/BELUM
      case "unsubscribe":
        return "unsubscribe";
      case "emergency":
        return "emergency";
      case "general_inquiry":
        return "inquiry";
      default:
        return "unknown";
    }
  }

  /**
   * Fallback keyword-based intent detection for when LLM fails
   */
  private fallbackKeywordIntentDetection(message: string): MessageIntent {
    const scores = this.calculateIntentScores(message);
    const maxScore = Math.max(...Object.values(scores));
    const primaryIntent = this.selectPrimaryIntent(scores);
    const sentiment = this.determineSentiment(message, primaryIntent);
    const confidence = this.calculateIntentConfidence(maxScore, message);

    return {
      primary: primaryIntent || "unknown",
      sentiment,
      confidence: Math.min(confidence || 0.5, 0.5), // Cap fallback confidence at 0.5
    };
  }

  /**
   * Process incoming message with full NLP analysis and conversation continuity
   */
  async processMessage(context: MessageContext): Promise<ProcessedMessage> {
    const normalizedMessage = this.normalizeMessage(context.message);

    // Get or create conversation state for continuity
    let conversationState =
      await this.conversationStateService.findByPhoneNumber(
        context.phoneNumber
      );
    if (!conversationState) {
      conversationState =
        await this.conversationStateService.getOrCreateConversationState(
          context.patientId,
          context.phoneNumber,
          "general_inquiry"
        );
    }

    // Get conversation history for context
    const conversationHistory =
      await this.conversationStateService.getConversationHistory(
        conversationState.id,
        20 // Last 20 messages for context
      );

    // Determine if this message needs intent classification
    const needsIntentDetection = this.shouldUseIntentDetection(
      normalizedMessage,
      conversationState,
      context
    );

    let intent: MessageIntent;
    let entities: MessageEntity[] = [];
    let llmResponse: ProcessedLLMResponse | null = null;

    if (needsIntentDetection) {
      // Use intent detection for verification and confirmation messages
      intent = await this.detectIntent(
        normalizedMessage,
        context,
        conversationHistory
      );
      entities = this.extractEntities(normalizedMessage);
    } else {
      // Use direct LLM response for general inquiries
      intent = {
        primary: "inquiry",
        sentiment: "neutral",
        confidence: 1.0,
      };
    }

    // Get patient context for LLM
    const patientContext = await this.patientContextService.getPatientContext(
      context.phoneNumber
    );

    // Build full conversation context for LLM
    const llmContext: ConversationContext = {
      patientId: context.patientId,
      phoneNumber: context.phoneNumber,
      previousMessages: (conversationHistory || []).map((msg) => ({
        role: msg.direction === "inbound" ? "user" : "assistant",
        content: msg.message,
      })),
      patientInfo:
        patientContext.found && patientContext.context
          ? {
              name: patientContext.context.patient.name,
              verificationStatus:
                patientContext.context.patient.verificationStatus,
              activeReminders: patientContext.context.activeReminders.map(
                (r) => ({
                  medicationName: r.customMessage || "obat",
                  scheduledTime: r.scheduledTime,
                })
              ),
            }
          : undefined,
    };

    // Analyze message for safety concerns and emergencies
    const safetyAnalysis = await llmService.analyzePatientMessageSafety(
      normalizedMessage,
      {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        conversationId: conversationState.id,
        previousMessages: llmContext.previousMessages,
        patientInfo: llmContext.patientInfo,
      }
    );

    // Generate response based on intent detection result
    let recommendedResponse: RecommendedResponse;
    if (
      needsIntentDetection &&
      intent.confidence &&
      intent.confidence >= this.CONFIDENCE_THRESHOLD
    ) {
      // Use intent-based response generation for high-confidence intents
      recommendedResponse = await this.generateResponse(
        intent,
        entities,
        context
      );
    } else {
      // Use direct LLM response for general inquiries or low-confidence intents
      llmResponse = await this.generateDirectLLMResponse(
        normalizedMessage,
        llmContext,
        context.fullPatientContext
      );
      recommendedResponse = this.createResponseFromLLM(
        llmResponse,
        safetyAnalysis,
        context
      );
    }

    // Determine if human intervention is needed
    const requiresHumanIntervention =
      safetyAnalysis.escalationRequired ||
      safetyAnalysis.emergencyDetected ||
      (intent.confidence !== undefined &&
        intent.confidence < this.LOW_CONFIDENCE_THRESHOLD);

    // Update conversation state
    await this.updateConversationState(
      conversationState.id,
      intent,
      normalizedMessage
    );

    // Store the message in conversation history
    await this.conversationStateService.addMessage(conversationState.id, {
      message: normalizedMessage,
      direction: "inbound",
      messageType: this.mapIntentToMessageType(intent.primary),
      intent: intent.primary,
      confidence: intent.confidence ? Math.round(intent.confidence * 100) : 100,
      processedAt: new Date(),
    });

    // Store LLM response if generated
    if (llmResponse) {
      await this.conversationStateService.addMessage(conversationState.id, {
        message: llmResponse.content,
        direction: "outbound",
        messageType: this.mapIntentToMessageType(intent.primary),
        intent: intent.primary,
        confidence: intent.confidence
          ? Math.round(intent.confidence * 100)
          : 100,
        llmResponseId: llmResponse.model,
        llmModel: llmResponse.model,
        llmTokensUsed: llmResponse.tokensUsed,
        llmCost: this.calculateLLMCost(llmResponse.tokensUsed),
        llmResponseTimeMs: llmResponse.responseTime,
        processedAt: new Date(),
      });
    }

    return {
      intent,
      confidence: intent.confidence ?? 1.0,
      entities,
      response: recommendedResponse,
      context,
      requiresHumanIntervention,
    };
  }

  /**
   * Normalize message for better processing
   */
  private normalizeMessage(message: string): string {
    return (
      message
        .toLowerCase()
        .trim()
        // Remove extra whitespace
        .replace(/\s+/g, " ")
        // Remove common punctuation that doesn't affect meaning
        .replace(/[.,!?;:]$/g, "")
        // Normalize common abbreviations
        .replace(/\budh\b/g, "sudah")
        .replace(/\bblm\b/g, "belum")
        .replace(/\bga\b/g, "tidak")
        .replace(/\bgak\b/g, "tidak")
        .replace(/\bengga\b/g, "tidak")
        .replace(/\benggak\b/g, "tidak")
    );
  }

  /**
   * Update conversation state based on intent
   */
  private async updateConversationState(
    conversationStateId: string,
    intent: MessageIntent,
    message: string
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      currentContext: this.mapIntentToContext(intent.primary),
      lastMessage: message,
      messageCount: undefined, // Will be auto-incremented
    };

    // Set expected response type based on intent
    updates.expectedResponseType = this.getExpectedResponseType(intent.primary);

    await this.conversationStateService.updateConversationState(
      conversationStateId,
      updates
    );
  }

  /**
   * Map intent to message type for storage
   */
  private mapIntentToMessageType(
    intent: MessageIntent["primary"]
  ): ConversationMessageData["messageType"] {
    switch (intent) {
      case "accept":
      case "decline":
        return "verification";
      case "confirm_taken":
      case "confirm_missed":
      case "confirm_later":
        return "confirmation";
      case "emergency":
        return "general"; // Emergency gets special handling
      default:
        return "general";
    }
  }

  /**
   * Detect message intent using LLM
   */
  private async detectIntent(
    message: string,
    context: MessageContext,
    conversationHistory?: ConversationMessageData[]
  ): Promise<MessageIntent> {
    try {
      // Get patient context for LLM
      const patientContext = await this.patientContextService.getPatientContext(
        context.phoneNumber
      );

      // Build conversation context for LLM with conversation history
      const llmContext: ConversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages: (
          conversationHistory ||
          context.previousMessages ||
          []
        ).map((msg) => ({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.message,
        })),
        patientInfo:
          patientContext.found && patientContext.context
            ? {
                name: patientContext.context.patient.name,
                verificationStatus:
                  patientContext.context.patient.verificationStatus,
                activeReminders: patientContext.context.activeReminders.map(
                  (r) => ({
                    medicationName: r.customMessage || "obat",
                    scheduledTime: r.scheduledTime,
                  })
                ),
              }
            : undefined,
      };

      // Use LLM for intent detection
      const llmResult = await llmService.detectIntent(message, llmContext);

      // Map LLM intent to our internal intent types
      const primaryIntent = this.mapLLMIntentToInternal(llmResult.intent);

      // Determine sentiment
      const sentiment = this.determineSentiment(message, primaryIntent);

      return {
        primary: primaryIntent,
        sentiment,
        confidence: llmResult.confidence,
        secondary: [llmResult.intent], // Keep original LLM intent as secondary
      };
    } catch (error) {
      console.error(
        "LLM intent detection failed, falling back to keyword-based:",
        error
      );

      // Fallback to keyword-based detection if LLM fails
      return this.fallbackKeywordIntentDetection(message);
    }
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(message: string, keywords: string[]): number {
    let score = 0;

    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        // Exact match gets higher score
        if (message === keyword) {
          score += 10;
        } else {
          score += keyword.length;
        }
      }

      // Check for fuzzy matches (partial words)
      const fuzzyMatches = this.findFuzzyMatches(message, keyword);
      score += fuzzyMatches * (keyword.length * 0.5);
    }

    return score;
  }

  /**
   * Find fuzzy matches for typos and variations
   */
  private findFuzzyMatches(message: string, keyword: string): number {
    // Simple Levenshtein distance for fuzzy matching
    const words = message.split(" ");
    let matches = 0;

    for (const word of words) {
      if (this.levenshteinDistance(word, keyword) <= 2) {
        matches++;
      }
    }

    return matches;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Determine sentiment of the message
   */
  private determineSentiment(
    message: string,
    intent: MessageIntent["primary"]
  ): MessageIntent["sentiment"] {
    const { positive, negative } = this.calculateWordBasedSentiment(message);

    if (positive > negative) return "positive";
    if (negative > positive) return "negative";

    // Default sentiment based on intent
    return this.getDefaultSentimentForIntent(intent);
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = [];

    // Extract different types of entities
    entities.push(...this.extractTimeEntities(message));
    entities.push(...this.extractEmergencyEntities(message));

    return entities;
  }

  /**
   * Determine conversation context
   */
  private async determineContext(
    context: MessageContext,
    intent: MessageIntent
  ): Promise<MessageContext> {
    // This would typically query the database for conversation state
    // For now, return the context as-is with enhanced information
    return {
      ...context,
      conversationState: {
        id: `conv_${context.patientId}_${Date.now()}`,
        patientId: context.patientId,
        currentContext: this.mapIntentToContext(intent.primary),
        expectedResponseType: this.getExpectedResponseType(intent.primary),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Map intent to conversation context
   */
  private mapIntentToContext(
    intent: MessageIntent["primary"]
  ): ConversationState["currentContext"] {
    switch (intent) {
      case "accept":
      case "decline":
        return "verification";
      case "confirm_taken":
      case "confirm_missed":
      case "confirm_later":
        return "reminder_confirmation";
      case "emergency":
        return "emergency";
      case "inquiry":
        return "general_inquiry";
      default:
        return "general_inquiry";
    }
  }

  /**
   * Get expected response type for intent
   */
  private getExpectedResponseType(
    intent: MessageIntent["primary"]
  ): ConversationState["expectedResponseType"] {
    switch (intent) {
      case "accept":
      case "decline":
      case "confirm_taken":
      case "confirm_missed":
        return "yes_no";
      case "confirm_later":
        return "text";
      case "inquiry":
        return "text";
      default:
        return "text";
    }
  }

  /**
   * Generate recommended response
   */
  private async generateResponse(
    intent: MessageIntent,
    entities: MessageEntity[],
    context: MessageContext
  ): Promise<RecommendedResponse> {
    // For high confidence intents, try to generate natural language response using LLM
    if ((intent.confidence ?? 0.5) >= this.CONFIDENCE_THRESHOLD) {
      try {
        const llmResponse = await this.generateLLMResponse(intent, context);
        if (llmResponse) {
          return llmResponse;
        }
      } catch (error) {
        console.warn(
          "LLM response generation failed, falling back to template:",
          error
        );
      }
    }

    // Fallback to template-based responses
    switch (intent.primary) {
      case "accept":
        return this.generateAcceptResponse();
      case "decline":
        return this.generateDeclineResponse();
      case "confirm_taken":
        return this.generateConfirmTakenResponse(context);
      case "confirm_missed":
        return this.generateConfirmMissedResponse(context);
      case "emergency":
        return this.generateEmergencyResponse(context);
      case "unsubscribe":
        return this.generateUnsubscribeResponse();
      default:
        return this.generateLowConfidenceResponse(intent);
    }
  }

  /**
   * Check if message requires human intervention
   */
  private requiresHumanIntervention(
    intent: MessageIntent,
    entities: MessageEntity[]
  ): boolean {
    // Emergency situations always require human intervention
    if (intent.primary === "emergency") return true;

    // Low confidence intents need human review
    if ((intent.confidence ?? 0.5) < this.LOW_CONFIDENCE_THRESHOLD) return true;

    // Complex entities might need human interpretation
    if (entities.some((entity) => entity.confidence < 0.5)) return true;

    // Inquiries typically need human response
    if (intent.primary === "inquiry") return true;

    // Messages with negative sentiment might need attention
    if (intent.sentiment === "negative") return true;

    return false;
  }

  /**
   * Generate response for accept intent
   */
  private generateAcceptResponse(): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "update_patient_status",
      data: { status: "verified" },
    });
    return {
      type: "auto_reply",
      message:
        "Terima kasih atas konfirmasinya! Anda akan menerima pengingat obat secara otomatis.",
      actions,
      priority: "low",
    };
  }

  /**
   * Generate response for decline intent
   */
  private generateDeclineResponse(): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "update_patient_status",
      data: { status: "declined" },
    });
    return {
      type: "auto_reply",
      message:
        "Baik, terima kasih atas responsnya. Jika berubah pikiran, Anda bisa menghubungi relawan PRIMA.",
      actions,
      priority: "low",
    };
  }

  /**
   * Generate response for confirm_taken intent
   */
  private generateConfirmTakenResponse(
    context: MessageContext
  ): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "log_confirmation",
      data: { status: "CONFIRMED", response: context.message },
    });
    return {
      type: "auto_reply",
      message: "Bagus! Terus jaga kesehatan ya. 💊❤️",
      actions,
      priority: "low",
    };
  }

  /**
   * Generate response for confirm_missed intent
   */
  private generateConfirmMissedResponse(
    context: MessageContext
  ): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "log_confirmation",
      data: { status: "MISSED", response: context.message },
    });
    actions.push({
      type: "send_followup",
      data: { type: "reminder", delay: 2 * 60 * 60 * 1000 }, // 2 hours
    });
    return {
      type: "auto_reply",
      message:
        "Jangan lupa minum obat berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙",
      actions,
      priority: "medium",
    };
  }

  /**
   * Generate response for emergency intent
   */
  private generateEmergencyResponse(
    context: MessageContext
  ): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "notify_volunteer",
      data: { priority: "urgent", message: context.message },
    });
    return {
      type: "human_intervention",
      message:
        "Kami mendeteksi ini sebagai situasi darurat. Relawan akan segera menghubungi Anda.",
      actions,
      priority: "urgent",
    };
  }

  /**
   * Generate response for unsubscribe intent
   */
  private generateUnsubscribeResponse(): RecommendedResponse {
    const actions: ResponseAction[] = [];
    actions.push({
      type: "update_patient_status",
      data: { status: "unsubscribed" },
    });
    return {
      type: "auto_reply",
      message:
        "Baik, kami akan berhenti mengirim pengingat. Semoga sehat selalu! 🙏",
      actions,
      priority: "low",
    };
  }

  /**
   * Generate response for low confidence or unknown intent
   */
  private generateLowConfidenceResponse(
    intent: MessageIntent
  ): RecommendedResponse {
    const confidence = intent.confidence ?? 0.5;

    if (confidence < this.LOW_CONFIDENCE_THRESHOLD) {
      const actions: ResponseAction[] = [];
      actions.push({
        type: "notify_volunteer",
        data: {
          priority: "medium",
          reason: "low_confidence_llm",
          originalIntent: intent.primary,
          confidence: confidence,
        },
      });
      return {
        type: "human_intervention",
        message:
          "Maaf, saya kurang yakin memahami pesan Anda. Relawan kami akan segera membantu.",
        actions,
        priority: "medium",
      };
    }

    if (confidence < this.CONFIDENCE_THRESHOLD) {
      // Medium confidence - provide basic response but flag for potential review
      const actions: ResponseAction[] = [];
      actions.push({
        type: "notify_volunteer",
        data: {
          priority: "low",
          reason: "medium_confidence_llm",
          originalIntent: intent.primary,
          confidence: confidence,
        },
      });
      return {
        type: "auto_reply",
        message:
          "Terima kasih atas pesannya. Jika ini bukan yang Anda maksud, silakan jelaskan lebih lanjut.",
        actions,
        priority: "low",
      };
    }

    return {
      type: "auto_reply",
      message:
        "Terima kasih atas pesannya. Jika ada yang bisa dibantu, silakan beri tahu.",
      actions: [],
      priority: "low",
    };
  }

  /**
   * Generate natural language response using LLM
   */
  private async generateLLMResponse(
    intent: MessageIntent,
    context: MessageContext
  ): Promise<RecommendedResponse | null> {
    try {
      // Get patient context for LLM
      const patientContext = await this.patientContextService.getPatientContext(
        context.phoneNumber
      );

      // Build conversation context for LLM
      const llmContext: ConversationContext = {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        previousMessages:
          context.previousMessages?.map((msg) => ({
            role: msg.direction === "inbound" ? "user" : "assistant",
            content: msg.message,
          })) || [],
        patientInfo:
          patientContext.found && patientContext.context
            ? {
                name: patientContext.context.patient.name,
                verificationStatus:
                  patientContext.context.patient.verificationStatus,
                activeReminders: patientContext.context.activeReminders.map(
                  (r) => ({
                    medicationName: r.customMessage || "obat",
                    scheduledTime: r.scheduledTime,
                  })
                ),
              }
            : undefined,
      };

      // Generate response using LLM
      const llmResponse = await llmService.generatePatientResponse(
        intent.primary,
        llmContext,
        `Intent confidence: ${intent.confidence}. Handle appropriately.`
      );

      // Store LLM response metadata in conversation
      if (llmResponse) {
        await this.conversationStateService.addMessage(
          context.conversationState?.id || "",
          {
            message: llmResponse.content,
            direction: "outbound",
            messageType: this.mapIntentToMessageType(intent.primary),
            intent: intent.primary,
            confidence: intent.confidence
              ? Math.round(intent.confidence * 100)
              : undefined,
            llmResponseId: llmResponse.model, // Use model as response ID for now
            llmModel: llmResponse.model,
            llmTokensUsed: llmResponse.tokensUsed,
            llmCost: this.calculateLLMCost(llmResponse.tokensUsed),
            llmResponseTimeMs: llmResponse.responseTime,
            processedAt: new Date(),
          }
        );
      }

      // Map to our response format
      const actions: ResponseAction[] = [];

      // Add appropriate actions based on intent
      switch (intent.primary) {
        case "accept":
          actions.push({
            type: "update_patient_status",
            data: { status: "verified" },
          });
          break;
        case "decline":
          actions.push({
            type: "update_patient_status",
            data: { status: "declined" },
          });
          break;
        case "confirm_taken":
          actions.push({
            type: "log_confirmation",
            data: { status: "CONFIRMED", response: context.message },
          });
          break;
        case "confirm_missed":
          actions.push({
            type: "log_confirmation",
            data: { status: "MISSED", response: context.message },
          });
          actions.push({
            type: "send_followup",
            data: { type: "reminder", delay: 2 * 60 * 60 * 1000 },
          });
          break;
        case "unsubscribe":
          actions.push({
            type: "update_patient_status",
            data: { status: "unsubscribed" },
          });
          break;
        case "emergency":
          actions.push({
            type: "notify_volunteer",
            data: { priority: "urgent", message: context.message },
          });
          return {
            type: "human_intervention",
            message: llmResponse.content,
            actions,
            priority: "urgent",
          };
      }

      return {
        type: "auto_reply",
        message: llmResponse.content,
        actions,
        priority: (intent.primary as string) === "emergency" ? "urgent" : "low",
      };
    } catch (error) {
      console.error("LLM response generation failed:", error);
      return null;
    }
  }

  /**
   * Generate direct LLM response without intent detection
   */
  private async generateDirectLLMResponse(
    message: string,
    context: ConversationContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fullPatientContext?: any
  ): Promise<ProcessedLLMResponse | null> {
    try {
      const systemPrompt = this.buildDirectResponsePrompt(
        context,
        fullPatientContext
      );

      const request: LLMRequest = {
        messages: [
          { role: "system", content: systemPrompt },
          ...context.previousMessages.slice(-10), // More context for response generation
          { role: "user", content: message },
        ],
        maxTokens: 500,
        temperature: 0.7,
      };

      const response = await llmService.generateResponse(request);

      // Apply safety filtering to LLM response
      const safetyResult = await safetyFilterService.filterLLMResponse(
        response,
        context
      );

      let finalResponse = response;
      if (!safetyResult.isSafe) {
        logger.warn(
          "LLM response failed safety filter, using sanitized version",
          {
            patientId: context.patientId,
            violations: safetyResult.violations.length,
          }
        );

        // Sanitize the response
        finalResponse = {
          ...response,
          content: safetyFilterService.sanitizeContent(
            response.content,
            safetyResult.violations
          ),
        };
      }

      return finalResponse;
    } catch (error) {
      logger.error("Direct LLM response generation failed:", error as Error);
      return null;
    }
  }

  /**
   * Build system prompt for direct LLM response generation
   */
  private buildDirectResponsePrompt(
    context: ConversationContext,
    fullPatientContext?: FullPatientContext
  ): string {
    const patientInfo = context.patientInfo;
    const activeReminders = patientInfo?.activeReminders || [];

    // Build comprehensive patient information
    let patientDetails = `PATIENT INFORMATION:
- Name: ${patientInfo?.name || "Unknown Patient"}
- Phone: ${context.phoneNumber}
- Verification Status: ${patientInfo?.verificationStatus || "Unknown"}`;

    if (fullPatientContext) {
      const patient = fullPatientContext.patient;
      const todaysReminders = fullPatientContext.todaysReminders || [];
      const medicalHistory = fullPatientContext.medicalHistory || {};
      const recentHealthNotes = fullPatientContext.recentHealthNotes || [];
      const patientVariables = fullPatientContext.patientVariables || [];

      patientDetails += `
- Age: ${
        patient.birthDate
          ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
          : "Unknown"
      }
- Cancer Stage: ${patient.cancerStage || "Unknown"}
- Diagnosis Date: ${
        patient.diagnosisDate
          ? new Date(patient.diagnosisDate).toLocaleDateString("id-ID")
          : "Unknown"
      }
- Doctor: ${patient.doctorName || "Unknown"}
- Hospital: ${patient.hospitalName || "Unknown"}
- Emergency Contact: ${patient.emergencyContactName || "Unknown"} (${
        patient.emergencyContactPhone || "Unknown"
      })
- Address: ${patient.address || "Unknown"}
- Notes: ${patient.notes || "None"}`;

      if (todaysReminders.length > 0) {
        patientDetails += `
- Today's Reminders: ${todaysReminders
          .map(
            (r) =>
              `${r.medicationName || r.customMessage || "obat"} at ${
                r.scheduledTime
              }`
          )
          .join(", ")}`;
      }

      if (activeReminders.length > 0) {
        patientDetails += `
- Active Medications: ${activeReminders
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => r.customMessage || "obat")
          .join(", ")}`;
      }

      if (medicalHistory.symptoms && medicalHistory.symptoms.length > 0) {
        patientDetails += `
- Recent Symptoms: ${medicalHistory.symptoms
          .slice(0, 3)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => s.symptom)
          .join(", ")}`;
      }

      if (recentHealthNotes.length > 0) {
        patientDetails += `
- Recent Health Notes: ${recentHealthNotes
          .slice(0, 2)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((n: any) => n.note.substring(0, 50) + "...")
          .join("; ")}`;
      }

      if (patientVariables.length > 0) {
        patientDetails += `
- Custom Variables: ${patientVariables
          .slice(0, 3)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((v: any) => `${v.name}: ${v.value}`)
          .join(", ")}`;
      }
    } else if (activeReminders.length > 0) {
      patientDetails += `
- Active Medications: ${activeReminders
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.medicationName)
        .join(", ")}`;
    }

    return `You are a helpful healthcare assistant for PRIMA (Palliative Remote Integrated Monitoring and Assistance) system communicating with cancer patients via WhatsApp.

${patientDetails}

CONVERSATION CONTEXT:
You have access to the previous conversation messages above. Use this context to provide relevant, personalized responses.

RESPONSE GUIDELINES:
- Always respond in Indonesian (Bahasa Indonesia)
- Be friendly, empathetic, supportive, and professional
- Provide comprehensive, informative responses that satisfy user questions
- Share general educational information about palliative care, cancer support, and wellness
- Explain concepts clearly with examples when helpful
- Include practical tips and resources when appropriate
- Never give personalized medical advice, diagnoses, or treatment recommendations
- For medical concerns, always direct to consult healthcare professionals
- For emergencies, immediately direct to appropriate help and alert volunteers
- Include PRIMA branding and offer further assistance
- Use simple, clear language that cancer patients can easily understand
- Acknowledge emotions and provide emotional support
- End responses by offering to connect with PRIMA volunteers for more personalized support

RESPONSE FORMAT:
Provide a comprehensive, natural response that fully addresses the patient's question or concern while maintaining safety and professionalism.`;
  }

  /**
   * Create response object from LLM output
   */
  private createResponseFromLLM(
    llmResponse: ProcessedLLMResponse | null,
    safetyAnalysis: {
      emergencyDetected: boolean;
      escalationRequired: boolean;
    },
    context: MessageContext
  ): RecommendedResponse {
    // Handle emergency situations
    if (safetyAnalysis.emergencyDetected) {
      return {
        type: "human_intervention",
        message:
          "Kami mendeteksi ini sebagai situasi darurat. Relawan akan segera menghubungi Anda.",
        actions: [
          {
            type: "notify_volunteer",
            data: { priority: "urgent", message: context.message },
          },
        ],
        priority: "urgent",
      };
    }

    // Handle cases requiring human intervention
    if (safetyAnalysis.escalationRequired) {
      return {
        type: "human_intervention",
        message:
          "Pesan Anda memerlukan perhatian khusus. Relawan kami akan segera membantu.",
        actions: [
          {
            type: "notify_volunteer",
            data: { priority: "high", message: context.message },
          },
        ],
        priority: "medium",
      };
    }

    // Use LLM response if available
    if (llmResponse) {
      return {
        type: "auto_reply",
        message: llmResponse.content,
        actions: [],
        priority: "low",
      };
    }

    // Fallback response
    return {
      type: "auto_reply",
      message:
        "Terima kasih atas pesannya. Jika ada yang bisa dibantu, silakan beri tahu.",
      actions: [],
      priority: "low",
    };
  }

  /**
   * Calculate LLM cost based on tokens and model
   */
  private calculateLLMCost(tokensUsed: number): number {
    // Gemini pricing (approximate)
    const costPerThousandTokens = 0.0005; // $0.0005 per 1K tokens for gemini-2.0-flash-exp
    return (tokensUsed / 1000) * costPerThousandTokens;
  }

  /**
   * Calculate scores for all intents
   */
  private calculateIntentScores(message: string): Record<string, number> {
    return {
      accept: this.calculateKeywordScore(message, this.ACCEPT_KEYWORDS),
      decline: this.calculateKeywordScore(message, this.DECLINE_KEYWORDS),
      confirm_taken: this.calculateKeywordScore(
        message,
        this.CONFIRMATION_TAKEN_KEYWORDS
      ),
      confirm_missed: this.calculateKeywordScore(
        message,
        this.CONFIRMATION_MISSED_KEYWORDS
      ),
      confirm_later: this.calculateKeywordScore(
        message,
        this.CONFIRMATION_LATER_KEYWORDS
      ),
      unsubscribe: this.calculateKeywordScore(
        message,
        this.UNSUBSCRIBE_KEYWORDS
      ),
      emergency: this.calculateKeywordScore(message, this.EMERGENCY_KEYWORDS),
      inquiry: this.calculateKeywordScore(message, this.INQUIRY_KEYWORDS),
    };
  }

  /**
   * Select primary intent from scores
   */
  private selectPrimaryIntent(
    scores: Record<string, number>
  ): MessageIntent["primary"] {
    const maxScore = Math.max(...Object.values(scores));
    return (
      (Object.keys(scores).find(
        (key) => scores[key] === maxScore
      ) as MessageIntent["primary"]) || "unknown"
    );
  }

  /**
   * Calculate confidence for intent
   */
  private calculateIntentConfidence(maxScore: number, message: string): number {
    return Math.min((maxScore / message.length) * 100, 1.0) || 0.5;
  }

  /**
   * Calculate sentiment score based on positive/negative words
   */
  private calculateWordBasedSentiment(message: string): {
    positive: number;
    negative: number;
  } {
    const positiveWords = [
      "baik",
      "bagus",
      "senang",
      "terima kasih",
      "makasih",
      "thanks",
      "good",
    ];
    const negativeWords = [
      "buruk",
      "jelek",
      "marah",
      "kesal",
      "kecewa",
      "tidak suka",
      "bad",
    ];

    const positiveScore = positiveWords.reduce(
      (score, word) => score + (message.includes(word) ? 1 : 0),
      0
    );
    const negativeScore = negativeWords.reduce(
      (score, word) => score + (message.includes(word) ? 1 : 0),
      0
    );

    return { positive: positiveScore, negative: negativeScore };
  }

  /**
   * Get default sentiment based on intent
   */
  private getDefaultSentimentForIntent(
    intent: MessageIntent["primary"]
  ): MessageIntent["sentiment"] {
    switch (intent) {
      case "accept":
      case "confirm_taken":
        return "positive";
      case "decline":
      case "confirm_missed":
      case "unsubscribe":
        return "negative";
      default:
        return "neutral";
    }
  }

  /**
   * Extract time entities from message
   */
  private extractTimeEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = [];
    const timePattern = /\b(\d{1,2}):(\d{2})\b/g;
    let match;
    while ((match = timePattern.exec(message)) !== null) {
      entities.push({
        type: "time",
        value: `${match[1]}:${match[2]}`,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
    return entities;
  }

  /**
   * Extract emergency entities from message
   */
  private extractEmergencyEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = [];
    if (this.EMERGENCY_KEYWORDS.some((keyword) => message.includes(keyword))) {
      entities.push({
        type: "emergency_level",
        value: "high",
        confidence: 0.7,
        position: { start: 0, end: message.length },
      });
    }
    return entities;
  }
}
