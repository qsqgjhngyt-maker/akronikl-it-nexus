// Приватный BFF→Worker OAuth protocol. Provider tokens сюда не передаются и не хранятся.
import {Buffer} from 'node:buffer';
const INTERNAL='/api/v2/account/internal/oauth';
const ISSUERS=Object.freeze({google:'https://accounts.google.com',yandex:'https://login.yandex.ru',vk:'https://id.vk.ru',mailru:'https://oauth.mail.ru'});
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
const sha=async text=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
const uuid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const statement=(db,sql,...args)=>db.prepare(sql).bind(...args);
const first=(db,sql,...args)=>statement(db,sql,...args).first();
class Rejected extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const deny=(code,status)=>{throw new Rejected(code,status)};
const response=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff'}});
const providerAllowed=(env,provider)=>Object.hasOwn(ISSUERS,provider)&&(provider!=='mailru'||env.OAUTH_MAILRU_SECURE_ADAPTER_ENABLED==='true');

async function ingress(request,env){
 if(env.OAUTH_ENABLED!=='true'||typeof env.OAUTH_SERVICE_KEY!=='string'||env.OAUTH_SERVICE_KEY.length<32||!env.DB)deny('OAUTH_UNAVAILABLE',503);
 const url=new URL(request.url);
 if(request.method!=='POST'||url.pathname!==INTERNAL||url.search||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')!=='application/json')deny('SERVICE_DENIED',401);
 const timestamp=request.headers.get('x-nexus-service-timestamp'),nonce=request.headers.get('x-nexus-service-nonce'),signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(timestamp||'')||!/^[a-f0-9]{32}$/.test(nonce||'')||!hash(signature)||Math.abs(Date.now()-Number(timestamp))>30000)deny('SERVICE_DENIED',401);
 const reader=request.body?.getReader();if(!reader)deny('INVALID_INPUT');
 const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>8192)deny('INPUT_TOO_LARGE',413);chunks.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=Buffer.concat(chunks,length),digest=hex(await crypto.subtle.digest('SHA-256',bytes));
 const canonical=`v1\nPOST\n${INTERNAL}\n${timestamp}\n${nonce}\n${digest}`;
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.OAUTH_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),encoder.encode(canonical)))deny('SERVICE_DENIED',401);
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{deny('INVALID_INPUT')}
 if(!data||!['begin','claim','complete'].includes(data.op))deny('INVALID_INPUT');
 const used=await statement(env.DB,'INSERT OR IGNORE INTO nexus_oauth_service_nonces(nonce,expires_at) VALUES(?1,?2)',nonce,new Date(Number(timestamp)+30000).toISOString()).run();
 if(!used.success||Number(used.meta?.changes)!==1)deny('SERVICE_DENIED',401);
 const bucket=Math.floor(Date.now()/60000),globalScope=await sha('oauth:'+data.op);
 const rate=await first(env.DB,'INSERT INTO nexus_oauth_rate_limits(scope_hash,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<120 RETURNING used',globalScope,bucket);
 if(!rate)deny('RATE_LIMITED',429);
 if(hash(data.flowHash)){
  const scoped=await first(env.DB,'INSERT INTO nexus_oauth_rate_limits(scope_hash,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<10 RETURNING used',await sha('oauth:'+data.op+':'+data.flowHash),bucket);
  if(!scoped)deny('RATE_LIMITED',429);
 }
 // Только истёкшие PKCE/nonce, без удаления identity/session/project данных.
 await statement(env.DB,'UPDATE nexus_oauth_transactions SET code_verifier=NULL,nonce=NULL WHERE expires_at<=?1 AND (code_verifier IS NOT NULL OR nonce IS NOT NULL)',now()).run();
 return data;
}

async function freshPasskey(db,{sessionHash,sessionId,accountId}={}){
 const row=await first(db,`SELECT s.id,s.subject_id,s.created_at FROM account_sessions s
 JOIN account_subjects a ON a.id=s.subject_id AND a.status='active'
 JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'
 JOIN nexus_passkey_credentials pk ON pk.login_method_id=lm.id AND pk.account_id=a.id
 WHERE ((?1 IS NOT NULL AND s.secret_hash=?1) OR (?2 IS NOT NULL AND s.id=?2))
 AND (?3 IS NULL OR a.id=?3) AND s.status='active' AND s.auth_strength='account-method-v1'
 AND s.revoked_at IS NULL AND s.idle_expires_at>?4 AND s.absolute_expires_at>?4`,sessionHash||null,sessionId||null,accountId||null,now());
 const age=row?Date.now()-Date.parse(row.created_at):NaN;
 return Number.isFinite(age)&&age>=0&&age<300000?row:null;
}

async function begin(env,data){
 const names=['op','provider','intent','stateHash','flowHash','codeVerifier','nonce'];
 if(data.intent==='link')names.push('sessionHash');
 if(!exact(data,names)||!providerAllowed(env,data.provider)||!['login','link'].includes(data.intent)||
  !hash(data.stateHash)||!hash(data.flowHash)||typeof data.codeVerifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(data.codeVerifier)||
  typeof data.nonce!=='string'||!/^[A-Za-z0-9_-]{22,128}$/.test(data.nonce)||(data.intent==='link'&&!hash(data.sessionHash)))deny('INVALID_INPUT');
 let account=null;
 if(data.intent==='link'){account=await freshPasskey(env.DB,{sessionHash:data.sessionHash});if(!account)deny('FRESH_PASSKEY_REQUIRED',401)}
 const txId=uuid(),created=now(),expiresAt=new Date(Date.now()+600000).toISOString();
 try{const saved=await statement(env.DB,`INSERT INTO nexus_oauth_transactions(id,state_hash,flow_hash,provider,intent,code_verifier,nonce,authorized_account_id,authorized_session_id,created_at,expires_at)
 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,txId,data.stateHash,data.flowHash,data.provider,data.intent,data.codeVerifier,data.nonce,account?.subject_id||null,account?.id||null,created,expiresAt).run();
 if(!saved.success||Number(saved.meta?.changes)!==1)deny('TRANSACTION_UNCONFIRMED',503)}catch{deny('TRANSACTION_REJECTED',409)}
 return{ok:true,txId,expiresAt};
}

async function claim(env,data){
 if(!exact(data,['op','provider','stateHash','flowHash'])||!providerAllowed(env,data.provider)||!hash(data.stateHash)||!hash(data.flowHash))deny('INVALID_INPUT');
 const claimId=uuid(),created=now();
 const commands=[
  statement(env.DB,`UPDATE nexus_oauth_transactions SET claimed_at=?1,claim_id=?2
   WHERE state_hash=?3 AND flow_hash=?4 AND provider=?5 AND claimed_at IS NULL AND completed_at IS NULL
   AND expires_at>?1 AND code_verifier IS NOT NULL AND nonce IS NOT NULL
   RETURNING id,code_verifier,nonce,intent`,created,claimId,data.stateHash,data.flowHash,data.provider),
  statement(env.DB,'UPDATE nexus_oauth_transactions SET code_verifier=NULL,nonce=NULL WHERE claim_id=?1',claimId)
 ];
 const committed=await env.DB.batch(commands);
 if(committed.length!==2||committed.some(x=>!x.success))deny('TRANSACTION_UNCONFIRMED',503);
 const row=committed[0].results?.[0];
 if(!row||Number(committed[1].meta?.changes)!==1)deny('TRANSACTION_REJECTED',401);
 return{ok:true,txId:row.id,codeVerifier:row.code_verifier,nonce:row.nonce,intent:row.intent};
}

function profileFor(provider,profile){
 if(!exact(profile,['issuer','subject','email','emailVerified','displayName'])||profile.issuer!==ISSUERS[provider]||
  typeof profile.subject!=='string'||!profile.subject.length||profile.subject.length>512||profile.subject!==profile.subject.trim()||/[\x00-\x1f\x7f]/.test(profile.subject)||
  typeof profile.emailVerified!=='boolean'||typeof profile.displayName!=='string'||!profile.displayName.trim()||profile.displayName.length>512||/[\x00-\x1f\x7f]/.test(profile.displayName))deny('PROFILE_REJECTED',401);
 let email=null;
 if(profile.email!==null){
  if(typeof profile.email!=='string'||profile.email.length>320||!/^\S+@\S+\.\S+$/.test(profile.email)||/[\x00-\x1f\x7f]/.test(profile.email))deny('PROFILE_REJECTED',401);
  email=profile.email.trim().toLowerCase();
 }
 if(profile.emailVerified&&!email)deny('PROFILE_REJECTED',401);
 return{...profile,email,displayName:profile.displayName.trim()};
}

async function complete(env,data){
 if(!exact(data,['op','txId','flowHash','profile'])||typeof data.txId!=='string'||data.txId.length>80||!hash(data.flowHash))deny('INVALID_INPUT');
 const tx=await first(env.DB,'SELECT * FROM nexus_oauth_transactions WHERE id=?1 AND flow_hash=?2 AND claimed_at IS NOT NULL AND completed_at IS NULL AND expires_at>?3',data.txId,data.flowHash,now());
 if(!tx||!providerAllowed(env,tx.provider))deny('TRANSACTION_REJECTED',401);
 const profile=profileFor(tx.provider,data.profile),emailHash=profile.email?await sha(profile.email):null;
 let identity=await first(env.DB,`SELECT oi.account_id,oi.login_method_id,a.status AS account_status,lm.status AS method_status,lm.kind
 FROM oauth_identities oi JOIN account_subjects a ON a.id=oi.account_id JOIN login_methods lm ON lm.id=oi.login_method_id AND lm.account_id=a.id
 WHERE oi.provider=?1 AND oi.issuer=?2 AND oi.provider_subject=?3`,tx.provider,profile.issuer,profile.subject);
 let accountId,methodId,isNewAccount=false,isNewIdentity=false;
 if(tx.intent==='link'){
  const authorized=await freshPasskey(env.DB,{sessionId:tx.authorized_session_id,accountId:tx.authorized_account_id});
  if(!authorized)deny('FRESH_PASSKEY_REQUIRED',401);
  accountId=authorized.subject_id;
  if(identity&&identity.account_id!==accountId)deny('IDENTITY_ALREADY_LINKED',409);
  if(identity&&(identity.account_status!=='active'||identity.method_status!=='active'||identity.kind!=='oauth'))deny('IDENTITY_REJECTED',403);
  methodId=identity?.login_method_id||uuid();isNewIdentity=!identity;
 }else if(identity){
  if(identity.account_status!=='active'||identity.method_status!=='active'||identity.kind!=='oauth')deny('IDENTITY_REJECTED',403);
  accountId=identity.account_id;methodId=identity.login_method_id;
 }else{
  if(emailHash&&await first(env.DB,'SELECT account_id FROM nexus_oauth_allowed_emails WHERE email_hash=?1 LIMIT 1',emailHash))deny('EXPLICIT_LINK_REQUIRED',403);
  accountId=uuid();methodId=uuid();isNewAccount=true;isNewIdentity=true;
 }
 const policy=await first(env.DB,'SELECT status FROM nexus_oauth_account_policies WHERE account_id=?1',accountId);
 if(policy&&(!profile.emailVerified||!emailHash||!await first(env.DB,'SELECT account_id FROM nexus_oauth_allowed_emails WHERE account_id=?1 AND email_hash=?2',accountId,emailHash)))deny('OWNER_EMAIL_REQUIRED',403);
 const created=now(),commitId=uuid(),sessionId=uuid(),deviceId=uuid();
 const secret='nxs_'+Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),secretHash=await sha(secret);
 const commands=[statement(env.DB,`UPDATE nexus_oauth_transactions SET completed_at=?1,commit_id=?2
  WHERE id=?3 AND flow_hash=?4 AND claimed_at IS NOT NULL AND completed_at IS NULL AND expires_at>?1`,created,commitId,tx.id,data.flowHash)];
 if(isNewAccount)commands.push(statement(env.DB,"INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?1,?2,'active',?3,?3)",accountId,profile.displayName,created));
 if(isNewIdentity){
  commands.push(statement(env.DB,"INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?1,?2,'oauth','active',?3)",methodId,accountId,created));
  commands.push(statement(env.DB,'INSERT INTO oauth_identities(login_method_id,account_id,provider,issuer,provider_subject,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?6)',methodId,accountId,tx.provider,profile.issuer,profile.subject,created));
 }
 commands.push(statement(env.DB,"INSERT INTO account_devices(id,subject_id,label,status,first_seen_at,last_seen_at) VALUES(?1,?2,'OAuth browser','active',?3,?3)",deviceId,accountId,created));
 commands.push(statement(env.DB,"INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?1,?2,?3,?4,'active','account-method-v1',?5,?5,?6,?7)",sessionId,accountId,deviceId,secretHash,created,new Date(Date.now()+1800000).toISOString(),new Date(Date.now()+43200000).toISOString()));
 commands.push(statement(env.DB,'INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?1,?2,?3,?4)',sessionId,methodId,accountId,created));
 commands.push(statement(env.DB,`INSERT INTO nexus_oauth_receipts(id,tx_id,flow_hash,account_id,login_method_id,session_id,device_id,provider,issuer,provider_subject,email_hash,email_verified,new_account,created_at)
 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`,commitId,tx.id,data.flowHash,accountId,methodId,sessionId,deviceId,tx.provider,profile.issuer,profile.subject,emailHash,profile.emailVerified?1:0,isNewAccount?1:0,created));
 if(profile.emailVerified)commands.push(statement(env.DB,`INSERT INTO nexus_oauth_verified_emails(account_id,email_hash,provider,issuer,provider_subject,receipt_id,verified_at)
 VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(account_id,email_hash,provider,issuer,provider_subject)
 DO UPDATE SET receipt_id=excluded.receipt_id,verified_at=excluded.verified_at`,accountId,emailHash,tx.provider,profile.issuer,profile.subject,commitId,created));
 try{
  const committed=await env.DB.batch(commands);
  if(committed.length!==commands.length||committed.some(x=>!x.success))deny('ISSUANCE_UNCONFIRMED',503);
  const receipt=await first(env.DB,'SELECT session_id FROM nexus_oauth_receipts WHERE id=?1 AND tx_id=?2 AND account_id=?3',commitId,tx.id,accountId);
  if(receipt?.session_id!==sessionId)deny('ISSUANCE_UNCONFIRMED',503);
 }catch{deny('ISSUANCE_UNCONFIRMED',503)}
 return{ok:true,sessionSecret:secret};
}

export async function handleOAuthService(request,env){
 try{
  const data=await ingress(request,env);
  return response(await (data.op==='begin'?begin(env,data):data.op==='claim'?claim(env,data):complete(env,data)));
 }catch(error){
  return response({error:{code:error instanceof Rejected?error.code:'OAUTH_UNAVAILABLE'}},error instanceof Rejected?error.status:503);
 }
}
