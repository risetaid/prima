/**
 * Central response processor for standardized handling across all interaction types
 */

import { ResponseContext, StandardResponse, responseHandlerRegistry, ResponseHandler } from "./response-handler";
import { VerificationResponseHandler } from "./response-handlers/verification-response.handler";
import { FollowupResponseHandler } from "./response-handlers/followup-response.handler";
import { UnsubscribeResponseHandler } from "./response-handlers/unsubscribe-response.handler";
import { GeneralInquiryResponseHandler } from "./response-handlers/general-inquiry-response.handler";
import { KnowledgeResponseHandler } from "./response-handlers/knowledge-response.handler";
import { logger } from "@/lib/logger";

export class ResponseProcessorService {
  constructor() {
    // Register all response handlers
    this.initializeHandlers();
  }

  /**
   * Initialize and register all response handlers
   */
  private initializeHandlers(): void {
    // Register handlers in priority order
    responseHandlerRegistry.registerHandler(new VerificationResponseHandler());
    responseHandlerRegistry.registerHandler(new UnsubscribeResponseHandler());
    responseHandlerRegistry.registerHandler(new FollowupResponseHandler());
    responseHandlerRegistry.registerHandler(new GeneralInquiryResponseHandler());
    responseHandlerRegistry.registerHandler(new KnowledgeResponseHandler());

    logger.info("Response handlers initialized", {
      handlerCount: responseHandlerRegistry.getAllHandlers().length,
      operation: "response_processor_init"
    });
  }

  /**
   * Process a response through the standardized handler system
   */
  async processResponse(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing response through standardized handler", {
        patientId: context.patientId,
        interactionType: context.interactionType,
        messageLength: context.message.length,
        operation: "standardized_response_processing"
      });

      // Find appropriate handler
      const handler = responseHandlerRegistry.getHandler(context);

      if (!handler) {
        logger.warn("No handler found for response context", {
          patientId: context.patientId,
          interactionType: context.interactionType,
          operation: "no_handler_found"
        });

        return {
          success: false,
          message: `No handler available for interaction type: ${context.interactionType}`,
          metadata: {
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
            source: "response_processor",
            action: "no_handler_found",
            patientId: context.patientId
          }
        };
      }

      // Process response through handler
      const result = await handler.handle(context);

      logger.info("Response processed successfully", {
        patientId: context.patientId,
        interactionType: context.interactionType,
        success: result.success,
        processingTimeMs: Date.now() - startTime,
        operation: "response_processed"
      });

      return result;

    } catch (error) {
      logger.error("Failed to process response through standardized handler", error instanceof Error ? error : new Error(String(error)), {
        patientId: context.patientId,
        interactionType: context.interactionType,
        operation: "response_processing_error"
      });

      return {
        success: false,
        message: "Failed to process response",
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          source: "response_processor",
          action: "processing_error",
          patientId: context.patientId
        }
      };
    }
  }

  /**
   * Create response context from raw data
   */
  createContext(
    patientId: string,
    phoneNumber: string,
    message: string,
    verificationStatus: string,
    interactionType: "verification" | "followup_response" | "emergency" | "general_inquiry" | "unsubscribe",
    additionalData?: Record<string, unknown>
  ): ResponseContext {
    return {
      patientId,
      phoneNumber,
      message,
      timestamp: new Date(),
      verificationStatus,
      interactionType,
      additionalData
    };
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ResponseHandler[] {
    return responseHandlerRegistry.getAllHandlers();
  }

  /**
   * Get processor statistics
   */
  async getStatistics(): Promise<{
    totalHandlers: number;
    handlerTypes: string[];
    lastProcessed?: string;
  }> {
    const handlers = this.getHandlers();

    return {
      totalHandlers: handlers.length,
      handlerTypes: handlers.map(h => h.constructor.name),
      // This could be enhanced with actual processing statistics
    };
  }
}

// Export singleton instance
export const responseProcessorService = new ResponseProcessorService();