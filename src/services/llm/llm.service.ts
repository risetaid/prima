/**
 * LLM Service for Anthropic Claude integration
 * Handles communication with Anthropic Claude API for natural language processing
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { responseCache } from "@/lib/response-cache";
import { safetyFilterService } from "./safety-filter";
import { CircuitBreaker, DEFAULT_CIRCUIT_CONFIGS } from "@/lib/circuit-breaker";
import { withRetry, DEFAULT_RETRY_CONFIGS } from "@/lib/retry";
import { messageQueueService } from "@/services/message-queue.service";
import { usageLimits } from "@/lib/usage-limits";
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
  private circuitBreaker: CircuitBreaker;
  private isCircuitBreakerEnabled: boolean;

  constructor() {
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      baseURL: "", // Anthropic doesn't use baseURL
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
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

    // Initialize circuit breaker
    this.isCircuitBreakerEnabled =
      process.env.ENABLE_CIRCUIT_BREAKER !== "false";
    this.circuitBreaker = new CircuitBreaker(DEFAULT_CIRCUIT_CONFIGS.llm);

    logger.info("LLM Service initialized", {
      model: this.config.model,
      provider: "Anthropic Claude",
      circuitBreakerEnabled: this.isCircuitBreakerEnabled,
    });
  }

  /**
   * Send a request to the LLM and get processed response with fallback mechanisms
   */
  async generateResponse(request: LLMRequest): Promise<ProcessedLLMResponse> {
    const startTime = Date.now();

    // Check usage limits before proceeding
    const limitCheck = await usageLimits.checkLimits();
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

    // Check if circuit breaker allows the request
    if (this.isCircuitBreakerEnabled && !this.circuitBreaker.canExecute()) {
      logger.warn(
        "Circuit breaker is open, queuing message for later processing",
        {
          state: this.circuitBreaker.getStats().state,
        }
      );

      // Queue the message for later processing
      await this.queueMessageForRetry(request, "LLM circuit breaker open");
      throw new Error(
        "LLM service temporarily unavailable (circuit breaker open)"
      );
    }

    try {
      // Execute with retry logic and circuit breaker protection
      const response = await this.executeWithFallbacks(async () => {
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
      });

      const responseTime = Date.now() - startTime;
      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      const tokensUsed = response.usage?.output_tokens || 0;
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
          circuitBreakerState: this.circuitBreaker.getStats().state,
        }
      );

      // Queue message for later retry if it's a temporary failure
      if (this.isRetryableError(err)) {
        await this.queueMessageForRetry(request, err.message);
      }

      throw new Error(`Anthropic Claude LLM request failed: ${err.message}`);
    }
  }

  /**
   * Detect intent from patient message using LLM with fallback
   */
  async detectIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentDetectionResult> {
    const systemPrompt = this.buildIntentDetectionPrompt(context);

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
   * Generate a natural language response for the patient
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

      const cachedResponse = await responseCache.get(
        `intent:${intent}`,
        patientContext
      );
      if (cachedResponse) {
        logger.debug("Using cached LLM response", {
          intent,
          cacheAge: Date.now() - cachedResponse.createdAt.getTime(),
        });

        // Parse the cached response from JSON string or object
        const parsedResponse =
          typeof cachedResponse.response === "string"
            ? JSON.parse(cachedResponse.response)
            : cachedResponse.response;

        // Type assertion to ProcessedLLMResponse
        const typedResponse = parsedResponse as ProcessedLLMResponse;

        const cachedResponseObj = {
          content: typedResponse.content,
          tokensUsed: typedResponse.tokensUsed || 0,
          model: typedResponse.model || this.config.model,
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

    const response = await this.generateResponse(request);

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
          intent,
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

    // Cache the response if appropriate (only safe responses)
    if (responseCache.shouldCache(intent, 0.8) && safetyResult.isSafe) {
      const patientContext = {
        patientName: context.patientInfo?.name,
        verificationStatus: context.patientInfo?.verificationStatus,
        activeRemindersCount: context.patientInfo?.activeReminders?.length || 0,
        conversationLength: context.previousMessages.length,
      };

      await responseCache.set(
        `intent:${intent}`,
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
  private buildIntentDetectionPrompt(context: ConversationContext): string {
    const activeReminders = context.patientInfo?.activeReminders || [];
    const reminderContext =
      activeReminders.length > 0
        ? `\nActive Medication Reminders: ${activeReminders
            .map((r: unknown) => {
              const reminder = r as {
                medicationName?: string;
                customMessage?: string;
              };
              return (
                reminder.medicationName || reminder.customMessage || "obat"
              );
            })
            .join(", ")}`
        : "";

    return `You are an AI assistant for PRIMA healthcare system helping cancer patients via WhatsApp.

Patient Information:
- Name: ${context.patientInfo?.name || "Unknown"}
- Phone: ${context.phoneNumber}
- Verification Status: ${
      context.patientInfo?.verificationStatus || "Unknown"
    }${reminderContext}

Your task is to analyze the patient's message and determine their intent. Respond with a JSON object containing:
- intent: One of [verification_response, medication_confirmation, unsubscribe, general_inquiry, emergency, unknown]
- confidence: Number between 0-1 indicating confidence level
- entities: Any extracted information (medication names, times, etc.)

Guidelines:
- For verification: Look for "YA" or "TIDAK" responses to verification questions
- For medication_confirmation: Look for confirmations about taking medication, such as:
  * "SUDAH minum", "sudah saya minum", "sudah ambil obat"
  * "BELUM minum", "belum saya minum", "belum ambil obat"
  * "sudah makan obat", "sudah telan obat", "sudah konsumsi obat"
  * References to taking medication: "minum", "ambil obat", "makan obat", "telan", "konsumsi"
  * Numbers like "keduanya sudah" (both already), "semuanya sudah" (all already)
- For unsubscribe: Look for "BERHENTI", "STOP", "CANCEL" or similar stop requests
- For emergency: Look for urgent medical situations, pain, symptoms
- For general_inquiry: Any other questions or statements

IMPORTANT: Distinguish between FOOD reminders and MEDICATION reminders. Messages about "makan makanan" (eating food) are NOT medication confirmations.

Respond only with valid JSON.`;
  }

  /**
   * Build system prompt for response generation
   */
  private buildResponseGenerationPrompt(
    context: ConversationContext,
    additionalContext?: string
  ): string {
    return `You are a helpful healthcare assistant for PRIMA (Palliative Remote Integrated Monitoring and Assistance) system communicating with cancer patients via WhatsApp.

Patient Information:
- Name: ${context.patientInfo?.name || "Unknown"}
- Phone: ${context.phoneNumber}

Guidelines for responses:
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

${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Generate a comprehensive, helpful response that fully addresses the user's question or concern while maintaining safety and professionalism.`;
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
   * Execute LLM request with circuit breaker and retry logic
   */
  private async executeWithFallbacks<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isCircuitBreakerEnabled) {
      // Simple retry without circuit breaker
      return withRetry(fn, DEFAULT_RETRY_CONFIGS.llm);
    }

    // Execute with circuit breaker protection
    return this.circuitBreaker.execute(async () => {
      return withRetry(fn, DEFAULT_RETRY_CONFIGS.llm);
    });
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      "timeout",
      "network",
      "connection",
      "rate limit",
      "server error",
      "internal server error",
      "bad gateway",
      "service unavailable",
      "gateway timeout",
      "too many requests",
      "temporary failure",
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
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
      normalizedMessage.includes("belum")
    ) {
      return { intent: "medication_confirmation", confidence: 0.8 };
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
   * Convert OpenAI message format to Anthropic format
   */
  private convertMessagesToAnthropicFormat(
    messages: LLMRequest["messages"]
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const anthropicMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // Anthropic handles system messages differently - prepend to first user message
        if (
          anthropicMessages.length === 0 ||
          anthropicMessages[0].role !== "user"
        ) {
          anthropicMessages.push({
            role: "user",
            content: `System: ${msg.content}\n\n${
              anthropicMessages.length > 0 ? anthropicMessages[0].content : ""
            }`,
          });
        } else {
          anthropicMessages[0].content = `System: ${msg.content}\n\n${anthropicMessages[0].content}`;
        }
      } else if (msg.role === "user" || msg.role === "assistant") {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return anthropicMessages;
  }

  /**
   * Get current configuration and circuit breaker stats (for debugging)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getConfig(): Partial<LLMConfig> & { circuitBreaker?: any } {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? "***" : "", // Hide API key
      circuitBreaker: this.isCircuitBreakerEnabled
        ? this.circuitBreaker.getStats()
        : null,
    };
  }
}

// Export singleton instance
export const llmService = new LLMService();
