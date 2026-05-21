/* Service Worker — Mentor Financiero PWA */
const CACHE = 'mentor-financiero-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './forms.js',
  './sync.js',
  './firebase-config.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
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
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // IMPORTANTE: solo manejamos recursos de la propia app.
  // Las peticiones a Firebase (firestore, auth, gstatic) deben pasar
  // directo a la red para que la sincronización en tiempo real funcione.
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => cached);
    })
  );
});
