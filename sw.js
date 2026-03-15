const CACHE_NAME = "sofia-boutique-cache-v2";
const urlsToCache = [
  "/",
  "/index.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Сразу активируем новый SW
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  // Удаляем старые версии кэша
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Сразу берем контроль над клиентами
  );
});

// Стратегия Network First, фоллбек на Cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Если запрос успешен и это нужный нам ресурс (например, html), можем кэшировать его
        if (event.request.method === "GET") {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});