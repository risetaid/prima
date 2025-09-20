import { db } from '@/db'
import { logger } from '@/lib/logger'
import { sql } from 'drizzle-orm'

export interface LockOptions {
  ttl?: number // Time to live in milliseconds (default: 30000 = 30 seconds)
  retryDelay?: number // Delay between retries in milliseconds (default: 100)
  maxRetries?: number // Maximum number of retries (default: 3)
}

export class DistributedLockService {
  private readonly DEFAULT_TTL = 30000 // 30 seconds
  private readonly DEFAULT_RETRY_DELAY = 100 // 100ms
  private readonly DEFAULT_MAX_RETRIES = 3

  /**
   * Acquire a distributed lock for a specific resource
   * Returns true if lock was acquired, false if already locked
   */
  async acquireLock(
    resourceKey: string,
    options: LockOptions = {}
  ): Promise<boolean> {
    const {
      ttl = this.DEFAULT_TTL,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      maxRetries = this.DEFAULT_MAX_RETRIES
    } = options

    const lockKey = this.getLockKey(resourceKey)
    const expiresAt = new Date(Date.now() + ttl)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try to insert a new lock record
        const result = await db.execute(sql`
          INSERT INTO distributed_locks (lock_key, expires_at, created_at)
          VALUES (${lockKey}, ${expiresAt.toISOString()}, NOW())
          ON CONFLICT (lock_key) DO NOTHING
          RETURNING lock_key
        `)

        if (Array.isArray(result) && result.length > 0) {
          logger.debug('Lock acquired successfully', {
            resourceKey,
            lockKey,
            attempt,
            ttl
          })
          return true
        }

        // Check if existing lock has expired
        const expiredResult = await db.execute(sql`
          DELETE FROM distributed_locks
          WHERE lock_key = ${lockKey}
          AND expires_at <= NOW()
          RETURNING lock_key
        `)

        if (Array.isArray(expiredResult) && expiredResult.length > 0) {
          // Lock was expired and deleted, try to acquire new one
          const newResult = await db.execute(sql`
            INSERT INTO distributed_locks (lock_key, expires_at, created_at)
            VALUES (${lockKey}, ${expiresAt.toISOString()}, NOW())
            ON CONFLICT (lock_key) DO NOTHING
            RETURNING lock_key
          `)

          if (Array.isArray(newResult) && newResult.length > 0) {
            logger.debug('Lock acquired after cleanup', {
              resourceKey,
              lockKey,
              attempt
            })
            return true
          }
        }

        if (attempt < maxRetries) {
          await this.delay(retryDelay)
        }
      } catch (error) {
        logger.error('Error acquiring lock', error as Error, {
          resourceKey,
          lockKey,
          attempt
        })

        if (attempt < maxRetries) {
          await this.delay(retryDelay)
        }
      }
    }

    logger.warn('Failed to acquire lock after all retries', {
      resourceKey,
      lockKey,
      maxRetries
    })
    return false
  }

  /**
   * Release a previously acquired lock
   */
  async releaseLock(resourceKey: string): Promise<void> {
    const lockKey = this.getLockKey(resourceKey)

    try {
      await db.execute(sql`
        DELETE FROM distributed_locks
        WHERE lock_key = ${lockKey}
      `)

      logger.debug('Lock released successfully', {
        resourceKey,
        lockKey
      })
    } catch (error) {
      logger.error('Error releasing lock', error as Error, {
        resourceKey,
        lockKey
      })
    }
  }

  /**
   * Execute a function with a distributed lock
   * Returns the result of the function or null if lock couldn't be acquired
   */
  async withLock<T>(
    resourceKey: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T | null> {
    const acquired = await this.acquireLock(resourceKey, options)

    if (!acquired) {
      return null
    }

    try {
      const result = await fn()
      return result
    } finally {
      await this.releaseLock(resourceKey)
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await db.execute(sql`
        DELETE FROM distributed_locks
        WHERE expires_at <= NOW()
        RETURNING lock_key
      `)

      const cleanedCount = Array.isArray(result) ? result.length : 0
      if (cleanedCount > 0) {
        logger.info('Cleaned up expired locks', { cleanedCount })
      }

      return cleanedCount
    } catch (error) {
      logger.error('Error cleaning up expired locks', error as Error)
      return 0
    }
  }

  /**
   * Check if a resource is currently locked
   */
  async isLocked(resourceKey: string): Promise<boolean> {
    const lockKey = this.getLockKey(resourceKey)

    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM distributed_locks
        WHERE lock_key = ${lockKey}
        AND expires_at > NOW()
      `)

      const count = Array.isArray(result) && result[0] ? parseInt((result[0] as Record<string, unknown>).count as string || '0', 10) : 0
      return count > 0
    } catch (error) {
      logger.error('Error checking lock status', error as Error, {
        resourceKey,
        lockKey
      })
      return false // Assume not locked on error to avoid deadlocks
    }
  }

  /**
   * Get remaining TTL for a lock
   */
  async getLockTTL(resourceKey: string): Promise<number> {
    const lockKey = this.getLockKey(resourceKey)

    try {
      const result = await db.execute(sql`
        SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) * 1000 as ttl_ms
        FROM distributed_locks
        WHERE lock_key = ${lockKey}
        AND expires_at > NOW()
        LIMIT 1
      `)

      const ttl = Array.isArray(result) && result[0] && (result[0] as Record<string, unknown>).ttl_ms ? parseInt((result[0] as Record<string, unknown>).ttl_ms as string, 10) : 0
      return ttl
    } catch (error) {
      logger.error('Error getting lock TTL', error as Error, {
        resourceKey,
        lockKey
      })
      return 0
    }
  }

  private getLockKey(resourceKey: string): string {
    return `lock:${resourceKey}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const distributedLockService = new DistributedLockService()