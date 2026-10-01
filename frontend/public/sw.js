// hdash service worker: offline fallback + Web Push.

const CACHE = 'hdash-v3';

const PRECACHE = [
  '/offline.html',
];

// Install — precache offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Only page loads are intercepted: network first, the precached offline.html when
// there's no connection. Nothing else is cached here. Pages are live data anyway,
// hashed _next/static assets are already immutable in the HTTP cache, and serving
// them cache-first from here caused intermittent hydration errors (React #418).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Page loads — network, then the offline page
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  }
});

// ─── Web Push ───────────────────────────────────────────────

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }
    const title = data.title || "hdash";
    const options = {
        body: data.body || "",
        tag: data.url || "hdash",
        data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
            for (const c of wins) {
                if (c.url.includes(target) && "focus" in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(target);
        })
    );
});
