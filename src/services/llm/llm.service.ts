/**
 * LLM Service for Anthropic Claude integration
 * Handles communication with Anthropic Claude API for natural language processing
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { responseCache } from "@/lib/response-cache";
import { safetyFilterService } from "./safety-filter";
import { withRetry, DEFAULT_RETRY_CONFIGS, isRetryableError } from "@/lib/simple-retry";
import { messageQueueService } from "@/services/message-queue.service";
import { llmCostService } from "@/lib/llm-cost-service";
import { ReminderTemplatesService } from "@/services/reminder/reminder-templates.service";
import {
  LLMConfig,
  LLMRequest,
  ProcessedLLMResponse,
  IntentDetectionResult,
  ConversationContext,
} from "./llm.types";

export class LLMService {
  private client: Anthropic;
  private config: LLMConfig;
  private templateService: ReminderTemplatesService;

  constructor() {
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      baseURL: "", // Anthropic doesn't use baseURL
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku",
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "1000"),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
      timeout: parseInt(process.env.LLM_TIMEOUT_MS || "30000"),
    };

    if (!this.config.apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    this.templateService = new ReminderTemplatesService();

    logger.info("LLM Service initialized", {
      model: this.config.model,
      provider: "Anthropic Claude",
    });
  }

  /**
   * Send a request to the LLM and get processed response with fallback mechanisms
   */
  async generateResponse(request: LLMRequest): Promise<ProcessedLLMResponse> {
    const startTime = Date.now();

    // Check usage limits before proceeding
    const limitCheck = await llmCostService.checkLimits();
    if (!limitCheck.allowed) {
      logger.warn("Usage limits exceeded, blocking LLM request", {
        limits: limitCheck.limits,
        alerts: limitCheck.alerts.length,
      });

      // Queue the message for later processing when limits reset
      await this.queueMessageForRetry(request, "Usage limits exceeded");
      throw new Error(
        "Usage limits exceeded - request queued for later processing"
      );
    }

    // Simple retry logic - no complex circuit breaker needed

    try {
      // Execute with retry logic
      const response = await withRetry(async () => {
        logger.debug("Sending Anthropic Claude LLM request", {
          messageCount: request.messages.length,
          maxTokens: request.maxTokens || this.config.maxTokens,
        });

        // Convert messages to Anthropic format
        const messages = this.convertMessagesToAnthropicFormat(
          request.messages
        );

        const result = await this.client.messages.create({
          model: this.config.model,
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          messages: messages,
        });

        return result;
      }, DEFAULT_RETRY_CONFIGS.llm);

      const responseTime = Date.now() - startTime;
      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
      const finishReason = response.stop_reason || "stop";

      logger.info("Anthropic Claude LLM response generated successfully", {
        tokensUsed,
        responseTime,
        contentLength: content.length,
      });

      return {
        content,
        tokensUsed,
        model: this.config.model,
        responseTime,
        finishReason,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const err = error as Error;

      logger.error(
        "Anthropic Claude LLM request failed after all retries",
        err,
        {
          responseTime,
          model: this.config.model,
              messageCount: request.messages.length,
          maxTokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          errorType: err.constructor.name,
          errorMessage: err.message,
          stack: err.stack?.substring(0, 500), // First 500 chars of stack
        }
      );

      // Queue message for later retry if it's a temporary failure
      if (isRetryableError(err)) {
        logger.info("Queueing failed LLM request for retry", {
          patientId: this.extractPatientInfoFromRequest(request)?.patientId,
          errorType: err.constructor.name,
        });
        await this.queueMessageForRetry(request, err.message);
      }

      // Don't throw generic error - provide specific error information
      const errorMessage = `Anthropic Claude LLM request failed: ${err.message} (Model: ${this.config.model}, Response time: ${responseTime}ms)`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Detect intent from patient message using LLM with fallback
   */
  async detectIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentDetectionResult> {
    const systemPrompt = await this.buildIntentDetectionPrompt(context);

    const request: LLMRequest = {
      messages: [
        { role: "system", content: systemPrompt },
        ...context.previousMessages.slice(-5), // Last 5 messages for context
        { role: "user", content: message },
      ],
      maxTokens: 200,
      temperature: 0.3, // Lower temperature for more consistent intent detection
    };

    try {
      const response = await this.generateResponse(request);

      // Parse the JSON response from LLM
      const parsedResponse = this.parseIntentResponse(response.content);

      return {
        intent: parsedResponse.intent,
        confidence: parsedResponse.confidence,
        entities: parsedResponse.entities,
        rawResponse: response,
      };
    } catch (error) {
      logger.error("Intent detection failed, using fallback", error as Error, {
        patientId: context.patientId,
        messageLength: message.length,
      });

      // Use keyword-based fallback for intent detection
      const fallbackResult = await this.fallbackIntentDetection(
        message,
        context
      );

      return {
        intent: fallbackResult.intent,
        confidence: fallbackResult.confidence,
        entities: fallbackResult.entities,
        rawResponse: {
          content: JSON.stringify(fallbackResult),
          tokensUsed: 0,
          model: "fallback-keyword",
          responseTime: 0,
          finishReason: "fallback",
        },
      };
    }
  }

  /**
   * Validate if response is in proper Indonesian
   */
  private validateLanguage(response: string): {
    isValid: boolean;
    issues: string[];
    confidence: number;
  } {
    const issues: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Common English words that should not appear in Indonesian responses
    const englishWords = [
      ' the ', ' and ', ' is ', ' are ', ' you ', ' your ', ' we ', ' our ',
      ' have ', ' has ', ' been ', ' were ', ' will ', ' would ', ' could ',
      ' should ', ' this ', ' that ', ' these ', ' those ', ' please ',
      ' thank ', ' thanks ', ' hello ', ' hi ', ' yes ', ' no ', ' not '
    ];

    // Common Indonesian phrases that should be present
    const indonesianIndicators = [
      'anda', 'saya', 'kami', 'mereka', 'ini', 'itu', 'terima kasih',
      'maaf', 'tolong', 'bantuan', 'kesehatan', 'pasien', 'obat'
    ];

    let englishScore = 0;
    let indonesianScore = 0;

    // Check for English words
    englishWords.forEach(word => {
      if (lowerResponse.includes(word)) {
        englishScore++;
        issues.push(`Bahasa Inggris terdeteksi: "${word.trim()}"`);
      }
    });

    // Check for Indonesian indicators
    indonesianIndicators.forEach(word => {
      if (lowerResponse.includes(word)) {
        indonesianScore++;
      }
    });

    // Calculate confidence score
    const totalWords = response.split(/\s+/).length;
    const englishRatio = englishScore / totalWords;
    const indonesianRatio = indonesianScore / totalWords;

    const isValid = englishScore === 0 && indonesianScore > 0;
    const confidence = Math.max(0, Math.min(1, (indonesianRatio - englishRatio) + 0.3));

    if (englishScore > 0) {
      issues.push(`Terdeteksi ${englishScore} kata bahasa Inggris`);
    }

    if (indonesianScore === 0) {
      issues.push('Tidak ada indikator bahasa Indonesia yang terdeteksi');
    }

    return {
      isValid,
      issues,
      confidence
    };
  }

  
  /**
   * Generate a natural language response for the patient with language validation
   */
  async generatePatientResponse(
    intent: string,
    context: ConversationContext,
    additionalContext?: string
  ): Promise<ProcessedLLMResponse> {
    // Check cache first for common queries
    if (responseCache.shouldCache(intent, 0.8)) {
      // Assume high confidence for now
      const patientContext = {
        patientName: context.patientInfo?.name,
        verificationStatus: context.patientInfo?.verificationStatus,
        activeRemindersCount: context.patientInfo?.activeReminders?.length || 0,
        conversationLength: context.previousMessages.length,
      };

      const cachedResponse = await responseCache.get(intent, patientContext);
      if (cachedResponse) {
        logger.debug("Using cached LLM response", {
          intent,
          cacheAge: Date.now() - cachedResponse.cachedAt,
        });

        // Parse the cached response from JSON string
        const parsedResponse = JSON.parse(cachedResponse.response) as ProcessedLLMResponse;

        const cachedResponseObj = {
          content: parsedResponse.content,
          tokensUsed: parsedResponse.tokensUsed || 0,
          model: parsedResponse.model || this.config.model,
          responseTime: 0, // Cached response
          finishReason: "cached",
        };

        // Even cached responses need safety filtering
        const safetyResult = await safetyFilterService.filterLLMResponse(
          cachedResponseObj,
          context
        );
        if (!safetyResult.isSafe) {
          logger.warn("Cached response failed safety filter", {
            intent,
            patientId: context.patientId,
            violations: safetyResult.violations.length,
          });
          // Fall through to generate new response
        } else {
          return cachedResponseObj;
        }
      }
    }

    const systemPrompt = this.buildResponseGenerationPrompt(
      context,
      additionalContext
    );

    const request: LLMRequest = {
      messages: [
        { role: "system", content: systemPrompt },
        ...context.previousMessages.slice(-10), // More context for response generation
        { role: "user", content: `Intent detected: ${intent}` },
      ],
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    // Generate response with language validation
    let finalResponse = await this.generateResponseWithLanguageValidation(request, intent, context);

    // Apply safety filtering to LLM response
    const safetyResult = await safetyFilterService.filterLLMResponse(
      finalResponse,
      context
    );

    if (!safetyResult.isSafe) {
      logger.warn(
        "LLM response failed safety filter, using sanitized version",
        {
          intent,
          patientId: context.patientId,
          violations: safetyResult.violations.length,
        }
      );

      // Sanitize the response
      finalResponse = {
        ...finalResponse,
        content: safetyFilterService.sanitizeContent(
          finalResponse.content,
          safetyResult.violations
        ),
      };
    }

    // Cache the response if appropriate (only safe and valid responses)
    if (responseCache.shouldCache(intent, 0.8) && safetyResult.isSafe) {
      const patientContext = {
        patientName: context.patientInfo?.name,
        verificationStatus: context.patientInfo?.verificationStatus,
        activeRemindersCount: context.patientInfo?.activeReminders?.length || 0,
        conversationLength: context.previousMessages.length,
      };

      await responseCache.set(
        intent,
        patientContext,
        JSON.stringify({
          content: finalResponse.content,
          tokensUsed: finalResponse.tokensUsed,
          model: finalResponse.model,
          responseTime: finalResponse.responseTime,
          finishReason: finalResponse.finishReason,
        })
      );
    }

    return finalResponse;
  }

  /**
   * Build system prompt for intent detection
   */
  private async buildIntentDetectionPrompt(context: ConversationContext): Promise<string> {
    const activeReminders = context.patientInfo?.activeReminders || [];
    const reminderContext =
      activeReminders.length > 0
        ? `\nActive Reminders: ${activeReminders
            .map((r: unknown) => {
              const reminder = r as {
                reminderName?: string;
                customMessage?: string;
              };
              return (
                reminder.reminderName || reminder.customMessage || "pengingat"
              );
            })
            .join(", ")}`
        : "";

    // Get real-time today's reminders for better context
    let todaysRemindersContext = "";
    try {
      if (context.patientId) {
        const { ReminderService } = await import("@/services/reminder/reminder.service");
        const reminderService = new ReminderService();
        const todaysReminders = await reminderService.getTodaysReminders(context.patientId);

        if (todaysReminders.length > 0) {
          todaysRemindersContext = `\nToday's Reminders: ${todaysReminders.map(r =>
            `${r.scheduledTime}: ${r.message || "pengingat"} (${r.isCompleted ? 'completed' : 'pending'})`
          ).join(", ")}`;
        }
      }
    } catch {
      // Silently fail - real-time data is optional for intent detection
    }

    // Get health notes context
    let healthNotesContext = "";
    try {
      if (context.patientId) {
        const { healthNotesQueryService } = await import("@/services/patient/health-notes-query.service");
        const recentNotes = await healthNotesQueryService.queryHealthNotes(context.patientId, {
          timeRange: "hari_ini",
          limit: 3
        });

        if (recentNotes.notes.length > 0) {
          healthNotesContext = `\nRecent Health Notes: ${recentNotes.notes.length} notes recorded today`;
        }
      }
    } catch {
      // Silently fail - real-time data is optional for intent detection
    }

    return `You are an AI assistant for PRIMA healthcare system helping cancer patients via WhatsApp.

Patient Information:
- Name: ${context.patientInfo?.name || "Unknown"}
- Phone: ${context.phoneNumber}
- Verification Status: ${
      context.patientInfo?.verificationStatus || "Unknown"
    }${reminderContext}${todaysRemindersContext}${healthNotesContext}

Your task is to analyze the patient's message and determine their intent. Respond with a JSON object containing:
- intent: One of [verification_response, reminder_confirmation, unsubscribe, reminder_inquiry, health_notes_inquiry, general_inquiry, emergency, unknown]
- confidence: Number between 0-1 indicating confidence level
- entities: Any extracted information (medication names, times, etc.)

Guidelines:
- For verification: Look for "YA" or "TIDAK" responses to verification questions
- For reminder_confirmation: Look for confirmations about reminders (MEDICATION, APPOINTMENT, GENERAL), such as:
  * "SUDAH", "sudah", "SELESAI", "HADIR" - positive confirmations
  * "BELUM", "belum", "TERLAMBAT" - pending/negative responses
  * "BANTUAN", "tolong" - help requests
  * Context-specific responses based on reminder type:
    - MEDICATION: "minum", "makan obat", "telan obat", "konsumsi obat"
    - APPOINTMENT: "hadir", "datang", "janji temu", "dokter"
    - GENERAL: "selesai", "dilakukan", "selesai", "lakukan"
- For reminder_inquiry: Look for questions about today's reminders, schedules, such as:
  * "remindernya hari ini apa saja", "pengingat hari ini apa saja"
  * "jadwal hari ini", "reminder untuk hari ini"
  * "apa reminder saya", "lihat reminder", "cek reminder"
- For health_notes_inquiry: Look for questions about health notes, medical records, such as:
  * "catatan kesehatannya apa saja", "catatan kesehatan hari ini"
  * "catatan kesehatan", "health notes", "riwayat kesehatan"
  * "kondisi kesehatan", "catatan medis"
- For unsubscribe: Look for "BERHENTI", "STOP", "CANCEL" or similar stop requests
- For emergency: Look for urgent medical situations, pain, symptoms
- For general_inquiry: Any other questions or statements

IMPORTANT: Detect reminder type from context and use appropriate confirmation keywords.

Respond only with valid JSON.`;
  }

  /**
   * Build system prompt for response generation
   */
  private buildResponseGenerationPrompt(
    context: ConversationContext,
    additionalContext?: string
  ): string {
    return `Anda adalah asisten kesehatan PRIMA yang berkomunikasi dengan pasien kanker melalui WhatsApp.

INFORMASI PASIEN:
- Nama: ${context.patientInfo?.name || "Pasien"}
- Nomor: ${context.phoneNumber}

PERINTAH WAJIB BAHASA:
- HARUS MERESPON DALAM BAHASA INDONESIA
- TIDAK BOLEH menggunakan bahasa Inggris
- Gunakan Bahasa Indonesia yang sopan dan mudah dipahami
- Pastikan semua respons menggunakan Bahasa Indonesia yang benar

PEDOMAN RESPON:
- Ramah, empati, dan profesional
- Berikan respons yang informatif dan membantu
- Gunakan format WhatsApp (*bold*, _italic_)
- Sertakan branding PRIMA
- Akhiri dengan penawaran bantuan
- Gunakan bahasa sehari-hari yang mudah dimengerti pasien
- Berikan dukungan emosional

BATASAN KEAMANAN:
- JANGAN berikan diagnosis medis atau saran pengobatan
- Untuk masalah medis, arahkan ke tenaga kesehatan profesional
- Untuk darurat, segera arahkan ke layanan darurat

${additionalContext ? `KONTEKS TAMBAHAN: ${additionalContext}` : ""}

HASILKAN RESPONS DALAM BAHASA INDONESIA YANG JELAS, RAMAH, DAN MEMBANTU.

INGAT: ANDA HARUS MERESPON DALAM BAHASA INDONESIA. TIDAK DIPERBOLEHKAN MENGGUNAKAN BAHASA INGGRIS.`;
  }

  /**
   * Parse the JSON response from intent detection
   */
  private parseIntentResponse(content: string): {
    intent: string;
    confidence: number;
    entities?: Record<string, unknown>;
  } {
    try {
      const parsed = JSON.parse(content.trim());
      return {
        intent: parsed.intent || "unknown",
        confidence: parsed.confidence || 0,
        entities: (parsed.entities as Record<string, unknown>) || {},
      };
    } catch (error) {
      logger.warn("Failed to parse LLM intent response", {
        content: content.substring(0, 100),
        error: (error as Error).message,
      });

      return {
        intent: "unknown",
        confidence: 0,
      };
    }
  }

  /**
   * Analyze patient message for safety concerns and emergencies
   */
  async analyzePatientMessageSafety(
    message: string,
    context: ConversationContext
  ): Promise<{
    emergencyDetected: boolean;
    safetyViolations: number;
    escalationRequired: boolean;
  }> {
    const analysis = await safetyFilterService.analyzePatientMessage(
      message,
      context
    );

    return {
      emergencyDetected: analysis.emergencyResult.isEmergency,
      safetyViolations: analysis.safetyResult.violations.length,
      escalationRequired: analysis.safetyResult.escalationRequired,
    };
  }

  
  /**
   * Queue message for later retry when LLM is unavailable
   */
  private async queueMessageForRetry(
    request: LLMRequest,
    reason: string
  ): Promise<void> {
    try {
      // Extract patient information from the request for queuing
      const patientInfo = this.extractPatientInfoFromRequest(request);

      if (patientInfo) {
        await messageQueueService.enqueueMessage({
          patientId: patientInfo.patientId,
          phoneNumber: patientInfo.phoneNumber,
          message: this.extractMessageFromRequest(request),
          priority: "medium",
          messageType: "general",
          maxRetries: 3,
          metadata: {
            originalRequest: request,
            failureReason: reason,
            queuedAt: new Date().toISOString(),
          },
        });

        logger.info("Message queued for retry", {
          patientId: patientInfo.patientId,
          reason,
          priority: "medium",
        });
      }
    } catch (queueError) {
      logger.error("Failed to queue message for retry", queueError as Error, {
        reason,
      });
    }
  }

  /**
   * Extract patient information from LLM request
   */
  private extractPatientInfoFromRequest(
    request: LLMRequest
  ): { patientId: string; phoneNumber: string } | null {
    // Try to extract from system message or user context
    for (const message of request.messages) {
      if (message.role === "system" && message.content) {
        const patientMatch = message.content.match(/Patient: (\w+)/);
        const phoneMatch = message.content.match(/Phone: (\+?[\d\s-]+)/);

        if (patientMatch && phoneMatch) {
          return {
            patientId: patientMatch[1],
            phoneNumber: phoneMatch[1].replace(/\s+/g, ""),
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract the main message from LLM request
   */
  private extractMessageFromRequest(request: LLMRequest): string {
    // Get the last user message
    const userMessages = request.messages.filter((msg) => msg.role === "user");
    return userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : "LLM processing request";
  }

  /**
   * Fallback keyword-based intent detection when LLM fails
   */
  private async fallbackIntentDetection(
    message: string,
    context: ConversationContext
  ): Promise<{
    intent: string;
    confidence: number;
    entities?: Record<string, unknown>;
  }> {
    const normalizedMessage = message.toLowerCase().trim();

    // Simple keyword-based intent detection
    if (
      normalizedMessage.includes("ya") ||
      normalizedMessage.includes("yes") ||
      normalizedMessage.includes("setuju")
    ) {
      return { intent: "verification_response", confidence: 0.8 };
    }

    if (
      normalizedMessage.includes("sudah") ||
      normalizedMessage.includes("belum") ||
      normalizedMessage.includes("selesai") ||
      normalizedMessage.includes("hadir") ||
      normalizedMessage.includes("datang") ||
      normalizedMessage.includes("lakukan") ||
      normalizedMessage.includes("minum") ||
      normalizedMessage.includes("makan") ||
      normalizedMessage.includes("telan")
    ) {
      return { intent: "reminder_confirmation", confidence: 0.8 };
    }

    if (
      normalizedMessage.includes("berhenti") ||
      normalizedMessage.includes("stop") ||
      normalizedMessage.includes("unsubscribe")
    ) {
      return { intent: "unsubscribe", confidence: 0.9 };
    }

    if (
      normalizedMessage.includes("darurat") ||
      normalizedMessage.includes("sakit") ||
      normalizedMessage.includes("tolong")
    ) {
      return { intent: "emergency", confidence: 0.9 };
    }

    if (
      normalizedMessage.includes("tanya") ||
      normalizedMessage.includes("bantuan") ||
      normalizedMessage.includes("help")
    ) {
      return { intent: "general_inquiry", confidence: 0.7 };
    }

    // Check for emergency keywords with higher priority
    const emergencyKeywords = [
      "darurat",
      "emergency",
      "sakit",
      "muntah",
      "alergi",
      "sesak",
      "nyeri",
      "demam",
      "gawat",
      "tolong",
    ];
    if (
      emergencyKeywords.some((keyword) => normalizedMessage.includes(keyword))
    ) {
      return { intent: "emergency", confidence: 0.95 };
    }

    logger.debug("Fallback intent detection: unknown intent", {
      message: normalizedMessage.substring(0, 100),
      patientId: context.patientId,
    });

    return { intent: "unknown", confidence: 0.3 };
  }

  /**
   * Convert internal message format to Anthropic format following official guide
   * https://docs.claude.com/en/docs/get-started#typescript
   */
  private convertMessagesToAnthropicFormat(
    messages: LLMRequest["messages"]
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const anthropicMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    // Handle system message separately - Anthropic recommends putting system instructions in the first user message
    let systemContent = "";

    for (const msg of messages) {
      if (msg.role === "system") {
        systemContent = msg.content;
      } else if (msg.role === "user" || msg.role === "assistant") {
        let content = msg.content;

        // Prepend system content to the first user message
        if (
          msg.role === "user" &&
          systemContent &&
          anthropicMessages.length === 0
        ) {
          content = `${systemContent}\n\n${content}`;
          systemContent = ""; // Clear after using
        }

        anthropicMessages.push({
          role: msg.role,
          content: content,
        });
      }
    }

    // If we still have system content and no user messages, create a user message with it
    if (systemContent && anthropicMessages.length === 0) {
      anthropicMessages.push({
        role: "user",
        content: systemContent,
      });
    }

    logger.debug("Converted messages to Anthropic format", {
      originalCount: messages.length,
      convertedCount: anthropicMessages.length,
      hasSystemMessage: messages.some((m) => m.role === "system"),
    });

    return anthropicMessages;
  }

  /**
   * Detect simple reminder confirmation response
   * This method detects "sudah"/"belum" patterns for status updates
   */
  async detectSimpleReminderResponse(
    message: string,
    context: ConversationContext
  ): Promise<{
    isReminderResponse: boolean;
    responseType: "confirmed" | "pending" | "help" | "unknown";
    confidence: number;
    reminderType?: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
  }> {
    const normalizedMessage = message.toLowerCase().trim();

    // Get reminder context to determine type-specific patterns
    let reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL' = 'MEDICATION';
    try {
      if (context.patientId) {
        const { ReminderService } = await import("@/services/reminder/reminder.service");
        const reminderService = new ReminderService();
        const todaysReminders = await reminderService.getTodaysReminders(context.patientId);
        const pendingReminder = todaysReminders.find(r => !r.isCompleted);
        if (pendingReminder) {
          reminderType = pendingReminder.reminderType as 'MEDICATION' | 'APPOINTMENT' | 'GENERAL' || 'MEDICATION';
        }
      }
    } catch {
      // Default to MEDICATION if context detection fails
    }

    // Type-specific confirmation patterns
    const confirmedPatterns = {
      MEDICATION: [
        "sudah", "udh", "udah", "sdh", "dah",
        "sudah minum", "udah minum", "sudah makan", "sudah telan",
        "sudah konsumsi", "sudah ambil", "done", "selesai",
        "sudah selesai", "sudah lakukan", "oke siap", "siap"
      ],
      APPOINTMENT: [
        "sudah", "hadir", "datang", "selesai", "done",
        "sudah hadir", "sudah datang", "sudah selesai"
      ],
      GENERAL: [
        "sudah", "selesai", "done", "selesai",
        "sudah selesai", "sudah lakukan", "sudah dilakukan"
      ]
    };

    const pendingPatterns = {
      MEDICATION: [
        "belum", "blm", "blum", "lum", "belom",
        "belum minum", "blm minum", "belum makan", "belum telan",
        "belum konsumsi", "belum ambil", "lupa", "belum lakukan",
        "nanti", "sebentar"
      ],
      APPOINTMENT: [
        "belum", "terlambat", "nanti", "sebentar",
        "belum hadir", "belum datang", "akan terlambat"
      ],
      GENERAL: [
        "belum", "nanti", "sebentar", "belom",
        "belum selesai", "belum lakukan", "belum dilakukan"
      ]
    };

    const helpPatterns = [
      "bantuan", "tolong", "help", "bantu",
      "minta bantuan", "butuh bantuan"
    ];

    // Use type-specific patterns
    const currentConfirmedPatterns = confirmedPatterns[reminderType];
    const currentPendingPatterns = pendingPatterns[reminderType];

    // Check for confirmation patterns
    const confirmedMatch = currentConfirmedPatterns.some(pattern =>
      normalizedMessage.includes(pattern) || normalizedMessage === pattern
    );

    // Check for pending patterns
    const pendingMatch = currentPendingPatterns.some(pattern =>
      normalizedMessage.includes(pattern) || normalizedMessage === pattern
    );

    // Check for help patterns
    const helpMatch = helpPatterns.some(pattern =>
      normalizedMessage.includes(pattern) || normalizedMessage === pattern
    );

    // Determine response type and confidence
    if (helpMatch) {
      return {
        isReminderResponse: true,
        responseType: "help",
        confidence: 0.9,
        reminderType
      };
    } else if (confirmedMatch && !pendingMatch) {
      return {
        isReminderResponse: true,
        responseType: "confirmed",
        confidence: 0.9,
        reminderType
      };
    } else if (pendingMatch && !confirmedMatch) {
      return {
        isReminderResponse: true,
        responseType: "pending",
        confidence: 0.9,
        reminderType
      };
    } else if (confirmedMatch && pendingMatch) {
      // Both patterns present - need more sophisticated analysis
      // Use LLM to determine the actual intent
      try {
        const llmResult = await this.detectIntent(message, context);
        if (llmResult.intent === "reminder_confirmation") {
          // Check entities for more specific information
          const entities = llmResult.entities as Record<string, unknown> || {};
          if (entities.confirmation_status === "confirmed") {
            return {
              isReminderResponse: true,
              responseType: "confirmed",
              confidence: 0.8,
              reminderType
            };
          } else if (entities.confirmation_status === "pending") {
            return {
              isReminderResponse: true,
              responseType: "pending",
              confidence: 0.8,
              reminderType
            };
          }
        }
      } catch (error) {
        logger.warn("LLM analysis failed for ambiguous reminder response", {
          message: normalizedMessage.substring(0, 50),
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Default to confirmed if ambiguous (conservative approach)
      return {
        isReminderResponse: true,
        responseType: "confirmed",
        confidence: 0.6,
        reminderType
      };
    }

    return {
      isReminderResponse: false,
      responseType: "unknown",
      confidence: 0,
      reminderType
    };
  }

  /**
   * Fallback Indonesian response templates for when LLM fails to generate proper Indonesian
   */
  private getIndonesianFallbackResponse(intent: string, context: ConversationContext): string {
    const patientName = context.patientInfo?.name || "Pasien";

    const templates = {
      reminder_confirmation: {
        confirmed: [
          `Baik ${patientName}, terima kasih sudah mengonfirmasi! Semoga obatnya bermanfaat ya.`,
          `Oke ${patientName}, sudah dicatat. Terima kasih konfirmasinya!`,
          `Terima kasih ${patientName}! Jangan lupa untuk istirahat yang cukup.`
        ],
        pending: [
          `Baik ${patientName}, nanti diingatkan kembali ya. Jangan lupa minum obatnya!`,
          `Oke ${patientName}, semoga segera selesai. Tolong diingat kembali ya!`,
          `${patientName}, jangan khawatir. Nanti akan diingatkan kembali.`
        ],
        help: [
          `${patientName}, butuh bantuan? Relawan PRIMA siap membantu Anda.`,
          `Baik ${patientName}, tim kami akan segera menghubungi Anda untuk bantuan.`
        ]
      },
      health_notes_inquiry: [
        `Halo ${patientName}, berikut informasi kesehatan terakhir yang kami catat:`,
        `${patientName}, sesuai catatan kesehatan Anda, kami memiliki informasi berikut:`,
        `Terima kasih pertanyaannya, ${patientName}. Berikut catatan kesehatan terakhir:`
      ],
      reminder_inquiry: [
        `Halo ${patientName}, berikut jadwal pengingat Anda untuk hari ini:`,
        `${patientName}, berikut pengingat yang terjadwal untuk Anda hari ini:`,
        `Baik ${patientName}, ini adalah pengingat Anda yang aktif saat ini:`
      ],
      general_inquiry: [
        `Halo ${patientName}, terima kasih telah menghubungi PRIMA. Ada yang bisa dibantu?`,
        `${patientName}, kami siap membantu pertanyaan Anda. Silakan jelaskan lebih detail.`,
        `Terima kasih ${patientName}. Tim PRIMA akan membantu menjawab pertanyaan Anda.`
      ],
      emergency: [
        `${patientName}, segera hubungi layanan darurat (112) atau rumah sakit terdekat! Tim kami juga akan menghubungi Anda.`,
        `Darurat! ${patientName}, segera cari bantuan medis. Tim PRIMA segera menghubungi Anda.`
      ]
    };

    const intentTemplates = templates[intent as keyof typeof templates] || templates.general_inquiry;
    const responseArray = Array.isArray(intentTemplates) ? intentTemplates : intentTemplates.confirmed;

    return responseArray[Math.floor(Math.random() * responseArray.length)];
  }

  /**
   * Generate response with language validation and retry mechanism
   */
  private async generateResponseWithLanguageValidation(
    request: LLMRequest,
    intent: string,
    context: ConversationContext,
    maxRetries: number = 2
  ): Promise<ProcessedLLMResponse> {
    const response = await this.generateResponse(request);

    // Validate language
    const validation = this.validateLanguage(response.content);

    logger.debug("Language validation result", {
      intent,
      patientId: context.patientId,
      isValid: validation.isValid,
      confidence: validation.confidence,
      issues: validation.issues,
      responseLength: response.content.length
    });

    // If response is valid, return it
    if (validation.isValid && validation.confidence > 0.7) {
      return response;
    }

    // If invalid, retry with stronger language instruction
    if (maxRetries > 0) {
      logger.warn("Language validation failed, retrying with stronger instruction", {
        patientId: context.patientId,
        intent,
        issues: validation.issues,
        retriesLeft: maxRetries
      });

      // Create strengthened request with stronger language instruction
      const strengthenedRequest: LLMRequest = {
        ...request,
        messages: [
          {
            role: "system",
            content: `PERINGATAN BAHASA: ANDA HARUS MERESPON DALAM BAHASA INDONESIA. TIDAK BOLEH SATU PUN KATA BAHASA INGGRIS. SEMUA RESPON HARUS MENGGUNAKAN BAHASA INDONESIA YANG BAIK DAN BENAR.`
          },
          ...request.messages
        ]
      };

      return this.generateResponseWithLanguageValidation(
        strengthenedRequest,
        intent,
        context,
        maxRetries - 1
      );
    }

    // If all retries failed, use fallback Indonesian template
    logger.error("Language validation failed after all retries, using fallback template", new Error(`Language validation failed for intent: ${intent}`), {
      intent,
      issues: validation.issues,
      confidence: validation.confidence,
      finalResponse: response.content.substring(0, 200),
      patientId: context.patientId
    });

    const fallbackResponse = this.getIndonesianFallbackResponse(intent, context);

    return {
      content: fallbackResponse,
      tokensUsed: response.tokensUsed,
      model: response.model,
      responseTime: response.responseTime,
      finishReason: "fallback_indonesian_template"
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  async detectSimpleMedicationResponse(
    message: string,
    context: ConversationContext
  ): Promise<{
    isMedicationResponse: boolean;
    responseType: "taken" | "not_taken" | "unknown";
    confidence: number;
  }> {
    logger.warn("Using legacy medication response detection method", {
      messageLength: message.length,
      operation: "legacy_detect_simple_medication_response"
    });

    const result = await this.detectSimpleReminderResponse(message, context);

    // Map new response types to legacy types
    let responseType: "taken" | "not_taken" | "unknown" = "unknown";
    if (result.responseType === "confirmed") responseType = "taken";
    else if (result.responseType === "pending") responseType = "not_taken";

    return {
      isMedicationResponse: result.isReminderResponse,
      responseType,
      confidence: result.confidence
    };
  }

  /**
   * Update reminder status based on simple response detection
   */
  async updateReminderStatusFromResponse(
    patientId: string,
    responseType: "confirmed" | "pending" | "help" | "taken" | "not_taken",
    message: string
  ): Promise<{ success: boolean; updatedReminderId?: string; reminderType?: string; error?: string }> {
    try {
      // Import dynamically to avoid circular dependencies
      const { db, reminders } = await import("@/db");
      const { eq, and, desc } = await import("drizzle-orm");

      // Find the most recent SENT reminder for this patient
      const pendingReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.patientId, patientId),
            eq(reminders.status, "SENT")
          )
        )
        .orderBy(desc(reminders.sentAt))
        .limit(1);

      if (pendingReminders.length === 0) {
        return {
          success: false,
          error: "No pending reminder found for this patient"
        };
      }

      const reminder = pendingReminders[0];

      // Map response types to database status
      const statusMapping = {
        "confirmed": "DELIVERED",
        "taken": "DELIVERED",
        "pending": "SENT",
        "not_taken": "SENT",
        "help": "SENT"
      };

      const confirmationStatusMapping = {
        "confirmed": "CONFIRMED",
        "taken": "CONFIRMED",
        "pending": "MISSED",
        "not_taken": "MISSED",
        "help": "PENDING"
      };

      // Update the reminder status
      await db
        .update(reminders)
        .set({
          status: statusMapping[responseType] as "SENT" | "DELIVERED" | "FAILED",
          confirmationStatus: confirmationStatusMapping[responseType] as "PENDING" | "CONFIRMED" | "MISSED",
          confirmationResponse: message,
          confirmationResponseAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(reminders.id, reminder.id));

      logger.info("Reminder status updated from simple response", {
        patientId,
        reminderId: reminder.id,
        responseType,
        newStatus: statusMapping[responseType],
        confirmationStatus: confirmationStatusMapping[responseType]
      });

      return {
        success: true,
        updatedReminderId: reminder.id,
        reminderType: reminder.reminderType
      };

    } catch (error) {
      logger.error("Failed to update reminder status from response", error as Error, {
        patientId,
        responseType,
        message: message.substring(0, 50)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current configuration (for debugging)
   */
  getConfig(): Partial<LLMConfig> {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? "***" : "", // Hide API key
    };
  }
}

// Export singleton instance
export const llmService = new LLMService();
