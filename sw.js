// ============================================================
// Sugar Free — sw.js  (Service Worker)
// Cache-first for app shell; pass through GitHub API calls.
// ============================================================

const CACHE_NAME = 'sugarfree-v4';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './backup.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './avatars/avatar-sprout.png',
  './avatars/avatar-sprout-shiny.png',
  './avatars/avatar-crash.png',
  './avatars/avatar-crash-shiny.png',
  './avatars/avatar-jumprope.png',
  './avatars/avatar-jumprope-shiny.png',
  './avatars/avatar-bicep.png',
  './avatars/avatar-bicep-shiny.png',
];

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: remove stale caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-only for GitHub API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always use network for GitHub API calls (backup/restore)
  if (url.hostname === 'api.github.com') return;

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
