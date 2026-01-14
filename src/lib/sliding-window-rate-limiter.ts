/**
 * Sliding Window Rate Limiter
 *
 * More accurate rate limiting using sliding window algorithm.
 * Uses Redis for distributed rate limiting.
 */

import { redis } from './redis';
import { logger } from './logger';

const RATE_LIMIT_PREFIX = 'prima:ratelimit:';

/**
 * Sliding window rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Sliding window rate limiter using Redis sorted sets
 *
 * Algorithm:
 * 1. Remove expired entries (outside window)
 * 2. Count current entries
 * 3. If under limit, add new entry
 * 4. Return result with TTL for cleanup
 */
export async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const prefixedKey = `${RATE_LIMIT_PREFIX}${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Use a Lua script for atomic operation
  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window_start = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local window_ms = tonumber(ARGV[4])

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    -- Count current entries
    local count = redis.call('ZCARD', key)

    if count < limit then
      -- Add new entry with current timestamp as score
      redis.call('ZADD', key, now, now .. ':' .. math.random())
      -- Set expiry (window + buffer)
      redis.call('PEXPIRE', key, window_ms + 1000)
      return {1, limit, limit - count - 1, now + window_ms}
    else
      -- Rate limited
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local resetTime = oldest[2] and (tonumber(oldest[2]) + window_ms) or (now + window_ms)
      return {0, limit, 0, resetTime}
    end
  `;

  try {
    // Check if redis.eval exists on the client wrapper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisClient = redis as any;
    if (typeof redisClient?.eval !== 'function') {
      // Redis client doesn't support eval, fall back to allowing request
      logger.debug('Redis eval not available, using memory rate limiter', { key });
      return memoryRateLimiter.check(key, limit, windowMs);
    }

    const result = await redisClient.eval(
      luaScript,
      1,
      prefixedKey,
      now.toString(),
      windowStart.toString(),
      limit.toString(),
      windowMs.toString()
    ) as [number, number, number, number];

    const [allowed, limit_, remaining, resetTime] = result;

    return {
      allowed: allowed === 1,
      limit: limit_,
      remaining: Math.max(0, remaining),
      resetTime,
    };
  } catch (error) {
    // On Redis error, allow the request but log warning
    logger.warn('Rate limiter Redis error, allowing request', {
      key,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    // Fail open - allow request on Redis failure
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetTime: now + windowMs,
    };
  }
}

/**
 * Simple in-memory rate limiter for single-instance deployments
 */
export class MemoryRateLimiter {
  private windows = new Map<string, { count: number; expiresAt: number }>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowData = this.windows.get(key);

    if (!windowData || windowData.expiresAt < now) {
      // New window
      const resetTime = now + windowMs;
      this.windows.set(key, { count: 1, expiresAt: resetTime });

      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime,
      };
    }

    if (windowData.count >= limit) {
      // Rate limited
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: windowData.expiresAt,
      };
    }

    // Increment count
    windowData.count++;

    return {
      allowed: true,
      limit,
      remaining: limit - windowData.count,
      resetTime: windowData.expiresAt,
    };
  }
}

// Export singleton instance
export const memoryRateLimiter = new MemoryRateLimiter();
