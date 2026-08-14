/* ═══════════════════════════════════════════════════════════════════════════
   IBI News — service worker (v7.0.0)

   Strategy
   ────────
   • Navigations (the HTML shell): NETWORK FIRST. News must never be served from
     a stale shell; the cache is only the offline lifeboat.
   • Same-origin static assets (logo, icons, manifest): STALE-WHILE-REVALIDATE.
   • Everything cross-origin (the RSS proxy, AI provider APIs, publisher images):
     NOT TOUCHED. Caching the proxy would freeze the news; caching AI POSTs is
     impossible anyway. Those requests fall through to the network untouched.

   ⚠ PRECACHE USES cache:'reload'. A plain cache.addAll() goes through the
   browser's HTTP cache, which happily hands back the PREVIOUS build's files —
   shipping old JS under a new version badge. Always bypass the HTTP cache here.
   ═══════════════════════════════════════════════════════════════════════════ */

const VERSION     = 'v7.0.0';
const SHELL_CACHE = 'ibinews-shell-' + VERSION;
const ASSET_CACHE = 'ibinews-assets-' + VERSION;
const OFFLINE_URL = './index.html';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './ibi-logo.jpg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // cache:'reload' — force each file to come from the network, not the
    // browser's HTTP cache (see the warning above).
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const resp = await fetch(new Request(url, { cache: 'reload' }));
        if (resp && resp.ok) await cache.put(url, resp);
      } catch (e) { /* a missing optional asset must not fail the install */ }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('ibinews-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map(k => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

// The page asks for the swap explicitly (its "Update" button) — never silently.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // proxy / APIs / images: hands off

  // 1. Navigations → network first, cached shell as the offline fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          const c = await caches.open(SHELL_CACHE);
          c.put(OFFLINE_URL, preload.clone());
          return preload;
        }
        const fresh = await fetch(req);
        const c = await caches.open(SHELL_CACHE);
        c.put(OFFLINE_URL, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(OFFLINE_URL) || await caches.match('./');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 2. Same-origin assets → stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(resp => {
      if (resp && resp.ok && resp.type === 'basic') cache.put(req, resp.clone());
      return resp;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
