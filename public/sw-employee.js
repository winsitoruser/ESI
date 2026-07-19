/* Humanify Employee Portal — online-first SW (D-016 / ESS-S4-1)
 * Network first; cache only as shell fallback. No offline mutation queue.
 */
const CACHE = 'humanify-employee-v3';
const PRECACHE = ['/employee', '/employee/login', '/manifest-employee.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (!url.pathname.startsWith('/employee')) return;
  // Never cache API / auth — online only
  if (url.pathname.startsWith('/api') || url.pathname.includes('/auth')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache navigations / shell only (ok HTML-ish)
        if (res.ok && e.request.mode === 'navigate') {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/employee')))
  );
});
