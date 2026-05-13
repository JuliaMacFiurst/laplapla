const CACHE_NAME = "laplapla-pwa-v1";
const APP_SHELL_ASSETS = [
  "/",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/favicon_io/site.webmanifest",
  "/favicon_io/android-chrome-192x192.webp",
  "/favicon_io/android-chrome-512x512.webp",
  "/laplapla-logo.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.destination && request.destination !== "document") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => undefined);
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
