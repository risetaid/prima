/**
 * Response Cache Service for LLM responses
 * Implements caching for common queries to reduce API costs and improve response times
 */

import { db } from '@/db'
import { llmResponseCache } from '@/db/schema'
import { eq, and, lt, sql, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export interface CacheKey {
  messageHash: string
  patientContextHash: string
}

export interface CachedResponse {
  id: string
  response: string
  createdAt: Date
  expiresAt: Date
}

export class ResponseCacheService {
  private readonly CACHE_TTL_HOURS = 24 // 24 hours default TTL
  private readonly MAX_CACHE_SIZE = 10000 // Maximum number of cached responses

  /**
   * Generate hash for message content
   */
  private generateMessageHash(message: string): string {
    return crypto.createHash('sha256').update(message.trim().toLowerCase()).digest('hex')
  }

  /**
   * Generate hash for patient context
   */
   private generatePatientContextHash(context: Record<string, unknown>): string {
    // Sort keys to ensure consistent hashing
    const sortedContext = Object.keys(context)
      .sort()
      .reduce((result, key) => {
        result[key] = context[key]
        return result
      }, {} as Record<string, unknown>)

    return crypto.createHash('sha256')
      .update(JSON.stringify(sortedContext))
      .digest('hex')
  }

  /**
   * Get cached response if available and not expired
   */
   async get(message: string, patientContext: Record<string, unknown>): Promise<CachedResponse | null> {
    try {
      const messageHash = this.generateMessageHash(message)
      const patientContextHash = this.generatePatientContextHash(patientContext)

      const cached = await db
        .select()
        .from(llmResponseCache)
        .where(
          and(
            eq(llmResponseCache.messageHash, messageHash),
            eq(llmResponseCache.patientContextHash, patientContextHash),
            sql`${llmResponseCache.expiresAt} > NOW()`
          )
        )
        .limit(1)

      if (cached.length === 0) {
        return null
      }

      const cacheEntry = cached[0]
      logger.debug('Cache hit for LLM response', {
        messageHash: messageHash.substring(0, 8),
        patientContextHash: patientContextHash.substring(0, 8),
        cacheAge: Date.now() - cacheEntry.createdAt.getTime()
      })

      return {
        id: cacheEntry.id,
        response: cacheEntry.response as string,
        createdAt: cacheEntry.createdAt,
        expiresAt: cacheEntry.expiresAt
      }
    } catch (error) {
      logger.warn('Failed to retrieve cached response', {
        messageLength: message.length,
        errorMessage: (error as Error).message
      })
      return null
    }
  }

  /**
   * Store response in cache
   */
  async set(
    message: string,
    patientContext: Record<string, unknown>,
    response: string,
    ttlHours?: number
  ): Promise<void> {
    try {
      const messageHash = this.generateMessageHash(message)
      const patientContextHash = this.generatePatientContextHash(patientContext)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + (ttlHours || this.CACHE_TTL_HOURS))

      // Check if we need to clean up old entries
      await this.cleanupExpired()

      // Insert or update cache entry
      await db
        .insert(llmResponseCache)
        .values({
          messageHash,
          patientContextHash,
          response,
          expiresAt
        })
        .onConflictDoUpdate({
          target: [llmResponseCache.messageHash, llmResponseCache.patientContextHash],
          set: {
            response,
            expiresAt
          }
        })

      logger.debug('Cached LLM response', {
        messageHash: messageHash.substring(0, 8),
        patientContextHash: patientContextHash.substring(0, 8),
        expiresAt
      })
    } catch (error) {
      logger.warn('Failed to cache response', {
        messageLength: message.length,
        errorMessage: (error as Error).message
      })
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpired(): Promise<number> {
    try {
      const result = await db
        .delete(llmResponseCache)
        .where(lt(llmResponseCache.expiresAt, new Date()))
        .returning()

      const deletedCount = result.length

      if (deletedCount > 0) {
        logger.info('Cleaned up expired cache entries', { count: deletedCount })
      }

      return deletedCount
    } catch (error) {
      logger.warn('Failed to cleanup expired cache', { errorMessage: (error as Error).message })
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number
    expiredEntries: number
    activeEntries: number
  }> {
    try {
      const [totalResult] = await db
        .select({ count: count() })
        .from(llmResponseCache)

      const [expiredResult] = await db
        .select({ count: count() })
        .from(llmResponseCache)
        .where(lt(llmResponseCache.expiresAt, new Date()))

      const total = totalResult?.count || 0
      const expired = expiredResult?.count || 0
      const active = total - expired

      return {
        totalEntries: total,
        expiredEntries: expired,
        activeEntries: active
      }
    } catch (error) {
      logger.warn('Failed to get cache stats', { errorMessage: (error as Error).message })
      return {
        totalEntries: 0,
        expiredEntries: 0,
        activeEntries: 0
      }
    }
  }

  /**
   * Clear all cache entries (for maintenance)
   */
  async clear(): Promise<number> {
    try {
      const result = await db.delete(llmResponseCache).returning()
      const deletedCount = result.length

      logger.info('Cleared response cache', { deletedCount })
      return deletedCount
    } catch (error) {
      logger.error('Failed to clear cache', error as Error)
      throw error
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