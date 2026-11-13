const CACHE_NAME = 'teacher-board-release-b2a529ceb3ed';
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles/board.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './vendor/three.min.js',
  './vendor/OrbitControls.js',
  './vendor/lucide.min.js',
  './src/app.js',
  './src/board-view.js',
  './src/dom-utils.js',
  './src/geom-helpers.js',
  './src/pdf-writer.js',
  './src/scene3d.js',
  './src/sim-runner.js',
  './src/snap-exporter.js',
  './src/snaps.js',
  './src/storage-db.js',
  './src/ui-catalog.js',
  './src/ui-export.js',
  './src/ui-panel.js',
  './src/ui-projects.js',
  './models/catalog-index.js',
  './models/registry.js',
  './models/pyramid-inscribed-sphere.js',
  './models/pyramid-circumscribed-sphere.js',
  './models/cone-inscribed-sphere.js',
  './models/cube-section.js',
  './models/physics/projectile-motion.js',
  './models/physics/impulse-explosion.js',
  './models/physics/gas-burner.js',
  './models/physics/water-waves.js',
  './models/physics/pendulum-oscillations.js',
];

function isHtmlNavigationPath(pathname) {
  return pathname.endsWith('/') || pathname.endsWith('.html') || !/\.[^/]+$/.test(pathname);
}

function isImmutableAsset(pathname) {
  return (
    pathname.includes('/vendor/') ||
    pathname.includes('/icons/') ||
    /\.(?:png|svg|ico|woff2?)$/i.test(pathname)
  );
}

function isValidAssetResponse(pathname, response) {
  if (!response || !response.ok) return false;
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (/\.(?:mjs|js|css|json|webmanifest)$/i.test(pathname) && ct.includes('text/html')) {
    return false;
  }
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          const res = await fetch(url, { cache: 'reload' });
          if (!res.ok) throw new Error(`Precache failed (${res.status}): ${url}`);
          await cache.put(url, res);
        })
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/ca.crt') || url.pathname.endsWith('/setup.html')) return;

  if (request.mode === 'navigate') {
    if (request.destination !== 'document' || !isHtmlNavigationPath(url.pathname)) {
      return;
    }
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(async (res) => {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (res.ok && ct.includes('text/html')) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('./index.html', res.clone());
          }
          return res;
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./')) || Response.error())
    );
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (isValidAssetResponse(url.pathname, response)) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (await caches.match(url.pathname, { ignoreSearch: true })) || Response.error();
        }
      })
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(async (response) => {
        if (isValidAssetResponse(url.pathname, response)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(
        async () =>
          (await caches.match(request)) ||
          (await caches.match(url.pathname, { ignoreSearch: true })) ||
          Response.error()
      )
  );
});
