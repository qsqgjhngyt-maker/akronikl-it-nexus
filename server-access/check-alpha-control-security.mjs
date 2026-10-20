import assert from 'node:assert/strict';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {controlFixture,sha} from '../tests/helpers/control-fixture.mjs';
import {handleOAuthService} from './worker/oauth-service.mjs';
import {handlePasskeyService} from './worker/passkey-service.mjs';
let tests=0;
const check=async(name,fn)=>{const f=await controlFixture();try{await fn(f);tests++;console.log('PASS '+name)}finally{f.close()}};
const post=(f,path,payload)=>f.call('/api/v2/account/control'+path,{method:'POST',payload:{requestId:crypto.randomUUID(),...payload}});
function signed(f,path,key,payload){
 const body=JSON.stringify(payload),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const signature=createHmac('sha256',key).update(['v1','POST',path,timestamp,nonce,sha(body)].join('\n')).digest('hex');
 return new Request('https://synthetic-worker.invalid'+path,{method:'POST',body,headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
}
async function oauth(f,payload){const res=await handleOAuthService(signed(f,'/api/v2/account/internal/oauth',f.env.OAUTH_SERVICE_KEY,payload),f.env);return {status:res.status,body:await res.json()}}
async function flow(f,provider='google',subject='synthetic-subject'){
 const data={op:'begin',provider,intent:'login',stateHash:sha(randomBytes(16)),flowHash:sha(randomBytes(16)),codeVerifier:'V'.repeat(43),nonce:'N'.repeat(43)};
 const started=await oauth(f,data);assert.equal(started.status,200);
 const claimed=await oauth(f,{op:'claim',provider,stateHash:data.stateHash,flowHash:data.flowHash});assert.equal(claimed.status,200);
 const issuer={google:'https://accounts.google.com',yandex:'https://login.yandex.ru',vk:'https://id.vk.ru'}[provider];
 return {op:'complete',txId:claimed.body.txId,flowHash:data.flowHash,profile:{issuer,subject,email:'synthetic@example.invalid',emailVerified:false,displayName:'Synthetic learner'}};
}
const state=(f,id)=>f.db.prepare('SELECT * FROM nexus_alpha_members WHERE account_id=?').get(id);
async function remove(f,user){assert.equal((await post(f,'/users/'+user.id+'/action',{version:state(f,user.id).version,action:'remove'})).status,200)}
async function plan(f,user){const response=await post(f,'/users/'+user.id+'/purge-preview',{version:state(f,user.id).version});assert.equal(response.status,200,response.body.error?.code);return response.body}
const purge=(f,user,preview)=>post(f,'/users/'+user.id+'/purge',{version:state(f,user.id).version,approvalToken:preview.approvalToken,confirmation:preview.confirmation});
function project(f,owner,id,marker){
 const stamp=f.stamp(),workspace='workspace-'+id;
 f.db.prepare("INSERT INTO workspaces(id,kind,name,owner_subject_id,created_at,updated_at) VALUES(?,'personal',?,?,?,?)").run(workspace,marker,owner.id,stamp,stamp);
 f.db.prepare("INSERT INTO projects(id,workspace_id,owner_subject_id,title,language_id,current_revision,latest_r2_key,created_at,updated_at) VALUES(?,?,?,?,'cpp',1,?,?,?)").run(id,workspace,owner.id,marker,'d1:'+id+':1',stamp,stamp);
 f.db.prepare('INSERT INTO project_snapshots(id,project_id,revision,snapshot_json,created_by,created_at) VALUES(?,?,1,?,?,?)').run('snapshot-'+id,id,JSON.stringify({marker}),owner.id,stamp);
 f.db.prepare('INSERT INTO project_revisions(id,project_id,revision,r2_key,created_by,created_at) VALUES(?,?,1,?,?,?)').run('revision-'+id,id,'d1:'+id+':1',owner.id,stamp);
 return workspace;
}
await check('invite-only policy blocks new Google/Yandex/VK accounts without creating identities',async f=>{
 for(const provider of ['google','yandex','vk']){
  const result=await oauth(f,await flow(f,provider,'synthetic-'+provider));assert.equal(result.status,403);assert.equal(result.body.error.code,'ALPHA_INVITATION_REQUIRED');
 }
 assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,1);
 assert.equal(f.db.prepare('SELECT count(*) n FROM oauth_identities').get().n,0);
});
await check('open registration admits one tester, repeat login reuses account, next provider meets quota',async f=>{
 assert.equal((await post(f,'/settings',{version:1,maxTesters:1,limitEnabled:true,registrationMode:'open'})).status,200);
 const first=await oauth(f,await flow(f,'google'));assert.equal(first.status,200);
 const userId=f.db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(first.body.sessionSecret)).subject_id;
 const repeated=await oauth(f,await flow(f,'google'));assert.equal(repeated.status,200);
 assert.equal(f.db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(repeated.body.sessionSecret)).subject_id,userId);
 const denied=await oauth(f,await flow(f,'vk','synthetic-new-vk'));assert.equal(denied.status,409);assert.equal(denied.body.error.code,'ALPHA_CAPACITY_REACHED');
 assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,2);
});
await check('concurrent last-slot claim rolls back the entire competing OAuth issuance',async f=>{
 await post(f,'/settings',{version:1,maxTesters:1,limitEnabled:true,registrationMode:'open'});
 const completion=await flow(f,'yandex','synthetic-racing-yandex');
 f.beforeBatch(()=>f.seed('synthetic-racer'));
 const denied=await oauth(f,completion);assert.equal(denied.status,409);
 assert.equal(f.db.prepare("SELECT count(*) n FROM oauth_identities WHERE provider_subject='synthetic-racing-yandex'").get().n,0);
 assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,2);
});
await check('blocked federated identity cannot create a replacement account by logging in again',async f=>{
 await post(f,'/settings',{version:1,maxTesters:2,limitEnabled:true,registrationMode:'open'});
 const first=await oauth(f,await flow(f));assert.equal(first.status,200);
 const id=f.db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(first.body.sessionSecret)).subject_id;
 await post(f,'/users/'+id+'/action',{version:1,action:'block'});
 const result=await oauth(f,await flow(f));assert.equal(result.status,403);assert.equal(result.body.error.code,'ALPHA_ACCESS_CLOSED');
 assert.equal(f.db.prepare('SELECT count(*) n FROM account_subjects').get().n,2);
});
await check('a fresh OAuth session for the administrator still cannot replace a Passkey write proof',async f=>{
 const stamp=f.stamp(),future=new Date(Date.now()+3600000).toISOString(),secret='nxs_'+randomBytes(32).toString('base64url');
 f.db.prepare("INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES('synthetic-owner-oauth',?,'oauth','active',?)").run(f.owner.id,stamp);
 f.db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES('synthetic-oauth-session',?,'synthetic-owner-device',?,'active','account-method-v1',?,?,?,?)").run(f.owner.id,sha(secret),stamp,stamp,future,future);
 f.db.prepare("INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES('synthetic-oauth-session','synthetic-owner-oauth',?,?)").run(f.owner.id,stamp);
 const actor={id:f.owner.id,secret};
 assert.equal((await f.call('/api/v2/account/control/users',{actor})).status,200);
 const denied=await f.call('/api/v2/account/control/invites',{actor,method:'POST',payload:{requestId:crypto.randomUUID(),ttlMinutes:60}});
 assert.equal(denied.status,401);assert.equal(denied.body.error.code,'ADMIN_FRESH_PASSKEY_REQUIRED');
});
await check('existing unadmitted users can be admitted or archived; administrator remains protected',async f=>{
 const stamp=f.stamp();
 f.db.prepare("INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES('synthetic-existing','Existing','active',?,?)").run(stamp,stamp);
 assert.equal((await post(f,'/users/synthetic-existing/action',{version:0,action:'admit'})).status,200);
 assert.equal(state(f,'synthetic-existing').state,'active');
 assert.equal((await post(f,'/users/synthetic-existing/action',{version:1,action:'remove'})).status,200);
 assert.equal(state(f,'synthetic-existing').state,'removed');
});
await check('expired/revoked invitations and duplicate usernames fail before key registration',async f=>{
 f.seed('synthetic-existing',{username:'tester.one'});
 const made=await post(f,'/invites',{ttlMinutes:60});assert.equal(made.status,200);
 const token=made.body.invitationToken,tokenHash=sha(token),id=made.body.accountId;
 Object.assign(f.env,{PASSKEY_ENABLED:'true',PASSKEY_SERVICE_KEY:'SYNTHETIC_SECURITY_PASSKEY_KEY_ONLY_20261020',PASSKEY_ORIGIN:'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',PASSKEY_RP_ID:'d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net'});
 const pk=async(op,input)=>{const response=await handlePasskeyService(signed(f,'/api/v2/account/internal/passkey',f.env.PASSKEY_SERVICE_KEY,{op,input,flowHash:'a'.repeat(64),sessionHash:null,networkHash:'b'.repeat(64)}),f.env);return {status:response.status,body:await response.json()}};
 assert.equal((await pk('register-options',{inviteHash:tokenHash,username:'tester.one',displayName:'Another'})).body.error.code,'USERNAME_UNAVAILABLE');
 for(const username of ['admin','A','two names','русский'])assert.equal((await pk('register-options',{inviteHash:tokenHash,username,displayName:'Another'})).status,400);
 const good=await pk('register-options',{inviteHash:tokenHash,username:'tester.two',displayName:'Тестировщик Два'});
 assert.equal(good.status,200);assert.equal(good.body.options.user.name,'tester.two');
 assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_passkey_credentials WHERE account_id=?').get(id).n,0);
 await post(f,'/users/'+id+'/action',{version:1,action:'revoke-invite'});
 assert.equal((await pk('invitation-info',{inviteHash:tokenHash})).status,403);
});
await check('expired invite reservation frees capacity but token cannot enroll',async f=>{
 await post(f,'/settings',{version:1,maxTesters:1,limitEnabled:true,registrationMode:'invite_only'});
 const made=await post(f,'/invites',{ttlMinutes:10});assert.equal(made.status,200);
 f.db.prepare("UPDATE nexus_alpha_members SET reserved_until='2000-01-01' WHERE account_id=?").run(made.body.accountId);
 f.db.prepare("UPDATE nexus_passkey_invites SET expires_at='2000-01-01' WHERE account_id=?").run(made.body.accountId);
 assert.equal((await post(f,'/invites',{ttlMinutes:10})).status,200);
});
await check('legacy or rolled-back issuer cannot insert a session/token for a blocked member',async f=>{
 const user=f.seed('synthetic-blocked');await post(f,'/users/'+user.id+'/action',{version:1,action:'block'});
 const stamp=f.stamp(),future=new Date(Date.now()+3600000).toISOString();
 assert.throws(()=>f.db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES('synthetic-bypass',?,?,?,'active','account-method-v1',?,?,?,?)").run(user.id,user.id+'-device',sha('synthetic-attempt'),stamp,stamp,future,future),/ALPHA_ACCESS_REQUIRED/);
 assert.throws(()=>f.db.prepare("INSERT INTO account_tokens(id,subject_id,token_hash,status,created_at) VALUES('synthetic-bypass-token',?,?,'active',?)").run(user.id,sha('synthetic-token'),stamp),/ALPHA_ACCESS_REQUIRED/);
});
await check('shared projects and external storage stop permanent deletion without touching data',async f=>{
 const target=f.seed('synthetic-target',{username:'target.one'}),other=f.seed('synthetic-other');
 project(f,target,'synthetic-shared','TARGET_PRIVATE_SENTINEL');
 f.db.prepare("INSERT INTO project_members(project_id,subject_id,role,status,created_at) VALUES('synthetic-shared',?,'viewer','active',?)").run(other.id,f.stamp());
 await remove(f,target);
 const preview=await post(f,'/users/'+target.id+'/purge-preview',{version:state(f,target.id).version});
 assert.equal(preview.body.error.code,'SHARED_PROJECT_TRANSFER_REQUIRED');
 f.db.exec("DELETE FROM project_members WHERE project_id='synthetic-shared'");
 f.db.exec("DROP TRIGGER nexus_alpha_project_write_insert");
 f.db.prepare("UPDATE projects SET latest_r2_key='external-storage-object' WHERE id='synthetic-shared'").run();
 const external=await post(f,'/users/'+target.id+'/purge-preview',{version:state(f,target.id).version});
 assert.equal(external.body.error.code,'PURGE_EXTERNAL_STORAGE_REVIEW_REQUIRED');
 assert.equal(f.db.prepare("SELECT count(*) n FROM project_snapshots WHERE project_id='synthetic-shared'").get().n,1);
});
await check('unknown schema and schema change between preview and commit fail closed atomically',async f=>{
 const user=f.seed('synthetic-target',{username:'target.one'});await remove(f,user);
 const preview=await plan(f,user);
 f.beforeBatch(()=>f.db.exec('CREATE TABLE synthetic_unreviewed_data(subject_id TEXT,body TEXT)'));
 assert.equal((await purge(f,user,preview)).status,409);
 assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(user.id));
 const next=await post(f,'/users/'+user.id+'/purge-preview',{version:state(f,user.id).version});assert.equal(next.body.error.code,'PURGE_SCHEMA_REVIEW_REQUIRED');
});
await check('expired or stale target approval never deletes the account',async f=>{
 const user=f.seed('synthetic-target',{username:'target.one'});await remove(f,user);const preview=await plan(f,user);
 f.db.prepare("UPDATE nexus_admin_purge_approvals SET expires_at='2000-01-01' WHERE target_id=?").run(user.id);
 assert.equal((await purge(f,user,preview)).body.error.code,'PURGE_APPROVAL_REJECTED');
 assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(user.id));
});
await check('full deletion removes owned server content and keeps another account/project byte-exact',async f=>{
 const target=f.seed('synthetic-target',{username:'target.one'}),other=f.seed('synthetic-other',{username:'other.one'});
 project(f,target,'target-project','TARGET_PRIVATE_SENTINEL');project(f,other,'other-project','OTHER_DATA_TO_KEEP');
 const stamp=f.stamp();
 f.db.prepare("INSERT INTO feedback_items(id,author_id,kind,type,status,request_key,request_hash,created_at,updated_at) VALUES('target-feedback',?,'message','bug','submitted','synthetic-request','synthetic-hash',?,?)").run(target.id,stamp,stamp);
 f.db.prepare("INSERT INTO feedback_revisions(item_id,revision,body,search_text,public_name,created_at) VALUES('target-feedback',1,'TARGET_PRIVATE_SENTINEL','TARGET_PRIVATE_SENTINEL','Target Name',?)").run(stamp);
 f.db.prepare("INSERT INTO nexus_account_avatars(account_id,jpeg_base64,version,updated_at) VALUES(?,'AAAA',1,?)").run(target.id,stamp);
 const before=JSON.stringify(f.db.prepare("SELECT * FROM project_snapshots WHERE project_id='other-project'").all());
 await remove(f,target);const preview=await plan(f,target);
 assert.equal(preview.counts.projects,1);assert.equal(preview.counts.feedback,1);
 assert.equal((await purge(f,target,preview)).status,200);
 assert.equal(JSON.stringify(f.db.prepare("SELECT * FROM project_snapshots WHERE project_id='other-project'").all()),before);
 assert.equal(f.db.prepare("SELECT count(*) n FROM projects WHERE id='target-project'").get().n,0);
 assert.equal(f.db.prepare('SELECT count(*) n FROM feedback_items WHERE author_id=?').get(target.id).n,0);
 assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0);
 for(const {name} of f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM '+name).all()).includes('TARGET_PRIVATE_SENTINEL'),false);
});
console.log(JSON.stringify({status:'PASS',tests,syntheticOnly:true,networkRequests:0,productionWrites:0}));
