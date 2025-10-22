const CACHE_VERSION = 'v61';
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const PRECACHE = `precache-${CACHE_VERSION}`;

// Предкешируем «оболочку» приложения
const ASSETS = [
  '/pwa-app/',
  '/pwa-app/index.html',
  '/pwa-app/styles.css',
  '/pwa-app/app.js',
  '/pwa-app/manifest.webmanifest',
  '/pwa-app/assets/icons/icon.svg'
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
      
      // Дополнительная проверка через 1 секунду
      setTimeout(async () => {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'FORCE_RELOAD' });
        });
      }, 1000);
    })()
  );
});

// Слушаем сообщения от клиентов
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  
  if (msg.type === 'SKIP_WAITING') {
    console.log('SW: Получена команда SKIP_WAITING');
    self.skipWaiting();
    return;
  }
  
  if (msg.type === 'CHECK_UPDATE') {
    console.log('SW: Принудительное обновление кэша');
    // Принудительно обновляем кэш предзагруженных ресурсов
    event.waitUntil(
      caches.open(PRECACHE).then(cache => {
        // Очищаем старый кэш и загружаем новый
        return cache.addAll(ASSETS);
      })
    );
  }
  
  if (msg.type === 'FORCE_UPDATE') {
    console.log('SW: Принудительное обновление всех ресурсов');
    event.waitUntil(
      (async () => {
        // Очищаем все кэши
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        // Создаем новый кэш с обновленными ресурсами
        const newCache = await caches.open(PRECACHE);
        await newCache.addAll(ASSETS);
        
        // Уведомляем всех клиентов об обновлении
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_UPDATED' });
        });
      })()
    );
  }
});

// Стратегии кэширования
function isHtmlRequest(request){
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Для навигации: агрессивно обновляем из сети
  if (isHtmlRequest(request)) {
    event.respondWith((async () => {
      try {
        // Всегда пытаемся получить свежую версию из сети
        const response = await fetch(request, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        // Обновляем кэш с новой версией
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        
        console.log('SW: Обновлен HTML из сети');
        return response;
      } catch {
        console.log('SW: Используем кэшированную версию HTML');
        const cache = await caches.open(PRECACHE);
        return (await cache.match('/pwa-app/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Для статических файлов: проверяем, внешний ли это ресурс
  event.respondWith((async () => {
    const isExternalResource = !request.url.startsWith(self.location.origin);
    
    if (isExternalResource) {
      // Для внешних ресурсов используем стандартную стратегию кэширования
      const cached = await caches.match(request);
      if (cached) {
        console.log('SW: Используем кэшированную версию внешнего ресурса:', request.url);
        return cached;
      }
      
      try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        console.log('SW: Кэширован внешний ресурс:', request.url);
        return response;
      } catch {
        console.log('SW: Ошибка загрузки внешнего ресурса:', request.url);
        return Response.error();
      }
    } else {
      // Для внутренних ресурсов используем агрессивное обновление
      try {
        const response = await fetch(request, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        // Обновляем кэш с новой версией
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        
        console.log('SW: Обновлен внутренний файл из сети:', request.url);
        return response;
      } catch {
        // Если нет сети, используем кэшированную версию
        const cached = await caches.match(request);
        if (cached) {
          console.log('SW: Используем кэшированную версию внутреннего файла:', request.url);
          return cached;
        }
        
        // Нет сети и нет в кэше
        console.log('SW: Нет кэшированной версии внутреннего файла:', request.url);
        return Response.error();
      }
    }
  })());
});


