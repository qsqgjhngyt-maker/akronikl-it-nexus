import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash,randomBytes} from 'node:crypto';import {Readable} from 'node:stream';import {EventEmitter} from 'node:events';
import {controlFixture} from './helpers/control-fixture.mjs';import {createNexusDurableStore} from '../server-access/bff/akronikl-store.mjs';import {handleAkroniklService} from '../server-access/worker/akronikl-service.mjs';import {createCloudSettingsHost} from '../tools/qa-akronikl/cloud-settings-gateway.mjs';import {GATEWAY_ORIGIN} from '../server-access/bff/account-read.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),owned=a=>createHash('sha256').update('nexus-account-v1\0'+a.id).digest('base64url'),key='SYNTHETIC_CLOUD_KEY_ONLY_123456789';
async function setup(){const f=await controlFixture();f.db.exec(await readFile(new URL('../server-access/migrations/0019_akronikl.sql',import.meta.url),'utf8'));Object.assign(f.env,{AKRONIKL_STATE_ENABLED:'true',AKRONIKL_SERVICE_KEY:'SYNTHETIC_AKRONIKL_RPC_KEY_ONLY_123456',AKRONIKL_VAULT_MASTER_KEY:randomBytes(32).toString('base64'),COOKIE_INGRESS_V3_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true'});const wire=[];const store=()=>createNexusDurableStore({env:f.env,fetchImpl:async(url,init)=>{wire.push(Buffer.from(init.body).toString());return handleAkroniklService(new Request(url,init),f.env);}});const req=(a,extra={})=>({headers:{cookie:'__Host-nexus_session='+a.secret,'x-nexus-account-expectation':a.id,'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({accountReadContract:'v3'})).toString('base64'),...extra},get rawHeaders(){return Object.entries(this.headers).flat();}});return {...f,wire,store,req};}
test('durable state/key survives fresh BFF; two accounts and concurrent revisions stay separate',async()=>{
 const f=await setup();try{const a=f.seed('assistant-a'),b=f.seed('assistant-b'),x=f.store(),y=f.store(),run=(s,actor,fn)=>s.run(f.req(actor),fn);
 await run(x,a,()=>x.vault.put(owned(a),{providerId:'qwen',modelId:'qwen3.8-flash',options:{},apiKey:key}));assert.equal((await run(y,a,()=>y.vault.get(owned(a),'qwen'))).apiKey,key);assert.equal(await run(y,b,()=>y.vault.get(owned(b),'qwen')),null);
 const results=await Promise.allSettled([run(x,a,()=>x.vault.writeState(owned(a),'preferences',{theme:'a'},0)),run(y,a,()=>y.vault.writeState(owned(a),'preferences',{theme:'b'},0))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/CLOUD_SETTINGS_CONFLICT/);
 const before=await run(y,a,()=>y.vault.readState(owned(a),'preferences'));assert.equal(before.revision,1);await run(y,a,()=>y.vault.writeState(owned(a),'preferences',{theme:'new'},1));assert.equal((await run(x,a,()=>x.vault.readState(owned(a),'preferences'))).revision,2);assert.equal((await run(x,b,()=>x.vault.readState(owned(b),'preferences'))).value,null);
 assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM nexus_akronikl_state').all()).includes(key),false);assert.equal(f.wire.join('').includes(key),false);await assert.rejects(run(y,b,()=>y.vault.get(owned(a),'qwen')),/CLOUD_ACCOUNT_REQUIRED/);
 // Ciphertext copied to another account is rejected by account+slot authenticated encryption.
 const row=f.db.prepare("SELECT ciphertext FROM nexus_akronikl_state WHERE account_id=? AND slot='key:qwen'").get(a.id);f.db.prepare("INSERT INTO nexus_akronikl_state VALUES(?,'key:qwen',1,?)").run(b.id,row.ciphertext);await assert.rejects(run(y,b,()=>y.vault.get(owned(b),'qwen')),/CLOUD_VAULT_UNAVAILABLE/);
 f.db.prepare("UPDATE account_sessions SET status='revoked',revoked_at=? WHERE id=?").run(new Date().toISOString(),a.session);await assert.rejects(run(y,a,()=>y.vault.list(owned(a))),/CLOUD_ACCOUNT_REQUIRED/);
 }finally{f.close();}
});
test('two BFF hosts restore one lease without another probe; disconnect fences cached adapters',async()=>{
 const f=await setup(),hosts=[];let calls=0;try{const a=f.seed('assistant-session-a'),b=f.seed('assistant-session-b');const adapter=()=>({complete:async()=>{calls++;return {response:{answer:'synthetic contract answer',citations:['S1']}}},dispose(){}});
 for(let i=0;i<2;i++){const store=f.store(),resolve=req=>req.headers['x-nexus-account-expectation'];resolve.sessionBinding=req=>sha(req.headers.cookie.split(';')[0].split('=')[1]);const host=await createCloudSettingsHost({origin:GATEWAY_ORIGIN,resolveAccount:resolve,vault:store.vault,sessionStore:store.leases,beforeModelCall:store.beforeModelCall,createAdapter:adapter});hosts.push({store,host});}
 async function call(index,actor,route,body,cookie=''){const {store,host}=hosts[index],req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);const h=f.req(actor).headers;Object.assign(req,{url:'/api/akronikl/cloud/'+route,method:body?'POST':'GET',headers:{...h,host:new URL(GATEWAY_ORIGIN).host,origin:GATEWAY_ORIGIN,'content-type':'application/json',cookie:h.cookie+(cookie?'; '+cookie:'')}});req.rawHeaders=Object.entries(req.headers).flat();const res=new EventEmitter();let result;res.setHeader=()=>{};res.writeHead=(status,headers)=>{result={status,headers}};res.end=b=>{res.writableEnded=true;result.body=JSON.parse(String(b));};await store.run(req,()=>host.handle(req,res));return result;}
 const c=await call(0,a,'connect',{providerId:'qwen',modelId:'qwen3.8-flash',apiKey:key,remember:true});assert.equal(c.status,200);assert.equal(calls,1);const cookie=c.headers['Set-Cookie'][0].split(';')[0],version=c.body.connectionVersion;
 assert.equal((await call(1,a,'ready',null,cookie)).body.connected,true);assert.equal(calls,1);assert.equal((await call(1,b,'ready',null,cookie)).body.connected,false);
 const input={connectionVersion:version,messages:[{role:'user',content:'Synthetic contract'}],allowedCitations:['S1']};assert.equal((await call(1,a,'generate',input,cookie)).status,200);assert.equal(calls,2);
 assert.equal((await call(0,a,'disconnect',{connectionVersion:version},cookie)).status,200);assert.equal((await call(1,a,'generate',input,cookie)).status,401);assert.equal(calls,2);
 }finally{for(const h of hosts)h.host.close();f.close();}
});
test('shared lease lock is atomic, fenced on release, account scoped; rate cap persists across stores',async()=>{
 const f=await setup();try{const a=f.seed('assistant-lock-a'),b=f.seed('assistant-lock-b'),x=f.store(),y=f.store(),token=randomBytes(32).toString('base64url'),v=randomBytes(16).toString('base64url'),run=(s,actor,fn)=>s.run(f.req(actor),fn);
 await run(x,a,()=>x.leases.save(token,{version:v,selection:{providerId:'qwen'},apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000}));assert.equal(await run(y,b,()=>y.leases.read(token)),null);
 const lock=await run(x,a,()=>x.leases.acquire(token,v));await assert.rejects(run(y,a,()=>y.leases.acquire(token,v)),/CLOUD_BUSY/);await run(y,a,()=>y.leases.release(token,v,'0'.repeat(64)));await assert.rejects(run(y,a,()=>y.leases.acquire(token,v)),/CLOUD_BUSY/);await run(x,a,()=>x.leases.release(token,v,lock));assert.ok(await run(y,a,()=>y.leases.acquire(token,v)));
 for(let i=0;i<4;i++){const s=i%2?x:y;await run(s,a,()=>s.beforeModelCall('connect'));}await assert.rejects(run(y,a,()=>y.beforeModelCall('connect')),/CLOUD_RATE_LIMITED/);await run(y,b,()=>y.beforeModelCall('connect'));
 }finally{f.close();}
});

test('disconnect cannot erase another replica’s running lock; expired and previous-session leases cannot restore',async()=>{
 const f=await setup();try{const a=f.seed('assistant-fence'),s=f.store(),tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')],v=randomBytes(16).toString('base64url'),run=fn=>s.run(f.req(a),fn);
 for(const token of tokens)await run(()=>s.leases.save(token,{version:v,selection:{providerId:'qwen'},apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000}));
 const lock=await run(()=>s.leases.acquire(tokens[0],v));await run(()=>s.leases.drop(tokens[0],v));await assert.rejects(run(()=>s.leases.acquire(tokens[1],v)),/CLOUD_BUSY/);await run(()=>s.leases.release(tokens[0],v,lock));assert.ok(await run(()=>s.leases.acquire(tokens[1],v)));
 f.db.prepare('UPDATE nexus_akronikl_connections SET expires_at=?').run(Date.now()-1);assert.equal(await run(()=>s.leases.read(tokens[1])),null);
 f.db.prepare('UPDATE nexus_akronikl_connections SET expires_at=?').run(Date.now()+100000);const nextSecret='nxs_'+randomBytes(32).toString('base64url');f.db.prepare('UPDATE account_sessions SET secret_hash=? WHERE id=?').run(sha(nextSecret),a.session);await assert.rejects(run(()=>s.leases.read(tokens[1])),/CLOUD_ACCOUNT_REQUIRED/);assert.equal(await s.run(f.req({...a,secret:nextSecret}),()=>s.leases.read(tokens[1])),null);
 }finally{f.close();}
});

async function hostRequest(host,route,{body,cookie='',abortAfterSave}={}){
 const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);Object.assign(req,{url:'/api/akronikl/cloud/'+route,method:body?'POST':'GET',headers:{host:new URL(GATEWAY_ORIGIN).host,origin:GATEWAY_ORIGIN,'content-type':'application/json',cookie},rawHeaders:[]});abortAfterSave?.(req);
 const res=new EventEmitter();let result;res.setHeader=()=>{};res.writeHead=(status,headers)=>{result={status,headers}};res.end=b=>{res.writableEnded=true;result.body=JSON.parse(String(b));};await host.handle(req,res);return result;
}
test('state-only ready never reads a durable key or instantiates an adapter',async()=>{
 let reads=0,adapters=0;const h=await createCloudSettingsHost({origin:GATEWAY_ORIGIN,generationEnabled:false,resolveAccount:()=> 'synthetic-account',vault:{id:'test'},sessionStore:{read(){reads++;throw Error('MUST_NOT_READ_KEY')}},createAdapter(){adapters++;throw Error('MUST_NOT_CREATE_ADAPTER')}});
 try{const r=await hostRequest(h,'ready',{cookie:'akronikl_cloud_='+'X'.repeat(43)});assert.equal(r.status,200);assert.equal(r.body.connected,false);assert.equal(r.body.generationEnabled,false);assert.deepEqual({reads,adapters},{reads:0,adapters:0});}finally{h.close();}
});
for(const fault of ['abort-save','fail-save','fail-old-read','fail-old-drop'])test('connect cleans an invisible lease and adapter on '+fault,async()=>{
 const leases=new Map(),old='O'.repeat(43);let reqRef,disposed=0,newId;const store={async save(id,value){leases.set(id,value);newId=id;if(fault==='abort-save')reqRef.emit('aborted');if(fault==='fail-save')throw Error('CLOUD_VAULT_UNAVAILABLE');},async read(id){if(fault==='fail-old-read'&&id===old)throw Error('CLOUD_VAULT_UNAVAILABLE');return id===old?{version:'V'.repeat(22)}:leases.get(id);},async drop(id){if(fault==='fail-old-drop'&&id===old)throw Error('CLOUD_VAULT_UNAVAILABLE');leases.delete(id);}};
 const h=await createCloudSettingsHost({origin:GATEWAY_ORIGIN,resolveAccount:()=> 'synthetic-account',vault:{id:'test'},sessionStore:store,createAdapter:()=>({complete:async()=>({}),dispose(){disposed++;}})});
 try{const r=await hostRequest(h,'connect',{body:{providerId:'qwen',modelId:'m',apiKey:key},cookie:'akronikl_cloud_='+old,abortAfterSave:req=>reqRef=req});assert.notEqual(r.status,200);assert.equal(r.body.connected,undefined);assert.equal(leases.has(newId),false);assert.equal(disposed,1);assert.equal(h.status().sessions,0);}finally{h.close();}
});

test('storage UTF-8 boundary and eight-connection cap reject without overwriting saved data',async()=>{
 const f=await setup();try{const a=f.seed('assistant-boundary'),s=f.store(),run=fn=>s.run(f.req(a),fn),value='я'.repeat(649990);assert.ok(Buffer.byteLength(JSON.stringify(value))<1300000);await run(()=>s.vault.writeState(owned(a),'chats',value,0));await assert.rejects(run(()=>s.vault.writeState(owned(a),'chats','я'.repeat(650001),1)),/CLOUD_SETTINGS_INVALID/);assert.equal((await run(()=>s.vault.readState(owned(a),'chats'))).value,value);
 const v=randomBytes(16).toString('base64url'),lease={version:v,selection:{providerId:'qwen'},apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000};for(let i=0;i<8;i++)await run(()=>s.leases.save(randomBytes(32).toString('base64url'),lease));await assert.rejects(run(()=>s.leases.save(randomBytes(32).toString('base64url'),lease)),/CLOUD_BUSY/);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_connections WHERE account_id=?').get(a.id).n,8);
 }finally{f.close();}
});

test('synthetic account purge covers assistant data atomically, rejects stale preview and preserves account B',async()=>{
 const f=await setup();try{const a=f.seed('assistant-purge-a',{username:'assistant.a'}),b=f.seed('assistant-purge-b',{username:'assistant.b'}),s=f.store(),run=(who,fn)=>s.run(f.req(who),fn);for(const who of [a,b])await run(who,()=>s.vault.writeState(owned(who),'preferences',{marker:who.id},0));
 const snapshot=()=>JSON.stringify(f.db.prepare('SELECT * FROM nexus_akronikl_state WHERE account_id=?').all(b.id)),before=snapshot(),state=()=>f.db.prepare('SELECT version FROM nexus_alpha_members WHERE account_id=?').get(a.id).version;
 const post=(route,payload)=>f.call('/api/v2/account/control/users/'+a.id+route,{method:'POST',payload:{requestId:crypto.randomUUID(),version:state(),...payload}});
 assert.equal((await post('/action',{action:'remove'})).status,200);let preview=await post('/purge-preview',{});assert.equal(preview.status,200,JSON.stringify(preview.body));assert.equal(preview.body.counts.assistantRecords,1);
 f.db.prepare('UPDATE nexus_akronikl_state SET revision=revision+1 WHERE account_id=?').run(a.id);assert.equal((await post('/purge',{approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation})).status,409);assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(a.id));
 preview=await post('/purge-preview',{});const result=await post('/purge',{approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_state WHERE account_id=?').get(a.id).n,0);assert.equal(snapshot(),before);assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{f.close();}
});

test('an existing device can replace its connection at the eight-lease cap',async()=>{
 const f=await setup();try{const a=f.seed('assistant-replace'),s=f.store(),run=fn=>s.run(f.req(a),fn),v=randomBytes(16).toString('base64url'),tokens=[];const value={version:v,selection:{providerId:'qwen'},apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000};for(let i=0;i<8;i++){const token=randomBytes(32).toString('base64url');tokens.push(token);await run(()=>s.leases.save(token,value));}
 const next=randomBytes(32).toString('base64url');await run(()=>s.leases.save(next,value,{replaceToken:tokens[0]}));await run(()=>s.leases.drop(tokens[0],v));assert.equal(await run(()=>s.leases.read(tokens[0])),null);assert.ok(await run(()=>s.leases.read(next)));assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_connections').get().n,8);
 }finally{f.close();}
});

test('forget fences an in-flight remembered key and connection; cleanup works after general RPC exhaustion',async()=>{
 const f=await setup();try{const a=f.seed('assistant-forget'),s=f.store(),run=fn=>s.run(f.req(a),fn),v=randomBytes(16).toString('base64url'),token=randomBytes(32).toString('base64url'),record={providerId:'qwen',modelId:'m',options:{},apiKey:key};await run(()=>s.vault.put(owned(a),record));const epoch=await run(()=>s.leases.providerEpoch('qwen'));await run(()=>s.leases.save(token,{version:v,selection:record,apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000,providerEpoch:epoch}));
 // An adapter already preparing to connect has captured epoch0. A later Forget wins.
 await run(()=>s.vault.remove(owned(a),'qwen'));await assert.rejects(run(()=>s.vault.put(owned(a),record,{providerEpoch:epoch})),/CLOUD_SETTINGS_CONFLICT/);await assert.rejects(run(()=>s.leases.save(randomBytes(32).toString('base64url'),{version:v,selection:record,apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000,providerEpoch:epoch})),/CLOUD_BUSY/);assert.equal(await run(()=>s.vault.get(owned(a),'qwen')),null);
 for(const [period,count]of [[60000,180],[86400000,5000]]){const at=Math.floor(Date.now()/period);f.db.prepare('INSERT INTO nexus_akronikl_limits VALUES(?,?,?,?) ON CONFLICT(account_id,bucket) DO UPDATE SET count=excluded.count').run(a.id,'rpc:'+period+':'+at,count,(at+1)*period);}
 await assert.rejects(run(()=>s.vault.list(owned(a))),/CLOUD_RATE_LIMITED/);await run(()=>s.leases.drop(token,v));await run(()=>s.vault.remove(owned(a),'qwen'));assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_akronikl_connections WHERE account_id=?').get(a.id).n,0);
 }finally{f.close();}
});

test('forget transaction fault cannot partially remove a key or its connections',async()=>{
 const f=await setup();try{const a=f.seed('assistant-forget-atomic'),s=f.store(),run=fn=>s.run(f.req(a),fn),v=randomBytes(16).toString('base64url'),token=randomBytes(32).toString('base64url');await run(()=>s.vault.put(owned(a),{providerId:'qwen',modelId:'m',options:{},apiKey:key}));await run(()=>s.leases.save(token,{version:v,selection:{providerId:'qwen'},apiKey:key,accountId:a.id,binding:sha(a.secret),expiresAt:Date.now()+100000}));
 const batch=f.env.DB.batch;f.env.DB.batch=commands=>batch([commands[0],{execute(){throw Error('SYNTHETIC_TRANSACTION_FAULT');}},...commands.slice(1)]);await assert.rejects(run(()=>s.vault.remove(owned(a),'qwen')),/CLOUD_VAULT_UNAVAILABLE/);f.env.DB.batch=batch;
 assert.equal((await run(()=>s.vault.get(owned(a),'qwen'))).apiKey,key);assert.ok(await run(()=>s.leases.read(token)));assert.equal(await run(()=>s.leases.providerEpoch('qwen')),0);
 }finally{f.close();}
});

test('slow body replay cannot outlive its timestamp or modify legacy replay storage',async()=>{
 const f=await setup(),realNow=Date.now;try{const a=f.seed('assistant-slow-replay'),s=f.store();await s.run(f.req(a),()=>s.vault.readState(owned(a),'preferences'));const body=f.wire[0];
 // Obtain the exact signed request from a fresh store without sending it first.
 let captured;const capture=createNexusDurableStore({env:f.env,fetchImpl:async(url,init)=>{captured={url,init};return handleAkroniklService(new Request(url,init),f.env);}});await capture.run(f.req(a),()=>capture.vault.readState(owned(a),'preferences'));const stamp=Number(captured.init.headers['x-nexus-service-timestamp']);Date.now=()=>stamp+1000;
 const stream=new ReadableStream({pull(controller){Date.now=()=>stamp+31000;controller.enqueue(new Uint8Array(captured.init.body));controller.close();}});const replay=await handleAkroniklService(new Request(captured.url,{...captured.init,body:stream,duplex:'half'}),f.env);assert.equal(replay.status,401);assert.equal((await replay.json()).code,'CLOUD_REQUEST_DENIED');assert.equal(f.db.prepare('SELECT count(*) n FROM account_service_nonces').get().n,0);assert.ok(body.includes('state.read'));
 }finally{Date.now=realNow;f.close();}
});
