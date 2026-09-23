import fs from 'node:fs';
const root=new URL('../',import.meta.url);const assert=(v,m)=>{if(!v)throw new Error(m)};
const provider=fs.readFileSync(new URL('sync/cloudflare-provider.js',root),'utf8');
const worker=fs.readFileSync(new URL('cloudflare/nexus-sync-worker/dist/worker.js',root),'utf8');
assert(!provider.includes("{'authorization':''}"),'skipAuth must not emit empty Authorization');
assert(provider.includes("bearer?{authorization:`Bearer ${bearer}`}:{}"),'provider must omit Authorization when bearer is absent');
assert(worker.includes("request.headers.get('access-control-request-headers')"),'dynamic preflight requested headers missing');
assert(worker.includes("'access-control-allow-origin': origin"),'exact-origin CORS response missing');
console.log('CLOUD_BOOTSTRAP_TRANSPORT_HOTFIX_PASS');
