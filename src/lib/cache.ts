import { redis } from './redis'

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PATIENT: 300,        // 5 minutes
  REMINDER_STATS: 120, // 2 minutes  
  TEMPLATES: 600,      // 10 minutes
  AUTOFILL: 180,       // 3 minutes
  USER_PROFILE: 300,   // 5 minutes
  USER_SESSION: 300,   // 5 minutes - reduce database hits during multi-tab usage
  REMINDERS_ALL: 120,  // 2 minutes
} as const

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
 * Get cached data with JSON parsing
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    if (!data) return null
    
    return JSON.parse(data) as T
  } catch (error) {
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
  try {
    await redis.set(key, JSON.stringify(data), ttl)
  } catch (error) {
    console.warn('Cache set failed:', error)
  }
}

/**
 * Invalidate cached data
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.warn('Cache invalidation failed:', error)
  }
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateMultipleCache(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map(key => redis.del(key)))
  } catch (error) {
    console.warn('Multiple cache invalidation failed:', error)
  }
}

/**
 * Check if cache key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    return await redis.exists(key)
  } catch (error) {
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
 * Health check for Redis
 */
export function getRedisHealthStatus(): { connected: boolean; message: string } {
  const connected = redis.isConnected()
  return {
    connected,
    message: connected ? 'Redis connected' : 'Redis not available - using direct database queries'
  }
}