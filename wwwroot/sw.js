const CACHE_NAME = "moneybook-cache-v2";
const CACHE_FILES = [
  "./",
  "B3232161_彭程_Web_Week18.html",
  "manifest.json",
  "moneybook-icon.svg",
  "moneybook-icon-192.png",
  "moneybook-icon-512.png",
  "lib/bootstrap/dist/css/bootstrap.min.css",
  "lib/bootstrap/dist/js/bootstrap.bundle.min.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      return cachedResponse || fetch(event.request);
    })
  );
});
