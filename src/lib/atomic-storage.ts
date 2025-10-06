/**
 * Atomic localStorage operations to prevent race conditions
 * between multiple tabs/windows accessing the same keys
 */

import { logger } from "@/lib/logger";

interface StorageLock {
  key: string;
  expiresAt: number;
  tabId: string;
}

// Generate unique tab ID
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const LOCK_PREFIX = "__atomic_lock_";
const LOCK_DURATION = 3000; // Reduced to 3 seconds to prevent long locks

// Global cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Acquire a lock for a storage key
 */
async function acquireLock(key: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${key}`;
  const lockData: StorageLock = {
    key,
    expiresAt: Date.now() + LOCK_DURATION,
    tabId: TAB_ID,
  };

  try {
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock) {
      const parsedLock: StorageLock = JSON.parse(existingLock);

      // Check if lock is expired or belongs to current tab
      if (parsedLock.expiresAt < Date.now() || parsedLock.tabId === TAB_ID) {
        // Lock is expired or owned by us, we can take it
        localStorage.setItem(lockKey, JSON.stringify(lockData));
        return true;
      }

      // Lock is held by another tab and not expired
      return false;
    }

    // No existing lock, acquire it
    localStorage.setItem(lockKey, JSON.stringify(lockData));
    return true;
   } catch (error) {
    logger.warn("Failed to acquire storage lock", { error: error as Error });
    return false;
  }
}

/**
 * Release a lock for a storage key
 */
function releaseLock(key: string): void {
  const lockKey = `${LOCK_PREFIX}${key}`;
  try {
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock) {
      const parsedLock: StorageLock = JSON.parse(existingLock);
      if (parsedLock.tabId === TAB_ID) {
        localStorage.removeItem(lockKey);
      }
    }
   } catch (error) {
    logger.warn("Failed to release storage lock", { error: error as Error });
  }
}

/**
 * Atomic get operation with retry logic - FIXED to prevent infinite loops
 */
export async function atomicGet<T>(
  key: string,
  maxRetries = 2 // Reduced from 3 to 2
): Promise<T | null> {
  const startTime = Date.now();
  const maxWaitTime = 5000; // Maximum 5 seconds total wait time

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check if we've exceeded max wait time
    if (Date.now() - startTime > maxWaitTime) {
      logger.warn(`Atomic get timeout for key ${key}`, { 
        elapsedMs: Date.now() - startTime,
        attempts: attempt 
      });
      return null;
    }

    if (await acquireLock(key)) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
       } catch (error) {
        logger.warn(`Atomic get failed for key ${key}`, { error: error as Error });
        return null;
      } finally {
        releaseLock(key);
      }
    }

    // Wait before retry with exponential backoff but capped
    if (attempt < maxRetries - 1) {
      const delay = Math.min(100 * Math.pow(2, attempt), 500); // Max 500ms delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.warn(
    `Failed to acquire lock for atomic get of key ${key} after ${maxRetries} attempts`,
    { elapsedMs: Date.now() - startTime }
  );
  return null;
}

/**
 * Atomic set operation with retry logic - FIXED to prevent infinite loops
 */
export async function atomicSet<T>(
  key: string,
  value: T,
  maxRetries = 2 // Reduced from 3 to 2
): Promise<boolean> {
  const startTime = Date.now();
  const maxWaitTime = 5000; // Maximum 5 seconds total wait time

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check if we've exceeded max wait time
    if (Date.now() - startTime > maxWaitTime) {
      logger.warn(`Atomic set timeout for key ${key}`, { 
        elapsedMs: Date.now() - startTime,
        attempts: attempt 
      });
      return false;
    }

    if (await acquireLock(key)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
       } catch (error) {
        logger.warn(`Atomic set failed for key ${key}`, { error: error as Error });
        return false;
      } finally {
        releaseLock(key);
      }
    }

    // Wait before retry with exponential backoff but capped
    if (attempt < maxRetries - 1) {
      const delay = Math.min(100 * Math.pow(2, attempt), 500); // Max 500ms delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.warn(
    `Failed to acquire lock for atomic set of key ${key} after ${maxRetries} attempts`,
    { elapsedMs: Date.now() - startTime }
  );
  return false;
}

/**
 * Atomic remove operation with retry logic
 */
export async function atomicRemove(
  key: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (await acquireLock(key)) {
      try {
        localStorage.removeItem(key);
        return true;
       } catch (error) {
        logger.warn(`Atomic remove failed for key ${key}`, { error: error as Error });
        return false;
      } finally {
        releaseLock(key);
      }
    }

    // Wait before retry
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }

  logger.warn(
    `Failed to acquire lock for atomic remove of key ${key} after ${maxRetries} attempts`
  );
  return false;
}

/**
 * Atomic update operation - get current value, apply update function, set new value
 */
export async function atomicUpdate<T>(
  key: string,
  updateFn: (currentValue: T | null) => T,
  maxRetries = 3
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (await acquireLock(key)) {
      try {
        const currentValue = localStorage.getItem(key);
        const parsedValue = currentValue ? JSON.parse(currentValue) : null;
        const newValue = updateFn(parsedValue);

        localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
       } catch (error) {
        logger.warn(`Atomic update failed for key ${key}`, { error: error as Error });
        return null;
      } finally {
        releaseLock(key);
      }
    }

    // Wait before retry
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }

  logger.warn(
    `Failed to acquire lock for atomic update of key ${key} after ${maxRetries} attempts`
  );
  return null;
}

/**
 * Clean up expired locks (can be called periodically)
 */
export function cleanupExpiredLocks(): void {
  try {
    const keys = Object.keys(localStorage);
    const lockKeys = keys.filter((key) => key.startsWith(LOCK_PREFIX));

    lockKeys.forEach((lockKey) => {
      try {
        const lockData = localStorage.getItem(lockKey);
        if (lockData) {
          const parsedLock: StorageLock = JSON.parse(lockData);
          if (parsedLock.expiresAt < Date.now()) {
            localStorage.removeItem(lockKey);
          }
        }
      } catch {
        // Remove corrupted lock data
        localStorage.removeItem(lockKey);
      }
    });
  } catch (error) {
    logger.warn("Failed to cleanup expired locks", { error: error as Error });
  }
}

// Clean up locks on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    // Clean up locks owned by this tab
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(LOCK_PREFIX)) {
          try {
            const lockData = localStorage.getItem(key);
            if (lockData) {
              const parsedLock: StorageLock = JSON.parse(lockData);
              if (parsedLock.tabId === TAB_ID) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Remove corrupted lock data
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      logger.warn("Failed to cleanup locks on unload", { error: error as Error });
    }
  });

  // Clean up any existing interval before setting a new one
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  // Periodic cleanup of expired locks with controlled interval
  cleanupInterval = setInterval(() => {
    try {
      cleanupExpiredLocks();
    } catch (error) {
      logger.warn("Failed to run periodic cleanup", { error: error as Error });
      // Clear interval if it keeps failing
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    }
  }, 60000); // Increased to 60 seconds to reduce frequency

  // Also cleanup on visibility change to handle tab switching
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupExpiredLocks();
    }
  });
}

