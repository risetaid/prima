/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily stopping calls to failing services
 */

import { logger } from './logger'

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number    // Number of failures before opening circuit
  recoveryTimeout: number     // Time in ms before attempting recovery
  monitoringPeriod: number    // Time window in ms for failure counting
  successThreshold: number    // Number of successes needed in HALF_OPEN to close
  name: string               // Identifier for logging
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number = 0
  private successes: number = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private totalRequests: number = 0
  private totalFailures: number = 0
  private totalSuccesses: number = 0
  private nextAttemptTime: number = 0

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for ${this.config.name}`)
      }
      // Time to try again - move to HALF_OPEN
      this.state = CircuitState.HALF_OPEN
      logger.info(`Circuit breaker ${this.config.name} moving to HALF_OPEN state`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++
    this.lastSuccessTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      if (this.successes >= this.config.successThreshold) {
        // Service has recovered
        this.reset()
        logger.info(`Circuit breaker ${this.config.name} recovered and closed`)
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures = 0
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test - go back to OPEN
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      this.successes = 0
      logger.warn(`Circuit breaker ${this.config.name} failed recovery test, back to OPEN`)
    } else if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
      // Too many failures - open the circuit
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      logger.warn(`Circuit breaker ${this.config.name} opened due to ${this.failures} failures`)
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successes = 0
    this.lastFailureTime = null
    this.nextAttemptTime = 0
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    }
  }

  /**
   * Check if circuit breaker can accept requests
   */
  canExecute(): boolean {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN) ||
           (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime)
  }

  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
    logger.info(`Circuit breaker ${this.config.name} manually opened`)
  }

  /**
   * Force circuit breaker to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.reset()
    logger.info(`Circuit breaker ${this.config.name} manually closed`)
  }
}

// Default configurations for different services
export const DEFAULT_CIRCUIT_CONFIGS = {
  llm: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 3,
    name: 'LLM-Service'
  },
  whatsapp: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 180000, // 3 minutes
    successThreshold: 2,
    name: 'WhatsApp-Service'
  },
  database: {
    failureThreshold: 3,
    recoveryTimeout: 15000, // 15 seconds
    monitoringPeriod: 120000, // 2 minutes
    successThreshold: 2,
    name: 'Database-Service'
  }
}