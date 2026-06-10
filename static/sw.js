const CACHE_NAME='finance-v3';
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll([
                '/',
                '/static/css/style.css',
                '/static/js/main.js',
                '/static/manifest.json'
            ])
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // تجاهل أي طلبات غير الـ GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
        .then((response) => {
            // تخزين الملفات الثابتة فقط (صور، ستايل، جافاسكريبت)
            if(response.status === 200 && event.request.url.includes('/static/')){
                let copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            return response;
        })
        .catch(() => caches.match(event.request))
    );
});
