// BreachBuddy Service Worker
// Provides offline support, caching, push notifications, and background sync

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `breachbuddy-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `breachbuddy-data-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/signup',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes that should be cached with Network First strategy
const API_CACHE_ROUTES = [
  '/api/compliance/dashboard',
  '/api/compliance/frameworks',
  '/api/compliance/requirements',
  '/api/compliance/audit-logs',
  '/api/automation/rules',
  '/api/policies/list',
];

// Routes that should always fetch from network (no cache)
const NETWORK_ONLY_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/2fa',
  '/api/privacy/delete',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-only routes
  if (NETWORK_ONLY_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(fetch(request));
    return;
  }

  // API routes - Network First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache First with Network Fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache First failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Network First Strategy - for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your internet connection.',
        cached: false,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Background Sync - for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'sync-control-tests') {
    event.waitUntil(syncControlTests());
  } else if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  } else if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

// Sync pending assessments
async function syncAssessments() {
  try {
    const db = await openDatabase();
    const pendingAssessments = await getPendingItems(db, 'assessments');

    for (const assessment of pendingAssessments) {
      try {
        const response = await fetch(`/api/compliance/requirements/${assessment.requirementId}/assess`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${assessment.token}`,
          },
          body: JSON.stringify(assessment.data),
        });

        if (response.ok) {
          await removeFromDatabase(db, 'assessments', assessment.id);
          await notifyClient('Assessment synced successfully');
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync assessment:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync assessments failed:', error);
  }
}

// Sync pending control tests
async function syncControlTests() {
  try {
    const db = await openDatabase();
    const pendingTests = await getPendingItems(db, 'controlTests');

    for (const test of pendingTests) {
      try {
        const response = await fetch(`/api/compliance/controls/${test.controlId}/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${test.token}`,
          },
          body: JSON.stringify(test.data),
        });

        if (response.ok) {
          await removeFromDatabase(db, 'controlTests', test.id);
          await notifyClient('Control test synced successfully');
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync control test:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync control tests failed:', error);
  }
}

// Sync pending comments
async function syncComments() {
  try {
    const db = await openDatabase();
    const pendingComments = await getPendingItems(db, 'comments');

    for (const comment of pendingComments) {
      try {
        const response = await fetch(`/api/collaboration/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${comment.token}`,
          },
          body: JSON.stringify(comment.data),
        });

        if (response.ok) {
          await removeFromDatabase(db, 'comments', comment.id);
          await notifyClient('Comment synced successfully');
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync comment:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync comments failed:', error);
  }
}

// Sync pending reports
async function syncReports() {
  try {
    const db = await openDatabase();
    const pendingReports = await getPendingItems(db, 'reports');

    for (const report of pendingReports) {
      try {
        const response = await fetch(`/api/compliance/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${report.token}`,
          },
          body: JSON.stringify(report.data),
        });

        if (response.ok) {
          await removeFromDatabase(db, 'reports', report.id);
          await notifyClient('Report synced successfully');
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync reports failed:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let notificationData = {
    title: 'BreachBuddy Alert',
    body: 'You have a new security notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    requireInteraction: false,
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {},
        actions: payload.actions || [],
        vibrate: payload.vibrate || [200, 100, 200],
      };
    } catch (error) {
      console.error('[Service Worker] Failed to parse push notification:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification action click (for actionable notifications)
self.addEventListener('notificationclick', (event) => {
  if (event.action) {
    console.log('[Service Worker] Notification action clicked:', event.action);
    
    event.notification.close();

    const actionHandlers = {
      'view-threat': '/dashboard?tab=threats',
      'investigate': '/dashboard?tab=threats&action=investigate',
      'resolve': '/dashboard?tab=threats&action=resolve',
      'view-compliance': '/dashboard?tab=compliance',
      'view-automation': '/dashboard?tab=automation',
    };

    const urlToOpen = actionHandlers[event.action] || '/dashboard';

    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              return client.focus().then(() => client.navigate(urlToOpen));
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Message handler for communication with client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// IndexedDB helpers for background sync
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BreachBuddyDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

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

function getPendingItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeFromDatabase(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Notify all clients
async function notifyClient(message) {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      message: message,
    });
  });
}

console.log('[Service Worker] Loaded successfully');
