/**
 * Cache management utilities for post-login cleanup
 * Clears development artifacts and ensures fresh data
 */

export interface CacheCleanupOptions {
  clearLocalStorage?: boolean
  clearSessionStorage?: boolean
  clearIndexedDB?: boolean
  clearServiceWorkerCache?: boolean
  skipKeys?: string[]
}

/**
 * Clears browser storage to prevent development artifacts
 * and ensures fresh data after login
 */
export async function clearBrowserCache(options: CacheCleanupOptions = {}) {
  const {
    clearLocalStorage = true,
    clearSessionStorage = true,
    clearIndexedDB = true,
    clearServiceWorkerCache = true,
    skipKeys = ['clerk-db', 'clerk-telemetry'] // Preserve Clerk data
  } = options

  const results = {
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    serviceWorker: false,
    errors: [] as string[]
  }

  // Clear localStorage while preserving specified keys
  if (clearLocalStorage && typeof window !== 'undefined' && window.localStorage) {
    try {
      const preserve: Record<string, string> = {}
      
      // Save keys to preserve
      skipKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) preserve[key] = value
      })
      
      // Clear all
      localStorage.clear()
      
      // Restore preserved keys
      Object.entries(preserve).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })
      
      results.localStorage = true
      console.log('✅ Cache: LocalStorage cleared (preserved keys:', skipKeys.join(', ') + ')')
    } catch (error) {
      const msg = 'Failed to clear localStorage'
      results.errors.push(msg)
      console.warn('⚠️ Cache:', msg, error)
    }
  }

  // Clear sessionStorage
  if (clearSessionStorage && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.clear()
      results.sessionStorage = true
      console.log('✅ Cache: SessionStorage cleared')
    } catch (error) {
      const msg = 'Failed to clear sessionStorage'
      results.errors.push(msg)
      console.warn('⚠️ Cache:', msg, error)
    }
  }

  // Clear IndexedDB (more complex, selective approach)
  if (clearIndexedDB && typeof window !== 'undefined' && 'indexedDB' in window) {
    try {
      // Get list of databases
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases()
        
        // Close and delete non-Clerk databases
        for (const db of databases) {
          if (db.name && !skipKeys.some(key => db.name!.includes(key))) {
            const deleteRequest = indexedDB.deleteDatabase(db.name)
            await new Promise((resolve, reject) => {
              deleteRequest.onsuccess = () => resolve(void 0)
              deleteRequest.onerror = () => reject(deleteRequest.error)
            })
            console.log(`✅ Cache: IndexedDB '${db.name}' cleared`)
          }
        }
      }
      results.indexedDB = true
    } catch (error) {
      const msg = 'Failed to clear IndexedDB'
      results.errors.push(msg)
      console.warn('⚠️ Cache:', msg, error)
    }
  }

  // Clear Service Worker Cache
  if (clearServiceWorkerCache && 'serviceWorker' in navigator && 'caches' in window) {
    try {
      const cacheNames = await caches.keys()
      
      // Delete non-critical caches
      const criticalCaches = ['clerk', 'auth', 'critical']
      for (const cacheName of cacheNames) {
        const isCritical = criticalCaches.some(critical => 
          cacheName.toLowerCase().includes(critical)
        )
        
        if (!isCritical) {
          await caches.delete(cacheName)
          console.log(`✅ Cache: Service Worker cache '${cacheName}' cleared`)
        }
      }
      results.serviceWorker = true
    } catch (error) {
      const msg = 'Failed to clear Service Worker caches'
      results.errors.push(msg)
      console.warn('⚠️ Cache:', msg, error)
    }
  }

  return results
}

/**
 * Clears role-specific cached data
 * Useful when user role changes or after login
 */
export function clearRoleCache() {
  if (typeof window === 'undefined') return
  
  try {
    // Clear role-related cache keys (matching role-cache.ts naming)
    const roleCacheKeys = [
      'prima_user_role',           // Main role cache (matches role-cache.ts)
      'prima_user_role_expiry',    // Role cache expiry (matches role-cache.ts)
      'prima-user-permissions',
      'prima-navigation-cache',
      'prima-dashboard-stats'
    ]
    
    roleCacheKeys.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    console.log('✅ Cache: Role-specific cache cleared')
  } catch (error) {
    console.warn('⚠️ Cache: Failed to clear role cache:', error)
  }
}

/**
 * Clear role cache specifically for user logout/role switches
 * This ensures clean transitions between different user roles
 */
export function clearRoleCacheOnLogout() {
  if (typeof window === 'undefined') return
  
  try {
    // Import and use the dedicated role cache clearing function
    // This ensures we use the same clearing logic as role-cache.ts
    
    // Clear all role-related data
    clearRoleCache()
    
    // Also clear any Clerk-related role data that might be cached
    const clerkRoleKeys = [
      'clerk-role',
      'clerk-permissions',
      'clerk-user-data'
    ]
    
    clerkRoleKeys.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    console.log('✅ Cache: Role cache cleared for logout/switch')
  } catch (error) {
    console.warn('⚠️ Cache: Failed to clear role cache on logout:', error)
  }
}

/**
 * Utility for clearing development-specific cache items
 * Useful during development when switching between users/roles
 */
export function clearDevelopmentCache() {
  if (typeof window === 'undefined') return
  
  try {
    const devCacheKeys = [
      'debug-',
      'dev-',
      'test-',
      'mock-',
      'temp-',
      'cache-',
      'webpack',
      'hot-reload'
    ]
    
    // Clear localStorage items matching dev patterns
    Object.keys(localStorage).forEach(key => {
      if (devCacheKeys.some(pattern => key.includes(pattern))) {
        localStorage.removeItem(key)
      }
    })
    
    // Clear sessionStorage items matching dev patterns  
    Object.keys(sessionStorage).forEach(key => {
      if (devCacheKeys.some(pattern => key.includes(pattern))) {
        sessionStorage.removeItem(key)
      }
    })
    
    console.log('✅ Cache: Development cache cleared')
  } catch (error) {
    console.warn('⚠️ Cache: Failed to clear development cache:', error)
  }
}

/**
 * Hook for triggering cache cleanup after successful login
 * Can be integrated into dashboard page or auth flow
 */
export async function postLoginCacheCleanup() {
  console.log('🧹 Cache: Starting post-login cleanup...')
  
  // Clear role-specific cache first
  clearRoleCache()
  
  // Clear development artifacts
  if (process.env.NODE_ENV === 'development') {
    clearDevelopmentCache()
  }
  
  // Comprehensive cache cleanup
  const results = await clearBrowserCache({
    clearLocalStorage: true,
    clearSessionStorage: false, // Keep session data for current session
    clearIndexedDB: true,
    clearServiceWorkerCache: true,
    skipKeys: ['clerk-db', 'clerk-telemetry', 'prima-session-data']
  })
  
  console.log('🧹 Cache: Post-login cleanup completed:', results)
  
  return results
}