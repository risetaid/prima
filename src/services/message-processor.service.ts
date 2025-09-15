// Message Processor Service - Advanced NLP for Indonesian WhatsApp responses
// Handles natural language processing, context awareness, and intelligent response classification

export interface MessageContext {
  patientId: string
  phoneNumber: string
  message: string
  timestamp: Date
  conversationState?: ConversationState
  previousMessages?: MessageHistory[]
}

export interface MessageHistory {
  message: string
  timestamp: Date
  direction: 'inbound' | 'outbound'
  type: 'verification' | 'reminder' | 'confirmation' | 'general'
}

export interface ConversationState {
  id: string
  patientId: string
  currentContext: 'verification' | 'reminder_confirmation' | 'general_inquiry' | 'emergency'
  expectedResponseType?: 'yes_no' | 'confirmation' | 'text' | 'number'
  relatedEntityId?: string // reminder_log_id, verification_id, etc.
  stateData?: Record<string, unknown>
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface ProcessedMessage {
  intent: MessageIntent
  confidence: number
  entities: MessageEntity[]
  response: RecommendedResponse
  context: MessageContext
  requiresHumanIntervention: boolean
}

export interface MessageIntent {
  primary: 'accept' | 'decline' | 'confirm_taken' | 'confirm_missed' | 'confirm_later' | 'unsubscribe' | 'inquiry' | 'emergency' | 'unknown'
  secondary?: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence?: number
}

export interface MessageEntity {
  type: 'time' | 'date' | 'symptom' | 'emergency_level'
  value: string
  confidence: number
  position: { start: number; end: number }
}

export interface RecommendedResponse {
  type: 'auto_reply' | 'human_intervention' | 'escalation'
  message?: string
  actions: ResponseAction[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface ResponseAction {
  type: 'update_patient_status' | 'log_confirmation' | 'send_followup' | 'notify_volunteer' | 'create_manual_confirmation'
  data: Record<string, unknown>
}

export class MessageProcessorService {
  // Indonesian keyword mappings with variations and typos
  private readonly ACCEPT_KEYWORDS = [
    'ya', 'iya', 'yes', 'y', 'ok', 'oke', 'baik', 'setuju', 'mau', 'ingin',
    'terima', 'siap', 'bisa', 'boleh', 'sudah siap', 'sudah oke', 'sudah baik'
  ]

  private readonly DECLINE_KEYWORDS = [
    'tidak', 'no', 'n', 'ga', 'gak', 'engga', 'enggak', 'tolak', 'nanti',
    'besok', 'belum', 'ga mau', 'ga bisa', 'ga siap', 'belum siap'
  ]

  private readonly CONFIRMATION_TAKEN_KEYWORDS = [
    'sudah', 'udh', 'sudah selesai', 'udh selesai', 'sudah lakukan', 'udh lakukan',
    'selesai', 'telah selesai', 'sudah lakukan', 'done', 'selesai', 'sudah selesai'
  ]

  private readonly CONFIRMATION_MISSED_KEYWORDS = [
    'belum', 'blm', 'belum selesai', 'blm selesai', 'belum lakukan', 'lupa',
    'lupa lakukan', 'skip', 'lewat', 'ga lakukan', 'tidak lakukan', 'belum lakukan'
  ]

  private readonly CONFIRMATION_LATER_KEYWORDS = [
    'nanti', 'bentaran', 'sebentar', 'tunggu', 'wait', 'later', 'tunggu sebentar',
    'nanti dulu', 'belum saatnya', 'masih ada waktu'
  ]

  private readonly UNSUBSCRIBE_KEYWORDS = [
    'berhenti', 'stop', 'cancel', 'batal', 'keluar', 'hapus', 'unsubscribe',
    'cabut', 'stop dulu', 'berhenti dulu', 'tidak mau lagi', 'sudah cukup'
  ]

  private readonly EMERGENCY_KEYWORDS = [
    'darurat', 'emergency', 'sakit', 'mual', 'muntah', 'alergi', 'sesak',
    'nyeri', 'sakit kepala', 'demam', 'panas', 'gawat', 'tolong', 'help'
  ]

  private readonly INQUIRY_KEYWORDS = [
    'tanya', 'pertanyaan', 'bagaimana', 'gimana', 'kenapa', 'kok', 'mengapa',
    'info', 'informasi', 'bantuan', 'help', 'tolong', 'mau tanya'
  ]

  /**
   * Process incoming message with full NLP analysis
   */
  async processMessage(context: MessageContext): Promise<ProcessedMessage> {
    const normalizedMessage = this.normalizeMessage(context.message)

    // Detect intent with confidence scoring
    const intent = this.detectIntent(normalizedMessage)

    // Extract entities
    const entities = this.extractEntities(normalizedMessage)

    // Determine context and conversation state
    const conversationContext = await this.determineContext(context, intent)

    // Generate recommended response
    const response = this.generateResponse(intent, entities, conversationContext)

    // Check if human intervention is needed
    const requiresHumanIntervention = this.requiresHumanIntervention(intent, entities)

    return {
      intent,
      confidence: intent.confidence ?? 0.5,
      entities,
      response,
      context: conversationContext,
      requiresHumanIntervention
    }
  }

  /**
   * Normalize message for better processing
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common punctuation that doesn't affect meaning
      .replace(/[.,!?;:]$/g, '')
      // Normalize common abbreviations
      .replace(/\budh\b/g, 'sudah')
      .replace(/\bblm\b/g, 'belum')
      .replace(/\bga\b/g, 'tidak')
      .replace(/\bgak\b/g, 'tidak')
      .replace(/\bengga\b/g, 'tidak')
      .replace(/\benggak\b/g, 'tidak')
  }

  /**
   * Detect message intent with confidence scoring
   */
  private detectIntent(message: string): MessageIntent {
    const scores = this.calculateIntentScores(message)

    // Find highest scoring intent
    const maxScore = Math.max(...Object.values(scores))
    const primaryIntent = this.selectPrimaryIntent(scores)

    // Determine sentiment
    const sentiment = this.determineSentiment(message, primaryIntent)

    // Calculate confidence based on score and message length
    const confidence = this.calculateIntentConfidence(maxScore, message)

    return {
      primary: primaryIntent || 'unknown',
      sentiment,
      confidence: confidence || 0.5
    }
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(message: string, keywords: string[]): number {
    let score = 0

    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        // Exact match gets higher score
        if (message === keyword) {
          score += 10
        } else {
          score += keyword.length
        }
      }

      // Check for fuzzy matches (partial words)
      const fuzzyMatches = this.findFuzzyMatches(message, keyword)
      score += fuzzyMatches * (keyword.length * 0.5)
    }

    return score
  }

  /**
   * Find fuzzy matches for typos and variations
   */
  private findFuzzyMatches(message: string, keyword: string): number {
    // Simple Levenshtein distance for fuzzy matching
    const words = message.split(' ')
    let matches = 0

    for (const word of words) {
      if (this.levenshteinDistance(word, keyword) <= 2) {
        matches++
      }
    }

    return matches
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Determine sentiment of the message
   */
  private determineSentiment(message: string, intent: MessageIntent['primary']): MessageIntent['sentiment'] {
    const { positive, negative } = this.calculateWordBasedSentiment(message)

    if (positive > negative) return 'positive'
    if (negative > positive) return 'negative'

    // Default sentiment based on intent
    return this.getDefaultSentimentForIntent(intent)
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = []

    // Extract different types of entities
    entities.push(...this.extractTimeEntities(message))
    entities.push(...this.extractEmergencyEntities(message))

    return entities
  }

  /**
   * Determine conversation context
   */
  private async determineContext(context: MessageContext, intent: MessageIntent): Promise<MessageContext> {
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
        updatedAt: new Date()
      }
    }
  }

  /**
   * Map intent to conversation context
   */
  private mapIntentToContext(intent: MessageIntent['primary']): ConversationState['currentContext'] {
    switch (intent) {
      case 'accept':
      case 'decline':
        return 'verification'
      case 'confirm_taken':
      case 'confirm_missed':
      case 'confirm_later':
        return 'reminder_confirmation'
      case 'emergency':
        return 'emergency'
      case 'inquiry':
        return 'general_inquiry'
      default:
        return 'general_inquiry'
    }
  }

  /**
   * Get expected response type for intent
   */
  private getExpectedResponseType(intent: MessageIntent['primary']): ConversationState['expectedResponseType'] {
    switch (intent) {
      case 'accept':
      case 'decline':
      case 'confirm_taken':
      case 'confirm_missed':
        return 'yes_no'
      case 'confirm_later':
        return 'text'
      case 'inquiry':
        return 'text'
      default:
        return 'text'
    }
  }

  /**
   * Generate recommended response
   */
  private generateResponse(
    intent: MessageIntent,
    entities: MessageEntity[],
    context: MessageContext
  ): RecommendedResponse {
    switch (intent.primary) {
      case 'accept':
        return this.generateAcceptResponse()
      case 'decline':
        return this.generateDeclineResponse()
      case 'confirm_taken':
        return this.generateConfirmTakenResponse(context)
      case 'confirm_missed':
        return this.generateConfirmMissedResponse(context)
      case 'emergency':
        return this.generateEmergencyResponse(context)
      case 'unsubscribe':
        return this.generateUnsubscribeResponse()
      default:
        return this.generateLowConfidenceResponse(intent)
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
    if (intent.primary === 'emergency') return true

    // Low confidence intents need human review
    if ((intent.confidence ?? 0.5) < 0.3) return true

    // Complex entities might need human interpretation
    if (entities.some(entity => entity.confidence < 0.5)) return true

    // Inquiries typically need human response
    if (intent.primary === 'inquiry') return true

    // Messages with negative sentiment might need attention
    if (intent.sentiment === 'negative') return true

    return false
  }

  /**
   * Generate response for accept intent
   */
  private generateAcceptResponse(): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'update_patient_status',
      data: { status: 'verified' }
    })
    return {
      type: 'auto_reply',
      message: 'Terima kasih atas konfirmasinya! Anda akan menerima pengingat obat secara otomatis.',
      actions,
      priority: 'low'
    }
  }

  /**
   * Generate response for decline intent
   */
  private generateDeclineResponse(): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'update_patient_status',
      data: { status: 'declined' }
    })
    return {
      type: 'auto_reply',
      message: 'Baik, terima kasih atas responsnya. Jika berubah pikiran, Anda bisa menghubungi relawan PRIMA.',
      actions,
      priority: 'low'
    }
  }

  /**
   * Generate response for confirm_taken intent
   */
  private generateConfirmTakenResponse(context: MessageContext): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'log_confirmation',
      data: { status: 'CONFIRMED', response: context.message }
    })
    return {
      type: 'auto_reply',
      message: 'Bagus! Terus jaga kesehatan ya. 💊❤️',
      actions,
      priority: 'low'
    }
  }

  /**
   * Generate response for confirm_missed intent
   */
  private generateConfirmMissedResponse(context: MessageContext): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'log_confirmation',
      data: { status: 'MISSED', response: context.message }
    })
    actions.push({
      type: 'send_followup',
      data: { type: 'reminder', delay: 2 * 60 * 60 * 1000 } // 2 hours
    })
    return {
      type: 'auto_reply',
      message: 'Jangan lupa minum obat berikutnya ya. Jika ada kendala, hubungi relawan PRIMA. 💙',
      actions,
      priority: 'medium'
    }
  }

  /**
   * Generate response for emergency intent
   */
  private generateEmergencyResponse(context: MessageContext): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'notify_volunteer',
      data: { priority: 'urgent', message: context.message }
    })
    return {
      type: 'human_intervention',
      message: 'Kami mendeteksi ini sebagai situasi darurat. Relawan akan segera menghubungi Anda.',
      actions,
      priority: 'urgent'
    }
  }

  /**
   * Generate response for unsubscribe intent
   */
  private generateUnsubscribeResponse(): RecommendedResponse {
    const actions: ResponseAction[] = []
    actions.push({
      type: 'update_patient_status',
      data: { status: 'unsubscribed' }
    })
    return {
      type: 'auto_reply',
      message: 'Baik, kami akan berhenti mengirim pengingat. Semoga sehat selalu! 🙏',
      actions,
      priority: 'low'
    }
  }

  /**
   * Generate response for low confidence or unknown intent
   */
  private generateLowConfidenceResponse(intent: MessageIntent): RecommendedResponse {
    if ((intent.confidence ?? 0.5) < 0.3) {
      const actions: ResponseAction[] = []
      actions.push({
        type: 'notify_volunteer',
        data: { priority: 'low', reason: 'unclear_message' }
      })
      return {
        type: 'human_intervention',
        message: 'Maaf, pesan Anda kurang jelas. Relawan akan segera membantu Anda.',
        actions,
        priority: 'low'
      }
    }

    return {
      type: 'auto_reply',
      message: 'Terima kasih atas pesannya. Jika ada yang bisa dibantu, silakan beri tahu.',
      actions: [],
      priority: 'low'
    }
  }



  /**
   * Extract time entities from message
   */
  private extractTimeEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = []
    const timePattern = /\b(\d{1,2}):(\d{2})\b/g
    let match
    while ((match = timePattern.exec(message)) !== null) {
      entities.push({
        type: 'time',
        value: `${match[1]}:${match[2]}`,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      })
    }
    return entities
  }

  /**
   * Extract emergency entities from message
   */
  private extractEmergencyEntities(message: string): MessageEntity[] {
    const entities: MessageEntity[] = []
    if (this.EMERGENCY_KEYWORDS.some(keyword => message.includes(keyword))) {
      entities.push({
        type: 'emergency_level',
        value: 'high',
        confidence: 0.7,
        position: { start: 0, end: message.length }
      })
    }
    return entities
  }

  /**
   * Calculate scores for all intents
   */
  private calculateIntentScores(message: string): Record<string, number> {
    return {
      accept: this.calculateKeywordScore(message, this.ACCEPT_KEYWORDS),
      decline: this.calculateKeywordScore(message, this.DECLINE_KEYWORDS),
      confirm_taken: this.calculateKeywordScore(message, this.CONFIRMATION_TAKEN_KEYWORDS),
      confirm_missed: this.calculateKeywordScore(message, this.CONFIRMATION_MISSED_KEYWORDS),
      confirm_later: this.calculateKeywordScore(message, this.CONFIRMATION_LATER_KEYWORDS),
      unsubscribe: this.calculateKeywordScore(message, this.UNSUBSCRIBE_KEYWORDS),
      emergency: this.calculateKeywordScore(message, this.EMERGENCY_KEYWORDS),
      inquiry: this.calculateKeywordScore(message, this.INQUIRY_KEYWORDS)
    }
  }

  /**
   * Select primary intent from scores
   */
  private selectPrimaryIntent(scores: Record<string, number>): MessageIntent['primary'] {
    const maxScore = Math.max(...Object.values(scores))
    return Object.keys(scores).find(key => scores[key] === maxScore) as MessageIntent['primary'] || 'unknown'
  }

  /**
   * Calculate confidence for intent
   */
  private calculateIntentConfidence(maxScore: number, message: string): number {
    return Math.min(maxScore / message.length * 100, 1.0) || 0.5
  }

  /**
   * Calculate sentiment score based on positive/negative words
   */
  private calculateWordBasedSentiment(message: string): { positive: number; negative: number } {
    const positiveWords = ['baik', 'bagus', 'senang', 'terima kasih', 'makasih', 'thanks', 'good']
    const negativeWords = ['buruk', 'jelek', 'marah', 'kesal', 'kecewa', 'tidak suka', 'bad']

    const positiveScore = positiveWords.reduce((score, word) =>
      score + (message.includes(word) ? 1 : 0), 0)
    const negativeScore = negativeWords.reduce((score, word) =>
      score + (message.includes(word) ? 1 : 0), 0)

    return { positive: positiveScore, negative: negativeScore }
  }

  /**
   * Get default sentiment based on intent
   */
  private getDefaultSentimentForIntent(intent: MessageIntent['primary']): MessageIntent['sentiment'] {
    switch (intent) {
      case 'accept':
      case 'confirm_taken':
        return 'positive'
      case 'decline':
      case 'confirm_missed':
      case 'unsubscribe':
        return 'negative'
      default:
        return 'neutral'
    }
  }
}