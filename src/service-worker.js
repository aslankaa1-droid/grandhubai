/* GrandHubAi Service Worker
 * Copyright © 2026 Кагиров Абдул-Хаким Ахмадович
 * Licensed under AGPL-3.0
 *
 * Стратегия: cache-first для статики, network-only для API.
 */
const CACHE_NAME = 'grandhubai-v1.6.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './pricing.html',
  './manifest.json',
  './prompts/_all.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Add individually to skip 404s without breaking install
      Promise.all(STATIC_ASSETS.map((url) =>
        cache.add(url).catch((e) => console.warn('SW: skip', url, e.message))
      ))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Не кэшируем API провайдеров
  if (url.hostname.includes('groq.com') ||
      url.hostname.includes('openrouter.ai') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('localhost')) {
    return; // bypass — network only
  }
  // Cache-first для остального
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }))
    )
  );
});
