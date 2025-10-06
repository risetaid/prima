/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily stopping operations
 * when a service fails repeatedly
 */

import { logger } from '@/lib/logger'

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

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private successCount: number = 0
  private lastSuccessTime: number = 0

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    logger.info(`Circuit breaker initialized: ${name}`, {
      circuit: name,
      state: this.state,
      config
    })
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
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
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Reset to closed if enough time has passed without success
      if (now - this.lastSuccessTime >= this.config.resetTimeout) {
        this.reset()
      }
    }
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
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0
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
