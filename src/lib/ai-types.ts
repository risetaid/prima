// AI Service Type Definitions for PRIMA

export type AIIntent =
  | 'reminder_confirmed'      // Patient confirmed taking medication/action
  | 'reminder_missed'         // Patient missed or hasn't completed action
  | 'verification_accept'     // Patient accepts WhatsApp reminders
  | 'verification_decline'    // Patient declines WhatsApp reminders
  | 'health_question'         // General health/medication question
  | 'emergency'               // Urgent medical situation
  | 'unsubscribe_request'     // Patient wants to stop receiving messages
  | 'unclear';                // Message intent is ambiguous

export type AIConfidenceLevel = 'high' | 'medium' | 'low';

export interface AIIntentResult {
  intent: AIIntent;
  confidence: number; // 0-100
  confidenceLevel: AIConfidenceLevel;
  reasoning: string;
  extractedInfo?: {
    symptoms?: string[];
    medications?: string[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeReference?: string;
  };
}

export interface AIConversationContext {
  patientId: string;
  patientName: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  patientContext?: {
    cancerStage?: string;
    currentMedications?: string[];
    recentReminders?: Array<{
      message: string;
      sentAt: Date;
    }>;
  };
}

export interface AIConversationResponse {
  message: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  suggestedAction?: 'send_message' | 'notify_volunteer' | 'mark_emergency';
  metadata: {
    tokensUsed: number;
    responseTimeMs: number;
    model: string;
    cost: number;
  };
}

export interface AIClientConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface AIPromptTemplate {
  system: string;
  userPrefix?: string;
  examples?: Array<{
    input: string;
    output: string;
  }>;
}

export interface AIUsageMetrics {
  requestId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  timestamp: Date;
}

// Error types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'API_ERROR' | 'TIMEOUT' | 'CONFIGURATION_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIRateLimitError extends AIServiceError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT');
    this.name = 'AIRateLimitError';
  }
}

export class AITimeoutError extends AIServiceError {
  constructor(message: string) {
    super(message, 'TIMEOUT');
    this.name = 'AITimeoutError';
  }
}
