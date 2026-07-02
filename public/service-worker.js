// FARMANESIA-EVO Service Worker
// Provides offline support and caching for the application

const CACHE_NAME = 'farmanesia-cache-v1';
const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/images/offline-image.png';

// Resources to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_PAGE,
  FALLBACK_IMAGE,
  '/images/logo/farmanesia-logo.png',
  '/css/tailwind.css',
  '/js/main.js'
];

// API endpoints to cache with network-first strategy
const API_CACHE_URLS = [
  '/api/tenant-info',
  '/api/inventory/products',
  '/api/pos/stock',
  '/api/customers'
];

// Install event - Pre-cache important resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Pre-caching offline assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          console.log('Service Worker: Cleaning old cache', cacheToDelete);
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - Handle network requests with appropriate strategy
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - Network-first strategy with fallback
  if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
  
  // Assets (CSS, JS, images) - Cache-first strategy
  if (isAssetRequest(url.pathname)) {
    event.respondWith(cacheFirstWithFallback(request));
    return;
  }
  
  // HTML pages - Network-first strategy
  if (isHTMLRequest(request)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
  
  // Default - Network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

// Network-first strategy with fallback for API requests
async function networkFirstWithFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, clone and cache the response
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Return cached response with header indicating it's from cache
      const modifiedResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: cachedResponse.headers
      });
      modifiedResponse.headers.set('X-FARMANESIA-Cache', 'true');
      
      return modifiedResponse;
    }
    
    // If no cached response, return a generic offline API response
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'OFFLINE',
        message: 'You are currently offline. This data is not available without network connection.'
      },
      offline: true
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-FARMANESIA-Offline': 'true'
      }
    });
  }
}

// Cache-first strategy for static assets
async function cacheFirstWithFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Not in cache, get from network
    const networkResponse = await fetch(request);
    
    // Cache the response for future requests
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed and not in cache
    
    // Return fallback image for image requests
    if (request.destination === 'image') {
      return caches.match(FALLBACK_IMAGE);
    }
    
    // Otherwise, just fail gracefully
    return new Response('Not available offline', { status: 503 });
  }
}

// Network-first for HTML with offline fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful response
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, return offline page
    return caches.match(OFFLINE_PAGE);
  }
}

// Standard network with cache fallback
async function networkWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful response
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    return caches.match(request);
  }
}

// Helper functions
function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

function isAssetRequest(pathname) {
  return (
    pathname.startsWith('/css/') ||
    pathname.startsWith('/js/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

function isHTMLRequest(request) {
  return (
    request.headers.get('accept')?.includes('text/html') && 
    !request.url.includes('.')
  );
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'farmanesia-offline-operations') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Process queued operations when back online
async function syncOfflineOperations() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('offlineOperations', 'readwrite');
    const store = tx.objectStore('offlineOperations');
    
    // Get all pending operations
    const operations = await store.getAll();
    
    // Process each operation
    for (const operation of operations) {
      try {
        // Attempt to send the operation to the server
        const response = await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        if (response.ok) {
          // If successful, remove from the queue
          await store.delete(operation.id);
          console.log('Synced offline operation:', operation.id);
        } else {
          console.error('Failed to sync operation:', operation.id, await response.text());
        }
      } catch (error) {
        console.error('Error syncing operation:', operation.id, error);
      }
    }
    
    // Close the database
    db.close();
  } catch (error) {
    console.error('Failed to sync offline operations:', error);
  }
}

// IndexedDB for offline operations
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FarmanesiaOfflineDB', 1);
    
    request.onerror = event => {
      reject('Error opening offline database');
    };
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for offline operations
      if (!db.objectStoreNames.contains('offlineOperations')) {
        const store = db.createObjectStore('offlineOperations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('url', 'url', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}
