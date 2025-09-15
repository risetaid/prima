import { redis } from './redis'
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

// Redis operation result types
export interface CacheOperationResult {
  success: boolean
  error?: string
}

export interface CacheHealthStatus {
  redis: boolean
  message: string
  lastError?: string
  cacheOperations: {
    set: boolean
    get: boolean
    del: boolean
  }
}

export interface RedisHealthStatus {
  connected: boolean
  message: string
}

// Cache configuration types
export interface CacheConfig {
  ttl: number
  key: string
}

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number
}

export interface CompressedCacheEntry {
  data: string // base64 encoded compressed data
  compressed: boolean
  originalSize: number
  compressedSize: number
  timestamp: number
  ttl: number
}

// Cache monitoring and analytics types
export interface CacheMetrics {
  hits: number
  misses: number
  totalRequests: number
  hitRatio: number
  averageResponseTime: number
  memoryUsage?: number
  uptime: number
  operations: {
    get: number
    set: number
    del: number
    exists: number
  }
  errors: {
    get: number
    set: number
    del: number
    exists: number
  }
  responseTimes: {
    get: number[]
    set: number[]
    del: number[]
    exists: number[]
  }
}

export interface CacheAnalytics {
  hitRatio: number
  averageResponseTime: number
  throughput: number // requests per second
  errorRate: number
  memoryEfficiency: number
  cacheUtilization: number
  recommendations: string[]
}

export interface PerformanceSnapshot {
  timestamp: number
  metrics: CacheMetrics
  memoryInfo?: {
    used: number
    available: number
    fragmentation: number
  }
}

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PATIENT: 30,         // 30 seconds (VERY FAST for verification updates)
  REMINDER_STATS: 120, // 2 minutes
  TEMPLATES: 600,      // 10 minutes
  AUTOFILL: 180,       // 3 minutes
  USER_PROFILE: 300,   // 5 minutes
  USER_SESSION: 300,   // 5 minutes - reduce database hits during multi-tab usage
  REMINDERS_ALL: 120,  // 2 minutes
} as const

// Compression configuration
export const COMPRESSION_THRESHOLD = 1024 // 1KB in bytes

// Cache key generators
export const CACHE_KEYS = {
  patient: (id: string) => `patient:${id}`,
  reminderStats: (patientId: string) => `stats:${patientId}`,
  templates: 'templates:all',
  autoFill: (patientId: string) => `autofill:${patientId}`,
  userProfile: (userId: string) => `user:${userId}`,
  userSession: (clerkId: string) => `session:${clerkId}`,
  remindersAll: (patientId: string) => `reminders:${patientId}:all`,
  healthNotes: (patientId: string) => `health-notes:${patientId}`,
} as const

/**
 * Compress data if it exceeds the threshold
 */
async function compressData(data: string): Promise<{ compressed: string; shouldCompress: boolean; originalSize: number; compressedSize: number }> {
  const originalSize = Buffer.byteLength(data, 'utf8')

  if (originalSize <= COMPRESSION_THRESHOLD) {
    return {
      compressed: data,
      shouldCompress: false,
      originalSize,
      compressedSize: originalSize
    }
  }

  try {
    const compressedBuffer = await gzipAsync(Buffer.from(data, 'utf8'))
    const compressed = compressedBuffer.toString('base64')
    const compressedSize = compressedBuffer.length

    return {
      compressed,
      shouldCompress: true,
      originalSize,
      compressedSize
    }
  } catch (error) {
    console.warn('Compression failed, using uncompressed data:', error)
    return {
      compressed: data,
      shouldCompress: false,
      originalSize,
      compressedSize: originalSize
    }
  }
}

/**
 * Decompress data if it was compressed
 */
async function decompressData(data: string, compressed: boolean): Promise<string> {
  if (!compressed) {
    return data
  }

  try {
    const compressedBuffer = Buffer.from(data, 'base64')
    const decompressedBuffer = await gunzipAsync(compressedBuffer)
    return decompressedBuffer.toString('utf8')
  } catch (error) {
    console.warn('Decompression failed:', error)
    throw new Error('Failed to decompress cached data')
  }
}

/**
 * Cache Monitor class for tracking performance metrics
 */
export class CacheMonitor {
  private metrics: CacheMetrics
  private startTime: number
  private snapshots: PerformanceSnapshot[] = []
  private maxSnapshots = 100 // Keep last 100 snapshots

  constructor() {
    this.startTime = Date.now()
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRatio: 0,
      averageResponseTime: 0,
      uptime: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
        exists: 0
      },
      errors: {
        get: 0,
        set: 0,
        del: 0,
        exists: 0
      },
      responseTimes: {
        get: [],
        set: [],
        del: [],
        exists: []
      }
    }
  }

  /**
   * Record a cache hit
   */
  recordHit(operation: keyof CacheMetrics['operations'], responseTime: number): void {
    this.metrics.hits++
    this.metrics.totalRequests++
    this.metrics.operations[operation]++
    this.metrics.responseTimes[operation].push(responseTime)
    this.updateHitRatio()
    this.updateAverageResponseTime()
  }

  /**
   * Record a cache miss
   */
  recordMiss(operation: keyof CacheMetrics['operations'], responseTime: number): void {
    this.metrics.misses++
    this.metrics.totalRequests++
    this.metrics.operations[operation]++
    this.metrics.responseTimes[operation].push(responseTime)
    this.updateHitRatio()
    this.updateAverageResponseTime()
  }

  /**
   * Record an error
   */
  recordError(operation: keyof CacheMetrics['errors']): void {
    this.metrics.errors[operation]++
    this.metrics.totalRequests++
  }

  /**
   * Update hit ratio
   */
  private updateHitRatio(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRatio = this.metrics.hits / this.metrics.totalRequests
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(): void {
    const allResponseTimes = [
      ...this.metrics.responseTimes.get,
      ...this.metrics.responseTimes.set,
      ...this.metrics.responseTimes.del,
      ...this.metrics.responseTimes.exists
    ]

    if (allResponseTimes.length > 0) {
      this.metrics.averageResponseTime = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    this.metrics.uptime = Date.now() - this.startTime
    return { ...this.metrics }
  }

  /**
   * Get cache analytics with insights
   */
  async getAnalytics(): Promise<CacheAnalytics> {
    const metrics = this.getMetrics()
    const memoryInfo = await this.getMemoryInfo()

    const throughput = metrics.totalRequests / (metrics.uptime / 1000) // requests per second
    const errorRate = metrics.totalRequests > 0 ?
      (Object.values(metrics.errors).reduce((sum, err) => sum + err, 0) / metrics.totalRequests) : 0

    const recommendations: string[] = []

    // Generate recommendations based on metrics
    if (metrics.hitRatio < 0.5) {
      recommendations.push('Consider increasing cache TTL values for better hit ratios')
    }
    if (metrics.averageResponseTime > 100) {
      recommendations.push('High response times detected - consider optimizing Redis configuration')
    }
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected - check Redis connection and configuration')
    }
    if (memoryInfo && memoryInfo.used / memoryInfo.available > 0.8) {
      recommendations.push('Memory usage is high - consider increasing Redis memory or implementing cache eviction policies')
    }

    return {
      hitRatio: metrics.hitRatio,
      averageResponseTime: metrics.averageResponseTime,
      throughput,
      errorRate,
      memoryEfficiency: memoryInfo ? (memoryInfo.used / memoryInfo.available) : 0,
      cacheUtilization: metrics.hitRatio,
      recommendations
    }
  }

  /**
   * Get Redis memory information
   */
  private async getMemoryInfo(): Promise<{ used: number; available: number; fragmentation: number } | null> {
    try {
      const info = await redis.info('memory')
      const lines = info.split('\n')
      let used = 0
      let maxMemory = 0
      let fragmentation = 1

      for (const line of lines) {
        if (line.startsWith('used_memory:')) {
          used = parseInt(line.split(':')[1])
        } else if (line.startsWith('maxmemory:')) {
          maxMemory = parseInt(line.split(':')[1])
        } else if (line.startsWith('mem_fragmentation_ratio:')) {
          fragmentation = parseFloat(line.split(':')[1])
        }
      }

      return {
        used,
        available: maxMemory > 0 ? maxMemory : used * 2, // Estimate if no maxmemory set
        fragmentation
      }
    } catch (error) {
      console.warn('Failed to get Redis memory info:', error)
      return null
    }
  }

  /**
   * Take a performance snapshot
   */
  takeSnapshot(): void {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: this.getMetrics()
    }

    this.snapshots.push(snapshot)

    // Keep only the most recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }
  }

  /**
   * Get performance snapshots
   */
  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots]
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.startTime = Date.now()
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRatio: 0,
      averageResponseTime: 0,
      uptime: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
        exists: 0
      },
      errors: {
        get: 0,
        set: 0,
        del: 0,
        exists: 0
      },
      responseTimes: {
        get: [],
        set: [],
        del: [],
        exists: []
      }
    }
    this.snapshots = []
  }
}

// Global cache monitor instance
export const cacheMonitor = new CacheMonitor()

/**
 * Get cached data with JSON parsing
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const startTime = Date.now()
  try {
    const data = await redis.get(key)
    const responseTime = Date.now() - startTime

    if (!data) {
      cacheMonitor.recordMiss('get', responseTime)
      return null
    }

    cacheMonitor.recordHit('get', responseTime)
    return JSON.parse(data) as T
   } catch (error: unknown) {
     cacheMonitor.recordError('get')
     console.warn('Cache get failed:', error)
     return null
   }
}

/**
 * Set cached data with JSON stringification
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  const startTime = Date.now()
  try {
    const success = await redis.set(key, JSON.stringify(data), ttl)
    const responseTime = Date.now() - startTime

    if (success) {
      cacheMonitor.recordHit('set', responseTime)
    } else {
      cacheMonitor.recordError('set')
    }
  } catch (error: unknown) {
    cacheMonitor.recordError('set')
    console.warn('Cache set failed:', error)
  }
}

/**
 * Batch set multiple cache entries using Redis pipelining for performance
 */
export async function pipelineSet<T>(
  entries: Array<{ key: string; data: T; ttl?: number }>
): Promise<{ success: boolean; errors: string[] }> {
  if (!redis.isConnected()) {
    return { success: false, errors: ['Redis not connected'] }
  }

  try {
    // Get the raw Redis client for pipelining
    // Note: This is a workaround for accessing the internal client
    const redisClient = redis as unknown as { client: { pipeline: () => { setex: (key: string, ttl: number, value: string) => void; set: (key: string, value: string) => void; exec: () => Promise<Array<[Error | null, unknown]>> } } }
    const client = redisClient.client
    if (!client) {
      return { success: false, errors: ['Redis client not available'] }
    }

    const pipeline = client.pipeline()
    const errors: string[] = []

    // Add all SET operations to the pipeline
    entries.forEach(({ key, data, ttl }) => {
      try {
        const serializedData = JSON.stringify(data)
        if (ttl) {
          pipeline.setex(key, ttl, serializedData)
        } else {
          pipeline.set(key, serializedData)
        }
      } catch (error) {
        errors.push(`Failed to serialize data for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })

    // Execute the pipeline
    const results = await pipeline.exec()

    // Check for pipeline execution errors
    if (results) {
      results.forEach((result: [Error | null, unknown], index: number) => {
        if (result[0]) { // Error in pipeline result
          const key = entries[index]?.key || `entry-${index}`
          errors.push(`Pipeline SET failed for key ${key}: ${result[0]}`)
        }
      })
    }

    return {
      success: errors.length === 0,
      errors
    }
  } catch (error: unknown) {
    console.warn('Pipeline SET failed:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown pipeline error']
    }
  }
}

/**
 * Set cached data with smart compression
 */
export async function setCompressedData<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  try {
    const jsonData = JSON.stringify(data)
    const { compressed, shouldCompress, originalSize, compressedSize } = await compressData(jsonData)

    const cacheEntry: CompressedCacheEntry = {
      data: compressed,
      compressed: shouldCompress,
      originalSize,
      compressedSize,
      timestamp: Date.now(),
      ttl
    }

    await redis.set(key, JSON.stringify(cacheEntry), ttl)
  } catch (error: unknown) {
    console.warn('Compressed cache set failed:', error)
  }
}

/**
 * Get cached data with smart decompression
 */
export async function getCompressedData<T>(key: string): Promise<T | null> {
  try {
    const rawData = await redis.get(key)
    if (!rawData) return null

    const cacheEntry: CompressedCacheEntry = JSON.parse(rawData)
    const decompressedData = await decompressData(cacheEntry.data, cacheEntry.compressed)

    return JSON.parse(decompressedData) as T
  } catch (error: unknown) {
    console.warn('Compressed cache get failed:', error)
    return null
  }
}

/**
 * Invalidate cached data
 */
export async function invalidateCache(key: string): Promise<void> {
  const startTime = Date.now()
  try {
    const success = await redis.del(key)
    const responseTime = Date.now() - startTime

    if (success) {
      cacheMonitor.recordHit('del', responseTime)
    } else {
      cacheMonitor.recordError('del')
    }
  } catch (error: unknown) {
    cacheMonitor.recordError('del')
    console.warn('Cache invalidation failed:', error)
  }
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateMultipleCache(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map(key => redis.del(key)))
  } catch (error: unknown) {
    console.warn('Multiple cache invalidation failed:', error)
  }
}

/**
 * Safe cache invalidation with error handling and result reporting
 */
export async function safeInvalidateCache(key: string): Promise<CacheOperationResult> {
  try {
    const result = await redis.del(key)
    return { success: result }
  } catch (error: unknown) {
    console.error(`Cache invalidation failed for key ${key}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Safe patient cache invalidation with comprehensive error handling
 */
export async function safeInvalidatePatientCache(patientId: string): Promise<{ success: boolean; errors: string[] }> {
  const keysToInvalidate = [
    CACHE_KEYS.patient(patientId),
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.autoFill(patientId),
    CACHE_KEYS.remindersAll(patientId),
    CACHE_KEYS.healthNotes(patientId),
  ]

  const results = await Promise.allSettled(
    keysToInvalidate.map(key => safeInvalidateCache(key))
  )

  const errors: string[] = []
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      errors.push(`Failed to invalidate ${keysToInvalidate[index]}: ${result.reason}`)
    } else if (!result.value.success) {
      errors.push(`Cache invalidation failed for ${keysToInvalidate[index]}: ${result.value.error}`)
    }
  })

  const success = errors.length === 0
  if (!success) {
    console.warn(`Patient cache invalidation partially failed for patient ${patientId}:`, errors)
  }

  return {
    success,
    errors
  }
}

/**
 * Check if cache key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  const startTime = Date.now()
  try {
    const exists = await redis.exists(key)
    const responseTime = Date.now() - startTime

    if (exists) {
      cacheMonitor.recordHit('exists', responseTime)
    } else {
      cacheMonitor.recordMiss('exists', responseTime)
    }

    return exists
  } catch (error: unknown) {
    cacheMonitor.recordError('exists')
    console.warn('Cache exists check failed:', error)
    return false
  }
}

/**
 * Cache with automatic fallback to database
 * Usage: const data = await cacheWithFallback('key', fetchFunction, 300)
 */
export async function cacheWithFallback<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try to get from cache first
  const cachedData = await getCachedData<T>(cacheKey)
  if (cachedData !== null) {
    return cachedData
  }

  // Fallback to fetch function
  const freshData = await fetchFunction()
  
  // Cache the fresh data (don't wait for it)
  setCachedData(cacheKey, freshData, ttl).catch(error => {
    console.warn('Background cache set failed:', error)
  })
  
  return freshData
}

/**
 * Patient-related cache invalidation helper
 */
export async function invalidatePatientCache(patientId: string): Promise<void> {
  const keysToInvalidate = [
    CACHE_KEYS.patient(patientId),
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.autoFill(patientId),
    CACHE_KEYS.remindersAll(patientId),
    CACHE_KEYS.healthNotes(patientId),
  ]
  
  await invalidateMultipleCache(keysToInvalidate)
}

/**
 * Background cache invalidation - non-blocking operation
 * Performs cache invalidation asynchronously without blocking the main thread
 */
export function invalidateCacheAsync(key: string): void {
  // Fire and forget - don't wait for completion
  setImmediate(async () => {
    try {
      await redis.del(key)
    } catch (error: unknown) {
      console.warn(`Background cache invalidation failed for key ${key}:`, error)
    }
  })
}

/**
 * Background multiple cache invalidation - non-blocking operation
 * Performs multiple cache invalidations asynchronously without blocking the main thread
 */
export function invalidateMultipleCacheAsync(keys: string[]): void {
  // Fire and forget - don't wait for completion
  setImmediate(async () => {
    try {
      await Promise.allSettled(keys.map(key => redis.del(key)))
    } catch (error: unknown) {
      console.warn('Background multiple cache invalidation failed:', error)
    }
  })
}

/**
 * Stale-While-Revalidate pattern implementation
 * Returns cached data immediately if available, then refreshes in background
 */
export async function getStaleWhileRevalidate<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try to get stale data from cache first
  const cachedData = await getCachedData<T>(cacheKey)

  if (cachedData !== null) {
    // Return stale data immediately
    // Trigger background refresh asynchronously
    setImmediate(async () => {
      try {
        const freshData = await fetchFunction()
        await setCachedData(cacheKey, freshData, ttl)
      } catch (error: unknown) {
        console.warn(`Background refresh failed for key ${cacheKey}:`, error)
      }
    })

    return cachedData
  }

  // No cached data available, fetch fresh data
  const freshData = await fetchFunction()

  // Cache the fresh data asynchronously
  setImmediate(async () => {
    try {
      await setCachedData(cacheKey, freshData, ttl)
    } catch (error: unknown) {
      console.warn(`Background cache set failed for key ${cacheKey}:`, error)
    }
  })

  return freshData
}

/**
 * Background patient cache invalidation - non-blocking operation
 * Invalidates all patient-related cache keys asynchronously
 */
export function invalidatePatientCacheAsync(patientId: string): void {
  const keysToInvalidate = [
    CACHE_KEYS.patient(patientId),
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.autoFill(patientId),
    CACHE_KEYS.remindersAll(patientId),
    CACHE_KEYS.healthNotes(patientId),
  ]

  invalidateMultipleCacheAsync(keysToInvalidate)
}

/**
 * Health check for Redis
 */
export function getRedisHealthStatus(): RedisHealthStatus {
  const connected = redis.isConnected()
  return {
    connected,
    message: connected ? 'Redis connected' : 'Redis not available - using direct database queries'
  }
}

/**
 * Comprehensive cache health check
 */
export async function getCacheHealthStatus(): Promise<CacheHealthStatus> {
  try {
    // Test Redis connection and operations
    const testKey = `health-check-${Date.now()}`
    const testValue = 'cache-health-test'

    // Test SET operation
    const setResult = await redis.set(testKey, testValue, 60) // 1 minute TTL

    // Test GET operation
    const getResult = await redis.get(testKey)

    // Test DEL operation
    const delResult = await redis.del(testKey)

    const cacheOperations = {
      set: setResult,
      get: getResult === testValue,
      del: delResult
    }

    const allOperationsSuccessful = Object.values(cacheOperations).every(op => op)

    return {
      redis: allOperationsSuccessful,
      message: allOperationsSuccessful ? 'Cache fully operational' : 'Cache operations partially failed',
      cacheOperations
    }
  } catch (error: unknown) {
    return {
      redis: false,
      message: 'Cache unavailable - falling back to database',
      lastError: error instanceof Error ? error.message : 'Unknown error',
      cacheOperations: {
        set: false,
        get: false,
        del: false
      }
    }
  }
}

/**
 * Get cache performance analytics
 */
export async function getCacheAnalytics(): Promise<CacheAnalytics> {
  return await cacheMonitor.getAnalytics()
}

/**
 * Get current cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return cacheMonitor.getMetrics()
}

/**
 * Take a performance snapshot
 */
export function takeCacheSnapshot(): void {
  cacheMonitor.takeSnapshot()
}

/**
 * Get performance snapshots
 */
export function getCacheSnapshots(): PerformanceSnapshot[] {
  return cacheMonitor.getSnapshots()
}

/**
 * Reset cache metrics
 */
export function resetCacheMetrics(): void {
  cacheMonitor.reset()
}

/**
 * Get cache hit ratio
 */
export function getCacheHitRatio(): number {
  return cacheMonitor.getMetrics().hitRatio
}

/**
 * Get cache performance summary
 */
export function getCachePerformanceSummary(): {
  hitRatio: number
  averageResponseTime: number
  totalRequests: number
  errorCount: number
  uptime: number
} {
  const metrics = cacheMonitor.getMetrics()
  const errorCount = Object.values(metrics.errors).reduce((sum, err) => sum + err, 0)

  return {
    hitRatio: metrics.hitRatio,
    averageResponseTime: metrics.averageResponseTime,
    totalRequests: metrics.totalRequests,
    errorCount,
    uptime: metrics.uptime
  }
}

