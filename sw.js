// sw.js — offline support, scoped deliberately:
//
//   CACHED (works offline):
//     - the app shell (index.html, app.js, reader.js, style.css) + the vendor
//       scripts it depends on (Tailwind, JSZip, epub.js, canvas-confetti)
//     - the ebook library listing (/rest/v1/ebooks) — stale-while-revalidate,
//       so the grid still renders from last-known data when offline
//     - each ebook's file content — cached the first time it's successfully
//       opened, so a book you've read once stays readable offline forever
//       after (until this cache is cleared)
//
//   NOT CACHED (requires a live connection, by design):
//     - quiz questions, the Ressources browse tab, vocabulary, authors,
//       edge functions (translate, search-resources), Google Fonts
//     - see isOfflineRestrictedSection() in app.js, which blocks navigation
//       into those screens while offline rather than letting them hang
//
//   WRITES (POST/PATCH/DELETE) are never intercepted here — they go straight
//   to Supabase, or into app.js's localStorage-backed offline queue when the
//   browser is offline. Bump CACHE_VERSION on any change to this file so
//   clients pick up the new caching rules instead of running the old ones.

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;
const BOOK_CACHE = `books-${CACHE_VERSION}`;
const ALL_CACHES = [SHELL_CACHE, DATA_CACHE, BOOK_CACHE];

const SHELL_URLS = [
    './',
    './index.html',
    './app.js',
    './reader.js',
    './style.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://cdn.tailwindcss.com'
];
const SHELL_VENDOR_URLS = new Set(SHELL_URLS.filter((u) => u.startsWith('http')));

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            // allSettled: a single CDN hiccup at install time shouldn't block the whole SW
            .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Vendor scripts loaded via <script src> come through as "opaque" responses (status 0,
// ok === false, body unreadable) because the browser issues them in no-cors mode. They're
// still valid to cache — just can't be inspected — so treat opaque as cacheable too.
function isCacheable(res) {
    return res && (res.ok || res.type === 'opaque');
}

async function staleWhileRevalidate(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    const network = fetch(req)
        .then((res) => { if (isCacheable(res)) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
    return cached || network;
}

async function cacheFirst(req, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    if (isCacheable(res)) cache.put(req, res.clone());
    return res;
}

function isEbookFile(url) {
    return url.pathname.includes('/storage/v1/object/') && url.pathname.includes('/ebooks/');
}
function isEbooksListQuery(url) {
    return url.pathname.startsWith('/rest/v1/ebooks');
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // writes are never cached — see file header

    const url = new URL(req.url);

    if (isEbookFile(url)) {
        event.respondWith(cacheFirst(req, BOOK_CACHE));
        return;
    }
    if (isEbooksListQuery(url)) {
        event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
        return;
    }
    if (url.origin === self.location.origin || SHELL_VENDOR_URLS.has(req.url)) {
        event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
        return;
    }
    // Everything else (quiz, ressources list, vocab, authors, edge functions, fonts):
    // no responseWith() call — falls through to the network exactly as if there were no SW.
});
