// Minimal service worker: makes the app installable and shows the last app shell when offline.
// It never touches other origins (the database host, fonts), never caches API or photo requests, and always tries the
// network first for pages so a new deploy is picked up straight away.
const CACHE = 'iiitd-market-shell-v1'
const BASE = new URL('./', self.location).pathname // e.g. /iiitd-black-market/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(BASE, { cache: 'reload' }))).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    if (url.pathname.endsWith('.html') && url.pathname !== BASE) return // privacy.html, terms.html: plain network
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === BASE) { const copy = response.clone(); caches.open(CACHE).then((c) => c.put(BASE, copy)) }
          return response
        })
        .catch(() => caches.match(BASE)),
    )
    return
  }
  if (url.pathname.startsWith(BASE + 'assets/')) {
    // Build files have content hashes in their names, so a cached copy is never stale.
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((c) => c.put(request, copy)) }
        return response
      })),
    )
  }
})
