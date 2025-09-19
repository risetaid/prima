/**
 * Standard response handling interfaces and types for PRIMA system
 * Provides consistent response structure across all interaction types
 */

export interface StandardResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  processingTimeMs?: number;
  source: string;
  action: string;
  patientId?: string;
  emergencyDetected?: boolean;
  escalated?: boolean;
  dataAccessRequired?: boolean;
  patientDataType?: string;
  responseResult?: unknown;
  analysisResult?: unknown;
  notesFound?: number;
  hasActiveReminders?: boolean;
  hasSchedule?: boolean;
  hasComplianceData?: boolean;
  remindersFound?: number;
  confirmationStatus?: string;
  healthCondition?: string;
}

export interface ResponseActions {
  sendWhatsApp?: boolean;
  notifyVolunteer?: boolean;
  escalateToEmergency?: boolean;
  updatePatientStatus?: boolean;
  scheduleFollowup?: boolean;
  logConversation?: boolean;
}

export interface ResponseContext {
  patientId: string;
  phoneNumber: string;
  message: string;
  timestamp: Date;
  verificationStatus: string;
  interactionType: InteractionType;
  conversationId?: string;
  additionalData?: Record<string, unknown>;
}

export type InteractionType =
  | "verification"
  | "medication_reminder"
  | "followup_response"
  | "emergency"
  | "general_inquiry"
  | "unsubscribe";

export interface ResponseHandler {
  canHandle(context: ResponseContext): boolean;
  handle(context: ResponseContext): Promise<StandardResponse>;
  getPriority(): number;
}

export interface ResponseHandlerRegistry {
  registerHandler(handler: ResponseHandler): void;
  getHandler(context: ResponseContext): ResponseHandler | null;
  getAllHandlers(): ResponseHandler[];
}

export class StandardResponseHandler implements ResponseHandler {
  private interactionType: InteractionType;
  private priority: number;

  constructor(interactionType: InteractionType, priority: number = 10) {
    this.interactionType = interactionType;
    this.priority = priority;
  }

  canHandle(context: ResponseContext): boolean {
    return context.interactionType === this.interactionType;
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      // Default implementation - should be overridden by specific handlers
      return {
        success: true,
        message: `Processed ${this.interactionType} response`,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          source: "standard_handler",
          action: this.interactionType,
          patientId: context.patientId
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process ${this.interactionType} response`,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          source: "standard_handler",
          action: this.interactionType,
          patientId: context.patientId
        }
      };
    }
  }

  getPriority(): number {
    return this.priority;
  }
}

export class DefaultResponseHandlerRegistry implements ResponseHandlerRegistry {
  private handlers: ResponseHandler[] = [];

  registerHandler(handler: ResponseHandler): void {
    this.handlers.push(handler);
    // Sort handlers by priority (lower number = higher priority)
    this.handlers.sort((a, b) => a.getPriority() - b.getPriority());
  }

  getHandler(context: ResponseContext): ResponseHandler | null {
    return this.handlers.find(handler => handler.canHandle(context)) || null;
  }

  getAllHandlers(): ResponseHandler[] {
    return [...this.handlers];
  }
}

// Global registry instance
export const responseHandlerRegistry = new DefaultResponseHandlerRegistry();

// Helper functions for creating standard responses
export function createSuccessResponse(
  message: string,
  data?: Record<string, unknown>,
  metadata?: Partial<ResponseMetadata>
): StandardResponse {
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      source: "prima_system",
      action: "success",
      ...metadata
    }
  };
}

export function createErrorResponse(
  message: string,
  error?: string | Error,
  metadata?: Partial<ResponseMetadata>
): StandardResponse {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : String(error),
    metadata: {
      timestamp: new Date().toISOString(),
      source: "prima_system",
      action: "error",
      ...metadata
    }
  };
}

export function createEmergencyResponse(
  message: string,
  patientId: string,
  emergencyIndicators?: string[],
  metadata?: Partial<ResponseMetadata>
): StandardResponse {
  return {
    success: true,
    message,
    metadata: {
      timestamp: new Date().toISOString(),
      source: "emergency_handler",
      action: "emergency_detected",
      patientId,
      emergencyDetected: true,
      escalated: true,
      ...metadata
    }
  };
}