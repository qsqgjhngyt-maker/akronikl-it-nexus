import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mediaPartsFixture} from './helpers/media-parts-fixture.mjs';
import {handleAdminService} from '../server-access/worker/admin-service.mjs';
import {encodeBlogLayout} from '../core/blog-layout.js';
import {MAX_ENVELOPE,metaOf,validMeta} from '../server-access/media-parts-contract.mjs';
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
const outcome=(r,status,code)=>{assert.equal(r.status,status);if(code)assert.equal(r.body.error?.code,code)};
const fresh=async fn=>{const f=await mediaPartsFixture();try{await fn(f)}finally{f.close()}};
await check('exact byte limit, canonical metadata and 16-part boundary',()=>fresh(async f=>{
 assert.equal(metaOf(f.media).totalParts,16);assert.equal(validMeta({...metaOf(f.media),bytes:98304,encodedLength:131072,totalParts:16}),true);
 for(const patch of [{bytes:98305},{encodedLength:131073},{totalParts:17},{width:0},{height:1601},{mime:'image/png'}])assert.equal(validMeta({...metaOf(f.media),...patch}),false);
 const b=f.begin();assert.ok(Buffer.byteLength(JSON.stringify(f.envelope(f.part(b,0))))<MAX_ENVELOPE);
}));
await check('out-of-order 16-part commit is exact, atomic, and audited once',()=>fresh(async f=>{
 const b=await f.filled({order:Array.from({length:16},(_,i)=>15-i)});assert.deepEqual(f.counts(),{media:0,audit:0,parts:16});
 outcome(await f.callParts(f.commit(b)),200);assert.deepEqual(f.counts(),{media:1,audit:1,parts:0});
 assert.equal(f.db.prepare('SELECT jpeg_base64 FROM nexus_content_media').get().jpeg_base64,f.media.data);
 outcome(await f.callParts(f.commit(b)),200);assert.equal(f.counts().audit,1);
}));
await check('same part is idempotent; conflicting part never overwrites stored bytes',()=>fresh(async f=>{
 const b=f.begin();outcome(await f.callParts(b),200);const p=f.part(b,0);outcome(await f.callParts(p),200);
 outcome(await f.callParts({...p,requestId:randomUUID()}),200);
 const {sha}=await import('./helpers/media-parts-fixture.mjs'),data='AAAA'+p.data.slice(4);
 outcome(await f.callParts({...p,requestId:randomUUID(),data,sha256:sha(data)}),409);
 assert.equal(f.db.prepare('SELECT data FROM nexus_content_media_parts').get().data,p.data);
}));
await check('incomplete commit fails without publication or audit',()=>fresh(async f=>{
 const b=f.begin();outcome(await f.callParts(b),200);outcome(await f.callParts(f.part(b,0)),200);
 outcome(await f.callParts(f.commit(b)),409,'CONTENT_MEDIA_PARTS_INCOMPLETE');assert.equal(f.counts().audit,0);assert.equal(f.counts().media,0);
}));
for(const [name,modify] of [
 ['part 8193 chars',p=>({...p,data:p.data+'A'})],['wrong part digest',p=>({...p,sha256:'0'.repeat(64)})],
 ['out of range index',p=>({...p,index:16})],['noncanonical base64',p=>({...p,data:'?'.repeat(p.data.length)})],
 ['padding in nonfinal part',p=>({...p,data:p.data.slice(0,-1)+'='})],['unknown property',p=>({...p,token:'SYNTHETIC'})]
])await check(name+' denied before part write',()=>fresh(async f=>{const b=f.begin();outcome(await f.callParts(b),200);outcome(await f.callParts(modify(f.part(b,0))),400);assert.equal(f.counts().parts,0)}));
for(const [name,change] of [
 ['session logout',f=>f.db.prepare("UPDATE account_sessions SET status='revoked',revoked_at=? WHERE id=?").run(new Date().toISOString(),f.owner.session)],
 ['account disabled',f=>f.db.prepare("UPDATE account_subjects SET status='disabled' WHERE id=?").run(f.owner.id)],
 ['admin grant revoked',f=>f.db.prepare("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id=?").run(f.owner.id)],
 ['device revoked',f=>f.db.prepare("UPDATE account_devices SET status='revoked' WHERE subject_id=?").run(f.owner.id)],
 ['passkey removed',f=>f.db.prepare('DELETE FROM nexus_passkey_credentials WHERE account_id=?').run(f.owner.id)],
 ['freshness expired',f=>f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date(Date.now()-300001).toISOString(),f.owner.session)],
 ['blocked member',f=>f.db.prepare("INSERT INTO nexus_alpha_members(account_id,state,created_at,updated_at) VALUES(?,'blocked',?,?)").run(f.owner.id,new Date().toISOString(),new Date().toISOString())]
])await check(name+' between phases denies commit and preserves existing data',()=>fresh(async f=>{
 const b=await f.filled();change(f);const r=await f.callParts(f.commit(b));assert.ok([401,403].includes(r.status));assert.equal(f.counts().media,0);assert.equal(f.counts().audit,0);
}));
await check('account/session switch cannot reuse another upload id',()=>fresh(async f=>{
 const b=f.begin();outcome(await f.callParts(b),200);const other=f.seed('other-admin',{admin:true});
 outcome(await f.callParts(f.part(b,0),{actor:other}),409);outcome(await f.callParts(f.commit(b),{expected:other.id}),401,'ACCOUNT_SESSION_CHANGED');
}));
await check('atomic authorization race at commit rolls back all media/audit writes',()=>fresh(async f=>{
 const b=await f.filled();f.beforeBatch(()=>f.db.prepare("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id=?").run(f.owner.id));
 outcome(await f.callParts(f.commit(b)),409);assert.deepEqual(f.counts(),{media:0,audit:0,parts:16});
}));
await check('simulated D1 batch fault leaves pending state and allows explicit new commit',()=>fresh(async f=>{
 const b=await f.filled(),batch=f.env.DB.batch;let first=true;f.env.DB.batch=async commands=>{if(first){first=false;throw Error('SYNTHETIC_D1_FAULT')}return batch(commands)};
 outcome(await f.callParts(f.commit(b)),409);assert.deepEqual(f.counts(),{media:0,audit:0,parts:16});
 outcome(await f.callParts(f.commit(b)),200);assert.equal(f.counts().audit,1);
}));
await check('wrong full digest, tampered parts, and mismatching JPEG dimensions cannot commit',()=>fresh(async f=>{
 const b=await f.filled();outcome(await f.callParts({...f.commit(b),sha256:'0'.repeat(64)}),400);
 f.db.prepare('UPDATE nexus_content_media_parts SET part_sha256=? WHERE upload_id=? AND part_index=0').run('0'.repeat(64),b.uploadId);
 outcome(await f.callParts(f.commit(b)),409);assert.equal(f.counts().audit,0);
 f.db.prepare('UPDATE nexus_content_media_parts SET part_sha256=? WHERE upload_id=? AND part_index=0').run(f.part(b,0).sha256,b.uploadId);
 f.db.prepare('UPDATE nexus_content_media_uploads SET width=width-1 WHERE upload_id=?').run(b.uploadId);
 outcome(await f.callParts(f.commit(b)),409);assert.equal(f.counts().media,0);
}));
await check('expiry cleanup removes only temporary rows; abort does not delete saved data',()=>fresh(async f=>{
 const b=await f.filled();f.db.prepare('UPDATE nexus_content_media_uploads SET expires_at=? WHERE upload_id=?').run('2000-01-01T00:00:00.000Z',b.uploadId);
 outcome(await f.callParts(f.commit(b)),409);assert.equal(f.counts().parts,0);assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(f.owner.id));
 const next=f.begin();outcome(await f.callParts(next),200);outcome(await f.callParts(f.abort(next)),200);outcome(await f.callParts(f.part(next,0)),409);
}));
await check('one pending/account, global 16, and quota reservations remain bounded atomically',()=>fresh(async f=>{
 const b=f.begin();outcome(await f.callParts(b),200);outcome(await f.callParts(f.begin()),409);
 for(let i=0;i<15;i++){const actor=f.seed('capacity-admin-'+i,{admin:true});outcome(await f.callParts(f.begin(),{actor}),200)}
 const actor=f.seed('capacity-last',{admin:true});outcome(await f.callParts(f.begin(),{actor}),409);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM nexus_content_media_uploads WHERE state='pending'").get().n,16);
}));
await check('race creating second reservation for same account is caught inside batch',()=>fresh(async f=>{
 const b=f.begin();f.beforeBatch(()=>{const m=b.meta;f.db.prepare("INSERT INTO nexus_content_media_uploads VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)").run(randomUUID(),f.owner.id,f.owner.session,randomUUID(),randomUUID(),m.id,m.encodedLength,m.bytes,m.width,m.height,m.totalParts,new Date().toISOString(),new Date(Date.now()+300000).toISOString())});
 outcome(await f.callParts(b),409);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_uploads').get().n,1);
}));
await check('storage bytes and media count quota rejects reservation without writes',()=>fresh(async f=>{
 const insert=f.db.prepare('INSERT INTO nexus_content_media VALUES(?,?,16,16,98304,?,?)');
 for(let i=0;i<683;i++)insert.run(String(i).padStart(64,'0'),'AAAA',f.owner.id,new Date().toISOString());
 outcome(await f.callParts(f.begin()),409);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_uploads').get().n,0);
}));
await check('signed nonce replay and forged HMAC are denied, every RPC requires service auth',()=>fresh(async f=>{
 const req=f.signedParts(f.envelope(f.begin()));assert.equal((await handleAdminService(req.clone(),f.env)).status,200);assert.equal((await handleAdminService(req.clone(),f.env)).status,401);
 assert.equal((await handleAdminService(f.signedParts(f.envelope(f.read()),{signature:'0'.repeat(64)}),f.env)).status,401);
}));
await check('private reads require fresh admin and public reads require published reference on every part',()=>fresh(async f=>{
 const b=await f.filled();outcome(await f.callParts(f.commit(b)),200);
 const ordinary=f.seed('ordinary-reader');outcome(await f.callParts(f.read(),{actor:ordinary}),403);outcome(await f.callParts(f.read(),{publicRead:true}),404);
 const body=encodeBlogLayout({schemaVersion:1,cover:{mediaId:f.media.id,alt:'Synthetic',caption:'',focusX:50,focusY:50},blocks:[]});
 const postId=randomUUID(),post=(action,version,content)=>f.call('/api/v2/account/control/content',{method:'POST',payload:{requestId:randomUUID(),target:'post',id:postId,slug:'synthetic-public',action,version,content}},f.env);
 outcome(await post('save',0,{title:'Synthetic',summary:'',body}),200);outcome(await post('publish',1,{layoutVersion:1}),200);
 const r=await f.callParts(f.read(),{publicRead:true});outcome(r,200);assert.ok(Buffer.byteLength(JSON.stringify(r.body))<=12000);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('vary'),'*');assert.equal(r.headers.has('set-cookie'),false);
 f.db.exec("UPDATE nexus_content_posts SET state='archived'");outcome(await f.callParts(f.read(1),{publicRead:true}),404);
 const forged=f.envelope({...f.read(),phase:'commit'},{publicRead:true});assert.equal((await handleAdminService(f.signedParts(forged),f.env)).status,400);
}));
await check('default disabled and mixed old/new paths fail closed without fallback',()=>fresh(async f=>{
 outcome(await f.callParts(f.begin(),{env:{...f.env,CONTENT_MEDIA_PARTS_ENABLED:'false'}}),503);
 outcome(await f.call('/api/v2/account/control/content',{method:'POST',payload:f.external()},f.env),503,'CONTENT_MEDIA_PARTS_REQUIRED');
 const env={...f.env,CONTENT_MEDIA_PARTS_ENABLED:'false'};outcome(await f.call('/api/v2/account/control/content',{method:'POST',payload:f.external()},env),200);
}));
await check('new tables preserve unrelated purge; reservation appearing during purge denies destructive commit',()=>fresh(async f=>{
 const target=f.seed('purge-parts-target'),base='/api/v2/account/control/users/'+target.id;
 outcome(await f.call(base+'/action',{method:'POST',payload:{requestId:randomUUID(),version:1,action:'remove'}},f.env),200);
 const preview=await f.call(base+'/purge-preview',{method:'POST',payload:{requestId:randomUUID(),version:2}},f.env);outcome(preview,200);
 const m=metaOf(f.media);
 f.beforeBatch(()=>f.db.prepare("INSERT INTO nexus_content_media_uploads VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)").run(randomUUID(),target.id,target.session,randomUUID(),randomUUID(),m.id,m.encodedLength,m.bytes,m.width,m.height,m.totalParts,new Date().toISOString(),new Date(Date.now()+300000).toISOString()));
 outcome(await f.call(base+'/purge',{method:'POST',payload:{requestId:randomUUID(),version:2,approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation}},f.env),409);
 assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(target.id));
 outcome(await f.call(base+'/purge-preview',{method:'POST',payload:{requestId:randomUUID(),version:2}},f.env),409,'PURGE_SCHEMA_REVIEW_REQUIRED');
}));
await check('pending reservation counts against existing 1000-media quota',()=>fresh(async f=>{
 const insert=f.db.prepare('INSERT INTO nexus_content_media VALUES(?,?,16,16,4,?,?)');
 for(let i=0;i<999;i++)insert.run(String(i).padStart(64,'0'),'AAAA',f.owner.id,new Date().toISOString());
 outcome(await f.callParts(f.begin()),200);
 const other=f.seed('quota-other-admin',{admin:true});outcome(await f.callParts(f.begin(),{actor:other}),409);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_uploads').get().n,1);
}));
await check('existing 120/account/minute limit is not expanded by parts protocol',()=>fresh(async f=>{
 f.db.prepare('INSERT INTO nexus_admin_rate_limits(scope,bucket,used) VALUES(?,?,120)').run(f.owner.id,Math.floor(Date.now()/60000));
 outcome(await f.callParts(f.begin()),429,'RATE_LIMITED');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_content_media_uploads').get().n,0);
}));
await check('ordinary admin with stale key cannot use private read phase',()=>fresh(async f=>{
 f.db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date(Date.now()-300001).toISOString(),f.owner.session);
 outcome(await f.callParts(f.read()),401,'ADMIN_FRESH_PASSKEY_REQUIRED');
}));
await check('exact 12000 bound reaches validation; 12001 and duplicate JSON key are rejected',()=>fresh(async f=>{
 const p={...f.begin(),padding:''},e=f.envelope(p);p.padding='x'.repeat(12000-Buffer.byteLength(JSON.stringify(e)));
 assert.equal((await handleAdminService(f.signedParts(e),f.env)).status,400);
 p.padding+='x';assert.equal((await handleAdminService(f.signedParts(e),f.env)).status,413);
 const raw=JSON.stringify(f.envelope(f.begin())).replace('"method":"POST"','"method":"GET","method":"POST"');assert.equal((await handleAdminService(f.signedParts(raw),f.env)).status,400);
}));
await check('public read has bounded 1920-RPC/min scope without consuming admin quota or storing rejected nonces',()=>fresh(async f=>{
 const bucket=Math.floor(Date.now()/60000),insert=f.db.prepare('INSERT INTO nexus_admin_rate_limits VALUES(?,?,120)');
 for(const digit of '0123456789abcdef')insert.run('!media-public-v1:'+digit,bucket);
 const before=f.db.prepare('SELECT COUNT(*) n FROM nexus_admin_nonces').get().n;
 outcome(await f.callParts(f.read(),{publicRead:true}),429,'RATE_LIMITED');
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM nexus_admin_nonces').get().n,before);
 outcome(await f.callParts(f.begin()),200);
}));
await check('only expired parts nonces are cleaned; legacy and live nonces remain',()=>fresh(async f=>{
 const put=f.db.prepare('INSERT INTO nexus_admin_nonces VALUES(?,?)');
 put.run('mp1:expired','2000-01-01T00:00:00.000Z');put.run('legacy-expired','2000-01-01T00:00:00.000Z');put.run('mp1:live',new Date(Date.now()+30000).toISOString());
 outcome(await f.callParts(f.begin()),200);
 assert.equal(f.db.prepare('SELECT nonce FROM nexus_admin_nonces WHERE nonce=?').get('mp1:expired'),undefined);
 assert.ok(f.db.prepare('SELECT nonce FROM nexus_admin_nonces WHERE nonce=?').get('legacy-expired'));assert.ok(f.db.prepare('SELECT nonce FROM nexus_admin_nonces WHERE nonce=?').get('mp1:live'));
}));
console.log(JSON.stringify({status:'PASS',checks,cloudWrites:0,syntheticOnly:true}));
