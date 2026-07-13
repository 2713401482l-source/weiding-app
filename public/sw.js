const CACHE_NAME = "baijing-shell-v4";
const BASE = new URL("./", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([BASE, `${BASE}manifest.webmanifest`])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Media metadata and seeking rely on byte ranges. A cached partial 206 response
  // is not a valid full-file cache entry and breaks differently across Safari/Chrome.
  if (request.headers.has("range")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(BASE, response.clone()));
      return response;
    }).catch(() => caches.match(BASE)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      if (response.ok && response.status === 200) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(() => cached || new Response("暂时无法连接", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
    return cached || network;
  }));
});
