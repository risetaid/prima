import { db } from '@/db'
import { logger } from '@/lib/logger'
import { sql } from 'drizzle-orm'

export interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number // Maximum requests per window (default: 10)
  keyPrefix?: string // Prefix for the rate limit key (default: 'rate_limit')
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  totalRequests: number
}

export class RateLimitService {
  private readonly DEFAULT_WINDOW_MS = 60000 // 1 minute
  private readonly DEFAULT_MAX_REQUESTS = 10
  private readonly DEFAULT_KEY_PREFIX = 'rate_limit'

  /**
   * Check if a request is allowed based on rate limits
   */
  async checkRateLimit(
    identifier: string,
    options: RateLimitOptions = {}
  ): Promise<RateLimitResult> {
    const {
      windowMs = this.DEFAULT_WINDOW_MS,
      maxRequests = this.DEFAULT_MAX_REQUESTS,
      keyPrefix = this.DEFAULT_KEY_PREFIX
    } = options

    const rateLimitKey = this.getRateLimitKey(identifier, keyPrefix)
    const windowStart = new Date(Date.now() - windowMs)
    const resetTime = new Date(Date.now() + windowMs)

    try {
      // Clean up old entries first
      await this.cleanupOldEntries(rateLimitKey, windowStart)

      // Get current count for this window
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM rate_limits
        WHERE rate_limit_key = ${rateLimitKey}
        AND created_at > ${windowStart}
      `)

      const currentCount = 'rows' in countResult && Array.isArray(countResult.rows) && countResult.rows[0] ? parseInt((countResult.rows[0] as Record<string, unknown>).count as string || '0', 10) : 0
      const remaining = Math.max(0, maxRequests - currentCount)
      const allowed = currentCount < maxRequests

      // If allowed, record this request
      if (allowed) {
        await db.execute(sql`
          INSERT INTO rate_limits (rate_limit_key, created_at)
          VALUES (${rateLimitKey}, NOW())
        `)
      }

      logger.debug('Rate limit check completed', {
        identifier,
        rateLimitKey,
        allowed,
        currentCount,
        remaining,
        maxRequests,
        windowMs
      })

      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: currentCount
      }
    } catch (error) {
      logger.error('Error checking rate limit', error as Error, {
        identifier,
        rateLimitKey
      })

      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
        totalRequests: 1
      }
    }
  }

  /**
   * Get current rate limit status without consuming a request
   */
  async getRateLimitStatus(
    identifier: string,
    options: RateLimitOptions = {}
  ): Promise<RateLimitResult> {
    const {
      windowMs = this.DEFAULT_WINDOW_MS,
      maxRequests = this.DEFAULT_MAX_REQUESTS,
      keyPrefix = this.DEFAULT_KEY_PREFIX
    } = options

    const rateLimitKey = this.getRateLimitKey(identifier, keyPrefix)
    const windowStart = new Date(Date.now() - windowMs)
    const resetTime = new Date(Date.now() + windowMs)

    try {
      // Get current count for this window
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM rate_limits
        WHERE rate_limit_key = ${rateLimitKey}
        AND created_at > ${windowStart}
      `)

      const currentCount = 'rows' in countResult && Array.isArray(countResult.rows) && countResult.rows[0] ? parseInt((countResult.rows[0] as Record<string, unknown>).count as string || '0', 10) : 0
      const remaining = Math.max(0, maxRequests - currentCount)
      const allowed = currentCount < maxRequests

      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: currentCount
      }
    } catch (error) {
      logger.error('Error getting rate limit status', error as Error, {
        identifier,
        rateLimitKey
      })

      return {
        allowed: true,
        remaining: maxRequests,
        resetTime,
        totalRequests: 0
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string, keyPrefix: string = this.DEFAULT_KEY_PREFIX): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(identifier, keyPrefix)

    try {
      await db.execute(sql`
        DELETE FROM rate_limits
        WHERE rate_limit_key = ${rateLimitKey}
      `)

      logger.info('Rate limit reset', {
        identifier,
        rateLimitKey
      })
    } catch (error) {
      logger.error('Error resetting rate limit', error as Error, {
        identifier,
        rateLimitKey
      })
    }
  }

  /**
   * Clean up old rate limit entries
   */
  async cleanupOldEntries(rateLimitKey?: string, cutoff?: Date): Promise<number> {
    try {
      let query = sql`DELETE FROM rate_limits`
      const conditions: string[] = []

      if (rateLimitKey) {
        conditions.push(`rate_limit_key = ${rateLimitKey}`)
      }

      if (cutoff) {
        conditions.push(`created_at <= ${cutoff}`)
      }

      if (conditions.length > 0) {
        query = sql`${query} WHERE ${sql.raw(conditions.join(' AND '))}`
      }

      const result = await db.execute(query)
      return 'rowCount' in result ? (result as Record<string, unknown>).rowCount as number : 0
    } catch (error) {
      logger.error('Error cleaning up rate limit entries', error as Error)
      return 0
    }
  }

  /**
   * Execute a function with rate limiting
   * Returns the result or null if rate limited
   */
  async withRateLimit<T>(
    identifier: string,
    fn: () => Promise<T>,
    options: RateLimitOptions = {}
  ): Promise<{ result: T | null; rateLimitInfo: RateLimitResult }> {
    const rateLimitResult = await this.checkRateLimit(identifier, options)

    if (!rateLimitResult.allowed) {
      return { result: null, rateLimitInfo: rateLimitResult }
    }

    try {
      const result = await fn()
      return { result, rateLimitInfo: rateLimitResult }
    } catch (error) {
      // The request was counted but failed, so we should handle appropriately
      logger.error('Function failed within rate limit', error as Error, {
        identifier
      })
      return { result: null, rateLimitInfo: rateLimitResult }
    }
  }

  private getRateLimitKey(identifier: string, keyPrefix: string): string {
    return `${keyPrefix}:${identifier}`
  }
}

// Specialized rate limiters for different use cases
export class WhatsAppRateLimiter extends RateLimitService {
  private readonly WHATSAPP_WINDOW_MS = 60000 // 1 minute
  private readonly WHATSAPP_MAX_REQUESTS = 30 // Fonnte typical rate limit

  async checkWhatsAppRateLimit(phoneNumber: string): Promise<RateLimitResult> {
    return this.checkRateLimit(phoneNumber, {
      windowMs: this.WHATSAPP_WINDOW_MS,
      maxRequests: this.WHATSAPP_MAX_REQUESTS,
      keyPrefix: 'whatsapp'
    })
  }
}

export class PatientResponseRateLimiter extends RateLimitService {
  private readonly RESPONSE_WINDOW_MS = 30000 // 30 seconds
  private readonly RESPONSE_MAX_REQUESTS = 5 // Max responses per 30 seconds

  async checkPatientResponseRateLimit(patientId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(patientId, {
      windowMs: this.RESPONSE_WINDOW_MS,
      maxRequests: this.RESPONSE_MAX_REQUESTS,
      keyPrefix: 'patient_response'
    })
  }
}

export class ReminderProcessingRateLimiter extends RateLimitService {
  private readonly PROCESSING_WINDOW_MS = 60000 // 1 minute
  private readonly PROCESSING_MAX_REQUESTS = 100 // Max reminders per minute

  async checkReminderProcessingRateLimit(): Promise<RateLimitResult> {
    return this.checkRateLimit('global', {
      windowMs: this.PROCESSING_WINDOW_MS,
      maxRequests: this.PROCESSING_MAX_REQUESTS,
      keyPrefix: 'reminder_processing'
    })
  }
}

// Export singleton instances
export const rateLimitService = new RateLimitService()
export const whatsAppRateLimiter = new WhatsAppRateLimiter()
export const patientResponseRateLimiter = new PatientResponseRateLimiter()
export const reminderProcessingRateLimiter = new ReminderProcessingRateLimiter()