const CACHE_NAME = "pool-villas-bangsaen-v1";
const APP_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/brand-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const PRIVATE_PATHS = ["/admin", "/auth", "/sign-in", "/api"];
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "script", "style"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (!CACHEABLE_DESTINATIONS.has(request.destination) && url.pathname !== "/manifest.webmanifest") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const updateCache = () => fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      });
      if (!cached) return updateCache();
      event.waitUntil(updateCache().then(() => undefined).catch(() => undefined));
      return cached;
    }),
  );
});
