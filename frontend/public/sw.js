const CACHE_NAME = 'sailing-score-v1';

// オフライン時に返すフォールバックページ（事前キャッシュ）
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// API ホスト判定
function isApiRequest(url) {
  return (
    url.port === '8000' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost' && url.port === '8000' ||
    url.hostname.includes('onrender.com')
  );
}

// ── install ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// ── activate ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── fetch ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // POST / PUT / DELETE はキャッシュしない
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // chrome-extension など除外
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // API リクエスト → Network First（失敗時はキャッシュ）
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Next.js HMR / dev サーバーは素通し
  if (url.pathname.startsWith('/_next/webpack-hmr') ||
      url.pathname.startsWith('/__nextjs')) return;

  // 静的アセット・ページ → Network First（オフライン時はキャッシュ）
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || caches.match('/')
        )
      )
  );
});
