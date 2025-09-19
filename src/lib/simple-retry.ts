/**
 * Simple Retry Utility with Exponential Backoff
 * Provides basic retry logic for handling transient failures
 */

import { logger } from './logger'

export interface RetryConfig {
  maxAttempts: number;      // Maximum number of retry attempts
  baseDelay: number;       // Base delay in milliseconds
  maxDelay: number;       // Maximum delay between retries
  backoffFactor: number;  // Exponential backoff multiplier
  jitter?: boolean;       // Add random jitter to prevent thundering herd
}

/**
 * Default retry configurations
 */
export const DEFAULT_RETRY_CONFIGS = {
  llm: {
    maxAttempts: 3,
    baseDelay: 1000,     // 1 second
    maxDelay: 10000,     // 10 seconds
    backoffFactor: 2,
    jitter: true,
  },
  database: {
    maxAttempts: 5,
    baseDelay: 500,      // 500ms
    maxDelay: 5000,     // 5 seconds
    backoffFactor: 1.5,
    jitter: true,
  },
  api: {
    maxAttempts: 4,
    baseDelay: 1000,     // 1 second
    maxDelay: 15000,     // 15 seconds
    backoffFactor: 2.5,
    jitter: true,
  },
  whatsapp: {
    maxAttempts: 3,
    baseDelay: 2000,     // 2 seconds
    maxDelay: 10000,     // 10 seconds
    backoffFactor: 2,
    jitter: true,
  }
} as const;

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const delay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter (±25% of delay)
    const jitterRange = delay * 0.25;
    return delay + (Math.random() * 2 - 1) * jitterRange;
  }

  return delay;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'server error',
    'internal server error',
    'bad gateway',
    'service unavailable',
    'gateway timeout',
    'too many requests',
    'temporary failure',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIGS.llm
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        logger.error('All retry attempts failed', lastError, {
          attempts: attempt,
          maxAttempts: config.maxAttempts,
        });
        throw lastError;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        logger.error('Non-retryable error, not retrying', lastError);
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);

      logger.warn('Retry attempt failed, scheduling retry', {
        attempt,
        maxAttempts: config.maxAttempts,
        delay,
        error: lastError.message,
        errorType: lastError.constructor.name,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error in retry logic');
}