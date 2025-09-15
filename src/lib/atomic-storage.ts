/**
 * Atomic localStorage operations to prevent race conditions
 * between multiple tabs/windows accessing the same keys
 */

interface StorageLock {
  key: string;
  expiresAt: number;
  tabId: string;
}

// Generate unique tab ID
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const LOCK_PREFIX = "__atomic_lock_";
const LOCK_DURATION = 5000; // 5 seconds

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
    console.warn("Failed to acquire storage lock:", error);
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
    console.warn("Failed to release storage lock:", error);
  }
}

/**
 * Atomic get operation with retry logic
 */
export async function atomicGet<T>(
  key: string,
  maxRetries = 3
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (await acquireLock(key)) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Atomic get failed for key ${key}:`, error);
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

  console.warn(
    `Failed to acquire lock for atomic get of key ${key} after ${maxRetries} attempts`
  );
  return null;
}

/**
 * Atomic set operation with retry logic
 */
export async function atomicSet<T>(
  key: string,
  value: T,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (await acquireLock(key)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`Atomic set failed for key ${key}:`, error);
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

  console.warn(
    `Failed to acquire lock for atomic set of key ${key} after ${maxRetries} attempts`
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
        console.warn(`Atomic remove failed for key ${key}:`, error);
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

  console.warn(
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
        console.warn(`Atomic update failed for key ${key}:`, error);
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

  console.warn(
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
    console.warn("Failed to cleanup expired locks:", error);
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
      console.warn("Failed to cleanup locks on unload:", error);
    }
  });

  // Periodic cleanup of expired locks
  setInterval(cleanupExpiredLocks, 30000); // Every 30 seconds
}

