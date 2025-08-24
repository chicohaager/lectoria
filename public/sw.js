// Lectoria Service Worker for PWA functionality
const CACHE_NAME = 'lectoria-v2.1';
const STATIC_CACHE = 'lectoria-static-v2.1';
const DYNAMIC_CACHE = 'lectoria-dynamic-v2.1';

// Static files to cache immediately
const STATIC_FILES = [
  '/',
  '/app',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/api/books',
  '/api/categories',
  '/api/users'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // Handle static files with cache-first strategy
  if (isStaticFile(url.pathname)) {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }

  // Handle navigation requests with network-first, fallback to app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithFallback(request)
    );
    return;
  }

  // Default: try network first, fallback to cache
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline message for API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline - Keine Internetverbindung verfügbar',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy for static files
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static file:', request.url);
    throw error;
  }
}

// Network-first with app shell fallback for navigation
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving app shell');
    
    // Try to serve the app shell from cache
    const appShell = await caches.match('/app');
    if (appShell) {
      return appShell;
    }
    
    // Fallback to basic offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Lectoria - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .offline { color: #666; }
        </style>
      </head>
      <body>
        <h1>Lectoria</h1>
        <div class="offline">
          <h2>Offline-Modus</h2>
          <p>Keine Internetverbindung verfügbar. Bitte versuchen Sie es später erneut.</p>
          <button onclick="window.location.reload()">Erneut versuchen</button>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Check if a file is static
function isStaticFile(pathname) {
  return pathname.includes('/static/') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.ico') ||
         pathname === '/manifest.json';
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Sync cached data when connection is restored
async function syncData() {
  console.log('[SW] Syncing cached data...');
  
  try {
    // Invalidate dynamic cache to get fresh data
    await caches.delete(DYNAMIC_CACHE);
    console.log('[SW] Dynamic cache cleared for fresh sync');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Lectoria hat neue Updates verfügbar',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/app'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Lectoria', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/app')
  );
});

console.log('[SW] Lectoria Service Worker loaded');