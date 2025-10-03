/**
 * Simplified Cache utilities for PRIMA Medical System
 * 
 * Basic cache interface with get/set/del operations.
 * Removed complex features: background invalidation, health checking, fallback patterns.
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

// ===== TYPES =====

export interface SimpleCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl: number): Promise<void>
  del(key: string): Promise<void>
}

// ===== CACHE CONSTANTS =====

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PATIENT: 900, // 15 minutes
  REMINDER_STATS: 300, // 5 minutes
  TEMPLATES: 600, // 10 minutes
  USER_PROFILE: 300, // 5 minutes
  USER_SESSION: 300, // 5 minutes
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

// ===== CORE CACHE FUNCTIONS =====

/**
 * Get cached data with JSON parsing
 */
export async function get<T>(key: string): Promise<T | null> {
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
export async function set<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), ttl);
  } catch (error: unknown) {
    logger.warn("Cache set failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete cached data
 */
export async function del(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error: unknown) {
    logger.warn("Cache delete failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Cache with automatic fallback to database
 */
export async function cacheWithFallback<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try to get from cache first
  const cachedData = await get<T>(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  // Fallback to fetch function
  const freshData = await fetchFunction();

  // Cache the fresh data (don't wait for it)
  set(cacheKey, freshData, ttl).catch((error) => {
    logger.warn("Background cache set failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return freshData;
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateMultiple(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map((key) => del(key)));
  } catch (error: unknown) {
    logger.warn("Multiple cache invalidation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ===== SIMPLE CACHE INVALIDATION =====

/**
 * Simple patient cache invalidation
 */
export async function invalidatePatientCache(patientId: string): Promise<void> {
  const keysToInvalidate = [
    CACHE_KEYS.patient(patientId),
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.remindersAll(patientId),
    CACHE_KEYS.healthNotes(patientId),
  ];

  await invalidateMultiple(keysToInvalidate);
}

/**
 * Simple user cache invalidation
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const keysToInvalidate = [
    CACHE_KEYS.userProfile(userId),
    CACHE_KEYS.userSession(userId),
  ];

  await invalidateMultiple(keysToInvalidate);
}

/**
 * Simple reminder cache invalidation
 */
export async function invalidateReminderCache(patientId: string): Promise<void> {
  const keysToInvalidate = [
    CACHE_KEYS.reminderStats(patientId),
    CACHE_KEYS.remindersAll(patientId),
  ];

  await invalidateMultiple(keysToInvalidate);
}

// ===== EXPORTS =====

export const simpleCache: SimpleCache = {
  get,
  set,
  del
};