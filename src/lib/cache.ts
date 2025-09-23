import { redis } from "./redis";
import { logger } from "./logger";

// Redis operation result types
export interface CacheOperationResult {
  success: boolean;
  error?: string;
}

export interface CacheHealthStatus {
  redis: boolean;
  message: string;
  lastError?: string;
  cacheOperations: {
    set: boolean;
    get: boolean;
    del: boolean;
  };
}

export interface RedisHealthStatus {
  connected: boolean;
  message: string;
}

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PATIENT: 900, // 15 minutes (appropriate for medical data that doesn't change frequently)
  REMINDER_STATS: 300, // 5 minutes
  TEMPLATES: 600, // 10 minutes
  USER_PROFILE: 300, // 5 minutes
  USER_SESSION: 300, // 5 minutes - reduce database hits during multi-tab usage
  REMINDERS_ALL: 300, // 5 minutes
} as const;

// Cache key generators
export const CACHE_KEYS = {
  patient: (id: string) => `patient:${id}`,
  reminderStats: (patientId: string) => `stats:${patientId}`,
  templates: "templates:all",
  userProfile: (userId: string) => `user:${userId}`,
  userSession: (clerkId: string) => `session:${clerkId}`,
  remindersAll: (patientId: string) => `reminders:${patientId}:all`,
  healthNotes: (patientId: string) => `health-notes:${patientId}`,
} as const;

/**
 * Get cached data with JSON parsing
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error: unknown) {
    logger.warn("Cache get failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
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
    await redis.set(key, JSON.stringify(data), ttl);
  } catch (error: unknown) {
    logger.warn("Cache set failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate cached data
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error: unknown) {
    logger.warn("Cache invalidation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateMultipleCache(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map((key) => redis.del(key)));
  } catch (error: unknown) {
    logger.warn("Multiple cache invalidation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Safe cache invalidation with error handling and result reporting
 */
export async function safeInvalidateCache(
  key: string
): Promise<CacheOperationResult> {
  try {
    const result = await redis.del(key);
    return { success: result };
  } catch (error: unknown) {
    logger.error(
      `Cache invalidation failed for key ${key}`,
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Safe patient cache invalidation with comprehensive error handling
 */
export async function safeInvalidatePatientCache(
  patientId: string
): Promise<{ success: boolean; errors: string[] }> {
  const keysToInvalidate = [
    CACHE_KEYS.patient(patientId),
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.remindersAll(patientId),
    CACHE_KEYS.healthNotes(patientId),
  ];

  const results = await Promise.allSettled(
    keysToInvalidate.map((key) => safeInvalidateCache(key))
  );

  const errors: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      errors.push(
        `Failed to invalidate ${keysToInvalidate[index]}: ${result.reason}`
      );
    } else if (!result.value.success) {
      errors.push(
        `Cache invalidation failed for ${keysToInvalidate[index]}: ${result.value.error}`
      );
    }
  });

  const success = errors.length === 0;
  if (!success) {
    logger.warn(
      `Patient cache invalidation partially failed for patient ${patientId}`,
      { errors }
    );
  }

  return {
    success,
    errors,
  };
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
  const cachedData = await getCachedData<T>(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  // Fallback to fetch function
  const freshData = await fetchFunction();

  // Cache the fresh data (don't wait for it)
  setCachedData(cacheKey, freshData, ttl).catch((error) => {
    logger.warn("Background cache set failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return freshData;
}

/**
 * Background cache invalidation - non-blocking operation
 * Performs cache invalidation asynchronously without blocking the main thread
 */
export function invalidateCacheAsync(key: string): void {
  // Fire and forget - don't wait for completion
  setImmediate(async () => {
    try {
      await redis.del(key);
    } catch (error: unknown) {
      logger.warn(`Background cache invalidation failed for key ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Background multiple cache invalidation - non-blocking operation
 * Performs multiple cache invalidations asynchronously without blocking the main thread
 */
export function invalidateMultipleCacheAsync(keys: string[]): void {
  // Fire and forget - don't wait for completion
  setImmediate(async () => {
    try {
      await Promise.allSettled(keys.map((key) => redis.del(key)));
    } catch (error: unknown) {
      logger.warn("Background multiple cache invalidation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Health check for Redis
 */
export function getRedisHealthStatus(): RedisHealthStatus {
  const connected = redis.isConnected();
  return {
    connected,
    message: connected
      ? "Redis connected"
      : "Redis not available - using direct database queries",
  };
}

/**
 * Comprehensive cache health check
 */
export async function getCacheHealthStatus(): Promise<CacheHealthStatus> {
  try {
    // Test Redis connection and operations
    const testKey = `health-check-${Date.now()}`;
    const testValue = "cache-health-test";

    // Test SET operation
    const setResult = await redis.set(testKey, testValue, 60); // 1 minute TTL

    // Test GET operation
    const getResult = await redis.get(testKey);

    // Test DEL operation
    const delResult = await redis.del(testKey);

    const cacheOperations = {
      set: setResult,
      get: getResult === testValue,
      del: delResult,
    };

    const allOperationsSuccessful = Object.values(cacheOperations).every(
      (op) => op
    );

    return {
      redis: allOperationsSuccessful,
      message: allOperationsSuccessful
        ? "Cache fully operational"
        : "Cache operations partially failed",
      cacheOperations,
    };
  } catch (error: unknown) {
    return {
      redis: false,
      message: "Cache unavailable - falling back to database",
      lastError: error instanceof Error ? error.message : "Unknown error",
      cacheOperations: {
        set: false,
        get: false,
        del: false,
      },
    };
  }
}
