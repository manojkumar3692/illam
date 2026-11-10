// Only cache the generic offline page and app icons. Never cache private pages or APIs.
const CACHE='illam-shell-v2';
const STATIC=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png','/icons/maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('illam-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));return;}if(STATIC.includes(url.pathname)){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));}});
