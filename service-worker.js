const CACHE = 'anx-v0.1.0-alpha.1.1-shell';
const CORE = [
  './','./index.html','./styles/app.css','./core/app.js','./core/storage.js','./core/i18n.js','./core/course-registry.js','./core/migrations/cpp-v7.js','./akronikl/context.js',
  './courses/catalog.json','./courses/cpp/manifest.json','./courses/cpp/curriculum.json','./locales/registry.json','./locales/ru/ui.json','./locales/en/ui.json','./manifest.webmanifest','./assets/icons/anx-icon.svg','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/apple-touch-icon.png','./version.json'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('anx-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  event.respondWith((async()=>{
    try {
      if(req.mode==='navigate') {
        const fresh=await fetch('./index.html', {cache:'no-store'});
        const type=fresh.headers.get('content-type')||'';
        if(fresh.ok && type.includes('text/html')) {
          const cache=await caches.open(CACHE);
          cache.put('./index.html',fresh.clone());
          return fresh;
        }
        const cached=await caches.match('./index.html');
        if(cached) return cached;
        return fresh;
      }
      const fresh=await fetch(req);
      if(fresh && fresh.ok) { const cache=await caches.open(CACHE); cache.put(req,fresh.clone()); }
      return fresh;
    } catch {
      const cached=await caches.match(req);
      if(cached) return cached;
      if(req.mode==='navigate') return caches.match('./index.html');
      throw new Error('offline-and-not-cached');
    }
  })());
});
