/**
 * Simple LLM Response Cache using Redis
 * Lightweight caching for common LLM responses to reduce API costs
 */

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

export interface CachedResponse {
  response: string
  cachedAt: number
}

export class ResponseCacheService {
  private readonly CACHE_TTL_SECONDS = 24 * 60 * 60 // 24 hours

  /**
   * Generate simple cache key from intent and context
   */
  private generateCacheKey(intent: string, patientContext: Record<string, unknown>): string {
    const contextStr = JSON.stringify(patientContext)
    // Use SHA256 hash instead of truncated base64 to prevent collisions
    const hash = createHash('sha256').update(contextStr).digest('hex')
    return `llm:${intent}:${hash}`
  }

  /**
   * Get cached response if available
   */
  async get(intent: string, patientContext: Record<string, unknown>): Promise<CachedResponse | null> {
    try {
      const key = this.generateCacheKey(intent, patientContext)
      const cached = await redis.get(key)

      if (!cached) return null

      const parsed = JSON.parse(cached) as CachedResponse
      logger.debug('Cache hit for LLM response', { intent })
      return parsed
    } catch (error) {
      logger.warn('Failed to retrieve cached response', {
        intent,
        errorMessage: (error as Error).message
      })
      return null
    }
  }

  /**
   * Store response in cache
   */
  async set(
    intent: string,
    patientContext: Record<string, unknown>,
    response: string
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(intent, patientContext)
      const cacheData: CachedResponse = {
        response,
        cachedAt: Date.now()
      }

      await redis.set(key, JSON.stringify(cacheData), this.CACHE_TTL_SECONDS)
      logger.debug('Cached LLM response', { intent })
    } catch (error) {
      logger.warn('Failed to cache response', {
        intent,
        errorMessage: (error as Error).message
      })
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Check if a message type should be cached
   */
  shouldCache(intent: string, confidence: number): boolean {
    // Only cache high-confidence responses for common intents
    if (confidence < 0.8) return false

    const cacheableIntents = [
      'general_inquiry',
      'verification_response',
      'medication_confirmation'
    ]

    return cacheableIntents.includes(intent)
  }
}

// Export singleton instance
export const responseCache = new ResponseCacheService()