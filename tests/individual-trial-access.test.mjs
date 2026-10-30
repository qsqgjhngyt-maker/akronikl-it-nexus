import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {controlFixture,sha} from './helpers/control-fixture.mjs';
import {alphaAccess} from '../server-access/worker/alpha-admission.mjs';
import {touchEligibleAccountSession} from '../server-access/worker/session-activity.mjs';
import {readEligibleAccountFoundation} from '../server-access/worker/account-foundation.js';
import worker from '../server-access/worker/entry.mjs';
const base='/api/v2/account/control';
test('individual trials: invitation, first completed login, expiry and administrator extension',async()=>{
 const f=await controlFixture(),{db,env}=f;
 const member=id=>db.prepare('SELECT * FROM nexus_alpha_members WHERE account_id=?').get(id);
 const post=(path,payload,actor)=>f.call(base+path,{method:'POST',payload:{requestId:randomUUID(),...payload},...(actor?{actor}:{})});
 const trial=(user,mode,minutes,actor)=>post('/users/'+user.id+'/trial',{version:member(user.id)?.version??0,mode,minutes},actor);
 function issue(user,stamp=new Date().toISOString()){
  const id=randomUUID(),future=new Date(Date.now()+3600000).toISOString();
  db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?,?,?,?,'active','account-method-v1',?,?,?,?)").run(id,user.id,user.id+'-device',sha(id),stamp,stamp,future,future);
  db.prepare('INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?,?,?,?)').run(id,user.method,user.id,stamp);
  return id;
 }
 try{
  const created=await post('/invites',{ttlMinutes:60,trialMinutes:10080});assert.equal(created.status,200);
  const invitation=member(created.body.accountId);assert.equal(invitation.trial_minutes,10080);assert.equal(invitation.first_login_at,null);assert.equal(invitation.access_expires_at,null);
  const listed=(await f.call(base+'/users')).body.users.find(u=>u.accountId===created.body.accountId);
  assert.ok(listed.invitationCreatedAt);assert.equal(listed.invitationExpiresAt,created.body.expiresAt);
  const pending={id:invitation.account_id};assert.equal((await trial(pending,'extend',1440)).status,200);
  assert.equal(member(pending.id).trial_minutes,11520);assert.equal(member(pending.id).first_login_at,null);assert.equal(member(pending.id).reserved_until,created.body.expiresAt);

  const user=f.seed('trial-new');db.prepare('DELETE FROM session_login_methods WHERE account_id=?').run(user.id);db.prepare('DELETE FROM account_sessions WHERE subject_id=?').run(user.id);
  assert.equal((await trial(user,'set',1440)).status,200);assert.equal(member(user.id).first_login_at,null,'options/key enrollment do not start a trial');
  db.exec('BEGIN');issue(user);assert.ok(member(user.id).first_login_at);db.exec('ROLLBACK');assert.equal(member(user.id).first_login_at,null,'a rolled-back issuance must not start the clock');
  const first=new Date().toISOString();issue(user,first);const started=member(user.id);assert.equal(started.first_login_at,first);assert.equal(Date.parse(started.access_expires_at)-Date.parse(first),86400000);
  issue(user);assert.equal(member(user.id).first_login_at,first);assert.equal(member(user.id).access_expires_at,started.access_expires_at,'another login must not reset access');
  assert.equal((await trial(user,'extend',1440)).status,200);assert.equal(Date.parse(member(user.id).access_expires_at),Date.parse(started.access_expires_at)+86400000);
  const payload={requestId:randomUUID(),version:member(user.id).version,mode:'extend',minutes:60};
  assert.equal((await f.call(base+'/users/'+user.id+'/trial',{method:'POST',payload})).status,200);const once=member(user.id).access_expires_at;
  assert.equal((await f.call(base+'/users/'+user.id+'/trial',{method:'POST',payload})).status,409);assert.equal(member(user.id).access_expires_at,once);
  const other=f.seed('trial-other');assert.equal((await trial(user,'extend',60,other)).status,403);assert.equal((await trial(f.owner,'set',60)).status,403);
  const previousVersion=member(user.id).version;f.beforeBatch(()=>db.prepare('UPDATE nexus_alpha_members SET version=version+1 WHERE account_id=?').run(user.id));
  assert.equal((await post('/users/'+user.id+'/trial',{version:previousVersion,mode:'extend',minutes:60})).status,409);assert.equal(member(user.id).access_expires_at,once);

  db.prepare('UPDATE nexus_alpha_members SET access_expires_at=? WHERE account_id=?').run(new Date(Date.now()-1000).toISOString(),user.id);
  assert.equal(await alphaAccess(env,user.id),false);const activeSession=db.prepare('SELECT secret_hash FROM account_sessions WHERE subject_id=? LIMIT 1').get(user.id).secret_hash;
  assert.equal(await readEligibleAccountFoundation(env.DB,activeSession,new Date().toISOString(),env),null);
  assert.equal(await touchEligibleAccountSession(env.DB,activeSession,new Date().toISOString(),env),null);
  assert.equal(db.prepare('SELECT count(*) n FROM nexus_alpha_occupied WHERE account_id=?').get(user.id).n,0);
  assert.throws(()=>issue(user),/ALPHA_ACCESS_REQUIRED/);
  const stamp=new Date().toISOString();assert.throws(()=>db.prepare("INSERT INTO workspaces(id,kind,name,owner_subject_id,created_at,updated_at) VALUES('trial-expired-workspace','personal','keep',?,?,?)").run(user.id,stamp,stamp),/ALPHA_WRITE_ACCESS_REQUIRED/);
  const before=Date.now();assert.equal((await trial(user,'extend',1440)).status,200);assert.ok(Date.parse(member(user.id).access_expires_at)>=before+86400000);assert.ok(Date.parse(member(user.id).access_expires_at)<=Date.now()+86400000);assert.equal(await alphaAccess(env,user.id),true);
  assert.ok(db.prepare('SELECT id FROM account_subjects WHERE id=?').get(user.id));assert.ok(db.prepare('SELECT id FROM login_methods WHERE account_id=?').get(user.id),'extension keeps account and keys');
  assert.equal((await post('/users/'+user.id+'/action',{version:member(user.id).version,action:'block'})).status,200);assert.equal((await trial(user,'extend',60)).status,409);assert.equal(member(user.id).state,'blocked');
  assert.equal(member(other.id).trial_minutes,null,'existing accounts stay unlimited');assert.equal((await trial(other,'set',60)).status,200);assert.ok(member(other.id).access_expires_at,'setting a trial on an already signed-in account starts now');
  const legacy=()=>worker.fetch(new Request('https://synthetic-worker.invalid/api/v1/me',{headers:{authorization:'Bearer '+other.secret}}),{...env,AUTH_MODE:'nexus-token'},{});
  assert.equal((await legacy()).status,200,'legacy account session works before deadline');
  db.prepare('UPDATE nexus_alpha_members SET access_expires_at=? WHERE account_id=?').run(new Date(Date.now()-1000).toISOString(),other.id);
  assert.equal((await legacy()).status,401,'direct legacy reads also respect the trial deadline');
  assert.equal((await trial(other,'set',null)).status,200);assert.equal(member(other.id).access_expires_at,null);assert.equal(await alphaAccess(env,other.id),true);
  for(const minutes of [-1,0,1,59,1.5,525601,'1440'])assert.equal((await trial(other,'set',minutes)).status,400);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.close();}
});

test('invitation deadline and access duration have independent defaults and per-user changes',async()=>{
 const f=await controlFixture(),{db}=f;
 const post=(path,payload)=>f.call(base+path,{method:'POST',payload:{requestId:randomUUID(),...payload}});
 const settings=()=>f.call(base+'/users').then(r=>r.body.settings);
 const changeDefaults=async(invitation,access)=>{const s=await settings();return post('/settings',{version:s.version,maxTesters:s.maxTesters,limitEnabled:s.limitEnabled,registrationMode:s.registrationMode,defaultInvitationMinutes:invitation,defaultTrialMinutes:access})};
 const row=id=>db.prepare('SELECT * FROM nexus_alpha_members WHERE account_id=?').get(id);
 try{
  assert.equal((await changeDefaults(60,1440)).status,200);
  const now=Date.now(),made=await post('/invites',{ttlMinutes:'default',trialMinutes:'default'});assert.equal(made.status,200);const id=made.body.accountId;
  assert.equal(row(id).trial_minutes,1440);assert.ok(Date.parse(row(id).reserved_until)>=now+3600000);const original=row(id).reserved_until;
  assert.equal((await changeDefaults(10080,10080)).status,200);assert.equal(row(id).trial_minutes,1440);assert.equal(row(id).reserved_until,original,'new defaults never rewrite issued invitations');
  assert.equal((await post('/users/'+id+'/invitation',{version:row(id).version,mode:'extend',minutes:1440})).status,200);
  assert.equal(Date.parse(row(id).reserved_until),Date.parse(original)+86400000);assert.equal(row(id).trial_minutes,1440);assert.equal(row(id).first_login_at,null);
  const hash=db.prepare('SELECT token_hash FROM nexus_admin_invites WHERE account_id=?').get(id).token_hash;
  assert.equal(db.prepare('SELECT expires_at FROM nexus_passkey_invites WHERE token_hash=?').get(hash).expires_at,row(id).reserved_until);
  const before=Date.now();assert.equal((await post('/users/'+id+'/invitation',{version:row(id).version,mode:'set',minutes:120})).status,200);assert.ok(Date.parse(row(id).reserved_until)>=before+7200000);assert.equal(row(id).trial_minutes,1440);
  const accessBefore=row(id).reserved_until;assert.equal((await post('/users/'+id+'/trial',{version:row(id).version,mode:'set',minutes:10080})).status,200);assert.equal(row(id).reserved_until,accessBefore);assert.equal(row(id).trial_minutes,10080);
  const explicit=await post('/invites',{ttlMinutes:1440,trialMinutes:null});assert.equal(explicit.status,200);assert.equal(row(explicit.body.accountId).trial_minutes,null);
  const expired=new Date(Date.now()-1000).toISOString();db.prepare('UPDATE nexus_passkey_invites SET expires_at=? WHERE token_hash=?').run(expired,hash);db.prepare('UPDATE nexus_alpha_members SET reserved_until=? WHERE account_id=?').run(expired,id);
  const s=await settings();assert.equal((await post('/settings',{version:s.version,maxTesters:1,limitEnabled:true,registrationMode:s.registrationMode})).status,200);
  assert.equal((await post('/users/'+id+'/invitation',{version:row(id).version,mode:'extend',minutes:60})).status,409,'reopening an expired invitation respects capacity');assert.equal(row(id).reserved_until,expired);assert.equal(db.prepare('SELECT expires_at FROM nexus_passkey_invites WHERE token_hash=?').get(hash).expires_at,expired,'failed extension rolls back both deadlines');
  const s2=await settings();assert.equal((await post('/settings',{version:s2.version,maxTesters:10,limitEnabled:true,registrationMode:s2.registrationMode})).status,200);
  const restart=Date.now();assert.equal((await post('/users/'+id+'/invitation',{version:row(id).version,mode:'extend',minutes:60})).status,200);assert.ok(Date.parse(row(id).reserved_until)>=restart+3600000);
  assert.equal((await post('/users/'+id+'/action',{version:row(id).version,action:'revoke-invite'})).status,200);assert.equal((await post('/users/'+id+'/invitation',{version:row(id).version,mode:'extend',minutes:60})).status,409,'revoked invitations stay closed');
  // A previously unlimited account can log in between the admin pre-read and commit.
  const racer=f.seed('trial-policy-racer');db.prepare('DELETE FROM session_login_methods WHERE account_id=?').run(racer.id);db.prepare('DELETE FROM account_sessions WHERE subject_id=?').run(racer.id);
  f.beforeBatch(()=>{const stamp=new Date().toISOString(),future=new Date(Date.now()+3600000).toISOString();db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES('policy-race',?,?,?,'active','account-method-v1',?,?,?,?)").run(racer.id,racer.id+'-device',sha('policy-race'),stamp,stamp,future,future);db.prepare("INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES('policy-race',?,?,?)").run(racer.method,racer.id,stamp)});
  assert.equal((await post('/users/'+racer.id+'/trial',{version:row(racer.id).version,mode:'set',minutes:1440})).status,409,'a racing first login cannot leave a finite trial without its deadline');assert.equal(row(racer.id).trial_minutes,null);
  assert.equal((await post('/users/'+racer.id+'/trial',{version:row(racer.id).version,mode:'set',minutes:1440})).status,200);assert.ok(row(racer.id).access_expires_at);
 }finally{f.close();}
});
