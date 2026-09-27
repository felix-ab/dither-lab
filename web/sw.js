/* Dither Lab service worker — network-first for the app's own files, cache as the offline fallback.
   Once installed, the app opens even when the local server isn't running. Bump VERSION on release. */
const VERSION = "dither-lab-2.1.0";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css?v=2.1.0",
  "./js/util.js?v=2.1.0",
  "./js/engine.js?v=2.1.0",
  "./js/gl.js?v=2.1.0",
  "./js/export.js?v=2.1.0",
  "./js/ui.js?v=2.1.0",
  "./js/app.js?v=2.1.0",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dither-lab-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
