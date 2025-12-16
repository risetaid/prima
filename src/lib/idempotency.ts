import { createHash } from 'crypto'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { metrics } from '@/lib/metrics'

/**
 * Check if an event is a duplicate using atomic idempotency key
 * Uses SET NX EX for atomic operation to prevent race conditions
 */
export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Atomic check-and-set operation using SET NX EX
    // Returns true if key was set (not a duplicate), false if key already exists (duplicate)
    const wasSet = await redis.setnx(key, '1', ttlSeconds);

    if (!wasSet) {
      // Key already exists - this is a duplicate
      metrics.increment('idempotency.duplicate_detected');

      logger.debug('Idempotency check - duplicate', {
        operation: 'idempotency.check',
        key,
        isDuplicate: true,
        duration_ms: Date.now() - startTime,
      });

      return true;
    }

    // Key was set successfully - this is a new event
    metrics.increment('idempotency.check');

    logger.debug('Idempotency check - new', {
      operation: 'idempotency.check',
      key,
      isDuplicate: false,
      duration_ms: Date.now() - startTime,
    });

    return false;
  } catch (error) {
    // Fail closed: If Redis is unavailable, treat as duplicate to be safe
    logger.error('Idempotency check failed - rejecting to be safe',
      error instanceof Error ? error : undefined,
      {
        operation: 'idempotency.check',
        key,
      }
    );
    metrics.increment('idempotency.error');
    return true; // Fail closed, not open
  }
}

export function hashFallbackId(parts: (string | undefined)[]): string {
  const h = createHash('sha1')
  h.update(parts.filter(Boolean).join('|'))
  return h.digest('hex')
}

