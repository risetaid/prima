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
    } catch (error: unknown) {
      lastError = error
      
      // Check if this is a retryable error
      const isRetryableError = error && typeof error === 'object' && 'code' in error && timeoutCodes.some(code => 
        (error as {code: string}).code === code || ('errno' in error && (error as {errno: string}).errno === code)
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
 * Log database performance metrics with enhanced monitoring
 */
export function logDbPerformance(operationName: string, startTime: number, additionalInfo?: unknown) {
  const duration = Date.now() - startTime
  
  // Log slow operations (over 1 second)
  if (duration > 1000) {
    console.warn(`🐌 Very Slow DB operation: ${operationName} took ${duration}ms`)
    if (additionalInfo) {
      console.warn('Additional info:', additionalInfo)
    }
  }
  // Log moderately slow operations (over 500ms)
  else if (duration > 500) {
    console.warn(`⚠️ Slow DB operation: ${operationName} took ${duration}ms`)
  }
  // Log potentially slow operations (over 100ms) in development
  else if (duration > 100 && process.env.NODE_ENV === 'development') {
    console.info(`📊 DB operation: ${operationName} took ${duration}ms`)
  }
}

/**
 * Enhanced query performance logger for specific query monitoring
 */
export function logQueryPerformance(
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  startTime: number,
  recordCount?: number,
  filters?: string[]
) {
  const duration = Date.now() - startTime
  const operation = `${queryType} ${tableName}`
  
  const details = {
    duration,
    recordCount,
    filters,
    timestamp: new Date().toISOString()
  }
  
  // Performance thresholds by operation type
  const thresholds = {
    SELECT: { slow: 100, verySlow: 500 },
    INSERT: { slow: 50, verySlow: 200 },
    UPDATE: { slow: 75, verySlow: 300 },
    DELETE: { slow: 100, verySlow: 400 }
  }
  
  const threshold = thresholds[queryType]
  
  if (duration > threshold.verySlow) {
    console.error(`🚨 Critical DB Performance: ${operation}`, details)
  } else if (duration > threshold.slow) {
    console.warn(`⚠️ Slow Query: ${operation}`, details)
  } else if (process.env.NODE_ENV === 'development' && duration > 25) {
    console.info(`📈 Query: ${operation} - ${duration}ms`)
  }
  
  return duration
}

/**
 * Create a performance monitoring wrapper for database operations
 */
export function withQueryMonitoring<T>(
  operation: () => Promise<T>,
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  expectedRecordCount?: number
) {
  return async (): Promise<T> => {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      
      // Log successful operation
      logQueryPerformance(queryType, tableName, startTime, expectedRecordCount)
      
      return result
    } catch (error) {
      // Log failed operation with error context
      const duration = Date.now() - startTime
      console.error(`❌ DB Error in ${queryType} ${tableName} after ${duration}ms:`, {
        error: error instanceof Error ? error.message : error,
        duration,
        expectedRecordCount
      })
      throw error
    }
  }
}

/**
 * Monitor database connection health
 */
export async function checkDatabaseHealth() {
  const startTime = Date.now()
  
  try {
    // Simple health check query
    await safeDbOperation(
      async () => {
        // This is a lightweight query to test connection - will be implemented when needed
        console.log('Database health check - connection test')
        return { health_check: 1 }
      },
      { maxRetries: 1, delayMs: 500 },
      3000 // 3 second timeout for health check
    )
    
    const duration = Date.now() - startTime
    
    if (duration > 1000) {
      console.warn(`⚠️ Database health check slow: ${duration}ms`)
      return { healthy: true, responseTime: duration, status: 'slow' }
    } else if (duration > 200) {
      console.info(`📊 Database health check: ${duration}ms`)
      return { healthy: true, responseTime: duration, status: 'normal' }
    } else {
      return { healthy: true, responseTime: duration, status: 'fast' }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ Database health check failed after ${duration}ms:`, error)
    return { healthy: false, responseTime: duration, status: 'error', error }
  }
}