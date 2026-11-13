const CACHE_NAME = 'tamascottchi-shell-v2-2';
const CORE = [
  './', './manifest.webmanifest', './wuschel-mark.svg',
  './assets/characters/scottchi-default.png',
  './assets/characters/scottchi-happy.png',
  './assets/characters/scottchi-hungry.png',
  './assets/characters/scottchi-tired.png',
  './assets/characters/scottchi-dirty.png',
  './assets/characters/scottchi-sad.png',
  './assets/characters/scottchi-excited.png',
  './assets/backgrounds/livingroom.webp',
  './assets/backgrounds/bathroom.webp',
  './assets/backgrounds/bedroom.webp',
  './assets/backgrounds/playroom.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('tamascottchi-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('./', response.clone());
      }
      return response;
    }).catch(async () => (await caches.match('./')) || Response.error()));
    return;
  }
  if (!['image', 'script', 'style', 'font', 'manifest'].includes(request.destination)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })));
});
