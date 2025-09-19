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
import { tokenizerService } from "@/lib/simple-tokenizer";
import { llmCostService } from "@/lib/llm-cost-service";

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
    | "reminder_inquiry"
    | "health_notes_inquiry"
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
    | "create_manual_confirmation"
    | "deactivate_reminders"
    | "log_verification_event";
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
   * Check if message is an accept response (for verification context)
   */
  private isAcceptResponse(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    return this.ACCEPT_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  /**
   * Determine if message needs intent detection based on keywords and context
   */
  private shouldUseIntentDetection(
    message: string,
    conversationState: ConversationState,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: MessageContext
  ): boolean {
    // Always use intent detection for verification and reminder contexts
    if (
      conversationState.currentContext === "verification" ||
      conversationState.currentContext === "reminder_confirmation"
    ) {
      return true;
    }

    const normalizedMessage = message.toLowerCase();

    // Use intent detection for messages containing verification/confirmation/reminder keywords
    const verificationKeywords = ["ya", "tidak", "iya", "yes", "no"];
    const confirmationKeywords = [
      "sudah",
      "belum",
      "udh",
      "blm",
      "selesai",
      "lakukan",
      "keduanya",
      "semuanya",
    ];

    const hasVerificationKeywords = verificationKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    const hasConfirmationKeywords = confirmationKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    const hasReminderInquiryKeywords = this.REMINDER_INQUIRY_KEYWORDS.some(
      (keyword) => normalizedMessage.includes(keyword)
    );
    const hasHealthNotesInquiryKeywords = this.HEALTH_NOTES_INQUIRY_KEYWORDS.some(
      (keyword) => normalizedMessage.includes(keyword)
    );

    // Use intent detection if message contains relevant keywords
    return (
      hasVerificationKeywords ||
      hasConfirmationKeywords ||
      hasReminderInquiryKeywords ||
      hasHealthNotesInquiryKeywords
    );
  }

  /**
   * Check if message should use LLM-based unsubscribe detection
   */
  private shouldUseLLMUnsubscribeDetection(message: string): boolean {
    const normalizedMessage = message.toLowerCase();

    // Extended unsubscribe keywords that need LLM analysis for better context
    const unsubscribeIndicators = [
      "berhenti",
      "stop",
      "matikan",
      "hentikan",
      "cukup",
      "tidak mau lagi",
      "sudah sembuh",
      "tidak sakit lagi",
      "tidak butuh lagi",
      "berhenti dong",
      "cukup sampai sini",
      "saya sudah tidak sakit",
      "boleh berhenti",
      "maaf mau berhenti",
      "terima kasih mau berhenti",
      "keluar",
      "batal",
      "cancel",
      "unsubscribe",
      "tidak ingin",
      "mau berhenti",
      "hentikan",
      "stop dulu",
      "berhenti dulu",
    ];

    return unsubscribeIndicators.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
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

  private readonly REMINDER_INQUIRY_KEYWORDS = [
    "reminder",
    "pengingat",
    "jadwal",
    "schedule",
    "apa reminder saya",
    "lihat reminder",
    "cek reminder",
    "reminder hari ini",
    "reminder besok",
    "ada reminder",
    "apa ada pengingat",
    "kapan pengingat",
    "remindernya hari ini apa saja",
    "pengingat hari ini apa saja",
    "jadwal hari ini",
    "jadwal reminder hari ini",
    "pengingat untuk hari ini",
    "reminder untuk hari ini",
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

  private readonly HEALTH_NOTES_INQUIRY_KEYWORDS = [
    "catatan kesehatan",
    "catatan kesehatannya",
    "catatan kesehatan apa saja",
    "health notes",
    "notes",
    "catatan medis",
    "catatan kesehatan hari ini",
    "catatan kesehatan terbaru",
    "riwayat kesehatan",
    "kondisi kesehatan",
    "catatan kesehatan untuk hari ini",
  ];

  /**
   * Map LLM intent to internal intent types
   */
  private mapLLMIntentToInternal(llmIntent: string): MessageIntent["primary"] {
    switch (llmIntent) {
      case "verification_response":
        return "accept"; // Will be refined based on YA/TIDAK in response generation
      case "reminder_confirmation":
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
    const startTime = Date.now();
    const normalizedMessage = this.normalizeMessage(context.message);

    // Declare variables at function scope
    let intent: MessageIntent;
    let entities: MessageEntity[] = [];
    let llmResponse: ProcessedLLMResponse | null = null;
    let needsIntentDetection = false;

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

    // Check if patient is already verified but conversation is still in verification context
    // If so, switch to general_inquiry context for proper LLM processing
    if (
      conversationState.currentContext === "verification" &&
      context.verificationStatus === "VERIFIED"
    ) {
      logger.info(
        "Switching verified patient conversation from verification to general_inquiry context",
        {
          patientId: context.patientId,
          phoneNumber: context.phoneNumber,
          conversationStateId: conversationState.id,
        }
      );

      conversationState = await this.conversationStateService.switchContext(
        conversationState.id,
        "general_inquiry"
      );
    }

    // Get conversation history for context
    const conversationHistory =
      await this.conversationStateService.getConversationHistory(
        conversationState.id,
        20 // Last 20 messages for context
      );

    // Special handling for verification context - always treat "ya" variations as acceptance
    if (conversationState.currentContext === "verification") {
      const isAcceptResponse = this.isAcceptResponse(normalizedMessage);
      if (isAcceptResponse) {
        intent = {
          primary: "accept",
          sentiment: "positive",
          confidence: 1.0,
        };
        entities = [];
      } else {
        // For verification context, if not "ya", treat as decline
        intent = {
          primary: "decline",
          sentiment: "negative",
          confidence: 1.0,
        };
        entities = [];
      }
    } else {
      // Always check for unsubscribe keywords first, regardless of context
      const shouldUseLLMForUnsubscribe =
        this.shouldUseLLMUnsubscribeDetection(normalizedMessage);

      if (shouldUseLLMForUnsubscribe) {
        // Use LLM-based unsubscribe detection for better understanding
        intent = await this.detectIntent(
          normalizedMessage,
          context,
          conversationHistory
        );
        entities = this.extractEntities(normalizedMessage);
        needsIntentDetection = true;

        // Override intent if LLM detection results in unsubscribe
        if (intent.primary === "unsubscribe") {
          // Keep the LLM-detected intent with enhanced confidence
          intent.confidence = Math.max(intent.confidence || 0.7, 0.8);
          intent.sentiment = "negative";
        }
      } else {
        // Fallback to original keyword-based unsubscribe detection
        const hasUnsubscribeKeywords = this.UNSUBSCRIBE_KEYWORDS.some(
          (keyword) => normalizedMessage.includes(keyword)
        );

        if (hasUnsubscribeKeywords) {
          // Force unsubscribe intent detection for messages with unsubscribe keywords
          intent = {
            primary: "unsubscribe",
            sentiment: "negative",
            confidence: 0.9, // High confidence for keyword-based detection
          };
          entities = this.extractEntities(normalizedMessage);
        } else {
          // Determine if this message needs intent classification
          needsIntentDetection = this.shouldUseIntentDetection(
            normalizedMessage,
            conversationState,
            context
          );

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
        }
      }
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
                  reminderMessage: r.customMessage || "pengingat",
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

    // Special handling for verification context - NEVER use LLM for response generation
    if (conversationState.currentContext === "verification") {
      recommendedResponse = await this.generateResponse(
        intent,
        entities,
        context
      );
    } else if (
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
      // Track cost for the LLM response
      await llmCostService.trackMessageCost(
        conversationState.id,
        normalizedMessage, // Input text
        llmResponse.content, // Output text
        llmResponse.model,
        Date.now() - startTime
      );

      // Store LLM response metadata in conversation
      const outboundMessageData =
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
          llmCost: 0, // Cost will be tracked by llmCostService separately
          llmResponseTimeMs: llmResponse.responseTime,
          processedAt: new Date(),
        });

      // Log cost tracking for monitoring
      logger.debug("LLM response processed", {
        conversationId: conversationState.id,
        messageId: outboundMessageData.id,
        tokens: llmResponse.tokensUsed,
        responseTime: llmResponse.responseTime,
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
   * Map intent to operation type for cost tracking
   */
  private mapIntentToOperationType(
    intent: MessageIntent["primary"]
  ): string {
    switch (intent) {
      case "accept":
      case "decline":
        return "intent_detection";
      case "confirm_taken":
      case "confirm_missed":
      case "confirm_later":
        return "response_generation";
      case "emergency":
        return "safety_filter";
      case "inquiry":
        return "direct_response";
      default:
        return "response_generation";
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
                    reminderMessage: r.customMessage || "pengingat",
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
    // For verification intents, ALWAYS use template responses to ensure consistency
    // NEVER use LLM for verification response generation
    if (intent.primary === "accept" || intent.primary === "decline") {
      switch (intent.primary) {
        case "accept":
          return this.generateAcceptResponse();
        case "decline":
          return this.generateDeclineResponse();
        default:
          break;
      }
    }

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
      case "confirm_taken":
        return this.generateConfirmTakenResponse(context);
      case "confirm_missed":
        return this.generateConfirmMissedResponse(context);
      case "emergency":
        return this.generateEmergencyResponse(context);
      case "unsubscribe":
        return this.generateUnsubscribeResponse();
      case "reminder_inquiry":
        return this.generateReminderInquiryResponse(context);
      case "health_notes_inquiry":
        return this.generateHealthNotesInquiryResponse(context);
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
        "Terima kasih atas konfirmasinya! Anda akan menerima pengingat secara otomatis.",
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
      message: "Bagus! Terus jaga kesehatan ya. 💙",
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
        "Jangan lupa pengingat berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙",
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
      data: {
        verificationStatus: "declined",
        isActive: false,
      },
    });
    actions.push({
      type: "deactivate_reminders",
      data: {},
    });
    actions.push({
      type: "log_verification_event",
      data: {
        action: "unsubscribe",
        verificationResult: "declined",
      },
    });
    return {
      type: "auto_reply",
      message:
        "Baik, kami akan berhenti mengirimkan pengingat. 🛑\n\nSemua pengingat telah dinonaktifkan.\n\nJika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏💙",
      actions,
      priority: "low",
    };
  }

  /**
   * Generate response for reminder inquiry intent
   */
  private async generateReminderInquiryResponse(
    context: MessageContext
  ): Promise<RecommendedResponse> {
    const actions: ResponseAction[] = [];

    try {
      // Import reminder service for real-time data access
      const { ReminderService } = await import("@/services/reminder/reminder.service");
      const reminderService = new ReminderService();

      // Get today's reminders in real-time
      const todaysReminders = await reminderService.getTodaysReminders(context.patientId);

      let message = `Halo ${
        context.patientName || "pasien"
      }, berikut informasi pengingat Anda:\n\n`;

      if (todaysReminders.length > 0) {
        message += "📅 *Pengingat Hari Ini:*\n";
        todaysReminders.forEach((reminder, index) => {
          const reminderMessage = reminder.message || "pengingat";
          const scheduledTime = reminder.scheduledTime || "waktu yang dijadwalkan";
          const status = reminder.isCompleted ? "✅ Selesai" : "⏰ Menunggu";
          const timeRemaining = reminder.timeRemaining ? `(${reminder.timeRemaining})` : "";

          message += `${index + 1}. Pukul ${scheduledTime}: ${reminderMessage} ${status} ${timeRemaining}\n`;
        });
        message += "\n";
      } else {
        message +=
          "📅 *Hari Ini:* Tidak ada pengingat yang dijadwalkan.\n\n";
      }

      // Add summary statistics
      const completedCount = todaysReminders.filter(r => r.isCompleted).length;
      const pendingCount = todaysReminders.filter(r => !r.isCompleted).length;

      message += "📊 *Ringkasan Hari Ini:*\n";
      message += `- Total pengingat: ${todaysReminders.length}\n`;
      message += `- Selesai: ${completedCount}\n`;
      message += `- Menunggu: ${pendingCount}\n\n`;

    message +=
      "💙 Jika ada pertanyaan, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏";

    return {
      type: "auto_reply",
      message,
      actions,
      priority: "low",
    };
    } catch (error) {
      logger.error("Failed to generate reminder inquiry response", error as Error, {
        patientId: context.patientId,
      });

      // Fallback response if service fails
      return {
        type: "auto_reply",
        message: `Halo ${context.patientName || "pasien"}, maaf saat ini tidak dapat mengambil jadwal pengingat Anda. Silakan hubungi relawan PRIMA untuk informasi lebih lengkap. 💙`,
        actions,
        priority: "low",
      };
    }
  }

  /**
   * Generate response for health notes inquiry intent
   */
  private async generateHealthNotesInquiryResponse(
    context: MessageContext
  ): Promise<RecommendedResponse> {
    const actions: ResponseAction[] = [];

    try {
      // Import health notes service
      const { healthNotesQueryService } = await import("@/services/patient/health-notes-query.service");

      // Get today's health notes for the patient
      const todayNotes = await healthNotesQueryService.queryHealthNotes(context.patientId, {
        timeRange: "hari_ini",
        limit: 10
      });

      // Get recent health summary
      const healthSummary = await healthNotesQueryService.getRecentHealthSummary(context.patientId, 7);

      let message = `Halo ${context.patientName || "pasien"}, berikut informasi catatan kesehatan Anda:\n\n`;

      if (todayNotes.notes.length > 0) {
        message += "📋 *Catatan Kesehatan Hari Ini:*\n";
        todayNotes.notes.forEach((note, index) => {
          const date = new Date(note.noteDate).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          message += `${index + 1}. ${date}: ${note.note.substring(0, 100)}${note.note.length > 100 ? '...' : ''}\n`;
        });
        message += "\n";
      } else {
        message += "📋 *Hari Ini:* Tidak ada catatan kesehatan yang dicatat hari ini.\n\n";
      }

      // Add recent health summary
      message += "📊 *Ringkasan Kesehatan Terkini:*\n";
      message += `${healthSummary}\n\n`;

      message += "💙 Jika ada pertanyaan tentang catatan kesehatan Anda, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏";

      return {
        type: "auto_reply",
        message,
        actions,
        priority: "low",
      };
    } catch (error) {
      logger.error("Failed to generate health notes inquiry response", error as Error, {
        patientId: context.patientId,
      });

      // Fallback response if service fails
      return {
        type: "auto_reply",
        message: `Halo ${context.patientName || "pasien"}, maaf saat ini tidak dapat mengambil catatan kesehatan Anda. Silakan hubungi relawan PRIMA untuk informasi lebih lengkap. 💙`,
        actions,
        priority: "low",
      };
    }
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
    // CRITICAL: Never use LLM for verification response generation
    // Verification responses must use templates to ensure consistency and avoid inappropriate content
    if (
      intent.primary === "accept" ||
      intent.primary === "decline" ||
      intent.primary === "unsubscribe"
    ) {
      logger.warn("LLM response generation blocked for critical intents", {
        intent: intent.primary,
        patientId: context.patientId,
        operation: "critical_intent_protection",
      });
      return null; // Force fallback to template responses
    }

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
                    reminderMessage: r.customMessage || "pengingat",
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
        // Track cost for the LLM response
        await llmCostService.trackMessageCost(
          context.conversationState?.id || "",
          "", // No specific input text for direct response
          llmResponse.content,
          llmResponse.model,
          llmResponse.responseTime
        );

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
            llmCost: 0, // Cost tracked by llmCostService separately
            llmResponseTimeMs: llmResponse.responseTime,
            processedAt: new Date(),
          }
        );
      }

      // Map to our response format
      const actions: ResponseAction[] = [];

      // Add appropriate actions based on intent
      // Note: accept/decline/unsubscribe cases are handled by template responses, not LLM
      switch (intent.primary) {
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
        message: this.convertMarkdownToWhatsApp(llmResponse.content),
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
    const startTime = Date.now();
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

      // Track cost for direct LLM response
      if (finalResponse) {
        await llmCostService.trackMessageCost(
          context.conversationId || "",
          message, // Input message
          finalResponse.content,
          finalResponse.model,
          Date.now() - startTime
        );
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fullPatientContext?: FullPatientContext
  ): string {
    const patientInfo = context.patientInfo;
    const activeReminders = patientInfo?.activeReminders || [];

    // Build concise patient information
    let patientDetails = `PATIENT: ${patientInfo?.name || "Unknown"}, Status: ${
      patientInfo?.verificationStatus || "Unknown"
    }`;

    if (activeReminders.length > 0) {
      patientDetails += `, Active reminders: ${activeReminders
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.reminderMessage || r.customMessage || "pengingat")
        .join(", ")}`;
    }

    return `You are PRIMA healthcare assistant for cancer patients via WhatsApp.

${patientDetails}

RESPONSE GUIDELINES:
- Respond in Indonesian, be friendly and professional
- Address patients by their first name only (e.g., "David" not "Bapak David" or "Ibu David")
- Never give medical advice, direct to professionals
- For emergencies, alert volunteers immediately
- Keep responses clear and supportive
- Use WhatsApp-compatible formatting (*bold* instead of **bold**)
- End with PRIMA branding`;
  }

  /**
   * Convert markdown formatting to WhatsApp compatible format
   */
  private convertMarkdownToWhatsApp(text: string): string {
    return (
      text
        // Convert **bold** to *bold* (WhatsApp format)
        .replace(/\*\*(.*?)\*\*/g, "*$1*")
        // Convert _italic_ to _italic_ (already WhatsApp compatible)
        // Convert ```code``` to ```code``` (already WhatsApp compatible)
        // Remove any other markdown that WhatsApp doesn't support
        .replace(/#{1,6}\s/g, "") // Remove headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to just text
        .replace(/^\s*[-*+]\s/gm, "• ") // Convert list items to bullet points
        .replace(/^\s*\d+\.\s/gm, "$1 ")
    ); // Keep numbered lists but clean them up
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
        message: this.convertMarkdownToWhatsApp(llmResponse.content),
        actions: [],
        priority: "low",
      };
    }

    // Intelligent fallback response based on message content
    const fallbackMessage = this.generateIntelligentFallbackResponse(
      context.message,
      "unknown" // Default intent for fallback
    );

    return {
      type: "auto_reply",
      message: fallbackMessage,
      actions: [],
      priority: "low",
    };
  }

  /**
   * Calculate LLM cost based on tokens and model
   */
  private calculateLLMCost(tokensUsed: number, model?: string): number {
    // Use tokenizer service for accurate cost calculation
    return tokenizerService.estimateCost(
      tokensUsed,
      model || "gemini-2.0-flash-exp"
    );
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
      reminder_inquiry: this.calculateKeywordScore(
        message,
        this.REMINDER_INQUIRY_KEYWORDS
      ),
      health_notes_inquiry: this.calculateKeywordScore(
        message,
        this.HEALTH_NOTES_INQUIRY_KEYWORDS
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

  /**
   * Generate intelligent fallback response based on message content
   */
  private generateIntelligentFallbackResponse(
    message: string,
    intent: MessageIntent["primary"]
  ): string {
    const normalizedMessage = message.toLowerCase().trim();

    // Check for greeting patterns
    if (this.isGreetingMessage(normalizedMessage)) {
      return "Halo! Saya adalah asisten PRIMA yang siap membantu Anda. Ada yang bisa saya bantu terkait kesehatan atau pengingat Anda? 💙";
    }

    // Check for question patterns
    if (this.isQuestionMessage(normalizedMessage)) {
      return "Saya melihat Anda memiliki pertanyaan. Untuk memberikan jawaban yang tepat, bisakah Anda memberikan sedikit detail lebih lanjut? Atau saya bisa membantu dengan informasi tentang pengingat Anda. 💙";
    }

    // Check for thank you patterns
    if (this.isThankYouMessage(normalizedMessage)) {
      return "Sama-sama! Saya di sini untuk membantu Anda. Jika ada hal lain yang bisa saya bantu, jangan ragu untuk bertanya. Semoga sehat selalu! 🙏💙";
    }

    // Check for reminder-related keywords
    if (this.isReminderRelated(normalizedMessage)) {
      return "Saya melihat pesan Anda berkaitan dengan pengingat. Untuk informasi yang akurat, saya bisa membantu dengan:\n\n• Jadwal pengingat Anda\n• Status pengingat aktif\n• Informasi umum\n\nApa yang ingin Anda ketahui? 💙";
    }

    // Check for health-related keywords
    if (this.isHealthRelated(normalizedMessage)) {
      return "Saya melihat Anda menyebutkan tentang kesehatan. Sebagai asisten PRIMA, saya bisa membantu dengan informasi umum tentang:\n\n• Edukasi kesehatan paliatif\n• Dukungan untuk pasien kanker\n• Tips kesehatan sehari-hari\n\nApakah ada topik spesifik yang ingin Anda bahas? 🏥";
    }

    // Default intelligent response based on intent
    switch (intent) {
      case "inquiry":
        return "Saya menerima pertanyaan Anda. Untuk memberikan bantuan yang lebih baik, bisakah Anda memberikan sedikit konteks atau detail lebih lanjut? Atau saya bisa membantu dengan informasi tentang layanan PRIMA. 💙";

      case "reminder_inquiry":
        return "Untuk informasi tentang pengingat, saya bisa membantu dengan:\n\n• Melihat jadwal pengingat hari ini\n• Mengecek status pengingat aktif\n• Memberikan ringkasan\n\nApa yang ingin Anda ketahui? ⏰";

      case "emergency":
        return "Saya mendeteksi ini mungkin berkaitan dengan keadaan darurat. Jika Anda membutuhkan bantuan medis segera, silakan hubungi:\n\n• Layanan darurat: 112\n• Rumah sakit terdekat\n• Relawan PRIMA untuk dukungan\n\nApakah ini benar keadaan darurat? 🚨";

      default:
        return "Terima kasih atas pesan Anda. Saya adalah asisten PRIMA yang siap membantu dengan:\n\n• Informasi tentang pengingat\n• Dukungan kesehatan paliatif\n• Edukasi kesehatan\n• Bantuan untuk pasien dan relawan\n\nAda yang spesifik yang bisa saya bantu? 💙";
    }
  }

  /**
   * Check if message is a greeting
   */
  private isGreetingMessage(message: string): boolean {
    const greetingPatterns = [
      "halo",
      "hai",
      "hello",
      "hi",
      "selamat",
      "pagi",
      "siang",
      "sore",
      "malam",
      "assalamualaikum",
      "salam",
      "apa kabar",
      "bagaimana kabar",
    ];
    return greetingPatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Check if message contains questions
   */
  private isQuestionMessage(message: string): boolean {
    const questionPatterns = [
      "apa",
      "bagaimana",
      "gimana",
      "kenapa",
      "kok",
      "mengapa",
      "kapan",
      "dimana",
      "siapa",
      "berapa",
      "tanya",
      "pertanyaan",
      "bisa",
      "boleh",
      "minta",
    ];
    return (
      questionPatterns.some((pattern) => message.includes(pattern)) ||
      message.includes("?") ||
      message.startsWith("tolong") ||
      message.startsWith("bantu")
    );
  }

  /**
   * Check if message is thank you
   */
  private isThankYouMessage(message: string): boolean {
    const thankYouPatterns = [
      "terima kasih",
      "makasih",
      "thanks",
      "thank you",
      "thx",
      "tq",
      "sama-sama",
      "sama²",
      "terimakasih",
    ];
    return thankYouPatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Check if message is reminder-related
   */
  private isReminderRelated(message: string): boolean {
    const reminderPatterns = [
      "pengingat",
      "reminder",
      "jadwal",
      "schedule",
      "ingat",
      "waktu",
      "janji",
    ];
    return reminderPatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Check if message is health-related
   */
  private isHealthRelated(message: string): boolean {
    const healthPatterns = [
      "sakit",
      "nyeri",
      "demam",
      "mual",
      "muntah",
      "pusing",
      "lemah",
      "kesehatan",
      "penyakit",
      "diagnosis",
      "pengobatan",
      "terapi",
      "kanker",
      "tumor",
      "kemoterapi",
      "radiasi",
      "operasi",
    ];
    return healthPatterns.some((pattern) => message.includes(pattern));
  }
}
