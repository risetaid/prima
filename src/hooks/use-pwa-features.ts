import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface PWAInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAFeatures {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isSupported: boolean;
  installPrompt: PWAInstallPrompt | null;
}

interface BackgroundSyncStatus {
  isSupported: boolean;
  isRegistered: boolean;
  pendingRequests: number;
}

interface NotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function usePWAFeatures() {
  const [pwaFeatures, setPwaFeatures] = useState<PWAFeatures>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isSupported: false,
    installPrompt: null,
  });

  const [backgroundSync, setBackgroundSync] = useState<BackgroundSyncStatus>({
    isSupported: false,
    isRegistered: false,
    pendingRequests: 0,
  });

  const [notifications, setNotifications] = useState<NotificationStatus>({
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied',
    isSubscribed: false,
  });

  // Check PWA support and installation status
  useEffect(() => {
    const checkPWASupport = () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      setPwaFeatures(prev => ({
        ...prev,
        isSupported,
        isInstalled,
      }));
    };

    checkPWASupport();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> }) => {
      e.preventDefault();
      setPwaFeatures(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as PWAInstallPrompt,
      }));
      logger.info('PWA install prompt available');
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setPwaFeatures(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
      logger.info('PWA installed successfully');
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setPwaFeatures(prev => ({ ...prev, isOnline: true }));
      logger.info('App is online');
    };

    const handleOffline = () => {
      setPwaFeatures(prev => ({ ...prev, isOnline: false }));
      logger.info('App is offline');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check background sync support
  useEffect(() => {
    const checkBackgroundSync = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Type assertion for sync API since it's not in default types
          const syncManager = (registration as ServiceWorkerRegistration & { sync: { getTags(): Promise<string[]> } }).sync;
          const tags = await syncManager.getTags();
          
          setBackgroundSync({
            isSupported: true,
            isRegistered: tags.includes('background-sync'),
            pendingRequests: 0, // This would need to be fetched from IndexedDB
          });
        } catch (error) {
          logger.error('Background sync check failed', error as Error);
          setBackgroundSync({
            isSupported: false,
            isRegistered: false,
            pendingRequests: 0,
          });
        }
      }
    };

    checkBackgroundSync();
  }, []);

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!pwaFeatures.installPrompt) {
      logger.warn('No install prompt available');
      return false;
    }

    try {
      await pwaFeatures.installPrompt.prompt();
      const choiceResult = await pwaFeatures.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        logger.info('User accepted PWA installation');
        setPwaFeatures(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      } else {
        logger.info('User dismissed PWA installation');
        return false;
      }
    } catch (error) {
      logger.error('PWA installation failed', error as Error);
      return false;
    }
  }, [pwaFeatures.installPrompt]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!notifications.isSupported) {
      logger.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifications(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        logger.info('Notification permission granted');
        return true;
      } else {
        logger.info('Notification permission denied');
        return false;
      }
    } catch (error) {
      logger.error('Notification permission request failed', error as Error);
      return false;
    }
  }, [notifications.isSupported]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!notifications.isSupported || notifications.permission !== 'granted') {
      logger.warn('Cannot subscribe to push notifications');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setNotifications(prev => ({ ...prev, isSubscribed: true }));
        logger.info('Push subscription successful');
        return true;
      } else {
        logger.error('Push subscription server error');
        return false;
      }
    } catch (error) {
      logger.error('Push subscription failed', error as Error);
      return false;
    }
  }, [notifications.isSupported, notifications.permission]);

  // Register background sync
  const registerBackgroundSync = useCallback(async (tag: string = 'background-sync') => {
    if (!backgroundSync.isSupported) {
      logger.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion for sync API since it's not in default types
      const syncManager = (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync;
      await syncManager.register(tag);
      
      setBackgroundSync(prev => ({ ...prev, isRegistered: true }));
      logger.info('Background sync registered');
      return true;
    } catch (error) {
      logger.error('Background sync registration failed', error as Error);
      return false;
    }
  }, [backgroundSync.isSupported]);

  // Send message to service worker
  const sendMessageToSW = useCallback(async (message: Record<string, unknown>) => {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage(message);
      } else {
        logger.warn('No active service worker found');
      }
    } catch (error) {
      logger.error('Failed to send message to service worker', error as Error);
    }
  }, []);

  // Get cache status from service worker
  const getCacheStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) return null;

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };

        if (registration.active) {
          registration.active.postMessage(
            { type: 'GET_CACHE_STATUS' },
            [messageChannel.port2]
          );
        } else {
          resolve(null);
        }

        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);
      });
    } catch (error) {
      logger.error('Failed to get cache status', error as Error);
      return null;
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    if (!('caches' in window)) {
      logger.warn('Cache API not supported');
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to clear cache', error as Error);
      return false;
    }
  }, []);

  return {
    // State
    pwaFeatures,
    backgroundSync,
    notifications,

    // Actions
    installPWA,
    requestNotificationPermission,
    subscribeToPush,
    registerBackgroundSync,
    sendMessageToSW,
    getCacheStatus,
    clearCache,
  };
}

// Hook for offline queue management
export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen for background sync messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC_SUCCESS') {
        logger.info('Background sync successful for:', event.data.url);
        // Update queue size or trigger refresh
        setQueueSize(prev => Math.max(0, prev - 1));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Add request to offline queue
  const addToQueue = useCallback(async () => {
    // This would typically be handled by the service worker
    // Here we just increment the queue size for UI purposes
    setQueueSize(prev => prev + 1);
    logger.info('Request added to offline queue');
  }, []);

  // Process offline queue
  const processQueue = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    setIsProcessing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion for sync API since it's not in default types
      const syncManager = (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync;
      await syncManager.register('background-sync');
      logger.info('Background sync triggered');
    } catch (error) {
      logger.error('Failed to process offline queue', error as Error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    queueSize,
    isProcessing,
    addToQueue,
    processQueue,
  };
}

// Hook for PWA update management
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      logger.info('New service worker activated');
      window.location.reload();
    };

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              logger.info('New app version available');
            }
          });
        });

        // Check for updates
        registration.update();
      } catch (error) {
        logger.error('Update check failed', error as Error);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!updateAvailable) return;

    setIsUpdating(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      logger.error('Failed to apply update', error as Error);
      setIsUpdating(false);
    }
  }, [updateAvailable]);

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
  };
}
