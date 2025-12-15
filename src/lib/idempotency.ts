import { createHash } from 'crypto'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { featureFlags } from '@/lib/feature-flags'
import { metrics } from '@/lib/metrics'

/**
 * Check if an event is a duplicate using idempotency key
 * 
 * LEGACY (race condition): Uses exists() + set() - gap allows duplicates
 * NEW (atomic): Uses SET NX EX - atomic operation prevents race condition
 * 
 * Controlled by feature flag: SECURITY_ATOMIC_IDEMPOTENCY
 */
export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    if (featureFlags.isEnabled('SECURITY_ATOMIC_IDEMPOTENCY')) {
      // NEW IMPLEMENTATION: Atomic SET NX EX
      // Returns null if key already exists (duplicate)
      // Returns "OK" if key was set (first time)
      const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      const isDuplicate = result === null;
      
      // Track metrics
      metrics.increment('idempotency.check.atomic');
      if (isDuplicate) {
        metrics.increment('idempotency.duplicate_detected.atomic');
      }
      
      logger.debug('Atomic idempotency check', {
        operation: 'idempotency.check',
        key,
        isDuplicate,
        implementation: 'atomic',
        duration_ms: Date.now() - startTime,
      });
      
      return isDuplicate;
    } else {
      // LEGACY IMPLEMENTATION: Race condition exists
      const exists = await redis.exists(key);
      if (exists) {
        metrics.increment('idempotency.check.legacy');
        metrics.increment('idempotency.duplicate_detected.legacy');
        return true;
      }
      
      await redis.set(key, '1', ttlSeconds);
      metrics.increment('idempotency.check.legacy');
      
      logger.debug('Legacy idempotency check', {
        operation: 'idempotency.check',
        key,
        isDuplicate: false,
        implementation: 'legacy',
        duration_ms: Date.now() - startTime,
      });
      
      return false;
    }
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

