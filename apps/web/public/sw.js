/* Minimal StageSync PWA service worker — network-first for navigations; cache shell assets.
 * CACHE name is stamped at build time with uiHash prefix (emit-ui-meta.mjs).
 * Never cache /api, /ws, or /downloads (APK / ui-bundle). */
const CACHE = "stagesync-pwa-v1";
const PRECACHE = ["/", "/client", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API / WS / APK downloads.
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.startsWith("/downloads")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        void caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
  );
});

/* #810 — WebPush / local show from push events */
self.addEventListener("push", (event) => {
  let title = "StageSync";
  let body = "Nowe powiadomienie";
  let path = "/client";
  let channel = "announcements";
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data === "object") {
      if (typeof data.title === "string") title = data.title;
      if (typeof data.body === "string") body = data.body;
      if (typeof data.path === "string") path = data.path;
      if (typeof data.channel === "string") channel = data.channel;
    } else if (event.data) {
      body = event.data.text();
    }
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: channel,
      data: { path },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    event.notification.data && typeof event.notification.data.path === "string"
      ? event.notification.data.path
      : "/client";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          void client.navigate?.(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
