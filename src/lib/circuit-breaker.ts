/**
 * Enhanced Circuit Breaker Pattern Implementation
 * Prevents cascading failures with adaptive thresholds and per-endpoint logic
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
  adaptiveThresholds?: boolean // Enable adaptive threshold adjustment
  maxFailureThreshold?: number // Maximum allowed failure threshold for adaptive mode
  minFailureThreshold?: number // Minimum allowed failure threshold for adaptive mode
  slowCallThreshold?: number  // Response time in ms considered "slow"
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
  failureRate: number
  averageResponseTime: number
  slowCallCount: number
}

interface RequestRecord {
  timestamp: number
  success: boolean
  responseTime: number
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
  private requestHistory: RequestRecord[] = []
  private slowCallCount: number = 0
  private totalResponseTime: number = 0

  constructor(private config: CircuitBreakerConfig) {
    // Set defaults for adaptive features
    if (this.config.adaptiveThresholds) {
      this.config.maxFailureThreshold = this.config.maxFailureThreshold ?? this.config.failureThreshold * 2
      this.config.minFailureThreshold = this.config.minFailureThreshold ?? Math.max(1, this.config.failureThreshold / 2)
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++
    const startTime = Date.now()

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.recordRequest(startTime, false, Date.now() - startTime)
        throw new Error(`Circuit breaker is OPEN for ${this.config.name}`)
      }
      // Time to try again - move to HALF_OPEN
      this.state = CircuitState.HALF_OPEN
      logger.info(`Circuit breaker ${this.config.name} moving to HALF_OPEN state`)
    }

    try {
      const result = await fn()
      const responseTime = Date.now() - startTime
      this.recordRequest(startTime, true, responseTime)
      this.onSuccess()
      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.recordRequest(startTime, false, responseTime)
      this.onFailure()
      throw error
    }
  }

  /**
   * Record a request in the sliding window
   */
  private recordRequest(timestamp: number, success: boolean, responseTime: number): void {
    this.requestHistory.push({ timestamp, success, responseTime })
    this.totalResponseTime += responseTime

    // Check for slow calls
    if (this.config.slowCallThreshold && responseTime > this.config.slowCallThreshold) {
      this.slowCallCount++
    }

    // Clean old records outside monitoring period
    const cutoffTime = Date.now() - this.config.monitoringPeriod
    this.requestHistory = this.requestHistory.filter(record => record.timestamp > cutoffTime)
  }

  /**
   * Calculate adaptive failure threshold based on recent performance
   */
  private getAdaptiveFailureThreshold(): number {
    if (!this.config.adaptiveThresholds || this.requestHistory.length < 10) {
      return this.config.failureThreshold
    }

    const recentRecords = this.requestHistory.slice(-20) // Last 20 requests
    const successRate = recentRecords.filter(r => r.success).length / recentRecords.length

    // Adjust threshold based on success rate
    let adaptiveThreshold = this.config.failureThreshold
    if (successRate > 0.95) {
      // High success rate - can tolerate more failures
      adaptiveThreshold = Math.min(this.config.maxFailureThreshold!, adaptiveThreshold + 1)
    } else if (successRate < 0.8) {
      // Low success rate - be more strict
      adaptiveThreshold = Math.max(this.config.minFailureThreshold!, adaptiveThreshold - 1)
    }

    return adaptiveThreshold
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

    const currentThreshold = this.getAdaptiveFailureThreshold()

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test - go back to OPEN
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      this.successes = 0
      logger.warn(`Circuit breaker ${this.config.name} failed recovery test, back to OPEN`)
    } else if (this.state === CircuitState.CLOSED && this.failures >= currentThreshold) {
      // Too many failures - open the circuit
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      logger.warn(`Circuit breaker ${this.config.name} opened due to ${this.failures} failures (threshold: ${currentThreshold})`)
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
    const recentRecords = this.requestHistory.filter(record =>
      record.timestamp > Date.now() - this.config.monitoringPeriod
    )
    const failureRate = recentRecords.length > 0
      ? recentRecords.filter(r => !r.success).length / recentRecords.length
      : 0
    const averageResponseTime = this.requestHistory.length > 0
      ? this.totalResponseTime / this.requestHistory.length
      : 0

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      failureRate,
      averageResponseTime,
      slowCallCount: this.slowCallCount
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
    name: 'LLM-Service',
    adaptiveThresholds: true,
    maxFailureThreshold: 8,
    minFailureThreshold: 3,
    slowCallThreshold: 10000 // 10 seconds
  },
  whatsapp: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 180000, // 3 minutes
    successThreshold: 2,
    name: 'WhatsApp-Service',
    adaptiveThresholds: true,
    maxFailureThreshold: 5,
    minFailureThreshold: 2,
    slowCallThreshold: 5000 // 5 seconds
  },
  database: {
    failureThreshold: 3,
    recoveryTimeout: 15000, // 15 seconds
    monitoringPeriod: 120000, // 2 minutes
    successThreshold: 2,
    name: 'Database-Service',
    adaptiveThresholds: true,
    maxFailureThreshold: 5,
    minFailureThreshold: 1,
    slowCallThreshold: 2000 // 2 seconds
  }
}

/**
 * Circuit Breaker Manager for per-endpoint logic
 * Manages multiple circuit breakers with shared configuration and monitoring
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map()
  private globalConfig: Partial<CircuitBreakerConfig>

  constructor(globalConfig: Partial<CircuitBreakerConfig> = {}) {
    this.globalConfig = globalConfig
  }

  /**
   * Get or create a circuit breaker for a specific endpoint
   */
  getBreaker(endpoint: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(endpoint)) {
      const breakerConfig = {
        ...this.globalConfig,
        ...config,
        name: config?.name || endpoint
      } as CircuitBreakerConfig

      this.breakers.set(endpoint, new CircuitBreaker(breakerConfig))
      logger.info(`Created circuit breaker for endpoint: ${endpoint}`)
    }

    return this.breakers.get(endpoint)!
  }

  /**
   * Execute a function with endpoint-specific circuit breaker protection
   */
  async execute<T>(endpoint: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const breaker = this.getBreaker(endpoint, config)
    return breaker.execute(fn)
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    for (const [endpoint, breaker] of this.breakers) {
      stats[endpoint] = breaker.getStats()
    }
    return stats
  }

  /**
   * Get statistics for a specific endpoint
   */
  getStats(endpoint: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(endpoint)
    return breaker ? breaker.getStats() : null
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose()
    }
    logger.info('All circuit breakers reset')
  }

  /**
   * Get health summary across all endpoints
   */
  getHealthSummary(): {
    totalEndpoints: number
    openCircuits: number
    halfOpenCircuits: number
    closedCircuits: number
    overallHealth: 'healthy' | 'degraded' | 'critical'
  } {
    const stats = Array.from(this.breakers.values()).map(b => b.getStats())
    const openCircuits = stats.filter(s => s.state === CircuitState.OPEN).length
    const halfOpenCircuits = stats.filter(s => s.state === CircuitState.HALF_OPEN).length
    const closedCircuits = stats.filter(s => s.state === CircuitState.CLOSED).length

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (openCircuits > 0) {
      overallHealth = 'critical'
    } else if (halfOpenCircuits > 0) {
      overallHealth = 'degraded'
    }

    return {
      totalEndpoints: this.breakers.size,
      openCircuits,
      halfOpenCircuits,
      closedCircuits,
      overallHealth
    }
  }
}

// Global circuit breaker manager instance
export const globalCircuitBreakerManager = new CircuitBreakerManager({
  adaptiveThresholds: true,
  slowCallThreshold: 5000
})