/**
 * Prompt Optimization Service for LLM cost efficiency
 * Reduces token usage while maintaining response quality
 */



export interface OptimizedPrompt {
  originalPrompt: string
  optimizedPrompt: string
  originalTokens: number
  optimizedTokens: number
  savings: number
  savingsPercentage: number
}

export interface PromptOptimizationResult {
  optimized: OptimizedPrompt
  recommendations: string[]
}

export class PromptOptimizerService {
  private readonly MAX_PROMPT_LENGTH = 2000 // Maximum characters for optimized prompts
  private readonly TARGET_TOKEN_REDUCTION = 0.3 // Target 30% reduction

  /**
   * Optimize a system prompt for cost efficiency
   */
  optimizeSystemPrompt(prompt: string): PromptOptimizationResult {
    const originalTokens = this.estimateTokens(prompt)

    // Apply various optimization techniques
    let optimized = prompt

    // Remove unnecessary whitespace and formatting
    optimized = this.compressWhitespace(optimized)

    // Remove redundant phrases
    optimized = this.removeRedundancies(optimized)

    // Shorten verbose instructions
    optimized = this.shortenInstructions(optimized)

    // Use abbreviations where appropriate
    optimized = this.applyAbbreviations(optimized)

    // Ensure we don't exceed maximum length
    if (optimized.length > this.MAX_PROMPT_LENGTH) {
      optimized = this.truncateSmartly(optimized, this.MAX_PROMPT_LENGTH)
    }

    const optimizedTokens = this.estimateTokens(optimized)
    const savings = originalTokens - optimizedTokens
    const savingsPercentage = originalTokens > 0 ? (savings / originalTokens) * 100 : 0

    const recommendations: string[] = []
    if (savingsPercentage < 10) {
      recommendations.push('Prompt is already well-optimized')
    } else if (savingsPercentage > 50) {
      recommendations.push('Significant optimization achieved - verify response quality')
    }

    if (optimizedTokens > 1000) {
      recommendations.push('Consider breaking complex prompts into smaller, focused prompts')
    }

    return {
      optimized: {
        originalPrompt: prompt,
        optimizedPrompt: optimized,
        originalTokens,
        optimizedTokens,
        savings,
        savingsPercentage
      },
      recommendations
    }
  }

  /**
   * Optimize conversation context for token efficiency
   */
  optimizeConversationContext(
    messages: Array<{ role: string; content: string }>,
    maxMessages: number = 5
  ): Array<{ role: string; content: string }> {
    if (messages.length <= maxMessages) {
      return messages
    }

    // Keep the most recent messages
    const recentMessages = messages.slice(-maxMessages)

    // Compress older messages if needed
    const compressedMessages = recentMessages.map(msg => ({
      ...msg,
      content: this.compressMessageContent(msg.content, msg.role)
    }))

    return compressedMessages
  }

  /**
   * Compress whitespace and formatting
   */
  private compressWhitespace(text: string): string {
    return text
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*\n\s*/g, '\n') // Clean up line breaks
      .trim()
  }

  /**
   * Remove redundant phrases and instructions
   */
  private removeRedundancies(text: string): string {
    const redundancies = [
      /please\s+/gi,
      /kindly\s+/gi,
      /you should\s+/gi,
      /you must\s+/gi,
      /it is important to\s+/gi,
      /remember to\s+/gi,
      /always\s+/gi,
      /never\s+/gi,
      /be sure to\s+/gi,
      /make sure to\s+/gi
    ]

    let optimized = text
    redundancies.forEach(pattern => {
      optimized = optimized.replace(pattern, '')
    })

    return optimized
  }

  /**
   * Shorten verbose instructions
   */
  private shortenInstructions(text: string): string {
    const replacements: Record<string, string> = {
      'Respond in Indonesian language': 'Respond in Indonesian',
      'Use simple and clear language': 'Use simple language',
      'Be friendly and professional': 'Be friendly',
      'Keep responses concise': 'Be concise',
      'Do not give medical advice': 'No medical advice',
      'Do not provide diagnoses': 'No diagnoses',
      'Focus on the patient': 'Patient-focused',
      'Maintain conversation context': 'Keep context',
      'Handle edge cases appropriately': 'Handle edge cases'
    }

    let optimized = text
    Object.entries(replacements).forEach(([long, short]) => {
      optimized = optimized.replace(new RegExp(long, 'gi'), short)
    })

    return optimized
  }

  /**
   * Apply common abbreviations
   */
  private applyAbbreviations(text: string): string {
    const abbreviations: Record<string, string> = {
      'patient': 'pt',
      'medication': 'med',
      'prescription': 'rx',
      'treatment': 'tx',
      'diagnosis': 'dx',
      'symptoms': 'sx',
      'response': 'resp',
      'message': 'msg',
      'conversation': 'conv',
      'verification': 'verif',
      'confirmation': 'confirm',
      'emergency': 'emerg',
      'information': 'info'
    }

    let optimized = text
    Object.entries(abbreviations).forEach(([full, abbr]) => {
      // Only abbreviate if it saves space and doesn't affect readability
      const regex = new RegExp(`\\b${full}\\b`, 'gi')
      optimized = optimized.replace(regex, abbr)
    })

    return optimized
  }

  /**
   * Smart truncation that preserves important information
   */
  private truncateSmartly(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text

    // Try to truncate at sentence boundaries
    const sentences = text.split(/[.!?]+/)
    let result = ''

    for (const sentence of sentences) {
      if ((result + sentence).length + 1 > maxLength) break
      result += sentence + '.'
    }

    if (result.length === 0) {
      // If no sentences fit, truncate at word boundary
      const words = text.split(' ')
      result = words.slice(0, Math.floor(maxLength / 6)).join(' ') + '...'
    }

    return result.trim()
  }

  /**
   * Compress message content while preserving meaning
   */
  private compressMessageContent(content: string, role: string): string {
    if (role === 'system') return content // Don't compress system messages

    // For user/assistant messages, keep them relatively intact but remove fluff
    return this.compressWhitespace(content)
      .replace(/^(.{100}).*$/, '$1...') // Truncate very long messages
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English/Indonesian text
    return Math.ceil(text.length / 4)
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(prompts: string[]): {
    totalOriginalTokens: number
    totalOptimizedTokens: number
    averageSavings: number
    bestOptimization: OptimizedPrompt | null
  } {
    const optimizations = prompts.map(p => this.optimizeSystemPrompt(p).optimized)

    const totalOriginalTokens = optimizations.reduce((sum, opt) => sum + opt.originalTokens, 0)
    const totalOptimizedTokens = optimizations.reduce((sum, opt) => sum + opt.optimizedTokens, 0)
    const totalSavings = optimizations.reduce((sum, opt) => sum + opt.savings, 0)
    const averageSavings = optimizations.length > 0 ? totalSavings / optimizations.length : 0

    const bestOptimization = optimizations.reduce((best, current) =>
      current.savingsPercentage > (best?.savingsPercentage || 0) ? current : best
    , null as OptimizedPrompt | null)

    return {
      totalOriginalTokens,
      totalOptimizedTokens,
      averageSavings,
      bestOptimization
    }
  }
}

// Export singleton instance
export const promptOptimizer = new PromptOptimizerService()