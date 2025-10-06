/**
 * Recovery mechanisms for handling and recovering from failed states
 * Provides automatic recovery strategies for common failure scenarios
 */

import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'
import { resetAllCircuitBreakers } from '@/lib/circuit-breaker'

export interface RecoveryOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
  onSuccess?: (attempt: number) => void
  onFailure?: (error: Error, attempts: number) => void
}

export interface RecoveryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  recoveryTime: number
}

/**
 * Generic recovery mechanism with exponential backoff
 */
export async function withRecovery<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RecoveryOptions = {}
): Promise<RecoveryResult<T>> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onRetry,
    onSuccess,
    onFailure,
  } = options

  const startTime = Date.now()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      const recoveryTime = Date.now() - startTime
      logger.info(`Recovery successful for ${operationName}`, {
        operation: operationName,
        attempt,
        attempts: attempt,
        recoveryTime,
      })

      onSuccess?.(attempt)
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        recoveryTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logger.warn(`Recovery attempt ${attempt} failed for ${operationName}`, {
        operation: operationName,
        attempt,
        maxRetries,
        error: lastError.message,
      })

      onRetry?.(attempt, lastError)

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  const recoveryTime = Date.now() - startTime
  const finalError = lastError || new Error('Unknown error during recovery')
  
  onFailure?.(finalError, maxRetries)
  
  logger.error(`Recovery failed for ${operationName} after ${maxRetries} attempts`, finalError, {
    operation: operationName,
    attempts: maxRetries,
    recoveryTime,
  })

  return {
    success: false,
    error: finalError,
    attempts: maxRetries,
    recoveryTime,
  }
}

/**
 * Cache recovery mechanism
 */
export class CacheRecovery {
  private static readonly RECOVERY_STRATEGIES = [
    'invalidate_cache',
    'reset_connection',
    'fallback_to_db',
    'graceful_degradation',
  ] as const

  static async recoverFromCacheFailure<T>(
    cacheKey: string,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<RecoveryResult<T>> {
    return withRecovery(
      async () => {
        // Strategy 1: Try to invalidate the problematic cache entry
        await redis.del(cacheKey)
        
        // Strategy 2: Test connection with a simple operation
        await redis.ping()
        
        // Strategy 3: Execute fallback operation
        const result = await fallbackOperation()
        
        // Strategy 4: Try to cache the fresh data
        await redis.set(cacheKey, JSON.stringify(result), 300) // 5 minutes TTL
        
        return result
      },
      `cache_recovery_${operationName}`,
      {
        maxRetries: 3,
        retryDelay: 500,
        onRetry: (attempt) => {
          const strategy = this.RECOVERY_STRATEGIES[attempt - 1] || 'unknown'
          logger.info(`Applying cache recovery strategy: ${strategy}`, {
            cacheKey,
            strategy,
            attempt,
          })
        },
      }
    )
  }
}

/**
 * Database connection recovery
 */
export class DatabaseRecovery {
  static async recoverFromConnectionFailure<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<RecoveryResult<T>> {
    return withRecovery(
      async () => {
        // Test connection with a simple query
        const { db } = await import('@/db')
        const { sql } = await import('drizzle-orm')
        await db.execute(sql`SELECT 1`)
        
        // Execute the original operation
        return await operation()
      },
      `db_recovery_${operationName}`,
      {
        maxRetries: 5,
        retryDelay: 1000,
        backoffMultiplier: 1.5,
        onRetry: (attempt, error) => {
          logger.info('Database connection recovery attempt', {
            operation: operationName,
            attempt,
            error: error.message,
          })
        },
      }
    )
  }
}

/**
 * API endpoint recovery
 */
export class ApiRecovery {
  static async recoverFromApiFailure<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    options: {
      timeout?: number
      fallbackData?: T
      useCache?: boolean
    } = {}
  ): Promise<RecoveryResult<T>> {
    const { timeout = 10000, fallbackData, useCache = true } = options

    return withRecovery(
      async () => {
        // Add timeout to the API call
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('API timeout')), timeout)
        })

        try {
          return await Promise.race([apiCall(), timeoutPromise])
        } catch (error) {
          // If we have fallback data, use it
          if (fallbackData !== undefined) {
            logger.warn(`API call failed, using fallback data for ${endpoint}`, {
              endpoint,
              error: error instanceof Error ? error.message : String(error),
            })
            return fallbackData
          }
          throw error
        }
      },
      `api_recovery_${endpoint}`,
      {
        maxRetries: useCache ? 3 : 2,
        retryDelay: 1000,
        onRetry: (attempt, error) => {
          logger.info('API recovery attempt', {
            endpoint,
            attempt,
            error: error instanceof Error ? error.message : String(error),
            hasFallback: fallbackData !== undefined,
          })
        },
      }
    )
  }
}

/**
 * System-wide recovery coordinator
 */
export class SystemRecovery {
  private static isRecovering = false
  private static recoveryStartTime = 0

  /**
   * Perform system-wide recovery
   */
  static async performSystemRecovery(trigger: string): Promise<void> {
    if (this.isRecovering) {
      logger.warn('System recovery already in progress, skipping', {
        trigger,
        currentDuration: Date.now() - this.recoveryStartTime,
      })
      return
    }

    this.isRecovering = true
    this.recoveryStartTime = Date.now()

    logger.info('Starting system-wide recovery', { trigger })

    try {
      // Step 1: Reset circuit breakers
      logger.info('Step 1: Resetting circuit breakers')
      resetAllCircuitBreakers()

      // Step 2: Test Redis connection
      logger.info('Step 2: Testing Redis connection')
      const redisStatus = await redis.ping()
      if (!redisStatus.success) {
        logger.warn('Redis connection still failing after reset')
      }

      // Step 3: Test database connection
      logger.info('Step 3: Testing database connection')
      const { db } = await import('@/db')
      const { sql } = await import('drizzle-orm')
      await db.execute(sql`SELECT 1`)

      // Step 4: Clear volatile caches
      logger.info('Step 4: Clearing volatile caches')
      const keysToClear = [
        'user:session:*',
        'dashboard:overview:*',
        'stats:*',
      ]

      for (const pattern of keysToClear) {
        try {
          const keys = await redis.keys(pattern)
          if (keys.length > 0) {
            await Promise.all(keys.map(key => redis.del(key)))
            logger.info(`Cleared ${keys.length} cache entries for pattern: ${pattern}`)
          }
        } catch (error) {
          logger.warn(`Failed to clear cache pattern ${pattern}`, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      const recoveryTime = Date.now() - this.recoveryStartTime
      logger.info('System recovery completed successfully', {
        trigger,
        recoveryTime,
      })

    } catch (error) {
      const recoveryTime = Date.now() - this.recoveryStartTime
      logger.error('System recovery failed', error instanceof Error ? error : new Error(String(error)), {
        trigger,
        recoveryTime,
      })
    } finally {
      this.isRecovering = false
    }
  }

  /**
   * Get current recovery status
   */
  static getRecoveryStatus(): {
    isRecovering: boolean
    currentDuration: number
  } {
    return {
      isRecovering: this.isRecovering,
      currentDuration: this.isRecovering ? Date.now() - this.recoveryStartTime : 0,
    }
  }
}

/**
 * Health check with automatic recovery
 */
export async function performHealthCheckWithRecovery(): Promise<{
  healthy: boolean
  checks: Record<string, boolean | string | number>
  recoveryAttempted?: boolean
}> {
  try {
    // Import health check
    const { GET: healthCheck } = await import('@/app/api/health/route')
    const response = await healthCheck()
    const healthData = await response.json()

    if (healthData.status === 'healthy') {
      return {
        healthy: true,
        checks: healthData.checks,
      }
    }

    // System is unhealthy, attempt recovery
    logger.warn('System unhealthy, attempting recovery', healthData)
    await SystemRecovery.performSystemRecovery('health_check_failure')

    // Re-check after recovery
    const recoveryResponse = await healthCheck()
    const recoveryData = await recoveryResponse.json()

    return {
      healthy: recoveryData.status === 'healthy',
      checks: recoveryData.checks,
      recoveryAttempted: true,
    }

  } catch (error) {
    logger.error('Health check failed completely', error instanceof Error ? error : new Error(String(error)))
    
    // Try emergency recovery
    await SystemRecovery.performSystemRecovery('health_check_crash')

    return {
      healthy: false,
      checks: {
        error: error instanceof Error ? error.message : String(error),
      },
      recoveryAttempted: true,
    }
  }
}

/**
 * Periodic recovery maintenance
 */
export function startRecoveryMaintenance(intervalMs: number = 300000) { // 5 minutes
  logger.info('Starting recovery maintenance service', { intervalMs })

  setInterval(async () => {
    try {
      // Check system health
      const healthResult = await performHealthCheckWithRecovery()
      
      if (!healthResult.healthy) {
        logger.warn('Periodic health check failed', healthResult.checks)
      }

      // Clean up expired locks
      const { cleanupExpiredLocks } = await import('@/lib/atomic-storage')
      cleanupExpiredLocks()

    } catch (error) {
      logger.error('Recovery maintenance failed', error instanceof Error ? error : new Error(String(error)))
    }
  }, intervalMs)
}
