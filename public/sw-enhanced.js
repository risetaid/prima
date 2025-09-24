// Enhanced Service Worker with Background Sync
const CACHE_NAME = 'prima-v1';
const OFFLINE_URL = '/_offline';
const BACKGROUND_SYNC_TAG = 'background-sync';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline page');
      return cache.addAll([
        OFFLINE_URL,
        '/',
        '/manifest.json',
        '/icon-192x192.png',
        '/icon-512x512.png',
      ]);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately
  self.clients.claim();
});

// Fetch event with network-first strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }
  
  // Handle other requests with stale-while-revalidate
  event.respondWith(handleResourceRequest(event.request));
});

// Background Sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(processBackgroundSync());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from PRIMA',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: 'prima-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-48x48.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PRIMA', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle API requests with background sync fallback
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', request.url);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For POST/PUT/DELETE requests, store for background sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeForBackgroundSync(request);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Request queued for when connection is restored',
          queued: true
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return offline response for GET requests
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Offline - data not available',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful page responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    
    // Try to serve cached version first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page as fallback
    return caches.match(OFFLINE_URL);
  }
}

// Handle resource requests with stale-while-revalidate
async function handleResourceRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cachedResponse);
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Store failed requests for background sync
async function storeForBackgroundSync(request) {
  const db = await openDB();
  const transaction = db.transaction(['requests'], 'readwrite');
  const store = transaction.objectStore('requests');
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };
  
  await store.add(requestData);
  
  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    await self.registration.sync.register(BACKGROUND_SYNC_TAG);
  }
}

// Process background sync
async function processBackgroundSync() {
  console.log('[SW] Processing background sync');
  
  const db = await openDB();
  const transaction = db.transaction(['requests'], 'readwrite');
  const store = transaction.objectStore('requests');
  const requests = await store.getAll();
  
  const results = [];
  
  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (response.ok) {
        // Remove successful request from store
        await store.delete(requestData.id);
        results.push({ success: true, url: requestData.url });
        
        // Notify clients of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_SUCCESS',
            url: requestData.url,
            timestamp: Date.now()
          });
        });
      } else {
        results.push({ success: false, url: requestData.url, status: response.status });
      }
    } catch (error) {
      console.log('[SW] Background sync failed for:', requestData.url, error);
      results.push({ success: false, url: requestData.url, error: error.message });
    }
  }
  
  console.log('[SW] Background sync results:', results);
  return results;
}

// Simple IndexedDB wrapper
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('prima-sw-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

// Sync content in background
async function syncContent() {
  try {
    // Sync critical content
    const contentUrls = [
      '/api/patients',
      '/api/reminders/scheduled',
      '/api/content/public?type=articles&limit=10'
    ];
    
    for (const url of contentUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(url, response.clone());
        }
      } catch (error) {
        console.log('[SW] Failed to sync:', url, error);
      }
    }
    
    console.log('[SW] Content sync completed');
  } catch (error) {
    console.log('[SW] Content sync failed:', error);
  }
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
});

// Get cache status
async function getCacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  return {
    cacheSize: keys.length,
    cacheKeys: keys.map(request => request.url),
    timestamp: Date.now()
  };
}
