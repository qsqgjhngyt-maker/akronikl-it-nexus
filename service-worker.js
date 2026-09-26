const CACHE='akronikl-it-nexus-v0.1.7-alpha.2.4.2';
const RUNTIME_CACHE='akronikl-it-nexus-runtime-v0.1.7-alpha.2.4.2';
const CORE=["./", "./index.html", "./styles/app.css", "./core/app.js", "./core/glass-select.js", "./core/memory-lab.js", "./core/oop-lab.js", "./core/i18n.js", "./core/course-registry.js", "./core/storage.js", "./core/view-resume.js", "./core/identity.js", "./core/account-shell.js", "./collaboration/access-control.js", "./collaboration/audit-log.js", "./sync/sync-queue.js", "./sync/provider-contract.js", "./sync/cloudflare-provider.js", "./sync/cloudflare-config.js", "./sync/identity-v2-client.js", "./sync/cloud-sync.js", "./project-studio/project-store.js", "./project-studio/project-templates.js", "./project-studio/project-studio.js", "./project-studio/project-build.js", "./core/migrations/cpp-v7.js", "./sandbox/sandbox.js", "./sandbox/code-studio.js", "./sandbox/code-workspace.js", "./sandbox/virtual-files.js", "./sandbox/provider-contract.js", "./sandbox/languages.js", "./sandbox/runtime-assets.js", "./sandbox/runtime-router.js", "./sandbox/diagnostics.js", "./sandbox/providers/browser-runtime.js", "./sandbox/providers/wasm-runtime.js", "./sandbox/providers/cloud-runtime.js", "./sandbox/workers/wasm-runtime-worker.js", "./effects/particles.js", "./akronikl/context.js", "./courses/catalog.json", "./courses/programming/languages.json", "./courses/cpp/manifest.json", "./courses/cpp/curriculum.json", "./courses/cpp/data/lessons.ru.json", "./courses/cpp/data/lessons.en.json", "./courses/cpp/data/practicums.ru.json", "./courses/cpp/data/projects.ru.json", "./locales/registry.json", "./locales/ru/ui.json", "./locales/en/ui.json", "./manifest.webmanifest", "./version.json", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/apple-touch-icon.png"];
const RUNTIME_HOSTS=new Set(['cdn.jsdelivr.net']);

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys
    .filter(key=>key.startsWith('akronikl-it-nexus-')&&key!==CACHE&&key!==RUNTIME_CACHE)
    .map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

async function sameOriginNetworkFirst(request){
  try{
    const response=await fetch(request);
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }catch{
    return (await caches.match(request))||((request.mode==='navigate')?await caches.match('./index.html'):Response.error());
  }
}

async function runtimeCacheFirst(request){
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response.ok||response.type==='opaque')await cache.put(request,response.clone());
    return response;
  }catch{
    return cached||Response.error();
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin===location.origin){event.respondWith(sameOriginNetworkFirst(event.request));return;}
  if(RUNTIME_HOSTS.has(url.hostname)&&(/\/npm\/@yowasp\/clang@/.test(url.pathname)||/\/npm\/@runno\/wasi@/.test(url.pathname))){
    event.respondWith(runtimeCacheFirst(event.request));
  }
});
