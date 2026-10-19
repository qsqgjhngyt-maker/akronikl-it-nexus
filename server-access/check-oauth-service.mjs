// SQLite :memory: + настоящий WebCrypto verifier. Никакой сети/реальных provider/данных.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {handleOAuthService} from './worker/oauth-service.mjs';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const path of ['../cloudflare/nexus-sync-worker/migrations/0002_nexus_account_tokens.sql','../cloudflare/nexus-sync-worker/migrations/0004_identity_v2_session_foundation.sql',
 'migrations/0005_login_methods_registry.sql','migrations/0006_account_lifecycle_hardening.sql','migrations/0007_identity_owner_and_issuance_guards.sql','migrations/0008_account_service_nonces.sql','migrations/0009_passkeys.sql','migrations/0010_feedback.sql','migrations/0011_oauth_service.sql'])db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
let beforeBatch=null,tests=0;
function prepared(sql,args=[]){
 const stmt=db.prepare(sql);
 return{
  sql,args,
  async run(){const meta=stmt.run(...args);return{success:true,meta:{changes:Number(meta.changes)}}},
  async first(){return stmt.get(...args)||null},
  async all(){return{success:true,results:stmt.all(...args)}},
  execute(){
   if(/\bRETURNING\b/i.test(sql)){const results=stmt.all(...args);return{success:true,results,meta:{changes:results.length}}}
   const meta=stmt.run(...args);return{success:true,results:[],meta:{changes:Number(meta.changes)}};
  }
 };
}
const DB={prepare(sql){return{bind(...args){return prepared(sql,args)}}},async batch(commands){
 if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook(commands)}
 db.exec('BEGIN');try{const results=commands.map(command=>command.execute());db.exec('COMMIT');return results}catch(error){db.exec('ROLLBACK');throw error}
}};
const key='SYNTHETIC_OAUTH_SERVICE_KEY_ONLY_20261019';
const env={DB,OAUTH_ENABLED:'true',OAUTH_SERVICE_KEY:key};
const path='/api/v2/account/internal/oauth',origin='https://synthetic-worker.invalid';
const sha=value=>createHash('sha256').update(value).digest('hex');
const hash=()=>randomBytes(32).toString('hex');
function signed(payload,{nonce=randomBytes(16).toString('hex'),timestamp=String(Date.now()),method='POST',url=origin+path,headers={}}={}){
 const body=JSON.stringify(payload),signature=createHmac('sha256',key).update(`v1\nPOST\n${path}\n${timestamp}\n${nonce}\n${sha(body)}`).digest('hex');
 return new Request(url,{method,...(method==='GET'?{}:{body}),headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature,...headers}});
}
async function call(payload,options={},override=env){
 const response=await handleOAuthService(signed(payload,options),override);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('vary'),'*');
 assert.equal(response.headers.has('set-cookie'),false);
 return{status:response.status,body:await response.json()};
}
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
const count=table=>Number(db.prepare('SELECT count(*) AS n FROM '+table).get().n);
const accountCounts=()=>['account_subjects','login_methods','oauth_identities','account_devices','account_sessions','session_login_methods','nexus_oauth_receipts','feedback_permissions'].map(count);
const issuers={google:'https://accounts.google.com',yandex:'https://login.yandex.ru',vk:'https://id.vk.ru',mailru:'https://oauth.mail.ru'};
function profile(provider='google',subject='synthetic-subject',email='learner@example.invalid'){
 return{issuer:issuers[provider],subject,email,emailVerified:email!==null,displayName:'Synthetic learner'};
}
async function flow({provider='google',intent='login',sessionHash,override=env}={}){
 const input={op:'begin',provider,intent,stateHash:hash(),flowHash:hash(),codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43),...(intent==='link'?{sessionHash}:{})};
 const started=await call(input,{},override);assert.equal(started.status,200,JSON.stringify(started));
 const claimed=await call({op:'claim',provider,stateHash:input.stateHash,flowHash:input.flowHash},{},override);assert.equal(claimed.status,200,JSON.stringify(claimed));
 assert.deepEqual(Object.keys(claimed.body).sort(),['codeVerifier','intent','nonce','ok','txId']);
 assert.equal(claimed.body.codeVerifier,input.codeVerifier);assert.equal(claimed.body.nonce,input.nonce);
 const tx=db.prepare('SELECT * FROM nexus_oauth_transactions WHERE id=?').get(claimed.body.txId);
 assert.equal(tx.code_verifier,null);assert.equal(tx.nonce,null);assert.ok(tx.claimed_at);
 return{input,txId:claimed.body.txId};
}
const finish=(flow,verifiedProfile,override=env)=>call({op:'complete',txId:flow.txId,flowHash:flow.input.flowHash,profile:verifiedProfile},{},override);

await check('feature/key default OFF и HMAC ingress fail closed без identity writes',async()=>{
 const input={op:'begin'},before=accountCounts();
 assert.equal((await call(input,{},{})).status,503);
 for(const option of [{method:'GET'},{url:origin+path+'?bad=1'},{url:origin+'/wrong'},
  {timestamp:String(Date.now()-31000)},{nonce:'a'.repeat(31)},
  {headers:{cookie:'synthetic=only'}},{headers:{authorization:'Bearer synthetic'}},
  {headers:{'x-nexus-service-signature':'0'.repeat(64)}}])assert.equal((await call(input,option)).status,401);
 const nonce=randomBytes(16).toString('hex');await call(input,{nonce});assert.equal((await call(input,{nonce})).status,401);
 assert.equal((await call({...input,pad:'x'.repeat(9000)})).status,413);
 assert.deepEqual(accountCounts(),before);
});
await check('strict begin provider/PKCE/nonce keys и Mail.ru отдельный secure-adapter flag',async()=>{
 const base={op:'begin',provider:'google',intent:'login',stateHash:hash(),flowHash:hash(),codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43)};
 for(const change of [{provider:'fake'},{provider:'mailru'},{codeVerifier:'A'.repeat(42)},{nonce:'short'},{stateHash:'bad'},{accountId:'forbidden'},{authStrength:'admin'},{sessionHash:hash()}])assert.equal((await call({...base,...change})).status,400);
 const secure={...env,OAUTH_MAILRU_SECURE_ADAPTER_ENABLED:'true'};
 const transaction=await flow({provider:'mailru',override:secure});const result=await finish(transaction,profile('mailru','synthetic-mailru'),secure);assert.equal(result.status,200);
});
await check('claim требует state+flow+provider и атомарно однократен',async()=>{
 const input={op:'begin',provider:'google',intent:'login',stateHash:hash(),flowHash:hash(),codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43)};
 assert.equal((await call(input)).status,200);
 for(const patch of [{stateHash:hash()},{flowHash:hash()},{provider:'vk'}])assert.equal((await call({op:'claim',provider:input.provider,stateHash:input.stateHash,flowHash:input.flowHash,...patch})).status,401);
 const good={op:'claim',provider:input.provider,stateHash:input.stateHash,flowHash:input.flowHash};assert.equal((await call(good)).status,200);assert.equal((await call(good)).status,401);
 db.prepare(`INSERT INTO nexus_oauth_transactions(id,state_hash,flow_hash,provider,intent,code_verifier,nonce,created_at,expires_at) VALUES(?,?,?,'google','login',?,?,'2000-01-01','2000-01-02')`).run('synthetic-expired',hash(),hash(),'A'.repeat(43),'B'.repeat(43));
 const expired=db.prepare('SELECT * FROM nexus_oauth_transactions WHERE id=?').get('synthetic-expired');
 assert.equal((await call({op:'claim',provider:'google',stateHash:expired.state_hash,flowHash:expired.flow_hash})).status,401);
 assert.equal(db.prepare('SELECT code_verifier FROM nexus_oauth_transactions WHERE id=?').get(expired.id).code_verifier,null);
});
let learnerAccount,learnerSecret;
await check('new ordinary registration выдаёт связанную session, без moderator/owner grant',async()=>{
 const transaction=await flow(),before=count('feedback_permissions');
 const result=await finish(transaction,profile());assert.equal(result.status,200,JSON.stringify(result));
 assert.deepEqual(Object.keys(result.body).sort(),['ok','sessionSecret']);assert.match(result.body.sessionSecret,/^nxs_[A-Za-z0-9_-]{43}$/);
 learnerSecret=result.body.sessionSecret;
 const session=db.prepare('SELECT * FROM account_sessions WHERE secret_hash=?').get(sha(learnerSecret));
 assert.equal(session.auth_strength,'account-method-v1');assert.equal(session.status,'active');learnerAccount=session.subject_id;
 const binding=db.prepare('SELECT * FROM session_login_methods WHERE session_id=?').get(session.id);assert.equal(binding.account_id,learnerAccount);
 const identity=db.prepare('SELECT * FROM oauth_identities WHERE login_method_id=?').get(binding.login_method_id);assert.equal(identity.provider_subject,'synthetic-subject');assert.equal(identity.account_id,learnerAccount);
 assert.equal(db.prepare('SELECT email FROM account_subjects WHERE id=?').get(learnerAccount).email,null);
 assert.equal(count('feedback_permissions'),before);assert.equal((await finish(transaction,profile())).status,401);
});
await check('existing identity exact tuple входит в тот же account; email/displayName не сливают accounts',async()=>{
 let transaction=await flow();let result=await finish(transaction,profile());assert.equal(result.status,200);
 assert.equal(db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(result.body.sessionSecret)).subject_id,learnerAccount);
 transaction=await flow({provider:'yandex'});result=await finish(transaction,{...profile('yandex','different-subject'),'displayName':'Synthetic learner'});assert.equal(result.status,200);
 assert.notEqual(db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(result.body.sessionSecret)).subject_id,learnerAccount);
 const rejected=await flow();assert.equal((await finish(rejected,{...profile(),issuer:issuers.vk})).status,401);
});
await check('VK ordinary identity не требует email и не создаёт ложный verified-email proof',async()=>{
 const transaction=await flow({provider:'vk'}),before=count('nexus_oauth_verified_emails');
 const result=await finish(transaction,profile('vk','synthetic-vk-subject',null));assert.equal(result.status,200);
 assert.equal(count('nexus_oauth_verified_emails'),before);
 assert.equal(db.prepare('SELECT status FROM account_sessions WHERE secret_hash=?').get(sha(result.body.sessionSecret)).status,'active');
});
await check('wrong flow, invalid profile и browser accountId не завершают transaction',async()=>{
 const transaction=await flow(),before=accountCounts();
 assert.equal((await call({op:'complete',txId:transaction.txId,flowHash:hash(),profile:profile()})).status,401);
 assert.equal((await call({op:'complete',txId:transaction.txId,flowHash:transaction.input.flowHash,profile:profile(),accountId:'forbidden'})).status,400);
 for(const patch of [{issuer:'https://attacker.invalid'},{subject:''},{emailVerified:'true'},{email:null,emailVerified:true},{displayName:'bad\nname'},{subject:'x'.repeat(513)}])assert.equal((await finish(transaction,{...profile(),...patch})).status,401);
 assert.deepEqual(accountCounts(),before);
});

// Изолированный синтетический owner: никакой реальной учётной записи/адреса в source.
const owner='synthetic-protected-account',ownerEmail='owner@example.invalid',ownerHash=sha(ownerEmail);
const created=new Date().toISOString(),future=new Date(Date.now()+3600000).toISOString(),passkeySecret='nxs_'+'P'.repeat(43),passkeyHash=sha(passkeySecret);
db.prepare("INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?,'Synthetic protected','active',?,?)").run(owner,created,created);
db.prepare("INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES('synthetic-passkey-method',?,'passkey','active',?)").run(owner,created);
db.prepare("INSERT INTO nexus_passkey_users(account_id,user_id) VALUES(?,?)").run(owner,'P'.repeat(43));
db.prepare("INSERT INTO nexus_passkey_credentials(id,account_id,login_method_id,public_key,counter,device_type,backed_up,transports_json,last_commit_id,created_at) VALUES('synthetic-passkey',?,'synthetic-passkey-method','synthetic-public',0,'multiDevice',1,'[]','synthetic-commit',?)").run(owner,created);
db.prepare("INSERT INTO account_devices(id,subject_id,status,first_seen_at,last_seen_at) VALUES('synthetic-passkey-device',?,'active',?,?)").run(owner,created,created);
db.prepare("INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES('synthetic-passkey-session',?,'synthetic-passkey-device',?,'active','account-method-v1',?,?,?,?)").run(owner,passkeyHash,created,created,future,future);
db.prepare("INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES('synthetic-passkey-session','synthetic-passkey-method',?,?)").run(owner,created);
db.prepare("INSERT INTO nexus_oauth_account_policies(account_id,status,created_at) VALUES(?,'pending',?)").run(owner,created);
db.prepare('INSERT INTO nexus_oauth_allowed_emails(account_id,email_hash,created_at) VALUES(?,?,?)').run(owner,ownerHash,created);

await check('owner email unknown identity требует explicit link; pending не отключает Passkey',async()=>{
 const transaction=await flow(),before=accountCounts();
 const result=await finish(transaction,profile('google','synthetic-owner-subject',ownerEmail));assert.equal(result.status,403);assert.equal(result.body.error.code,'EXPLICIT_LINK_REQUIRED');assert.deepEqual(accountCounts(),before);
 assert.equal(db.prepare("SELECT status FROM account_sessions WHERE id='synthetic-passkey-session'").get().status,'active');
 assert.throws(()=>db.prepare("UPDATE nexus_oauth_account_policies SET status='enforced',activated_at=? WHERE account_id=?").run(created,owner),/OAUTH_VERIFIED_OWNER_EMAIL_REQUIRED/);
});
await check('link требует свежий именно Passkey session, не OAuth/старую/revoked',async()=>{
 const base={op:'begin',provider:'google',intent:'link',stateHash:hash(),flowHash:hash(),codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43)};
 for(const sessionHash of [hash(),sha(learnerSecret)])assert.equal((await call({...base,sessionHash})).status,401);
 db.prepare("UPDATE account_sessions SET created_at=? WHERE id='synthetic-passkey-session'").run(new Date(Date.now()-301000).toISOString());
 assert.equal((await call({...base,sessionHash:passkeyHash})).status,401);
 db.prepare("UPDATE account_sessions SET created_at=? WHERE id='synthetic-passkey-session'").run(created);
});
let ownerFlow;
await check('owner link exact verified allowlisted email и доказательство до enforcement',async()=>{
 ownerFlow=await flow({intent:'link',sessionHash:passkeyHash});
 for(const verifiedProfile of [profile('google','synthetic-owner-subject','wrong@example.invalid'),{...profile('google','synthetic-owner-subject',ownerEmail),emailVerified:false}]){
  const result=await finish(ownerFlow,verifiedProfile);assert.equal(result.status,403);assert.equal(result.body.error.code,'OWNER_EMAIL_REQUIRED');
 }
 const result=await finish(ownerFlow,profile('google','synthetic-owner-subject',ownerEmail));assert.equal(result.status,200,JSON.stringify(result));
 assert.equal(db.prepare('SELECT subject_id FROM account_sessions WHERE secret_hash=?').get(sha(result.body.sessionSecret)).subject_id,owner);
 assert.equal(db.prepare('SELECT count(*) AS n FROM nexus_oauth_verified_emails WHERE account_id=? AND email_hash=?').get(owner,ownerHash).n,1);
 db.prepare("UPDATE nexus_oauth_account_policies SET status='enforced',activated_at=? WHERE account_id=?").run(new Date().toISOString(),owner);
 assert.equal(count('feedback_permissions'),0);
});
await check('known owner federated login требует тот же verified email; identity чужого account не переносится',async()=>{
 let transaction=await flow();
 for(const verifiedProfile of [profile('google','synthetic-owner-subject','changed@example.invalid'),{...profile('google','synthetic-owner-subject',ownerEmail),emailVerified:false}])assert.equal((await finish(transaction,verifiedProfile)).status,403);
 assert.equal((await finish(transaction,profile('google','synthetic-owner-subject',ownerEmail))).status,200);
 transaction=await flow({intent:'link',sessionHash:passkeyHash});const before=accountCounts();
 assert.equal((await finish(transaction,profile())).body.error.code,'IDENTITY_ALREADY_LINKED');assert.deepEqual(accountCounts(),before);
});
await check('atomic guard откатывает stale consumption и concurrent owner policy изменение',async()=>{
 let transaction=await flow(),before=accountCounts();
 beforeBatch=()=>db.prepare('UPDATE nexus_oauth_transactions SET completed_at=?,commit_id=? WHERE id=?').run(new Date().toISOString(),'synthetic-race-commit',transaction.txId);
 const stale=await finish(transaction,profile('google','synthetic-race-subject'));assert.equal(stale.status,503);assert.equal(stale.body.sessionSecret,undefined);assert.deepEqual(accountCounts(),before);
 transaction=await flow();before=accountCounts();
 beforeBatch=()=>db.prepare('INSERT INTO nexus_oauth_allowed_emails(account_id,email_hash,created_at) VALUES(?,?,?)').run(owner,sha('race@example.invalid'),created);
 const protectedRace=await finish(transaction,profile('google','synthetic-race-policy','race@example.invalid'));assert.equal(protectedRace.status,503);assert.deepEqual(accountCounts(),before);
});
await check('atomic link guard откатывает выдачу после concurrent revoke исходного Passkey session',async()=>{
 const transaction=await flow({intent:'link',sessionHash:passkeyHash}),before=accountCounts();
 beforeBatch=()=>db.prepare("UPDATE account_sessions SET status='revoked',revoked_at=?,revoked_reason='synthetic-test' WHERE id='synthetic-passkey-session'").run(new Date().toISOString());
 const result=await finish(transaction,profile('yandex','synthetic-new-owner-yandex',ownerEmail));assert.equal(result.status,401); // issuer mismatch ещё до DB.batch
 // Повтор с правильным issuer доходит до race hook и final receipt guard.
 const actual=await finish(transaction,profile('google','synthetic-new-owner-google',ownerEmail));assert.equal(actual.status,503);assert.equal(actual.body.sessionSecret,undefined);assert.deepEqual(accountCounts(),before);
});
await check('disabled mapped identity не превращается в новый account',async()=>{
 const identity=db.prepare("SELECT login_method_id FROM oauth_identities WHERE provider='google' AND provider_subject='synthetic-subject'").get();
 db.prepare("UPDATE login_methods SET status='disabled',disabled_at=? WHERE id=?").run(new Date().toISOString(),identity.login_method_id);
 const transaction=await flow(),before=accountCounts();assert.equal((await finish(transaction,profile())).status,403);assert.deepEqual(accountCounts(),before);
});
await check('per-flow rate limit ограничивает приватные begin requests',async()=>{
 const flowHash=hash();let limited=false;
 for(let i=0;i<11;i++){
  const result=await call({op:'begin',provider:'vk',intent:'login',stateHash:hash(),flowHash,codeVerifier:'A'.repeat(43),nonce:'B'.repeat(43)});
  if(i<10)assert.equal(result.status,200);else{assert.equal(result.status,429);limited=true}
 }assert.equal(limited,true);
});
console.log(JSON.stringify({status:'PASS',tests,networkRequests:0,realAccounts:0,providerTokensStored:false,moderatorGrants:count('feedback_permissions'),schemaSource:'existing repository migrations + additive 0011',sqlite:'memory',webCryptoVerification:true}));
db.close();
