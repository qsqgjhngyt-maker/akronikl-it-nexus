import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes,scryptSync} from 'node:crypto';
import {handleInvitedPasswordService} from './worker/invited-password-service.mjs';
import {managedInvitation} from './worker/alpha-admission.mjs';
import {createInvitedPasswordHandler} from './bff/invited-password.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
const definitions=[
 'CREATE TABLE account_subjects(id TEXT PRIMARY KEY,display_name TEXT,status TEXT,created_at TEXT,updated_at TEXT)',
 'CREATE TABLE nexus_alpha_settings(id INTEGER PRIMARY KEY,enforced INTEGER NOT NULL)',
 'INSERT INTO nexus_alpha_settings(id,enforced) VALUES(1,1)',
 'CREATE TABLE nexus_alpha_members(account_id TEXT PRIMARY KEY REFERENCES account_subjects(id),state TEXT,reserved_until TEXT,access_expires_at TEXT,trial_minutes INTEGER,first_login_at TEXT,version INTEGER DEFAULT 1,updated_at TEXT)',
 'CREATE TABLE nexus_admin_grants(account_id TEXT PRIMARY KEY,status TEXT)',
 'CREATE TABLE login_methods(id TEXT PRIMARY KEY,account_id TEXT REFERENCES account_subjects(id),kind TEXT,status TEXT,created_at TEXT)',
 'CREATE TABLE nexus_account_profiles(account_id TEXT PRIMARY KEY,username TEXT UNIQUE,created_at TEXT)',
 'CREATE TABLE nexus_passkey_invites(token_hash TEXT PRIMARY KEY,account_id TEXT,purpose TEXT,expires_at TEXT,consumed_at TEXT,commit_id TEXT)',
 'CREATE TABLE nexus_admin_invites(token_hash TEXT PRIMARY KEY REFERENCES nexus_passkey_invites(token_hash),account_id TEXT,kind TEXT,state TEXT,created_by TEXT)',
 'CREATE TABLE account_devices(id TEXT PRIMARY KEY,subject_id TEXT REFERENCES account_subjects(id),label TEXT,status TEXT,first_seen_at TEXT,last_seen_at TEXT)',
 'CREATE TABLE account_sessions(id TEXT PRIMARY KEY,subject_id TEXT REFERENCES account_subjects(id),device_id TEXT REFERENCES account_devices(id),secret_hash TEXT UNIQUE,status TEXT,auth_strength TEXT,created_at TEXT,last_seen_at TEXT,idle_expires_at TEXT,absolute_expires_at TEXT,revoked_at TEXT,revoked_reason TEXT)',
 'CREATE TABLE session_login_methods(session_id TEXT REFERENCES account_sessions(id),login_method_id TEXT REFERENCES login_methods(id),account_id TEXT REFERENCES account_subjects(id),created_at TEXT)',
 'CREATE TABLE account_tokens(subject_id TEXT,status TEXT)',
 'CREATE TRIGGER start_trial AFTER INSERT ON session_login_methods BEGIN UPDATE nexus_alpha_members SET first_login_at=(SELECT created_at FROM account_sessions WHERE id=NEW.session_id),access_expires_at=datetime(\'now\',\'+7 days\') WHERE account_id=NEW.account_id AND first_login_at IS NULL; END'
];
for(const sql of definitions)db.exec(sql);
db.exec(readFileSync(new URL('./migrations/0021_invited_email_password.sql',import.meta.url),'utf8'));
const D1={
 prepare(query){return{bind(...args){return{
  first:async()=>db.prepare(query).get(...args)??null,
  all:async()=>({results:db.prepare(query).all(...args)}),
  run:async()=>{const x=db.prepare(query).run(...args);return{success:true,meta:{changes:x.changes}}}
 }}}},
 async batch(statements){
  db.exec('BEGIN IMMEDIATE');
  try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}
  catch(error){db.exec('ROLLBACK');throw error}
 }
};
const key='test-only-invited-password-secret-change-me';
const env={DB:D1,INVITED_PASSWORD_ENABLED:'true',ALPHA_ADMISSION_ENABLED:'true',INVITED_PASSWORD_SERVICE_KEY:key};
async function rpc(op,fields={}){
 const body=JSON.stringify({op,...fields}),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signed=createHmac('sha256',key).update(['v1','POST','/api/v2/account/internal/invited-password',timestamp,nonce,sha(body)].join('\n')).digest('hex');
 const response=await handleInvitedPasswordService(new Request('https://worker.invalid/api/v2/account/internal/invited-password',{
  method:'POST',headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signed},body
 }),env);
 assert.equal(response.headers.get('cache-control'),'no-store');
 return{status:response.status,data:await response.json()};
}
const expires=new Date(Date.now()+86400000).toISOString(),now=new Date().toISOString();
const account='synthetic-invited-1',invitation='npi_'+randomBytes(32).toString('base64url'),inviteHash=sha(invitation),emailHash=sha('guest@example.com'),networkHash=sha('synthetic-ip');
db.prepare('INSERT INTO account_subjects VALUES(?1,?2,?3,?4,?4)').run(account,'Приглашённый','active',now);
db.prepare('INSERT INTO nexus_alpha_members(account_id,state,reserved_until,trial_minutes,updated_at) VALUES(?1,?2,?3,10080,?4)').run(account,'invited',expires,now);
db.prepare("INSERT INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at) VALUES(?1,?2,'bootstrap',?3)").run(inviteHash,account,expires);
db.prepare("INSERT INTO nexus_admin_invites VALUES(?1,?2,'admin','ready','trusted-admin')").run(inviteHash,account);
db.prepare('INSERT INTO nexus_password_invite_emails VALUES(?1,?2,?3,?4)').run(inviteHash,account,emailHash,now);
const checks=[];
const disabled=await handleInvitedPasswordService(new Request('https://worker.invalid/api/v2/account/internal/invited-password'),{});
assert.equal(disabled.status,503);checks.push('Feature OFF: fail closed');
assert.equal((await rpc('preflight',{inviteHash:sha('bad'),emailHash,networkHash})).status,403);checks.push('Unknown invitation blocked');
await assert.rejects(()=>managedInvitation(env,inviteHash),e=>e.code==='ENROLLMENT_REQUIRED');checks.push('Email invite cannot become passkey invite');
assert.equal((await rpc('preflight',{inviteHash,emailHash,networkHash})).status,200);
const salt=randomBytes(16),pass='my-unique-strong-password-for-test';
const hash=scryptSync(pass,salt,32,{N:32768,r:8,p:3,maxmem:96*1024*1024});
const enrollment={inviteHash,emailHash,networkHash,username:'guest.test',displayName:'Приглашённый',saltB64:salt.toString('base64url'),hashB64:hash.toString('base64url')};
const created=await rpc('enroll',enrollment);
assert.equal(created.status,200,JSON.stringify(created.data));checks.push('Enrollment binds invite + email');
assert.equal(db.prepare('SELECT state FROM nexus_alpha_members WHERE account_id=?1').get(account).state,'active');
assert.notEqual((await rpc('enroll',enrollment)).status,200);checks.push('Invite is one-time');
const challenge1=(await rpc('begin',{emailHash,networkHash})).data;
assert.equal((await rpc('finish',{challengeId:challenge1.challengeId,emailHash,networkHash,proof:'0'.repeat(64)})).status,401);checks.push('Wrong password fails');
const challenge=(await rpc('begin',{emailHash,networkHash})).data;
assert.equal(challenge.saltB64,salt.toString('base64url'));
const proof=createHmac('sha256',hash).update(['v1',challenge.challengeId,emailHash,networkHash].join('\n')).digest('hex');
const logged=await rpc('finish',{challengeId:challenge.challengeId,emailHash,networkHash,proof});
assert.equal(logged.status,200,JSON.stringify(logged.data));
assert.match(logged.data.sessionSecret,/^nxs_[A-Za-z0-9_-]{43}$/);
assert.equal(db.prepare('SELECT COUNT(*) n FROM nexus_password_receipts').get().n,1);
assert.equal(db.prepare('SELECT COUNT(*) n FROM nexus_admin_grants').get().n,0);
assert.ok(db.prepare('SELECT first_login_at FROM nexus_alpha_members WHERE account_id=?1').get(account).first_login_at);
checks.push('Password-bound session issued without admin grant; trial starts');
assert.notEqual((await rpc('finish',{challengeId:challenge.challengeId,emailHash,networkHash,proof})).status,200);checks.push('Login proof cannot replay');
assert.equal((await rpc('logout',{sessionHash:sha(logged.data.sessionSecret)})).status,200);
assert.equal(db.prepare('SELECT status FROM account_sessions WHERE secret_hash=?1').get(sha(logged.data.sessionSecret)).status,'revoked');
checks.push('Logout revokes session');
const lastChallenge=(await rpc('begin',{emailHash,networkHash})).data;
db.prepare("UPDATE nexus_alpha_members SET state='blocked' WHERE account_id=?1").run(account);
const lastProof=createHmac('sha256',hash).update(['v1',lastChallenge.challengeId,emailHash,networkHash].join('\n')).digest('hex');
assert.equal((await rpc('finish',{challengeId:lastChallenge.challengeId,emailHash,networkHash,proof:lastProof})).status,401);
checks.push('Blocked participant cannot log in');
const publicLogin=createInvitedPasswordHandler({env:{}});
let status;
await publicLogin({url:'/api/v2/account/password/login',method:'POST',headers:{}},{writeHead(code){status=code},end(){}});
assert.equal(status,503);checks.push('Public BFF gate disabled by default');
db.close();
console.log(JSON.stringify({result:'PASS',checks,realDatabaseWrites:0},null,2));
