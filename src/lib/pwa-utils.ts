'use client'

/**
 * PWA (Progressive Web App) utilities for PRIMA Healthcare System
 * Provides offline capability, background sync, and push notifications
 */

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface ServiceWorkerStatus {
  supported: boolean
  registered: boolean
  installed: boolean
  activated: boolean
  error?: string
}

/**
 * Register the service worker for offline functionality
 */
export async function registerServiceWorker(): Promise<ServiceWorkerStatus> {
  const status: ServiceWorkerStatus = {
    supported: false,
    registered: false,
    installed: false,
    activated: false
  }

  if (typeof window === 'undefined') {
    return status
  }

  if ('serviceWorker' in navigator) {
    status.supported = true

    try {
      console.log('🔧 PWA: Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      status.registered = true

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 PWA: Service worker update found')
        
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              status.installed = true
              
              if (navigator.serviceWorker.controller) {
                // New service worker available
                console.log('✅ PWA: New service worker installed, reload recommended')
                showUpdateAvailableToast()
              } else {
                // First installation
                console.log('✅ PWA: Service worker installed for the first time')
                status.activated = true
              }
            }
          })
        }
      })

      // Check if service worker is active
      if (registration.active) {
        status.activated = true
        console.log('✅ PWA: Service worker is active')
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

      console.log('✅ PWA: Service worker registered successfully')
      return status

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      status.error = errorMsg
      console.error('❌ PWA: Service worker registration failed:', errorMsg)
      return status
    }
  } else {
    console.warn('⚠️ PWA: Service workers not supported in this browser')
    return status
  }
}

/**
 * Handle messages from the service worker
 */
function handleServiceWorkerMessage(event: MessageEvent) {
  const { type, payload } = event.data

  switch (type) {
    case 'CACHE_UPDATED':
      console.log('💾 PWA: Cache updated for:', payload.url)
      break
      
    case 'OFFLINE_FALLBACK':
      console.log('📱 PWA: Serving offline fallback for:', payload.url)
      showOfflineToast()
      break
      
    case 'BACKGROUND_SYNC':
      console.log('🔄 PWA: Background sync completed:', payload.tag)
      break
      
    default:
      console.log('📨 PWA: Message from service worker:', event.data)
  }
}

/**
 * Check if the app can be installed as a PWA
 */
export function setupPWAInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    let deferredPrompt: PWAInstallPrompt | null = null

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📲 PWA: Install prompt available')
      
      // Prevent the mini-infobar from appearing
      e.preventDefault()
      
      // Store the event for later use
      deferredPrompt = e as PWAInstallPrompt
      
      // Show install button
      showInstallButton(deferredPrompt)
      resolve(true)
    })

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA: App was installed successfully')
      deferredPrompt = null
      hideInstallButton()
    })

    // Fallback - if no install prompt after 3 seconds, assume not installable
    setTimeout(() => {
      if (!deferredPrompt) {
        resolve(false)
      }
    }, 3000)
  })
}

/**
 * Trigger PWA install prompt
 */
export async function triggerPWAInstall(deferredPrompt: PWAInstallPrompt): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('⚠️ PWA: No install prompt available')
    return false
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for user's choice
    const { outcome } = await deferredPrompt.userChoice

    console.log(`📲 PWA: User ${outcome} the install prompt`)
    
    return outcome === 'accepted'

  } catch (error) {
    console.error('❌ PWA: Install prompt failed:', error)
    return false
  }
}

/**
 * Check if the app is running as an installed PWA
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Check for PWA display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  // Check for iOS PWA
  const isIOSPWA = 'standalone' in (window.navigator as any) && (window.navigator as any).standalone
  
  // Check for Android PWA
  const isAndroidPWA = document.referrer.includes('android-app://')

  return isStandalone || isIOSPWA || isAndroidPWA
}

/**
 * Request notification permissions for medication reminders
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('⚠️ PWA: Notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    console.log('✅ PWA: Notification permission already granted')
    return 'granted'
  }

  try {
    console.log('🔔 PWA: Requesting notification permission...')
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      console.log('✅ PWA: Notification permission granted')
    } else {
      console.log('❌ PWA: Notification permission denied')
    }

    return permission

  } catch (error) {
    console.error('❌ PWA: Failed to request notification permission:', error)
    return 'denied'
  }
}

/**
 * Show a local notification (for testing or immediate notifications)
 */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'prima-notification',
      ...options
    })
  } else {
    console.warn('⚠️ PWA: Cannot show notification - permission not granted')
  }
}

/**
 * Initialize PWA features on app load
 */
export async function initializePWA() {
  console.log('🚀 PWA: Initializing PRIMA healthcare PWA features...')

  try {
    // Register service worker
    const swStatus = await registerServiceWorker()
    
    // Setup install prompt
    const canInstall = await setupPWAInstallPrompt()
    
    // Request notification permission if not already granted
    await requestNotificationPermission()
    
    // Log PWA status
    console.log('📊 PWA Status:', {
      serviceWorker: swStatus,
      installable: canInstall,
      installed: isPWAInstalled(),
      notifications: Notification.permission
    })

    // Show PWA features are ready
    if (swStatus.activated) {
      console.log('✅ PWA: PRIMA healthcare app is ready for offline use!')
    }

  } catch (error) {
    console.error('❌ PWA: Initialization failed:', error)
  }
}

/**
 * UI Helper functions (to be implemented based on your toast system)
 */
function showUpdateAvailableToast() {
  // Implementation depends on your toast system (sonner, react-hot-toast, etc.)
  console.log('🔄 PWA: Update available - showing toast to user')
  
  // You can implement this with your existing toast system
  // toast.info('Update tersedia', { 
  //   description: 'Versi baru aplikasi tersedia. Refresh untuk memperbarui.',
  //   action: { label: 'Refresh', onClick: () => window.location.reload() }
  // })
}

function showOfflineToast() {
  console.log('📱 PWA: Showing offline mode notification')
  
  // toast.warning('Mode Offline', {
  //   description: 'Anda sedang offline. Beberapa fitur mungkin terbatas.'
  // })
}

function showInstallButton(deferredPrompt: PWAInstallPrompt) {
  console.log('📲 PWA: Showing install button')
  
  // You can show an install button in your UI
  // This would typically involve updating some state to show an install prompt
}

function hideInstallButton() {
  console.log('📲 PWA: Hiding install button')
  
  // Hide the install button after successful installation
}

/**
 * Check network connectivity
 */
export function getNetworkStatus() {
  if (typeof window === 'undefined') {
    return { online: true, effectiveType: 'unknown' }
  }

  return {
    online: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType || 'unknown'
  }
}

/**
 * Listen for network status changes
 */
export function listenToNetworkChanges(callback: (online: boolean) => void) {
  if (typeof window === 'undefined') return

  const handleOnline = () => {
    console.log('🌐 PWA: Back online')
    callback(true)
  }

  const handleOffline = () => {
    console.log('📱 PWA: Gone offline')
    callback(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}