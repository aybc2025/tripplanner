// sw.js - Service Worker for Offline Support
const CACHE_NAME = 'trip-planner-v1.0.0';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Files to cache for offline use
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles/base.css',
    './scripts/app.js',
    './scripts/db.js',
    './scripts/calendar.js',
    './scripts/dnd.js',
    './scripts/pwa.js',
    './manifest.webmanifest',
    './assets/icon-192x192.png',
    './assets/icon-512x512.png'
];

// Dynamic assets that will be cached on first request
const DYNAMIC_ASSETS_PATTERNS = [
    /\/assets\//,
    /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/,
    /\.(?:woff|woff2|ttf|eot)$/
];

// Network-first assets (always try network first)
const NETWORK_FIRST_PATTERNS = [
    /api\//,
    /\/share\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (cacheName.startsWith('trip-planner-') && 
                            cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim(); // Take control of all pages
            })
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests (different origin)
    if (url.origin !== location.origin) {
        return;
    }
    
    // Choose caching strategy based on request
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        // Network first (for API calls, shared links)
        event.respondWith(networkFirstStrategy(request));
    } else if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
        // Cache first (for static assets)
        event.respondWith(cacheFirstStrategy(request));
    } else if (DYNAMIC_ASSETS_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        // Stale while revalidate (for images, fonts)
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else {
        // Default: network with cache fallback
        event.respondWith(networkWithCacheFallbackStrategy(request));
    }
});

// Caching strategies
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        
        // Try to return cached version as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('./');
        }
        
        throw error;
    }
}

async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network request failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkResponsePromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('Network request failed:', error);
        });
    
    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || networkResponsePromise;
}

async function networkWithCacheFallbackStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // For navigation requests, return the main page
        if (request.mode === 'navigate') {
            return caches.match('./');
        }
        
        throw error;
    }
}

// Background sync (when supported)
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'trip-data-sync') {
        event.waitUntil(syncTripData());
    }
});

async function syncTripData() {
    try {
        console.log('Syncing trip data in background...');
        
        // This would integrate with your chosen backend (Firebase/Supabase)
        // For now, we'll just simulate the sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Background sync completed');
        
        // Notify the app about successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED',
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        console.error('Background sync failed:', error);
        
        // Notify the app about sync failure
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }
}

// Push notifications (when supported)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/assets/icon-192x192.png',
                badge: '/assets/icon-192x192.png',
                data: data.data,
                actions: data.actions || [],
                requireInteraction: false,
                silent: false
            })
        );
    } catch (error) {
        console.error('Failed to show push notification:', error);
    }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.notification.data);
    
    event.notification.close();
    
    // Handle notification actions
    if (event.action) {
        console.log('Notification action clicked:', event.action);
    }
    
    // Open or focus the app
    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then((clients) => {
                // Check if app is already open
                for (const client of clients) {
                    if (client.url.includes(self.registration.scope)) {
                        return client.focus();
                    }
                }
                
                // Open new window if app is not open
                return self.clients.openWindow('/');
            })
    );
});

// Message handling from main app
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    }
    
    if (event.data && event.data.type === 'SYNC_REQUEST') {
        // Register background sync
        if (self.registration.sync) {
            self.registration.sync.register('trip-data-sync');
        }
    }
});

// Cache management utilities
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => {
                if (cacheName.startsWith('trip-planner-')) {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
        
        console.log('All caches cleared');
        
        // Notify app
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'CACHE_CLEARED',
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        console.error('Failed to clear caches:', error);
    }
}

// Cache size management
async function manageCacheSize() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const requests = await cache.keys();
        
        // If cache is getting large, remove oldest entries
        if (requests.length > 100) {
            console.log('Dynamic cache is large, cleaning up...');
            
            // Remove oldest 20 entries
            const toDelete = requests.slice(0, 20);
            await Promise.all(toDelete.map(request => cache.delete(request)));
            
            console.log(`Removed ${toDelete.length} old cache entries`);
        }
    } catch (error) {
        console.error('Cache management failed:', error);
    }
}

// Periodic cache cleanup
setInterval(manageCacheSize, 60000); // Every minute

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

// Update detection
self.addEventListener('activate', (event) => {
    // Check if this is a new version
    event.waitUntil(
        self.clients.matchAll()
            .then((clients) => {
                if (clients.length > 0) {
                    // Notify all clients that an update is available
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'UPDATE_AVAILABLE',
                            version: CACHE_NAME,
                            timestamp: new Date().toISOString()
                        });
                    });
                }
            })
    );
});

// Utility functions
function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

function isStaticAsset(url) {
    return STATIC_ASSETS.includes(url.pathname) || 
           DYNAMIC_ASSETS_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function shouldCacheRequest(request) {
    const url = new URL(request.url);
    
    // Don't cache if URL has cache-busting parameters
    if (url.searchParams.has('no-cache') || url.searchParams.has('bust')) {
        return false;
    }
    
    // Don't cache if request has no-cache headers
    if (request.headers.get('cache-control') === 'no-cache') {
        return false;
    }
    
    return true;
}

// Performance monitoring
let performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    errors: 0
};

function recordCacheHit() {
    performanceMetrics.cacheHits++;
}

function recordCacheMiss() {
    performanceMetrics.cacheMisses++;
}

function recordNetworkRequest() {
    performanceMetrics.networkRequests++;
}

function recordError() {
    performanceMetrics.errors++;
}

// Send performance metrics to app periodically
setInterval(() => {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'PERFORMANCE_METRICS',
                metrics: { ...performanceMetrics },
                timestamp: new Date().toISOString()
            });
        });
    });
    
    // Reset metrics
    performanceMetrics = {
        cacheHits: 0,
        cacheMisses: 0,
        networkRequests: 0,
        errors: 0
    };
}, 60000); // Every minute

console.log('Service Worker script loaded');

// Debug logging
const DEBUG = true;

function debugLog(message, ...args) {
    if (DEBUG) {
        console.log(`[SW] ${message}`, ...args);
    }
}

// Enhanced error handling with retry logic
async function fetchWithRetry(request, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(request);
            
            if (response.ok) {
                return response;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            lastError = error;
            debugLog(`Fetch attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    
    throw lastError;
}

// Selective cache invalidation
async function invalidateCachePattern(pattern) {
    try {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
            if (cacheName.startsWith('trip-planner-')) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                
                for (const request of requests) {
                    const url = new URL(request.url);
                    if (pattern.test(url.pathname)) {
                        await cache.delete(request);
                        debugLog('Invalidated cache entry:', url.pathname);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Cache invalidation failed:', error);
    }
  }
