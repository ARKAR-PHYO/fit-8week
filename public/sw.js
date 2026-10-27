/*
 * Service worker for the 8-Week Plan PWA.
 *
 *  - /_next/static/* (hashed build files), icons and dish photos: cache-first.
 *  - Page loads and in-app navigations: network-first; a successful response is cached,
 *    so pages you've opened before still load offline. Falls back to /offline.html.
 *  - /api/*: never cached here. Personal data is cached by the app in IndexedDB, and
 *    writes go through the app's own offline queue.
 *  - Redirects (e.g. to /login when signed out) are never cached.
 */
const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isCacheablePage(response) {
  return response && response.ok && !response.redirected && response.type === "basic";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/meals/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok && !res.redirected) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isRsc = request.headers.get("RSC") === "1";
  if (!isNavigation && !isRsc) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (isCacheablePage(res)) {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request, { ignoreVary: true });
        if (hit) return hit;
        if (isNavigation) return (await caches.match(OFFLINE_URL)) || Response.error();
        return Response.error();
      }),
  );
});
