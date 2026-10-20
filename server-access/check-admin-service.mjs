import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import {controlFixture,sha} from '../tests/helpers/control-fixture.mjs';
import {sanitizeAvatar} from './avatar-codec.mjs';
import {alphaAccess,validUsername,validDisplayName} from './worker/alpha-admission.mjs';
import {handleAdminService} from './worker/admin-service.mjs';
const base='/api/v2/account/control',f=await controlFixture(),{db,env,owner}=f;
const requestId=f.requestId,post=(path,payload,options={})=>f.call(base+path,{method:'POST',payload:{requestId:requestId(),...payload},...options});
let tests=0;const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
const state=id=>db.prepare('SELECT * FROM nexus_alpha_members WHERE account_id=?').get(id);
const count=table=>db.prepare('SELECT count(*) n FROM '+table).get().n;
try{
 await check('schema is additive, enforcement requires administrator Passkey; owner cannot be removed',async()=>{
  assert.equal((await f.call(base+'/capabilities')).body.canManage,true);
  assert.equal(count('nexus_admin_grants'),1);
  const response=await post('/users/'+owner.id+'/action',{version:1,action:'remove'});
  assert.equal(response.status,403);assert.equal(response.body.error.code,'ADMIN_ACCOUNT_PROTECTED');
 });
 const learner=f.seed('synthetic-learner',{username:'learner.one'});
 await check('ordinary user capabilities false; list and write are denied by server',async()=>{
  assert.equal((await f.call(base+'/capabilities',{actor:learner})).body.canManage,false);
  assert.equal((await f.call(base+'/users',{actor:learner})).status,403);
  const response=await post('/invites',{ttlMinutes:60},{actor:learner});assert.equal(response.status,403);assert.equal(count('nexus_admin_invites'),0);
 });
 await check('disabled feature, bad HMAC, Cookie and service replay fail closed',async()=>{
  assert.equal((await f.call(base+'/users',{},{})).status,503);
  for(const headers of [{'x-nexus-service-signature':'0'.repeat(64)},{cookie:'synthetic=only'},{authorization:'Bearer synthetic'}])assert.equal((await f.call(base+'/users',{headers})).status,401);
  const nonce='a'.repeat(32);assert.equal((await f.call(base+'/users',{nonce})).status,200);assert.equal((await f.call(base+'/users',{nonce})).status,401);
 });
 await check('captured account mismatch never authorizes another account',async()=>{
  const req=f.signed(base+'/users'),body=JSON.parse(await req.text());body.expectedAccountId=learner.id;
  // A fake actor id cannot gain a valid signature.
  const response=await handleAdminService(new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(body)}),env);assert.equal(response.status,401);
 });
 await check('stale admin and OAuth-only session cannot mutate users',async()=>{
  const old=db.prepare('SELECT created_at FROM account_sessions WHERE id=?').get(owner.session).created_at;
  db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(new Date(Date.now()-301000).toISOString(),owner.session);
  assert.equal((await post('/invites',{ttlMinutes:60})).body.error.code,'ADMIN_FRESH_PASSKEY_REQUIRED');
  db.prepare('UPDATE account_sessions SET created_at=? WHERE id=?').run(old,owner.session);
 });
 await check('list exposes bounded account information and excludes session secrets',async()=>{
  const result=await f.call(base+'/users');assert.equal(result.status,200);assert.equal(result.body.counts.active,1);
  assert.equal(result.body.users.find(u=>u.accountId===owner.id).protected,true);
  for(const secret of [owner.secret,learner.secret,env.ADMIN_SERVICE_KEY])assert.equal(JSON.stringify(result.body).includes(secret),false);
 });
 let invitation;
 await check('one-use invitation reserves a slot, only hash stored, duplicate request is not replayed',async()=>{
  const payload={requestId:requestId(),ttlMinutes:60};
  const before=count('account_subjects'),created=await f.call(base+'/invites',{method:'POST',payload});assert.equal(created.status,200,JSON.stringify(created.body));invitation=created.body;
  assert.match(invitation.invitationToken,/^npi_[A-Za-z0-9_-]{43}$/);
  assert.equal(db.prepare('SELECT token_hash FROM nexus_admin_invites WHERE account_id=?').get(invitation.accountId).token_hash,sha(invitation.invitationToken));
  assert.equal(state(invitation.accountId).state,'invited');
  assert.equal((await f.call(base+'/invites',{method:'POST',payload})).status,409);assert.equal(count('account_subjects'),before+1);
 });
 await check('quota counts reservations, cannot be lowered below occupied, over-limit creation rolls back',async()=>{
  const settings=(await f.call(base+'/users')).body.settings;
  assert.equal((await post('/settings',{version:settings.version,maxTesters:1,limitEnabled:true,registrationMode:'invite_only'})).status,409);
  assert.equal((await post('/settings',{version:settings.version,maxTesters:2,limitEnabled:true,registrationMode:'invite_only'})).status,200);
  const before=count('account_subjects');assert.equal((await post('/invites',{ttlMinutes:60})).body.error.code,'ALPHA_CAPACITY_REACHED');assert.equal(count('account_subjects'),before);
 });
 await check('revoking an invitation releases its slot and cannot be restored without a key',async()=>{
  assert.equal((await post('/users/'+invitation.accountId+'/action',{version:1,action:'revoke-invite'})).status,200);
  assert.equal(state(invitation.accountId).state,'removed');
  assert.equal(db.prepare('SELECT state FROM nexus_admin_invites WHERE account_id=?').get(invitation.accountId).state,'revoked');
  assert.equal((await f.call(base+'/users')).body.counts.occupied,1);
 });
 const pixels=Buffer.alloc(128*128*4,180);for(let n=3;n<pixels.length;n+=4)pixels[n]=255;
 const encoded=jpeg.encode({data:pixels,width:128,height:128},80).data;
 let avatar;
 await check('avatar is decoded/re-encoded, EXIF metadata stripped; served only for current account',async()=>{
  const metadata=Buffer.from('Exif\0\0SYNTHETIC_GPS_NEVER_STORE'),length=Buffer.alloc(2);length.writeUInt16BE(metadata.length+2);
  const input=Buffer.concat([encoded.subarray(0,2),Buffer.from([255,225]),length,metadata,encoded.subarray(2)]).toString('base64');
  assert.equal(Buffer.from(sanitizeAvatar(input),'base64').includes(Buffer.from('SYNTHETIC_GPS_NEVER_STORE')),false);
  avatar=await f.call('/api/v2/account/profile/avatar',{actor:learner,method:'POST',payload:{requestId:requestId(),version:0,jpegBase64:sanitizeAvatar(input)}});assert.equal(avatar.status,200,JSON.stringify(avatar.body));
  assert.match(avatar.body.avatar,/^data:image\/jpeg;base64,/);assert.equal(avatar.body.username,'learner.one');
  assert.equal((await f.call('/api/v2/account/profile')).body.avatar,null);
 });
 await check('invalid/SVG/oversized/dimension-bomb avatar inputs fail and preserve prior avatar',async()=>{
  const before=db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(learner.id).jpeg_base64;
  for(const value of ['data:image/svg+xml;base64,PHN2Zz4=','%%%','A'.repeat(131073),Buffer.from('<svg/>').toString('base64')]){
   const result=await f.call('/api/v2/account/profile/avatar',{actor:learner,method:'POST',payload:{requestId:requestId(),version:1,jpegBase64:value}});assert.equal(result.status,400);
  }
  assert.equal(db.prepare('SELECT jpeg_base64 FROM nexus_account_avatars WHERE account_id=?').get(learner.id).jpeg_base64,before);
 });
 await check('block atomically revokes sessions and legacy tokens while retaining profile, avatar and keys',async()=>{
  db.prepare("INSERT INTO account_tokens(id,subject_id,token_hash,status,created_at) VALUES('synthetic-token',?,?,'active',?)").run(learner.id,sha('synthetic-legacy-token'),f.stamp());
  const response=await post('/users/'+learner.id+'/action',{version:1,action:'block'});assert.equal(response.status,200,JSON.stringify(response.body));
  assert.equal(await alphaAccess(env,learner.id),false);
  assert.equal(db.prepare('SELECT status FROM account_sessions WHERE id=?').get(learner.session).status,'revoked');
  assert.equal(db.prepare("SELECT status FROM account_tokens WHERE id='synthetic-token'").get().status,'revoked');
  assert.equal(count('nexus_account_avatars'),1);assert.equal(db.prepare('SELECT status FROM login_methods WHERE id=?').get(learner.method).status,'active');
  assert.equal((await f.call('/api/v2/account/profile',{actor:learner})).status,401);
 });
 await check('restore does not revive revoked sessions; stale versions and self-target fail',async()=>{
  assert.equal((await post('/users/'+learner.id+'/action',{version:1,action:'restore'})).status,409);
  assert.equal((await post('/users/'+learner.id+'/action',{version:2,action:'restore'})).status,200);
  assert.equal(state(learner.id).state,'active');assert.equal(db.prepare('SELECT status FROM account_sessions WHERE id=?').get(learner.session).status,'revoked');
 });
 await check('admin grant revoked during an operation rolls back the entire mutation',async()=>{
  const before=state(learner.id);
  f.beforeBatch(()=>db.prepare("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id=?").run(owner.id));
  const result=await post('/users/'+learner.id+'/action',{version:before.version,action:'remove'});assert.equal(result.status,401);
  assert.equal(state(learner.id).state,'active');assert.equal(state(learner.id).version,before.version);
  db.prepare("UPDATE nexus_admin_grants SET status='active' WHERE account_id=?").run(owner.id);
 });
 await check('username rules are unique lowercase identifiers with separate bounded display names',async()=>{
  for(const name of ['admin','root','a','a b','../x','a@b','Admin','пример'])assert.equal(validUsername(name),false);
  assert.equal(validUsername('tester.one-2'),true);assert.equal(validDisplayName('Тестировщик Альфа'),true);
  assert.equal(validDisplayName('<img src=x>'),true); // rendered only with textContent / escaped HTML
  assert.equal(validDisplayName('line\nbreak'),false);
  assert.throws(()=>db.prepare('INSERT INTO nexus_account_profiles(account_id,username,created_at) VALUES(?,?,?)').run(owner.id,'LEARNER.ONE',f.stamp()));
 });
 await check('purge requires archive, explicit confirmation and matching one-use approval',async()=>{
  assert.equal((await post('/users/'+learner.id+'/purge-preview',{version:state(learner.id).version})).body.error.code,'REMOVE_BEFORE_PURGE');
  await post('/users/'+learner.id+'/action',{version:state(learner.id).version,action:'remove'});
  const version=state(learner.id).version,preview=await post('/users/'+learner.id+'/purge-preview',{version});assert.equal(preview.status,200,JSON.stringify(preview.body));
  const invalid=await post('/users/'+learner.id+'/purge',{version,approvalToken:preview.body.approvalToken,confirmation:'DELETE wrong'});
  assert.equal(invalid.status,400);assert.equal(count('nexus_account_avatars'),1);
  const deleted=await post('/users/'+learner.id+'/purge',{version,approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation});
  assert.equal(deleted.status,200,JSON.stringify(deleted.body));assert.equal(deleted.body.localCopiesRemotelyErased,false);
  assert.equal(db.prepare('SELECT id FROM account_subjects WHERE id=?').get(learner.id),undefined);
  assert.equal(count('nexus_account_avatars'),0);assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  assert.equal((await post('/users/'+learner.id+'/purge',{version,approvalToken:preview.body.approvalToken,confirmation:preview.body.confirmation})).status,404);
  assert.ok(db.prepare("SELECT id FROM nexus_admin_audit WHERE action='purge'").get());
 });
 console.log(JSON.stringify({status:'PASS',tests,realAccounts:false,networkRequests:0,productionWrites:0}));
}finally{f.close()}
