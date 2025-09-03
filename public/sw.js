// PRIMA Service Worker - Healthcare PWA with Offline Support
// Version: 1.0.0

const CACHE_NAME = 'prima-healthcare-v1'
const CACHE_VERSION = '1.0.0'

// Critical resources that must be cached for offline functionality
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/dashboard/pengingat',
  '/sign-in',
  '/pending-approval',
  '/manifest.json',
  '/bg_desktop.png',
]

// Healthcare-specific data patterns to cache
const HEALTHCARE_API_PATTERNS = [
  /\/api\/user\/(profile|status|session)/,
  /\/api\/patients$/,
  /\/api\/patients\/\w+$/,
  /\/api\/templates$/,
  /\/api\/dashboard\/overview$/
]

// Resources to cache on request
const CACHEABLE_RESOURCES = [
  /\.(js|css|woff|woff2|ttf|eot)$/,
  /\/api\/.*$/,
  /^\//
]

// Install event - Cache critical resources
self.addEventListener('install', event => {
  console.log('🔧 PRIMA SW: Installing service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('💾 PRIMA SW: Caching critical resources')
        return cache.addAll(CRITICAL_RESOURCES.map(url => new Request(url, { cache: 'reload' })))
      })
      .then(() => {
        console.log('✅ PRIMA SW: Critical resources cached')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('❌ PRIMA SW: Failed to cache critical resources:', error)
      })
  )
})

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 PRIMA SW: Activating service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName.startsWith('prima-') && cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('🗑️ PRIMA SW: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('✅ PRIMA SW: Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - Network-first for API, Cache-first for static resources
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }
  
  // Healthcare API requests - Network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleHealthcareAPI(request))
    return
  }
  
  // Static resources - Cache first
  if (CACHEABLE_RESOURCES.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleStaticResource(request))
    return
  }
  
  // Default - Network first
  event.respondWith(handleDefault(request))
})

// Healthcare API handler - Critical for offline functionality
async function handleHealthcareAPI(request) {
  const url = new URL(request.url)
  
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request.clone())
    
    // Cache successful healthcare API responses
    if (networkResponse.ok && HEALTHCARE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request.clone(), networkResponse.clone())
      console.log('💾 PRIMA SW: Cached API response:', url.pathname)
    }
    
    return networkResponse
    
  } catch (error) {
    console.warn('⚠️ PRIMA SW: Network failed for API:', url.pathname)
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('📱 PRIMA SW: Serving cached API response:', url.pathname)
      return cachedResponse
    }
    
    // For critical healthcare endpoints, return meaningful offline response
    if (url.pathname.includes('/user/session') || url.pathname.includes('/user/profile')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Offline - Tidak dapat terhubung ke server',
        offline: true,
        needsSync: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Static resource handler - Cache first for performance
async function handleStaticResource(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request.clone(), networkResponse.clone())
    }
    
    return networkResponse
    
  } catch (error) {
    console.warn('⚠️ PRIMA SW: Failed to fetch static resource:', request.url)
    throw error
  }
}

// Default handler - Network first with cache fallback
async function handleDefault(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request.clone(), networkResponse.clone())
    }
    
    return networkResponse
    
  } catch (error) {
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      console.log('📱 PRIMA SW: Serving cached response:', request.url)
      return cachedResponse
    }
    
    throw error
  }
}

console.log('🏥 PRIMA Service Worker loaded - Healthcare PWA ready')