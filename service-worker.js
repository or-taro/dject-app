// Only public application assets are cached. API responses and novels never enter CacheStorage.
const CACHE='dject-pages-v2-multigpt';
const ASSETS=['./','./app.js','./style.css','./manifest.webmanifest','./icon-192.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dject-pages-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET')return;event.respondWith(fetch(event.request,{cache:'no-cache'}).catch(()=>caches.match(event.request)));});
