// Database utility functions with retry mechanism for connection timeouts

export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  timeoutCodes?: string[]
}

const DEFAULT_TIMEOUT_CODES = ['CONNECT_TIMEOUT', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT']

/**
 * Executes a database operation with retry logic for connection timeouts
 */
export async function dbOperationWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    timeoutCodes = DEFAULT_TIMEOUT_CODES
  } = options

  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if this is a retryable error
      const isRetryableError = timeoutCodes.some(code => 
        error.code === code || error.errno === code
      )
      
      if (isRetryableError && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      
      // Not retryable or max retries reached
      throw error
    }
  }
  
  throw lastError
}

/**
 * Creates a timeout wrapper for database operations
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

/**
 * Combines retry logic with timeout for maximum reliability
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  retryOptions: RetryOptions = {},
  timeoutMs: number = 10000
): Promise<T> {
  return dbOperationWithRetry(
    () => withTimeout(operation, timeoutMs),
    retryOptions
  )
}

/**
 * Log database performance metrics
 */
export function logDbPerformance(operationName: string, startTime: number) {
  const duration = Date.now() - startTime
  if (duration > 1000) {
    console.warn(`⚠️ Slow DB operation: ${operationName} took ${duration}ms`)
  }
}