/**
 * Retry utility with exponential backoff and jitter
 * Provides configurable retry logic for handling transient failures
 */

import { logger } from './logger'

export interface RetryConfig {
  maxAttempts: number           // Maximum number of retry attempts
  baseDelay: number            // Base delay in milliseconds
  maxDelay: number            // Maximum delay between retries
  backoffFactor: number       // Exponential backoff multiplier
  jitter: boolean             // Add random jitter to prevent thundering herd
  retryCondition?: (error: Error) => boolean  // Function to determine if error should be retried
  name?: string               // Identifier for logging
}

export interface RetryStats {
  attempts: number
  totalDelay: number
  lastError: Error | null
  success: boolean
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly stats: RetryStats
  ) {
    super(message)
    this.name = 'RetryError'
  }
}

/**
 * Default retry configurations for different scenarios
 */
export const DEFAULT_RETRY_CONFIGS = {
  // For LLM API calls - more conservative
  llm: {
    maxAttempts: 3,
    baseDelay: 1000,     // 1 second
    maxDelay: 10000,     // 10 seconds
    backoffFactor: 2,
    jitter: true,
    name: 'LLM-Retry'
  },

  // For database operations
  database: {
    maxAttempts: 5,
    baseDelay: 500,      // 500ms
    maxDelay: 5000,      // 5 seconds
    backoffFactor: 1.5,
    jitter: true,
    name: 'Database-Retry'
  },

  // For external API calls
  api: {
    maxAttempts: 4,
    baseDelay: 1000,     // 1 second
    maxDelay: 15000,     // 15 seconds
    backoffFactor: 2.5,
    jitter: true,
    name: 'API-Retry'
  },

  // For WhatsApp message sending
  whatsapp: {
    maxAttempts: 3,
    baseDelay: 2000,     // 2 seconds
    maxDelay: 10000,     // 10 seconds
    backoffFactor: 2,
    jitter: true,
    name: 'WhatsApp-Retry'
  }
}

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
  const delay = Math.min(exponentialDelay, config.maxDelay)

  if (config.jitter) {
    // Add random jitter (±25% of delay)
    const jitterRange = delay * 0.25
    return delay + (Math.random() * 2 - 1) * jitterRange
  }

  return delay
}

/**
 * Check if an error should be retried based on the retry condition
 */
function shouldRetry(error: Error, config: RetryConfig): boolean {
  if (config.retryCondition) {
    return config.retryCondition(error)
  }

  // Default retry conditions for common transient errors
  const errorMessage = error.message.toLowerCase()
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'temporary',
    'rate limit',
    'server error',
    'internal server error',
    'bad gateway',
    'service unavailable',
    'gateway timeout',
    'too many requests'
  ]

  return retryableErrors.some(keyword => errorMessage.includes(keyword))
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    lastError: null,
    success: false
  }

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    stats.attempts = attempt

    try {
      const result = await fn()
      stats.success = true
      return result
    } catch (error) {
      const err = error as Error
      stats.lastError = err

      logger.warn(`${config.name || 'Retry'} attempt ${attempt}/${config.maxAttempts} failed`, {
        attempt,
        maxAttempts: config.maxAttempts,
        error: err.message,
        totalDelay: stats.totalDelay
      })

      // Don't retry on last attempt or if error is not retryable
      if (attempt === config.maxAttempts || !shouldRetry(err, config)) {
        throw new RetryError(
          `Failed after ${attempt} attempts: ${err.message}`,
          attempt,
          err,
          stats
        )
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config)
      stats.totalDelay += delay

      logger.info(`${config.name || 'Retry'} waiting ${delay}ms before retry ${attempt + 1}`, {
        delay,
        attempt: attempt + 1,
        totalDelay: stats.totalDelay
      })

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new RetryError(
    'Unexpected retry loop exit',
    config.maxAttempts,
    stats.lastError || new Error('Unknown error'),
    stats
  )
}

/**
   * Create a retry wrapper function that can be reused
   */
   export function createRetryWrapper<T extends unknown[], R>(
  config: RetryConfig
) {
  return async (fn: (...args: T) => Promise<R>, ...args: T): Promise<R> => {
    return withRetry(() => fn(...args), config)
  }
}

/**
   * Decorator for methods that need retry logic
   */
   export function retryable(config: RetryConfig) {
  return function <T extends unknown[], R>(
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      return withRetry(() => originalMethod.apply(this, args), config)
    }

    return descriptor
  }
}