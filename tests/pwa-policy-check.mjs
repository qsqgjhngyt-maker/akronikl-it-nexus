import assert from 'node:assert/strict';
import {publicRecord,sha256,verifyResponse,verifyBytes} from '../pwa/policy.js';
import {RUNTIME_RESOURCES} from '../pwa/runtime-manifest.js';
const bytes=new TextEncoder().encode('public synthetic module');
const record={url:'/releases/closure/public.js',bytes:bytes.length,sha256:await sha256(bytes),mime:'text/javascript'};
const origin='https://synthetic.invalid';let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
await check('only exact producer record is public',async()=>{
 assert.equal(publicRecord(new Request(origin+record.url),origin,[record],'v1'),record);
 for(const path of ['/api/v2/account','/account/entry/','/nexus-shell.html','/','/index.html','/API/v2/cloud/projects','/%61pi/v2/account',record.url+'?account=other',record.url+'?v=other',record.url+'#copy=synthetic','/api/v2/account#copy=synthetic','/unapproved.js'])assert.equal(publicRecord(new Request(origin+path),origin,[record],'v1'),null);
 assert.equal(publicRecord(new Request(origin+record.url,{method:'POST',body:'synthetic'}),origin,[record],'v1'),null);
 assert.equal(publicRecord(new Request('https://foreign.invalid'+record.url),origin,[record],'v1'),null);
 assert.equal(publicRecord(new Request(origin+record.url+'?v=v1'),origin,[record],'v1'),record);
 const retained={...record,version:'previous'};
 assert.equal(publicRecord(new Request(origin+record.url+'?v=previous'),origin,[retained],'current'),retained);
 assert.equal(publicRecord(new Request(origin+record.url+'?v=forged'),origin,[retained],'current'),null);
});
await check('digest, size and MIME prove the actual response body',async()=>{
 const good=()=>new Response(bytes,{headers:{'content-type':'application/javascript; charset=utf-8'}});
 assert.deepEqual(new Uint8Array(await verifyResponse(record,good())),bytes);
 await assert.rejects(verifyResponse(record,new Response('x'.repeat(bytes.length),{headers:{'content-type':'text/javascript'}})),{code:'ASSET_INTEGRITY_MISMATCH'});
 await assert.rejects(verifyResponse(record,new Response('short',{headers:{'content-type':'text/javascript'}})),{code:'ASSET_SIZE_MISMATCH'});
 await assert.rejects(verifyResponse(record,new Response(bytes,{headers:{'content-type':'text/html'}})),{code:'ASSET_MIME_REJECTED'});
 for(const headers of [{'cache-control':'no-store'},{'cache-control':'private, max-age=100'},{vary:'*'},{'set-cookie':'SYNTHETIC_ONLY=x'}])await assert.rejects(verifyResponse(record,new Response(bytes,{headers:{'content-type':'text/javascript',...headers}})),{code:'ASSET_PRIVATE_RESPONSE_REJECTED'});
 for(const status of [206,301,401,403,404,500])await assert.rejects(verifyResponse(record,new Response(bytes,{status,headers:{'content-type':'text/javascript'}})),{code:'ASSET_RESPONSE_REJECTED'});
 await assert.rejects(verifyBytes(record,bytes.subarray(1)),{code:'ASSET_SIZE_MISMATCH'});
});
await check('complete declared Clang/WASI browser graph is pinned and bounded',async()=>{
 assert.equal(RUNTIME_RESOURCES.length,7);const urls=new Set(RUNTIME_RESOURCES.map(r=>r.url));
 for(const r of RUNTIME_RESOURCES){assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.ok(r.bytes>0&&r.bytes<160*1024*1024);assert.ok(r.url.startsWith('https://cdn.jsdelivr.net/npm/'));assert.ok(!new URL(r.url).search);for(const dependency of r.dependencies)assert.ok(urls.has(dependency))}
 assert.equal(RUNTIME_RESOURCES[0].dependencies.length,5);assert.equal(RUNTIME_RESOURCES.reduce((n,r)=>n+r.bytes,0),105558342);
});
await check('Markdown requires the exact producer MIME; HTML substitution, private headers and altered bytes remain rejected',async()=>{
 const body=new TextEncoder().encode('# Synthetic public Markdown\n'),md={url:'/releases/synthetic/courses/README.md',mime:'text/markdown',bytes:body.length,sha256:await sha256(body)};
 const response=()=>new Response(body,{headers:{'content-type':'text/markdown; charset=utf-8'}});
 await assert.rejects(verifyResponse({...md,mime:'text/html'},response()),{code:'ASSET_MIME_REJECTED'});
 assert.deepEqual(new Uint8Array(await verifyResponse(md,response())),body);
 await assert.rejects(verifyResponse(md,new Response(body,{headers:{'content-type':'text/html'}})),{code:'ASSET_MIME_REJECTED'});
 await assert.rejects(verifyResponse(md,new Response(body,{headers:{'content-type':'text/markdown',vary:'Accept-Encoding, *'}})),{code:'ASSET_PRIVATE_RESPONSE_REJECTED'});
 await assert.rejects(verifyResponse(md,new Response(new Uint8Array(body.length),{headers:{'content-type':'text/markdown'}})),{code:'ASSET_INTEGRITY_MISMATCH'});
});
console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,realCredentials:false}));
