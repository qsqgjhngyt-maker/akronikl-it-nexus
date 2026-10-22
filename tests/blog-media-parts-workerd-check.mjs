// Реальный локальный workerd/D1, compatibility date production. Outbound запрещён.
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Miniflare} from '../server-access/node_modules/miniflare/dist/src/index.js';
import {mediaPartsFixture} from './helpers/media-parts-fixture.mjs';
import {readPhotoParts} from '../server-access/bff/media-parts.mjs';
import {controlService} from '../server-access/bff/account-control.mjs';
import {WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
import {encodeBlogLayout} from '../core/blog-layout.js';
const f=await mediaPartsFixture(),records=[],store=await mkdtemp(join(tmpdir(),'nexus-media-parts-d1-'));
let mf,base,db,outbound=0,requests=0,maxEnvelope=0,failure;
const bindings=Object.fromEntries(Object.entries(f.env).filter(([,v])=>typeof v==='string'));
const options={modules:true,scriptPath:fileURLToPath(new URL('../server-access/worker-bundle/entry.mjs',import.meta.url)),host:'127.0.0.1',port:0,compatibilityDate:'2026-09-23',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'synthetic-media-parts'},d1Persist:store,bindings,outboundService:()=>{outbound++;return new Response('OUTBOUND_FORBIDDEN',{status:503})}};
async function start(){mf=new Miniflare(options);base=await mf.ready;db=await mf.getD1Database('DB')}
async function check(name,fn){const t=performance.now();try{await fn();records.push({name,status:'PASS',durationMs:Math.round(performance.now()-t)});console.log('PASS '+name)}catch(e){failure={name,code:e.code||e.name};throw e}}
async function wire(url,init){
 assert.equal(url,WORKER_ORIGIN+'/api/v2/account/internal/control');const bytes=Buffer.byteLength(init.body);assert.ok(bytes<=12000);maxEnvelope=Math.max(maxEnvelope,bytes);requests++;
 return fetch(new URL('/api/v2/account/internal/control',base),init);
}
async function call(payload,{publicRead=false,expected}={}){
 const r=f.signedParts(f.envelope(payload,{publicRead,...(expected?{expected}:{})})),body=await r.text();
 const res=await wire(WORKER_ORIGIN+'/api/v2/account/internal/control',{method:'POST',headers:r.headers,body});
 assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('vary'),'*');assert.equal(res.headers.has('set-cookie'),false);
 const text=await res.text();assert.ok(Buffer.byteLength(text)<=12000);return {status:res.status,data:JSON.parse(text)};
}
const count=async table=>(await db.prepare('SELECT COUNT(*) n FROM '+table).first()).n;
try{
 await start();
 await check('fresh D1 additive migration and synthetic seed; production compatibility 2026-09-23',async()=>{
  const names=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(n=>'../cloudflare/nexus-sync-worker/migrations/'+n+'.sql');
  names.push(...['0005_login_methods_registry','0006_account_lifecycle_hardening','0007_identity_owner_and_issuance_guards','0008_account_service_nonces','0009_passkeys','0010_feedback','0011_oauth_service','0012_alpha_administration','0013_account_avatars','0014_community_content','0015_blog_media','0016_blog_media_parts'].map(n=>'../server-access/migrations/'+n+'.sql'));
  for(const name of names){const sql=(await readFile(new URL(name,import.meta.url),'utf8')).split(/\r?\n/).filter(l=>!l.trimStart().startsWith('--')).join(' ');await db.exec(sql)}
  for(const table of ['account_subjects','login_methods','nexus_passkey_users','nexus_passkey_credentials','account_devices','account_sessions','session_login_methods','nexus_admin_grants'])for(const row of f.db.prepare('SELECT * FROM '+table).all()){
   const keys=Object.keys(row);await db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').bind(...Object.values(row)).run();
  }
  await db.exec('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
 });
 const b=f.begin();
 await check('begin and first eight parts remain invisible to media/audit',async()=>{
  assert.equal((await call(b)).status,200);
  for(let i=7;i>=0;i--)assert.equal((await call(f.part(b,i))).status,200);
  assert.equal(await count('nexus_content_media'),0);assert.equal(await count('nexus_content_media_audit'),0);assert.equal(await count('nexus_content_media_parts'),8);
 });
 await check('dispose/restart actual workerd retains partial D1 upload and account rows',async()=>{
  await mf.dispose();mf=null;await start();
  assert.equal(await count('nexus_content_media_parts'),8);assert.equal(await count('account_subjects'),1);
  for(let i=15;i>=8;i--)assert.equal((await call(f.part(b,i))).status,200);
 });
 await check('incomplete fault rejected; exact 16-part commit creates one immutable media/audit',async()=>{
  const saved=await db.prepare('SELECT * FROM nexus_content_media_parts WHERE upload_id=? AND part_index=15').bind(b.uploadId).first();
  await db.prepare('DELETE FROM nexus_content_media_parts WHERE upload_id=? AND part_index=15').bind(b.uploadId).run();
  assert.equal((await call(f.commit(b))).status,409);
  await db.prepare('INSERT INTO nexus_content_media_parts VALUES(?,?,?,?)').bind(saved.upload_id,saved.part_index,saved.data,saved.part_sha256).run();
  assert.equal((await call(f.commit(b))).status,200);assert.equal(await count('nexus_content_media_audit'),1);assert.equal(await count('nexus_content_media_parts'),0);
 });
 const rpc=(envelope,options)=>controlService(f.env,wire,envelope,{...options,mediaDiagnostics:true});
 await check('BFF assembles full near-limit private read through actual HTTP workerd/D1',async()=>{
  const r=await readPhotoParts(f.envelope(null),f.media.id,rpc);assert.equal(r.media.data,f.media.data);
 });
 await check('completed upload and idempotent receipt survive second engine restart',async()=>{
  await mf.dispose();mf=null;await start();assert.equal((await call(f.commit(b))).status,200);assert.equal(await count('nexus_content_media_audit'),1);
 });
 await check('public signed read cannot access draft; publication required',async()=>{
  assert.equal((await call(f.read(),{publicRead:true})).status,404);
  const body=encodeBlogLayout({schemaVersion:1,cover:{mediaId:f.media.id,alt:'Synthetic',caption:'',focusX:50,focusY:50},blocks:[]}),id=randomUUID();
  for(const [action,version,content] of [['save',0,{title:'Synthetic',summary:'',body}],['publish',1,{layoutVersion:1}]]){
   const request=f.signedParts({path:'/api/v2/account/control/content',method:'POST',payload:{requestId:randomUUID(),target:'post',id,slug:'synthetic-public',action,version,content},sessionHash:f.envelope(null).sessionHash,expectedAccountId:f.owner.id});
   const res=await wire(WORKER_ORIGIN+'/api/v2/account/internal/control',{method:'POST',headers:request.headers,body:await request.text()});assert.equal(res.status,200);
  }
 });
 await check('full public read is signed, bounded and hash verified on BFF',async()=>{
  const r=await readPhotoParts({sessionHash:null,expectedAccountId:null},f.media.id,rpc,{publishedOnly:true});assert.equal(r.media.data,f.media.data);
 });
 await check('unpublish between reads denies next part; cached authorization never reused',async()=>{
  assert.equal((await call(f.read(),{publicRead:true})).status,200);
  await db.exec("UPDATE nexus_content_posts SET state='archived'");assert.equal((await call(f.read(1),{publicRead:true})).status,404);
 });
 await check('actual D1 expiry cascade and nonce cleanup preserve saved media and legacy replay records',async()=>{
  const next=f.begin();assert.equal((await call(next)).status,200);assert.equal((await call(f.part(next,0))).status,200);
  await db.prepare('UPDATE nexus_content_media_uploads SET expires_at=? WHERE upload_id=?').bind('2000-01-01T00:00:00.000Z',next.uploadId).run();
  await db.exec("INSERT INTO nexus_admin_nonces VALUES('mp1:expired','2000-01-01T00:00:00.000Z'); INSERT INTO nexus_admin_nonces VALUES('legacy-expired','2000-01-01T00:00:00.000Z')");
  assert.equal((await call(f.commit(next))).status,409);assert.equal(await count('nexus_content_media_parts'),0);assert.equal(await count('nexus_content_media'),1);assert.equal(await count('nexus_content_media_audit'),1);
  assert.equal(await db.prepare("SELECT nonce FROM nexus_admin_nonces WHERE nonce='mp1:expired'").first(),null);assert.ok(await db.prepare("SELECT nonce FROM nexus_admin_nonces WHERE nonce='legacy-expired'").first());
 });
 await check('account mismatch and stale passkey cannot read private parts',async()=>{
  assert.equal((await call(f.read(),{expected:'another-account'})).status,401);
  await db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').bind(new Date(Date.now()-600000).toISOString(),f.owner.session).run();
  assert.equal((await call(f.read())).status,401);
  await db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').bind(new Date().toISOString(),f.owner.session).run();
 });
 await check('12001-byte private envelope rejected before temporary data mutation',async()=>{
  const p={...f.begin(),padding:''},v=f.envelope(p);p.padding='x'.repeat(12001-Buffer.byteLength(JSON.stringify(v)));const req=f.signedParts(v);
  const res=await fetch(new URL('/api/v2/account/internal/control',base),{method:'POST',headers:req.headers,body:await req.text()});assert.equal(res.status,413);
  assert.equal(await count('nexus_content_media'),1);
 });
 await check('revoked session fails closed after restart; stored media remains intact',async()=>{
  await db.prepare("UPDATE account_sessions SET revoked_at=?,status='revoked' WHERE id=?").bind(new Date().toISOString(),f.owner.session).run();
  assert.equal((await call(f.read())).status,401);assert.equal(await count('nexus_content_media'),1);assert.equal(await count('nexus_content_media_audit'),1);
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 });
 assert.equal(outbound,0);
}catch(e){process.exitCode=1;console.log(JSON.stringify({status:'FAIL',failure:failure||{code:e.code||e.name},message:String(e.message).slice(0,120)}))}
finally{
 if(mf)await mf.dispose();f.close();
 const result={status:process.exitCode?'FAIL':'PASS',checks:records.length,records,failure,compatibilityDate:'2026-09-23',runtime:'actual workerd HTTP + persistent D1; two restarts',requests,maxEnvelope,outboundRequests:outbound,cloudWrites:0,syntheticOnly:true};
 if(process.env.NEXUS_TEST_RESULT)await writeFile(process.env.NEXUS_TEST_RESULT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...result,records:undefined}));
}
