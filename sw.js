const CACHE_VERSION = 'v10';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const PRECACHE = `precache-${CACHE_VERSION}`;

// Предкешируем «оболочку» приложения
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => {
        if (![PRECACHE, RUNTIME_CACHE].includes(key)) return caches.delete(key);
      }));
      await self.clients.claim();
      // Принудительно обновляем все клиенты
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })()
  );
});

// Стратегии кэширования
function isHtmlRequest(request){
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Для навигации: сначала сеть, затем кэш с фолбэком на index.html
  if (isHtmlRequest(request)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        return response;
      } catch {
        const cache = await caches.open(PRECACHE);
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Для статических файлов: сначала кэш, потом сеть с докешированием
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    } catch {
      // Нет сети и нет в кэше
      return Response.error();
    }
  })());
});


