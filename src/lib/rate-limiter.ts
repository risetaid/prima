import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Prefix for Redis keys
  skipSuccessfulRequests?: boolean // Skip rate limiting for successful requests
  skipFailedRequests?: boolean // Skip rate limiting for failed requests
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalRequests: number
}

export interface RateLimitInfo {
  identifier: string
  config: RateLimitConfig
  result: RateLimitResult
}

/**
 * Rate limiting utility using Redis for distributed rate limiting
 */
export class RateLimiter {
  private static readonly DEFAULT_CONFIG: Partial<RateLimitConfig> = {
    keyPrefix: 'ratelimit',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }

  /**
   * Check if request should be rate limited
   */
  static async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const key = `${fullConfig.keyPrefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - fullConfig.windowMs

    try {
      // Get current request data
      const currentData = await redis.get(key)
      let requestData: { requests: number[]; windowStart: number } = {
        requests: [],
        windowStart: now
      }

      if (currentData) {
        try {
          requestData = JSON.parse(currentData)
        } catch {
          // Reset data if parsing fails
          requestData = { requests: [], windowStart: now }
        }
      }

      // Clean old requests outside the window
      requestData.requests = requestData.requests.filter(timestamp => timestamp > windowStart)
      requestData.windowStart = windowStart

      // Add current request
      requestData.requests.push(now)

      const requestCount = requestData.requests.length
      const allowed = requestCount <= fullConfig.maxRequests
      const remaining = Math.max(0, fullConfig.maxRequests - requestCount)
      const resetTime = now + fullConfig.windowMs

      // Save updated data with expiration
      const success = await redis.set(
        key,
        JSON.stringify(requestData),
        Math.ceil(fullConfig.windowMs / 1000) + 60 // TTL in seconds + buffer
      )

      if (!success) {
        logger.warn('Failed to save rate limit data to Redis', { identifier })
      }

      const result: RateLimitResult = {
        allowed,
        remaining,
        resetTime,
        totalRequests: requestCount
      }

      // Log rate limit violations
      if (!allowed) {
        logger.security(`Rate limit exceeded for ${identifier}`, {
          identifier,
          requestCount,
          maxRequests: fullConfig.maxRequests,
          windowMs: fullConfig.windowMs,
          remaining,
          resetTime: new Date(resetTime).toISOString()
        })
      }

      return result
    } catch (error) {
      logger.error('Rate limiter error', error instanceof Error ? error : new Error(String(error)), {
        identifier,
        config: fullConfig
      })

      // On Redis error, allow the request to prevent blocking legitimate users
      return {
        allowed: true,
        remaining: fullConfig.maxRequests,
        resetTime: now + fullConfig.windowMs,
        totalRequests: 0
      }
    }
  }

  /**
   * Middleware function for API routes
   */
  static async rateLimitMiddleware(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
    const result = await this.checkRateLimit(identifier, config)

    if (!result.allowed) {
      return {
        allowed: false,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    }

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
      }
    }
  }

  /**
   * Clean up old rate limit data (maintenance function)
   */
  static async cleanup(identifier?: string): Promise<void> {
    try {
      // Note: With the current RedisClient implementation, we can't efficiently
      // scan for keys. This is a simplified cleanup that only handles specific identifiers.
      // In production, you might want to extend RedisClient to support key scanning.

      if (identifier) {
        const key = `${this.DEFAULT_CONFIG.keyPrefix}:${identifier}`
        const exists = await redis.exists(key)
        if (exists) {
          await redis.del(key)
          logger.info(`Cleaned up rate limit data for ${identifier}`)
        }
      } else {
        // For general cleanup, we'd need to extend RedisClient to support scanning
        logger.info('General cleanup not supported with current RedisClient implementation')
      }
    } catch (error) {
      logger.error('Rate limiter cleanup error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  static async getStats(identifier?: string): Promise<{
    totalKeys: number
    activeKeys: number
    totalRequests: number
    averageRequestsPerKey: number
  }> {
    try {
      // Note: With current RedisClient, we can't efficiently scan keys
      // This is a simplified implementation that only works for specific identifiers
      if (identifier) {
        const key = `${this.DEFAULT_CONFIG.keyPrefix}:${identifier}`
        const exists = await redis.exists(key)

        if (exists) {
          const data = await redis.get(key)
          if (data) {
            try {
              const parsed = JSON.parse(data)
              const requestCount = parsed.requests?.length || 0

              return {
                totalKeys: 1,
                activeKeys: requestCount > 0 ? 1 : 0,
                totalRequests: requestCount,
                averageRequestsPerKey: requestCount
              }
            } catch {
              // Invalid data format
            }
          }
        }
      }

      // For general stats without specific identifier, return zeros
      // In production, you'd want to extend RedisClient to support key scanning
      logger.info('General rate limit stats not available with current RedisClient implementation')

      return {
        totalKeys: 0,
        activeKeys: 0,
        totalRequests: 0,
        averageRequestsPerKey: 0
      }
    } catch (error) {
      logger.error('Failed to get rate limiter stats', error instanceof Error ? error : new Error(String(error)))
      return {
        totalKeys: 0,
        activeKeys: 0,
        totalRequests: 0,
        averageRequestsPerKey: 0
      }
    }
  }
}

// Pre-configured rate limiters for common use cases
export const API_RATE_LIMITS = {
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },

  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },

  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  },

  // WhatsApp API endpoints
  WHATSAPP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50
  },

  // Admin endpoints
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200
  },

  // Public content endpoints
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500
  }
} as const

// Helper function to get client IP from request
export function getClientIP(request: Request): string {
  // Try different headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')

  if (forwarded) {
    // Take first IP if multiple are present
    return forwarded.split(',')[0].trim()
  }

  if (realIP) return realIP
  if (clientIP) return clientIP

  // Fallback to a default identifier
  return 'unknown'
}

// Helper function to get user identifier for rate limiting
export function getUserIdentifier(request: Request, userId?: string | null): string {
  if (userId) {
    return `user:${userId}`
  }

  const ip = getClientIP(request)
  return `ip:${ip}`
}

