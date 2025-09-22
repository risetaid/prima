/**
 * Type definitions for LLM service responses and configurations
 */

export interface LLMConfig {
  apiKey: string
  baseURL: string
  model: string
  maxTokens: number
  temperature: number
  timeout: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface LLMResponse {
  id: string
  type: string
  role: string
  content: Array<{
    type: string
    text?: string
    tool_use?: {
      id: string
      name: string
      input: Record<string, unknown>
    }
  }>
  model: string
  stop_reason: string | null
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface LLMError {
  error: {
    message: string
    type: string
    code?: string
  }
}

export interface ProcessedLLMResponse {
  content: string
  tokensUsed: number
  model: string
  responseTime: number
  finishReason: string
}

export interface IntentDetectionResult {
  intent: string
  confidence: number
  entities?: Record<string, unknown>
  rawResponse: ProcessedLLMResponse
}

export interface ConversationContext {
  patientId: string
  phoneNumber: string
  conversationId?: string
  previousMessages: LLMMessage[]
  patientInfo?: {
    name?: string
    verificationStatus?: string
    activeReminders?: unknown[]
  }
}