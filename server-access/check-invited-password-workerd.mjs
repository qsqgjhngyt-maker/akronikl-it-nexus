// Actual local workerd + D1, all migrations. No remote DB or outbound network.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHmac,createHash,randomBytes,scryptSync} from 'node:crypto';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
const f=await controlFixture(),key='SYNTHETIC_WORKERD_PASSWORD_SERVICE_KEY_ONLY';let outbound=0;
const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('worker-bundle/entry.mjs',import.meta.url)),
 compatibilityDate:'2026-09-23',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'synthetic-password'},
 bindings:{ALPHA_ADMISSION_ENABLED:'true',ADMIN_CONTROL_ENABLED:'true',ADMIN_SERVICE_KEY:f.env.ADMIN_SERVICE_KEY,INVITED_PASSWORD_ENABLED:'true',INVITED_PASSWORD_SERVICE_KEY:key},
 outboundService:()=>{outbound++;return new Response('FORBIDDEN',{status:503})}});
const sha=v=>createHash('sha256').update(v).digest('hex'),checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
let db,invitation,accountId;
async function rpc(op,fields={}){
 const path='/api/v2/account/internal/invited-password',body=JSON.stringify({op,...fields}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',key).update(['v1','POST',path,timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const r=await mf.dispatchFetch('https://synthetic.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
 return {status:r.status,body:await r.json()};
}
const emailHash=sha('worker-guest@example.com'),networkHash=sha('synthetic-network'),tokenHash=sha('synthetic-mail-code');
const salt=randomBytes(16),hash=scryptSync('Synthetic workerd password',salt,32,{N:32768,r:8,p:3,maxmem:96*1024*1024});
try{
 db=await mf.getD1Database('DB');
 await check('Actual D1 applies complete migration chain through 0024',async()=>{
  const foundation=['0001_sync_team_foundation','0002_nexus_account_tokens','0003_d1_only_project_snapshots','0004_identity_v2_session_foundation'].map(n=>'../cloudflare/nexus-sync-worker/migrations/'+n+'.sql');
  const files=await readdir(new URL('migrations/',import.meta.url));
  for(const file of [...foundation,...files.filter(n=>n.endsWith('.sql')).sort().map(n=>'migrations/'+n)]){
   const text=(await readFile(new URL(file,import.meta.url),'utf8')).split(/\r?\n/).filter(n=>!n.trimStart().startsWith('--')).join(' ');await db.exec(text);
  }
  for(const table of ['account_subjects','login_methods','nexus_passkey_users','nexus_passkey_credentials','account_devices','account_sessions','session_login_methods','nexus_admin_grants']){
   for(const row of f.db.prepare('SELECT * FROM '+table).all()){
    const keys=Object.keys(row);await db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').bind(...Object.values(row)).run();
   }
  }
  await db.exec('UPDATE nexus_alpha_settings SET enforced=1 WHERE id=1');
 });
 await check('Fresh admin session issues email-bound invitation in D1',async()=>{
  const r=f.signed('/api/v2/account/control/invites',{method:'POST',payload:{requestId:crypto.randomUUID(),ttlMinutes:60,trialMinutes:60,email:'worker-guest@example.com'}});
  const result=await mf.dispatchFetch(r.url,{method:'POST',headers:r.headers,body:await r.text()});const body=await result.json();assert.equal(result.status,200,JSON.stringify(body));invitation=body.invitationToken;accountId=body.accountId;
 });
 await check('Workerd verifies HMAC mail proof and enrolls once',async()=>{
  assert.equal((await rpc('mail-enroll',{emailHash,networkHash,tokenHash,inviteHash:sha(invitation)})).body.deliver,true);
  const data={emailHash,networkHash,tokenHash,inviteHash:sha(invitation),username:'workerd.guest',displayName:'Synthetic guest',saltB64:salt.toString('base64url'),hashB64:hash.toString('base64url')};
  const r=await rpc('enroll',data);assert.equal(r.status,200,JSON.stringify(r));assert.notEqual((await rpc('enroll',data)).status,200);
 });
 let secret;
 await check('D1 batch prevents parallel challenge replay and issues one session',async()=>{
  const c=(await rpc('begin',{emailHash,networkHash})).body;
  const proof=createHmac('sha256',hash).update(['v1',c.challengeId,emailHash,networkHash].join('\n')).digest('hex');
  const data={challengeId:c.challengeId,emailHash,networkHash,proof};
  const results=await Promise.all([rpc('finish',data),rpc('finish',data)]);assert.equal(results.filter(r=>r.status===200).length,1,JSON.stringify(results));secret=results.find(r=>r.status===200).body.sessionSecret;
  assert.equal((await db.prepare('SELECT count(*) n FROM account_sessions WHERE subject_id=?1').bind(accountId).first()).n,1);
 });
 await check('Recovery resets atomically and revokes existing server session',async()=>{
  const tokenHash=sha('recovery-code');assert.equal((await rpc('mail-recover',{emailHash,networkHash,tokenHash})).body.deliver,true);
  const fresh=randomBytes(16),freshHash=scryptSync('Changed synthetic password',fresh,32,{N:32768,r:8,p:3,maxmem:96*1024*1024});
  const data={emailHash,networkHash,tokenHash,saltB64:fresh.toString('base64url'),hashB64:freshHash.toString('base64url')};
  assert.equal((await rpc('reset',data)).status,200);assert.notEqual((await rpc('reset',data)).status,200);
  assert.equal((await db.prepare('SELECT status FROM account_sessions WHERE secret_hash=?1').bind(sha(secret)).first()).status,'revoked');
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 });
 assert.equal(outbound,0);console.log(JSON.stringify({result:'PASS',checks,outboundRequests:outbound,remoteDatabaseWrites:0}));
}finally{await mf.dispose();f.close()}
