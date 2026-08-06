const CACHE = "mycar-plus-v6-12";
const APP_SHELL = [
  "./", "index.html", "styles.css", "report-manager.js", "indicator-calculations.js", "app.js",
  "mycarplus-db.js", "cloud.js", "ai-logic.js", "firebase-config.js", "jszip.min.js",
  "manifest.webmanifest", "icon-32.png", "icon-180.png", "icon-192.png", "icon-512.png",
  "desenvolvedor.png", "about-logo.png", "data/MyCarPlus.xlsx",
];
const NETWORK_FIRST = [
  "/index.html", "/styles.css", "/report-manager.js", "/indicator-calculations.js", "/app.js",
  "/mycarplus-db.js", "/cloud.js", "/ai-logic.js", "/firebase-config.js", "/manifest.webmanifest",
  "/data/MyCarPlus.xlsx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((name) => name !== CACHE).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

async function networkFirst(request, fallbackKey = null) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (fallbackKey ? await cache.match(fallbackKey) : undefined) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "index.html"));
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.includes("/firebasejs/12.16.0/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  event.respondWith(NETWORK_FIRST.some((suffix) => path.endsWith(suffix)) ? networkFirst(event.request) : cacheFirst(event.request));
});
