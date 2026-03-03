// Service Worker Registration and Management
// Handles service worker lifecycle, updates, and communication

export interface ServiceWorkerStatus {
  registered: boolean;
  installing: boolean;
  waiting: boolean;
  active: boolean;
  error: string | null;
}

/**
 * Register the service worker
 * @returns Promise with registration object
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('[SW] Service Worker registered:', registration.scope);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[SW] New service worker available');
          notifyUpdate();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service Worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const status: ServiceWorkerStatus = {
    registered: false,
    installing: false,
    waiting: false,
    active: false,
    error: null,
  };

  if (!('serviceWorker' in navigator)) {
    status.error = 'Service Worker not supported';
    return status;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      status.registered = true;
      status.installing = !!registration.installing;
      status.waiting = !!registration.waiting;
      status.active = !!registration.active;
    }

    return status;
  } catch (error: any) {
    status.error = error.message;
    return status;
  }
}

/**
 * Update service worker immediately
 */
export async function updateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      
      // Skip waiting and activate new service worker
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (error) {
    console.error('[SW] Service Worker update failed:', error);
  }
}

/**
 * Clear all caches
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }

    // Also clear caches directly
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    console.log('[SW] Caches cleared');
  } catch (error) {
    console.error('[SW] Cache clearing failed:', error);
  }
}

/**
 * Cache specific URLs
 */
export async function cacheUrls(urls: string[]): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ 
        type: 'CACHE_URLS',
        urls: urls,
      });
    }
  } catch (error) {
    console.error('[SW] URL caching failed:', error);
  }
}

/**
 * Listen for service worker messages
 */
export function listenForServiceWorkerMessages(
  callback: (message: any) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const messageHandler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', messageHandler);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', messageHandler);
  };
}

/**
 * Check if app is running as PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function listenForConnectivityChanges(
  onlineCallback: () => void,
  offlineCallback: () => void
): () => void {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}

/**
 * Notify user about available update
 */
function notifyUpdate() {
  // This can be customized to show a toast or modal
  if (confirm('A new version of BreachBuddy is available. Reload to update?')) {
    window.location.reload();
  }
}

/**
 * Add item to background sync queue
 */
export async function addToSyncQueue(
  storeName: string,
  data: any,
  token: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.add({
        data: data,
        token: token,
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Register background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(`sync-${storeName}`);
    }

    console.log(`[SW] Added to sync queue: ${storeName}`);
  } catch (error) {
    console.error('[SW] Failed to add to sync queue:', error);
    throw error;
  }
}

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BreachBuddyDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('assessments')) {
        db.createObjectStore('assessments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('controlTests')) {
        db.createObjectStore('controlTests', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('comments')) {
        db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Get pending sync items count
 */
export async function getPendingSyncCount(): Promise<{
  assessments: number;
  controlTests: number;
  comments: number;
  reports: number;
  total: number;
}> {
  try {
    const db = await openDatabase();
    
    const counts = {
      assessments: await getStoreCount(db, 'assessments'),
      controlTests: await getStoreCount(db, 'controlTests'),
      comments: await getStoreCount(db, 'comments'),
      reports: await getStoreCount(db, 'reports'),
      total: 0,
    };

    counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0) - counts.total;
    
    return counts;
  } catch (error) {
    console.error('[SW] Failed to get pending sync count:', error);
    return { assessments: 0, controlTests: 0, comments: 0, reports: 0, total: 0 };
  }
}

function getStoreCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
