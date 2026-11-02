// Real migration chain, BFF -> signed Worker -> SQLite. Synthetic data only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import {handleInvitedPasswordService} from './worker/invited-password-service.mjs';
import {managedInvitation} from './worker/alpha-admission.mjs';
import {readEligibleAccountFoundation} from './worker/account-foundation.js';
import {createInvitedPasswordHandler} from './bff/invited-password.mjs';
import {sendPasswordMail} from './bff/password-mail.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const f=await controlFixture(),db=f.db,checks=[];
for(const name of ['0016_blog_media_parts','0018_course_final','0019_akronikl','0021_invited_email_password','0022_password_mail_recovery'])
 db.exec(readFileSync(new URL('./migrations/'+name+'.sql',import.meta.url),'utf8'));
const key='SYNTHETIC_PASSWORD_SERVICE_KEY_FOR_TESTS_ONLY';
Object.assign(f.env,{INVITED_PASSWORD_ENABLED:'true',INVITED_PASSWORD_SERVICE_KEY:key});
const env={INVITED_PASSWORD_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',INVITED_PASSWORD_SERVICE_KEY:key,
 INVITED_PASSWORD_ORIGIN:'https://nexus.invalid',INVITED_PASSWORD_WORKER_ORIGIN:'https://worker.invalid',
 INVITED_PASSWORD_MAIL_ENABLED:'true',RESEND_API_KEY:'re_SYNTHETIC_MAIL_KEY_ONLY',INVITED_PASSWORD_MAIL_FROM:'nexus@example.com'};
const calls=[],mailbox=[];
const fetchImpl=async(url,options)=>{
 assert.equal(url,'https://worker.invalid/api/v2/account/internal/invited-password');
 const fields=JSON.parse(options.body);calls.push(fields);assert.ok(!('password' in fields));
 return handleInvitedPasswordService(new Request(url,options),f.env);
};
const handler=createInvitedPasswordHandler({env,fetchImpl,wait:async()=>{},sendMail:async mail=>{mailbox.push(mail)}});
async function post(action,body,headers={},selected=handler){
 const req=Readable.from([Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
 req.url='/api/v2/account/password/'+action;req.method='POST';req.socket={remoteAddress:'192.0.2.1'};
 req.headers={host:'nexus.invalid',origin:'https://nexus.invalid','content-type':'application/json','x-nexus-password-write':'1','sec-fetch-site':'same-origin',...headers};
 req.rawHeaders=Object.entries(req.headers).flat();let status,responseHeaders,result;
 await selected(req,{writeHead(code,value){status=code;responseHeaders=value},end(body){result=JSON.parse(body)}});
 assert.equal(responseHeaders['cache-control'],'no-store');return {status,headers:responseHeaders,data:result};
}
async function rpc(op,fields={},overrides={}){
 const body=JSON.stringify({op,...fields}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',key).update(['v1','POST','/api/v2/account/internal/invited-password',timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const request=new Request('https://worker.invalid/api/v2/account/internal/invited-password',{method:'POST',body,
  headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature,...overrides}});
 const copy=request.clone(),response=await handleInvitedPasswordService(request,f.env);
 return {status:response.status,data:await response.json(),request:copy};
}
const clearRates=()=>db.exec('DELETE FROM nexus_password_rate_limits');
async function invite(email='guest@example.com'){
 const r=await f.call('/api/v2/account/control/invites',{method:'POST',payload:{requestId:crypto.randomUUID(),ttlMinutes:60,trialMinutes:60,email}});
 assert.equal(r.status,200,JSON.stringify(r.body));return {...r.body,email};
}
const pass='Synthetic unique password 12345';
async function verify(i){clearRates();assert.equal((await post('verify-email',{email:i.email,invitationToken:i.invitationToken})).status,200);return mailbox.at(-1).code}
const fields=(i,code)=>({invitationToken:i.invitationToken,email:i.email,code,username:'guest.'+randomBytes(4).toString('hex'),displayName:'Synthetic guest',password:pass});
async function login(email,password=pass){clearRates();return post('login',{email,password})}
const check=async(name,task)=>{clearRates();await task();checks.push(name);console.log('PASS '+name)};
try{
 await check('Actual migrations preserve existing owner session and foreign keys',async()=>{
  assert.ok(await readEligibleAccountFoundation(f.env.DB,sha(f.owner.secret),undefined,f.env));assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 });
 const i=await invite();let code,session;
 await check('Flags OFF and invalid origin fail before upstream/KDF',async()=>{
  assert.equal((await post('login',{email:i.email,password:pass},{},createInvitedPasswordHandler({env:{}}))).status,503);
  assert.equal((await post('login',{email:i.email,password:pass},{origin:'https://evil.invalid'})).status,403);
  assert.equal((await post('login',{}, {'sec-fetch-site':'cross-site'})).status,403);assert.equal(calls.length,0);
 });
 await check('Email proof goes only to bound mailbox with neutral response',async()=>{
  const a=await post('verify-email',{email:'other@example.com',invitationToken:i.invitationToken});assert.equal(mailbox.length,0);
  const b=await post('verify-email',{email:' GUEST@EXAMPLE.COM ',invitationToken:i.invitationToken});
  assert.deepEqual(a,b);assert.equal(mailbox.length,1);assert.equal(mailbox[0].to,i.email);code=mailbox[0].code;assert.ok(!JSON.stringify(b).includes(code));
 });
 await check('Email invitation cannot use Passkey even with flag OFF',async()=>{
  await assert.rejects(()=>managedInvitation({...f.env,INVITED_PASSWORD_ENABLED:'false'},sha(i.invitationToken)),e=>e.code==='ENROLLMENT_REQUIRED');
 });
 await check('Incorrect email code cannot consume invitation',async()=>{
  assert.notEqual((await post('enroll',fields(i,'x'.repeat(43)))).status,200);
  assert.equal(db.prepare('SELECT state FROM nexus_admin_invites WHERE account_id=?').get(i.accountId).state,'ready');
 });
 await check('Verified enrollment is atomic, invite is one-use, trial waits for login',async()=>{
  const r=await post('enroll',fields(i,code));assert.equal(r.status,200,JSON.stringify(r));
  const p=db.prepare('SELECT * FROM nexus_password_credentials WHERE account_id=?').get(i.accountId);assert.ok(p.email_verified_at);assert.equal(p.version,1);
  assert.equal(db.prepare('SELECT first_login_at FROM nexus_alpha_members WHERE account_id=?').get(i.accountId).first_login_at,null);
  assert.notEqual((await post('enroll',fields(i,code))).status,200);
 });
 await check('Unknown/wrong login is neutral; no password reaches Worker',async()=>{
  assert.deepEqual((await login(i.email,'Wrong synthetic password 123')).data,(await login('unknown@example.com')).data);assert.ok(!JSON.stringify(calls).includes(pass));
 });
 await check('Secure session supports account read and trial without admin ACL',async()=>{
  const r=await login(i.email);assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data,{ok:true});assert.match(r.headers['set-cookie'][0],/HttpOnly; Secure; SameSite=Strict/);
  session=/nxs_[A-Za-z0-9_-]{43}/.exec(r.headers['set-cookie'][0])[0];
  assert.equal((await readEligibleAccountFoundation(f.env.DB,sha(session),undefined,f.env)).account.accountId,i.accountId);
  assert.ok(db.prepare('SELECT first_login_at FROM nexus_alpha_members WHERE account_id=?').get(i.accountId).first_login_at);
  assert.equal((await f.call('/api/v2/account/control/users',{actor:{id:i.accountId,secret:session}})).status,403);
  assert.equal(db.prepare('SELECT count(*) n FROM nexus_admin_grants').get().n,1);
 });
 await check('Old successful challenge does not break expiry cleanup',async()=>{
  db.exec("UPDATE nexus_password_challenges SET expires_at='2000-01-01T00:00:00.000Z'");assert.equal((await login(i.email)).status,200);
 });
 await check('Owner block revokes sessions and recovery cannot reopen access',async()=>{
  let version=db.prepare('SELECT version FROM nexus_alpha_members WHERE account_id=?').get(i.accountId).version;
  assert.equal((await f.call('/api/v2/account/control/users/'+i.accountId+'/action',{method:'POST',payload:{requestId:crypto.randomUUID(),version,action:'block'}})).status,200);
  assert.equal(await readEligibleAccountFoundation(f.env.DB,sha(session),undefined,f.env),null);
  const before=mailbox.length;assert.equal((await post('recover',{email:i.email})).status,200);assert.equal(mailbox.length,before);assert.equal((await login(i.email)).status,401);
  version=db.prepare('SELECT version FROM nexus_alpha_members WHERE account_id=?').get(i.accountId).version;
  assert.equal((await f.call('/api/v2/account/control/users/'+i.accountId+'/action',{method:'POST',payload:{requestId:crypto.randomUUID(),version,action:'restore'}})).status,200);
 });
 await check('Recovery consumes code, rotates password, revokes sessions and challenges',async()=>{
  assert.equal((await login(i.email)).status,200);await post('recover',{email:i.email});const c=mailbox.at(-1).code;
  const changed=await post('reset',{email:i.email,code:c,password:'A changed synthetic password 56789'});assert.equal(changed.status,200,JSON.stringify(changed));
  assert.equal(db.prepare("SELECT count(*) n FROM account_sessions WHERE subject_id=? AND status='active'").get(i.accountId).n,0);
  assert.notEqual((await post('reset',{email:i.email,code:c,password:pass})).status,200);
  assert.equal((await login(i.email)).status,401);assert.equal((await login(i.email,'A changed synthetic password 56789')).status,200);
 });
 await check('Rate limits persist without disabling login method',async()=>{
  for(let n=0;n<10;n++)assert.equal((await rpc('begin',{emailHash:sha(i.email),networkHash:sha('rate-network')})).status,200);
  assert.equal((await rpc('begin',{emailHash:sha(i.email),networkHash:sha('other-network')})).status,429);
  assert.equal(db.prepare('SELECT status FROM login_methods WHERE account_id=?').get(i.accountId).status,'active');
 });
 await check('Service signature and nonce replay fail',async()=>{
  assert.equal((await rpc('begin',{emailHash:sha(i.email),networkHash:sha('network')},{'x-nexus-service-signature':'0'.repeat(64)})).status,401);
  const r=await rpc('begin',{emailHash:sha(i.email),networkHash:sha('network')});assert.equal((await handleInvitedPasswordService(r.request,f.env)).status,401);
 });
 await check('Enrollment race with owner revoke rolls back profile and credentials',async()=>{
  const j=await invite('race@example.com'),c=await verify(j);
  f.beforeBatch(()=>db.prepare("UPDATE nexus_alpha_members SET state='blocked' WHERE account_id=?").run(j.accountId));
  assert.notEqual((await post('enroll',fields(j,c))).status,200);
  assert.equal(db.prepare('SELECT count(*) n FROM nexus_password_credentials WHERE account_id=?').get(j.accountId).n,0);
  assert.equal(db.prepare('SELECT count(*) n FROM nexus_account_profiles WHERE account_id=?').get(j.accountId).n,0);
 });
 await check('Expired/revoked invitations and expired/superseded email codes fail',async()=>{
  const j=await invite('expiry@example.com'),c=await verify(j);
  db.prepare("UPDATE nexus_password_mail_tokens SET expires_at='2000-01-01T00:00:00.000Z' WHERE account_id=?").run(j.accountId);
  assert.notEqual((await post('enroll',fields(j,c))).status,200);
  const next=await verify(j);assert.notEqual(c,next);
  assert.notEqual((await post('enroll',fields(j,c))).status,200);
  db.prepare("UPDATE nexus_passkey_invites SET expires_at='2000-01-01T00:00:00.000Z' WHERE account_id=?").run(j.accountId);
  assert.notEqual((await post('enroll',fields(j,next))).status,200);
  db.prepare("UPDATE nexus_admin_invites SET state='revoked' WHERE account_id=?").run(j.accountId);
  assert.notEqual((await post('enroll',fields(j,next))).status,200);
 });
 await check('Login proof is single-use and cannot cross email/network or owner-revoke race',async()=>{
  const j=await invite('login-race@example.com');assert.equal((await post('enroll',fields(j,await verify(j)))).status,200);clearRates();
  const networkHash=sha('race-network'),emailHash=sha(j.email),p=db.prepare('SELECT * FROM nexus_password_credentials WHERE account_id=?').get(j.accountId);
  const getProof=async()=>{
   const c=(await rpc('begin',{emailHash,networkHash})).data;
   return {challengeId:c.challengeId,emailHash,networkHash,proof:createHmac('sha256',Buffer.from(p.hash_b64,'base64url')).update(['v1',c.challengeId,emailHash,networkHash].join('\n')).digest('hex')};
  };
  const proof=await getProof();assert.equal((await rpc('finish',{...proof,networkHash:sha('other')})).status,401);
  assert.equal((await rpc('finish',proof)).status,200);assert.notEqual((await rpc('finish',proof)).status,200);
  const racing=await getProof(),before=db.prepare('SELECT count(*) n FROM account_sessions WHERE subject_id=?').get(j.accountId).n;
  f.beforeBatch(()=>db.prepare("UPDATE nexus_alpha_members SET state='blocked' WHERE account_id=?").run(j.accountId));
  assert.notEqual((await rpc('finish',racing)).status,200);
  assert.equal(db.prepare('SELECT count(*) n FROM account_sessions WHERE subject_id=?').get(j.accountId).n,before);
 });
 await check('Expired recovery and reset racing owner removal cannot change credentials',async()=>{
  await post('recover',{email:i.email});const c=mailbox.at(-1).code;
  db.prepare("UPDATE nexus_password_mail_tokens SET expires_at='2000-01-01T00:00:00.000Z' WHERE account_id=? AND purpose='recover'").run(i.accountId);
  assert.notEqual((await post('reset',{email:i.email,code:c,password:pass})).status,200);
  clearRates();await post('recover',{email:i.email});const newer=mailbox.at(-1).code;
  const p=db.prepare('SELECT * FROM nexus_password_credentials WHERE account_id=?').get(i.accountId);
  f.beforeBatch(()=>db.prepare("UPDATE nexus_alpha_members SET state='removed' WHERE account_id=?").run(i.accountId));
  assert.notEqual((await post('reset',{email:i.email,code:newer,password:pass})).status,200);
  assert.equal(db.prepare('SELECT hash_b64 FROM nexus_password_credentials WHERE account_id=?').get(i.accountId).hash_b64,p.hash_b64);
  db.prepare("UPDATE nexus_alpha_members SET state='active' WHERE account_id=?").run(i.accountId);
 });
 await check('Logout requires protected gateway cookie context and revokes server session',async()=>{
  const r=await login(i.email,'A changed synthetic password 56789');assert.equal(r.status,200);
  const raw=r.headers['set-cookie'][0].split(';')[0],secret=raw.split('=')[1];
  assert.notEqual((await post('logout',{}, {cookie:raw})).status,200);
  const context=Buffer.from(JSON.stringify({passwordIngressContract:'v2',cookieHeader:raw})).toString('base64');
  assert.equal((await post('logout',{}, {cookie:raw,'x-yc-apigateway-operation-context':context})).status,200);
  assert.equal(await readEligibleAccountFoundation(f.env.DB,sha(secret),undefined,f.env),null);
 });
 await check('Disabling password method revokes sessions and blocks recovery',async()=>{
  db.prepare("UPDATE login_methods SET status='disabled',disabled_at=? WHERE account_id=?").run(new Date().toISOString(),i.accountId);
  assert.equal(db.prepare("SELECT count(*) n FROM account_sessions WHERE subject_id=? AND status='active'").get(i.accountId).n,0);
  assert.equal((await login(i.email,'A changed synthetic password 56789')).status,401);
 });
 await check('Mail adapter pins provider and never puts code in URL',async()=>{
  let called=false;await sendPasswordMail({env,to:'guest@example.com',code:'x'.repeat(43),purpose:'recover',fetchImpl:async(url,options)=>{
   called=true;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');assert.ok(JSON.parse(options.body).text.includes('x'.repeat(43)));return new Response('{}');
  }});assert.ok(called);
 });
 await check('Audit is immutable and full schema foreign keys remain valid',async()=>{
  assert.throws(()=>db.exec('DELETE FROM nexus_password_security_audit'),/IMMUTABLE/);const a=JSON.stringify(db.prepare('SELECT * FROM nexus_password_security_audit').all());assert.ok(!a.includes(pass));assert.ok(!a.includes(code));assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 });
 console.log(JSON.stringify({result:'PASS',checks,remoteDatabaseWrites:0,realEmailsSent:0},null,2));
}finally{f.close()}
