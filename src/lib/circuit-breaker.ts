/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily stopping operations
 * when a service fails repeatedly
 *
 * Redis-backed state persistence:
 * - State persists across server restarts
 * - Multiple instances share the same circuit state
 * - Gracefully degrades to in-memory if Redis is unavailable
 */

// Server-only module - uses Redis (ioredis) which requires Node.js
import "server-only";

import { logger } from '@/lib/logger'
import { getPooledConnection } from '@/lib/redis-pool'
import type IORedis from 'ioredis'

export interface CircuitBreakerConfig {
  failureThreshold: number    // Number of failures before opening
  resetTimeout: number        // Time in milliseconds to wait before trying again
  monitoringPeriod: number    // Time window to count failures
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  lastFailureTime: number
  successCount: number
  lastSuccessTime: number
}

// Redis key TTL: 24 hours (auto-cleanup stale breakers)
const REDIS_KEY_TTL_SECONDS = 24 * 60 * 60

// Sync interval: how often to sync memory state to Redis (ms)
const REDIS_SYNC_INTERVAL = 5000

// Connection for circuit breaker Redis operations (separate from main redis client)
let redisConnection: IORedis | null = null
let redisAvailable = true
let lastRedisCheck = 0
const REDIS_CHECK_INTERVAL = 30000 // 30 seconds between Redis availability checks

function getRedisClient(): IORedis | null {
  // Don't attempt Redis if we know it's unavailable (with periodic recheck)
  const now = Date.now()
  if (!redisAvailable && now - lastRedisCheck < REDIS_CHECK_INTERVAL) {
    return null
  }

  if (!redisConnection) {
    try {
      // Only initialize if Redis URL is configured
      if (!process.env.REDIS_URL && !process.env.KV_URL) {
        redisAvailable = false
        lastRedisCheck = now
        return null
      }
      redisConnection = getPooledConnection('circuit-breaker')
    } catch (error) {
      logger.warn('Circuit breaker: Failed to get Redis connection, using in-memory fallback', {
        circuitBreaker: true,
        error: error instanceof Error ? error.message : String(error)
      })
      redisAvailable = false
      lastRedisCheck = now
      return null
    }
  }

  // Check connection status
  if (redisConnection.status !== 'ready' && redisConnection.status !== 'connecting') {
    if (now - lastRedisCheck >= REDIS_CHECK_INTERVAL) {
      lastRedisCheck = now
      // Try to reconnect
      redisConnection.connect().catch(() => {
        redisAvailable = false
      })
    }
    return null
  }

  redisAvailable = true
  return redisConnection
}

export class CircuitBreaker {
  // In-memory state (always the source of truth for operations)
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private successCount: number = 0
  private lastSuccessTime: number = 0

  private readonly redisKey: string
  private lastRedisSync: number = 0
  private pendingSync: boolean = false

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    this.redisKey = `circuit-breaker:${name}:state`

    logger.info(`Circuit breaker initialized: ${name}`, {
      circuit: name,
      state: this.state,
      config,
      redisKey: this.redisKey
    })

    // Async load initial state from Redis (non-blocking)
    this.loadStateFromRedis()
  }

  /**
   * Load state from Redis and merge with memory state
   * Uses the state with the most recent failure/success time
   */
  private loadStateFromRedis(): void {
    const redis = getRedisClient()
    if (!redis) return

    // Non-blocking load
    redis.get(this.redisKey)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data) as CircuitBreakerState
            // Only update memory state if Redis state is more recent
            // This handles the case where another instance opened the circuit
            const redisMoreRecent =
              parsed.lastFailureTime > this.lastFailureTime ||
              parsed.lastSuccessTime > this.lastSuccessTime

            if (redisMoreRecent) {
              this.state = parsed.state
              this.failureCount = parsed.failureCount
              this.lastFailureTime = parsed.lastFailureTime
              this.successCount = parsed.successCount
              this.lastSuccessTime = parsed.lastSuccessTime

              logger.debug(`Circuit breaker ${this.name}: synced state from Redis`, {
                circuit: this.name,
                state: this.state,
                source: 'redis'
              })
            }
          } catch {
            // Ignore parse errors
          }
        }
      })
      .catch(() => {
        // Silently fail - memory state is always valid
      })
  }

  /**
   * Save state to Redis (non-blocking, best effort)
   * Uses debouncing to avoid too many writes
   */
  private saveStateToRedis(): void {
    // Debounce: don't sync more than once per interval
    const now = Date.now()
    if (now - this.lastRedisSync < REDIS_SYNC_INTERVAL) {
      // Schedule a delayed sync if not already pending
      if (!this.pendingSync) {
        this.pendingSync = true
        setTimeout(() => {
          this.pendingSync = false
          this.doSaveStateToRedis()
        }, REDIS_SYNC_INTERVAL)
      }
      return
    }

    this.doSaveStateToRedis()
  }

  /**
   * Actually save state to Redis
   */
  private doSaveStateToRedis(): void {
    const redis = getRedisClient()
    if (!redis) return

    this.lastRedisSync = Date.now()

    const stateData: CircuitBreakerState = {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
      lastSuccessTime: this.lastSuccessTime
    }

    redis.setex(this.redisKey, REDIS_KEY_TTL_SECONDS, JSON.stringify(stateData))
      .catch((error) => {
        logger.debug('Circuit breaker: Failed to save to Redis', {
          circuit: this.name,
          error: error instanceof Error ? error.message : String(error)
        })
      })
  }

  /**
   * Force immediate sync to Redis (for state transitions)
   */
  private syncToRedisImmediately(): void {
    this.lastRedisSync = 0 // Reset debounce
    this.doSaveStateToRedis()
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Periodically sync from Redis to pick up state from other instances
    this.maybeLoadFromRedis()

    // Check if circuit should be reset
    this.checkState()

    if (this.state === CircuitState.OPEN) {
      logger.warn(`Circuit breaker OPEN for ${this.name}, failing fast`, {
        circuit: this.name,
        state: this.state,
        timeSinceLastFailure: Date.now() - this.lastFailureTime
      })
      throw new Error(`Circuit breaker OPEN for ${this.name}`)
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Periodically load state from Redis to sync with other instances
   */
  private maybeLoadFromRedis(): void {
    const now = Date.now()
    // Sync from Redis every REDIS_SYNC_INTERVAL
    if (now - this.lastRedisSync >= REDIS_SYNC_INTERVAL) {
      this.loadStateFromRedis()
    }
  }

  /**
   * Check if circuit state should change
   */
  private checkState(): void {
    const now = Date.now()

    if (this.state === CircuitState.OPEN) {
      // Check if we should try again (move to half-open)
      if (now - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
        logger.info(`Circuit breaker HALF_OPEN for ${this.name}`, {
          circuit: this.name,
          state: this.state,
          timeSinceLastFailure: now - this.lastFailureTime
        })
        this.syncToRedisImmediately()
      }
    }
    // Note: HALF_OPEN state transitions are handled by onSuccess/onFailure
    // No automatic reset from HALF_OPEN based on time
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    const now = Date.now()
    this.lastSuccessTime = now

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      // After a few successes in half-open, close the circuit
      if (this.successCount >= 3) {
        this.reset()
        logger.info(`Circuit breaker CLOSED for ${this.name} after recovery`, {
          circuit: this.name,
          state: this.state,
          successCount: this.successCount
        })
      } else {
        this.saveStateToRedis()
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0
      this.saveStateToRedis()
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      // If we fail in half-open, open the circuit again
      this.state = CircuitState.OPEN
      logger.warn(`Circuit breaker OPENED again for ${this.name} (failed in half-open)`, {
        circuit: this.name,
        state: this.state,
        failureCount: this.failureCount
      })
      this.syncToRedisImmediately()
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN
        logger.warn(`Circuit breaker OPENED for ${this.name} (too many failures)`, {
          circuit: this.name,
          state: this.state,
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold
        })
        this.syncToRedisImmediately()
      } else {
        this.saveStateToRedis()
      }
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    this.lastSuccessTime = 0
    this.syncToRedisImmediately()
  }

  /**
   * Force reset circuit breaker (for manual recovery)
   */
  forceReset(): void {
    this.reset()
    logger.info(`Circuit breaker FORCE RESET for ${this.name}`, {
      circuit: this.name,
      state: this.state
    })
  }

  /**
   * Get current circuit breaker state
   */
  getState(): {
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime: number
    lastSuccessTime: number
    isOpen: boolean
    isHalfOpen: boolean
    isClosed: boolean
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      isOpen: this.state === CircuitState.OPEN,
      isHalfOpen: this.state === CircuitState.HALF_OPEN,
      isClosed: this.state === CircuitState.CLOSED
    }
  }

  /**
   * Get current circuit breaker state (async version - loads from Redis first)
   */
  async getStateAsync(): Promise<{
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime: number
    lastSuccessTime: number
    isOpen: boolean
    isHalfOpen: boolean
    isClosed: boolean
  }> {
    // Force load from Redis to get latest state from all instances
    const redis = getRedisClient()
    if (redis) {
      try {
        const data = await Promise.race([
          redis.get(this.redisKey),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Redis timeout')), 1000)
          )
        ])

        if (data) {
          const parsed = JSON.parse(data) as CircuitBreakerState
          // Merge: use the state with most recent activity
          if (parsed.lastFailureTime > this.lastFailureTime ||
              parsed.lastSuccessTime > this.lastSuccessTime) {
            this.state = parsed.state
            this.failureCount = parsed.failureCount
            this.lastFailureTime = parsed.lastFailureTime
            this.successCount = parsed.successCount
            this.lastSuccessTime = parsed.lastSuccessTime
          }
        }
      } catch {
        // Ignore errors, return memory state
      }
    }

    return this.getState()
  }

  /**
   * Check if circuit is available for operations
   */
  isAvailable(): boolean {
    this.checkState()
    return this.state !== CircuitState.OPEN
  }
}

// Default circuit breaker configurations
export const DEFAULT_CIRCUIT_CONFIGS = {
  redis: {
    failureThreshold: 5,      // Open after 5 failures
    resetTimeout: 30000,      // Try again after 30 seconds
    monitoringPeriod: 60000   // Monitor failures in 1 minute window
  },
  database: {
    failureThreshold: 3,      // Open after 3 failures
    resetTimeout: 10000,      // Try again after 10 seconds
    monitoringPeriod: 30000   // Monitor failures in 30 second window
  },
  external_api: {
    failureThreshold: 10,     // Open after 10 failures
    resetTimeout: 60000,      // Try again after 1 minute
    monitoringPeriod: 300000  // Monitor failures in 5 minute window
  }
} as const

// Global circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>()

/**
 * Get or create a circuit breaker instance
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    const finalConfig = config
      ? { ...DEFAULT_CIRCUIT_CONFIGS.redis, ...config }
      : DEFAULT_CIRCUIT_CONFIGS.redis

    circuitBreakers.set(name, new CircuitBreaker(name, finalConfig))
  }

  return circuitBreakers.get(name)!
}

/**
 * Get all circuit breaker states for monitoring
 */
export function getAllCircuitBreakerStates(): Record<string, ReturnType<CircuitBreaker['getState']>> {
  const states: Record<string, ReturnType<CircuitBreaker['getState']>> = {}

  for (const [name, breaker] of circuitBreakers.entries()) {
    states[name] = breaker.getState()
  }

  return states
}

/**
 * Get all circuit breaker states for monitoring (async with Redis)
 */
export async function getAllCircuitBreakerStatesAsync(): Promise<Record<string, Awaited<ReturnType<CircuitBreaker['getStateAsync']>>>> {
  const states: Record<string, Awaited<ReturnType<CircuitBreaker['getStateAsync']>>> = {}

  for (const [name, breaker] of circuitBreakers.entries()) {
    states[name] = await breaker.getStateAsync()
  }

  return states
}

/**
 * Reset all circuit breakers (for maintenance/recovery)
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.forceReset()
  }

  logger.info('All circuit breakers reset', {
    totalBreakers: circuitBreakers.size
  })
}
