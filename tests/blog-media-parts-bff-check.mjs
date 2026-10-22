import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {mediaPartsFixture,sha} from './helpers/media-parts-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {createAccountControlHandler} from '../server-access/bff/account-control.mjs';
import {createContentHandler} from '../server-access/bff/content.mjs';
import {uploadPhotoParts,readPhotoParts} from '../server-access/bff/media-parts.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
import {encodeBlogLayout} from '../core/blog-layout.js';
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
async function fixture(fn){
 const f=await mediaPartsFixture(),calls=[],nonces=new Set();let mode='normal',active=0,peak=0;
 const env={...f.env,ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',CONTENT_PROXY_ENABLED:'true',COOKIE_INGRESS_V3_ENABLED:'true',BFF_CONTENT_MEDIA_PARTS_ENABLED:'true'};
 async function transport(url,options){
  assert.equal(url,WORKER_ORIGIN+'/api/v2/account/internal/control');assert.ok(Buffer.byteLength(options.body)<=12000);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.body.includes(f.owner.secret),false);
  const p=JSON.parse(options.body).payload;calls.push({phase:p.phase,index:p.index,requestId:p.requestId,bytes:Buffer.byteLength(options.body),signal:options.signal});
  assert.ok(!nonces.has(options.headers['x-nexus-service-nonce']));nonces.add(options.headers['x-nexus-service-nonce']);
  active++;peak=Math.max(peak,active);
  try{
   if(mode==='delay')await delay(20,undefined,{signal:options.signal});
   if(mode==='part-network'&&p.phase==='part')throw Object.assign(Error('SYNTHETIC'),{code:'ECONNRESET'});
   let r=await handleAdminService(new Request(url,options),f.env);
   if(p.phase==='read'&&r.status===200){
    const headers=new Headers(r.headers),data=await r.json();
    if(mode==='set-cookie')headers.set('set-cookie','SYNTHETIC_FORBIDDEN');
    if(mode==='cache')headers.set('cache-control','public, max-age=300');
    if(mode==='vary')headers.set('vary','origin');
    if(mode==='mime')headers.set('content-type','text/html');
    if(mode==='redirect')return {status:302,redirected:true,headers,body:new Response('{}').body};
    if(mode==='digest')data.part.sha256='0'.repeat(64);
    if(mode==='unknown')data.part.credential='SYNTHETIC_FORBIDDEN';
    if(mode==='metadata'&&p.index===1)data.part.meta.width--;
    if(mode==='oversize')return new Response('x'.repeat(12001),{headers});
    if(mode==='body-stall')return {status:200,headers,body:new ReadableStream({start(c){c.enqueue(Buffer.from('{'))},cancel(){}})};
    return new Response(JSON.stringify(data),{status:r.status,headers});
   }
   return r;
  }finally{active--}
 }
 const handler=createAccountControlHandler({env,fetchImpl:transport}),publicHandler=createContentHandler({env,fetchImpl:transport});
 async function invoke({method='POST',path='/api/v2/account/control/content',payload,expected=f.owner.id,origin=GATEWAY_ORIGIN,publicRead=false}={}){
  const headers={host:new URL(GATEWAY_ORIGIN).host,...(!publicRead?{origin,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':expected,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+f.owner.secret}:{})};
  const req=Object.assign(Readable.from(payload?[Buffer.from(JSON.stringify(payload))]:[]),{url:path,method,headers,rawHeaders:Object.entries(headers).flat()});let status,body,head;
  await (publicRead?publicHandler:handler)(req,{writeHead(s,h){status=s;head=h},end(v){body=v}});
  assert.equal(head['cache-control'],'no-store');assert.equal(head.vary,'*');assert.equal(head['set-cookie'],undefined);assert.equal(body.includes(f.owner.secret),false);
  return {status,body:JSON.parse(body)};
 }
 async function store(){const b=await f.filled();assert.equal((await f.callParts(f.commit(b))).status,200);return b}
 async function publish(){
  const body=encodeBlogLayout({schemaVersion:1,cover:{mediaId:f.media.id,alt:'Synthetic',caption:'',focusX:50,focusY:50},blocks:[]}),id=randomUUID();
  for(const [action,version,content] of [['save',0,{title:'Synthetic',summary:'',body}],['publish',1,{layoutVersion:1}]])assert.equal((await f.call('/api/v2/account/control/content',{method:'POST',payload:{requestId:randomUUID(),target:'post',id,slug:'synthetic-public',action,version,content}},f.env)).status,200);
 }
 try{await fn({f,env,transport,invoke,store,publish,calls,mode:v=>{mode=v},peak:()=>peak})}finally{f.close()}
}
await check('same external upload, 18 small signed RPC, same bytes/quality and single final audit',()=>fixture(async({f,invoke,calls,mode,peak})=>{
 mode('delay');const input=f.external();input.content={jpegBase64:f.media.data};const t=performance.now(),r=await invoke({payload:input});
 assert.equal(r.status,200);assert.equal(calls.length,18);assert.equal(peak(),2);assert.equal(calls.filter(c=>c.phase==='commit').length,1);assert.ok(performance.now()-t<12000);
 assert.equal(new Set(calls.map(c=>c.signal)).size,1);assert.equal(new Set(calls.map(c=>c.requestId)).size,18);assert.equal(f.counts().audit,1);
 // Внешняя нормализация выполняется ровно один раз; parts не меняют её результат.
 const {sanitizeBlogImage}=await import('../server-access/blog-image-codec.mjs');assert.equal(f.db.prepare('SELECT jpeg_base64 FROM nexus_content_media').get().jpeg_base64,sanitizeBlogImage(f.media.data).data);
}));
await check('private and published public read assemble exact 16 parts before replying',()=>fixture(async({f,store,publish,invoke,calls})=>{
 await store();let r=await invoke({method:'GET',path:'/api/v2/account/control/content?media='+f.media.id});assert.equal(r.status,200);assert.equal(r.body.media.data,f.media.data);assert.equal(calls.length,16);
 await publish();r=await invoke({method:'GET',path:'/api/v2/content/feed?media='+f.media.id,publicRead:true});assert.equal(r.status,200);assert.equal(sha(Buffer.from(r.body.media.data,'base64')),f.media.id);assert.equal(calls.length,32);
}));
for(const mode of ['set-cookie','cache','vary','mime','redirect','digest','unknown','metadata','oversize'])await check('read '+mode+' cannot return partial or unverified photo',()=>fixture(async({f,store,mode:setMode,invoke})=>{
 await store();setMode(mode);const r=await invoke({method:'GET',path:'/api/v2/account/control/content?media='+f.media.id});assert.equal(r.status,502);assert.equal(r.body.media,undefined);assert.equal(f.counts().audit,1);
}));
await check('part network failure cancels peers, never retries or commits',()=>fixture(async({f,mode,invoke,calls})=>{
 mode('part-network');const p=f.external();p.content={jpegBase64:f.media.data};const r=await invoke({payload:p});assert.equal(r.status,502);assert.ok(calls.length<=3);assert.equal(calls.some(c=>c.phase==='commit'),false);assert.equal(f.counts().media,0);assert.equal(f.counts().audit,0);
}));
await check('external client cannot select internal phases or spoof account/origin',()=>fixture(async({f,invoke,calls})=>{
 assert.equal((await invoke({path:'/api/v2/account/control/content/media-parts',payload:f.begin()})).status,404);assert.equal(calls.length,0);
 const p=f.external();p.content={jpegBase64:f.media.data};assert.equal((await invoke({payload:p,origin:'https://synthetic.invalid'})).status,403);assert.equal(calls.length,0);
 assert.equal((await invoke({payload:p,expected:'another-account'})).status,401);assert.equal(calls.length,1);
}));
await check('Worker feature mismatch gives one failure and never retries legacy upload',()=>fixture(async({f,invoke,calls})=>{
 f.env.CONTENT_MEDIA_PARTS_ENABLED='false';const p=f.external();p.content={jpegBase64:f.media.data};assert.equal((await invoke({payload:p})).status,503);assert.equal(calls.length,1);assert.equal(calls[0].phase,'begin');
}));
await check('shared deadline bounds all phases; cancellation does not create media',()=>fixture(async({f,transport,calls})=>{
 let count=0;
 // Для deadline проверяем orchestration отдельно; реальные подписи проверены остальными кейсами.
 const syntheticRPC=async(e,{signal})=>{count++;await delay(25,undefined,{signal});const p=e.payload;if(p.phase==='begin')return {ok:true,uploadId:p.uploadId,meta:p.meta};return {ok:true,uploadId:p.uploadId,index:p.index,sha256:p.sha256}};
 const start=performance.now();await assert.rejects(uploadPhotoParts(f.envelope(f.external()),syntheticRPC,{signal:AbortSignal.timeout(60)}));assert.ok(performance.now()-start<1000);assert.ok(count<=5);assert.equal(f.counts().media,0);
}));
await check('real 12-second body deadline cancels an indefinitely stalled part response',()=>fixture(async({f,store,mode,invoke,calls})=>{
 await store();mode('body-stall');const keepAlive=setInterval(()=>{},500);
 try{const start=performance.now(),r=await invoke({method:'GET',path:'/api/v2/account/control/content?media='+f.media.id});assert.equal(r.status,502);const elapsed=performance.now()-start;assert.ok(elapsed>=11500&&elapsed<14000);assert.equal(calls.length,1)}finally{clearInterval(keepAlive)}
}));
await check('public parts rate limit remains 429, without partial image or fallback',()=>fixture(async({f,store,publish,invoke,calls})=>{
 await store();await publish();for(const digit of '0123456789abcdef')f.db.prepare('INSERT INTO nexus_admin_rate_limits VALUES(?,?,120)').run('!media-public-v1:'+digit,Math.floor(Date.now()/60000));
 const r=await invoke({method:'GET',path:'/api/v2/content/feed?media='+f.media.id,publicRead:true});assert.equal(r.status,429);assert.equal(r.body.media,undefined);assert.equal(calls.length,1);
}));
console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,syntheticOnly:true}));
