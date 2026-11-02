// Invite-only password method. Never exposed to browsers: signed BFF -> Worker only.
// The memory-hard scrypt work happens in the trusted Node BFF, not on a 10 ms Workers Free CPU budget.
// Login uses a single-use challenge HMAC keyed by the password-derived hash;
// no reusable password-equivalent verifier is transferred during login.
import {Buffer} from 'node:buffer';
import {alphaSettings,validUsername,validDisplayName} from './alpha-admission.mjs';

const INTERNAL='/api/v2/account/internal/invited-password';
const encoder=new TextEncoder();
const sql=(db,statement,...args)=>db.prepare(statement).bind(...args);
const first=(db,statement,...args)=>sql(db,statement,...args).first();
const now=()=>new Date().toISOString();
const after=ms=>new Date(Date.now()+ms).toISOString();
const uuid=()=>crypto.randomUUID();
const random=bytes=>Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url');
const hex=bytes=>Buffer.from(bytes).toString('hex');
const digest=async data=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(data)));
const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
class Rejected extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const deny=(code,status)=>{throw new Rejected(code,status)};
const reply=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});

async function envelope(request,env){
 if(env.INVITED_PASSWORD_ENABLED!=='true'||env.ALPHA_ADMISSION_ENABLED!=='true'||
    typeof env.INVITED_PASSWORD_SERVICE_KEY!=='string'||env.INVITED_PASSWORD_SERVICE_KEY.length<32||!env.DB)deny('PASSWORD_UNAVAILABLE',503);
 const url=new URL(request.url);
 if(request.method!=='POST'||url.pathname!==INTERNAL||url.search||
    request.headers.get('content-type')!=='application/json'||request.headers.has('cookie')||
    request.headers.has('authorization'))deny('SERVICE_DENIED',401);
 const stamp=request.headers.get('x-nexus-service-timestamp');
 const nonce=request.headers.get('x-nexus-service-nonce');
 const signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(stamp||'')||!/^[a-f0-9]{32}$/.test(nonce||'')||!isHash(signature)||
    Math.abs(Date.now()-Number(stamp))>30000)deny('SERVICE_DENIED',401);
 const reader=request.body?.getReader();
 if(!reader)deny('INVALID_INPUT');
 const parts=[];let length=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.length;
   if(length>8192)deny('INPUT_TOO_LARGE',413);
   parts.push(value);
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=Buffer.concat(parts,length);
 const canonical=['v1','POST',INTERNAL,stamp,nonce,hex(await crypto.subtle.digest('SHA-256',bytes))].join('\n');
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.INVITED_PASSWORD_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('HMAC',key,Buffer.from(signature,'hex'),encoder.encode(canonical));
 if(!valid)deny('SERVICE_DENIED',401);
 let data;
 try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{deny('INVALID_INPUT')}
 if(!data||!['enroll','begin','finish','logout'].includes(data.op))deny('INVALID_INPUT');
 const saved=await sql(env.DB,'INSERT OR IGNORE INTO nexus_password_service_nonces(nonce,expires_at) VALUES(?1,?2)',nonce,new Date(Number(stamp)+30000).toISOString()).run();
 if(!saved.success||saved.meta?.changes!==1)deny('SERVICE_DENIED',401);
 await sql(env.DB,'DELETE FROM nexus_password_service_nonces WHERE nonce IN (SELECT nonce FROM nexus_password_service_nonces WHERE expires_at<?1 LIMIT 64)',now()).run();
 await alphaSettings(env); // fail closed if the invitation/admission enforcement is unavailable
 return data;
}
async function limit(env,scope,bucket,max){
 const scopeHash=await digest(scope);
 const permitted=await first(env.DB,
  'INSERT INTO nexus_password_rate_limits(scope_hash,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<?3 RETURNING used',
  scopeHash,bucket,max);
 if(!permitted)deny('RATE_LIMITED',429);
}
async function rate(env,data){
 const minute=Math.floor(Date.now()/60000);
 await limit(env,'global:'+data.op,minute,200);
 if(data.networkHash){
  await limit(env,'network:'+data.networkHash,minute,30);
 }
 if(data.emailHash){
  await limit(env,'email:'+data.emailHash,Math.floor(minute/10),5);
 }
 await sql(env.DB,'DELETE FROM nexus_password_rate_limits WHERE rowid IN(SELECT rowid FROM nexus_password_rate_limits WHERE bucket<?1 LIMIT 100)',Math.floor(minute/10)-10).run();
}
function validDerived(salt,hash){
 return typeof salt==='string'&&/^[A-Za-z0-9_-]{22}$/.test(salt)&&
  typeof hash==='string'&&/^[A-Za-z0-9_-]{43}$/.test(hash)&&
  Buffer.from(salt,'base64url').length===16&&Buffer.from(hash,'base64url').length===32;
}

async function enroll(env,data){
 if(!exact(data,['op','inviteHash','emailHash','username','displayName','saltB64','hashB64','networkHash'])||
    !isHash(data.inviteHash)||!isHash(data.emailHash)||!isHash(data.networkHash)||
    !validUsername(data.username)||!validDisplayName(data.displayName)||
    !validDerived(data.saltB64,data.hashB64))deny('INVALID_INPUT');
 await rate(env,data);
 const stamp=now();
 const invite=await first(env.DB,[
  'SELECT i.account_id FROM nexus_admin_invites i',
  'JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash AND p.account_id=i.account_id',
  'JOIN nexus_password_invite_emails e ON e.token_hash=i.token_hash AND e.account_id=i.account_id',
  'JOIN nexus_alpha_members m ON m.account_id=i.account_id',
  "JOIN account_subjects a ON a.id=i.account_id AND a.status='active'",
  "WHERE i.token_hash=?1 AND e.email_hash=?2 AND i.kind='admin' AND i.state='ready'",
  "AND m.state='invited' AND m.reserved_until>?3 AND p.consumed_at IS NULL AND p.expires_at>?3",
  "AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=i.account_id)",
  "AND NOT EXISTS(SELECT 1 FROM login_methods lm WHERE lm.account_id=i.account_id AND lm.kind='password')"
 ].join(' '),data.inviteHash,data.emailHash,stamp);
 if(!invite)deny('ENROLLMENT_REQUIRED',403);
 const id=invite.account_id,methodId=uuid(),commitId=uuid();
 const commands=[
  sql(env.DB,"UPDATE nexus_admin_invites SET state='accepted' WHERE token_hash=?1 AND state='ready'",data.inviteHash),
  sql(env.DB,'UPDATE nexus_passkey_invites SET consumed_at=?1,commit_id=?2 WHERE token_hash=?3 AND account_id=?4 AND consumed_at IS NULL AND expires_at>?1',stamp,commitId,data.inviteHash,id),
  sql(env.DB,"UPDATE nexus_alpha_members SET state='active',reserved_until=NULL,version=version+1,updated_at=?1 WHERE account_id=?2 AND state='invited' AND reserved_until>?1",stamp,id),
  sql(env.DB,'INSERT INTO nexus_account_profiles(account_id,username,created_at) VALUES(?1,?2,?3)',id,data.username,stamp),
  sql(env.DB,'UPDATE account_subjects SET display_name=?1,updated_at=?2 WHERE id=?3',data.displayName,stamp,id),
  sql(env.DB,"INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?1,?2,'password','active',?3)",methodId,id,stamp),
  sql(env.DB,"INSERT INTO nexus_password_credentials(account_id,login_method_id,email_hash,salt_b64,hash_b64,algorithm,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'scrypt-N32768-r8-p3',?6,?6)",id,methodId,data.emailHash,data.saltB64,data.hashB64,stamp),
  sql(env.DB,"INSERT INTO nexus_password_audit(id,account_id,action,created_at) VALUES(?1,?2,'enroll',?3)",commitId,id,stamp)
 ];
 try{
  const outcome=await env.DB.batch(commands);
  if(outcome.length!==commands.length||outcome.some(row=>!row.success)||outcome[0]?.meta?.changes!==1||outcome[1]?.meta?.changes!==1||outcome[2]?.meta?.changes!==1)deny('ENROLLMENT_UNCONFIRMED',503);
  const receipt=await first(env.DB,'SELECT account_id FROM nexus_password_credentials WHERE account_id=?1 AND login_method_id=?2 AND email_hash=?3',id,methodId,data.emailHash);
  if(!receipt)deny('ENROLLMENT_UNCONFIRMED',503);
 }catch(error){
  if(error instanceof Rejected)throw error;
  if(String(error?.message||'').includes('nexus_account_profiles.username'))deny('USERNAME_UNAVAILABLE',409);
  deny('ENROLLMENT_UNCONFIRMED',503);
 }
 return {ok:true};
}

async function begin(env,data){
 if(!exact(data,['op','emailHash','networkHash'])||!isHash(data.emailHash)||!isHash(data.networkHash))deny('INVALID_INPUT');
 await rate(env,data);
 const row=await first(env.DB,[
  'SELECT p.account_id,p.salt_b64 FROM nexus_password_credentials p',
  "JOIN account_subjects a ON a.id=p.account_id AND a.status='active'",
  "JOIN login_methods lm ON lm.id=p.login_method_id AND lm.account_id=p.account_id AND lm.kind='password' AND lm.status='active'",
  "JOIN nexus_alpha_members m ON m.account_id=p.account_id AND m.state='active'",
  'WHERE p.email_hash=?1 AND (m.access_expires_at IS NULL OR m.access_expires_at>?2)',
  'AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=p.account_id)'
 ].join(' '),data.emailHash,now());
 const challengeId=uuid(),salt=row?.salt_b64||random(16),created=now(),expiresAt=after(60000);
 await sql(env.DB,'INSERT INTO nexus_password_challenges(id,account_id,email_hash,network_hash,salt_b64,created_at,expires_at) VALUES(?1,?2,?3,?4,?5,?6,?7)',challengeId,row?.account_id||null,data.emailHash,data.networkHash,salt,created,expiresAt).run();
 await sql(env.DB,'DELETE FROM nexus_password_challenges WHERE id IN (SELECT id FROM nexus_password_challenges WHERE expires_at<?1 LIMIT 64)',new Date(Date.now()-60000).toISOString()).run();
 return {challengeId,saltB64:salt};
}
async function finish(env,data){
 if(!exact(data,['op','challengeId','emailHash','networkHash','proof'])||
    typeof data.challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(data.challengeId)||
    !isHash(data.emailHash)||!isHash(data.networkHash)||!isHash(data.proof))deny('INVALID_INPUT');
 const timestamp=now();
 const challenge=await first(env.DB,
  'SELECT * FROM nexus_password_challenges WHERE id=?1 AND email_hash=?2 AND network_hash=?3 AND consumed_at IS NULL AND expires_at>?4',
  data.challengeId,data.emailHash,data.networkHash,timestamp);
 if(!challenge)deny('AUTH_FAILED',401);
 const credential=challenge.account_id?await first(env.DB,[
  'SELECT p.account_id,p.login_method_id,p.hash_b64 FROM nexus_password_credentials p',
  "JOIN account_subjects a ON a.id=p.account_id AND a.status='active'",
  "JOIN login_methods lm ON lm.id=p.login_method_id AND lm.account_id=p.account_id AND lm.kind='password' AND lm.status='active'",
  "JOIN nexus_alpha_members m ON m.account_id=p.account_id AND m.state='active'",
  'WHERE p.account_id=?1 AND p.email_hash=?2 AND (m.access_expires_at IS NULL OR m.access_expires_at>?3)',
  'AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=p.account_id)'
 ].join(' '),challenge.account_id,data.emailHash,timestamp):null;
 let proven=false;
 if(credential){
  const key=await crypto.subtle.importKey('raw',Buffer.from(credential.hash_b64,'base64url'),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const message=['v1',challenge.id,data.emailHash,data.networkHash].join('\n');
  proven=await crypto.subtle.verify('HMAC',key,Buffer.from(data.proof,'hex'),encoder.encode(message));
 }
 if(!proven){
  await sql(env.DB,'UPDATE nexus_password_challenges SET consumed_at=?1 WHERE id=?2 AND consumed_at IS NULL',timestamp,challenge.id).run();
  deny('AUTH_FAILED',401);
 }
 const sessionId=uuid(),deviceId=uuid(),receiptId=uuid();
 const secret='nxs_'+random(32),secretHash=await digest(secret);
 const commands=[
  sql(env.DB,'UPDATE nexus_password_challenges SET consumed_at=?1 WHERE id=?2 AND consumed_at IS NULL AND expires_at>?1',timestamp,challenge.id),
  sql(env.DB,"INSERT INTO account_devices(id,subject_id,label,status,first_seen_at,last_seen_at) VALUES(?1,?2,'Password browser','active',?3,?3)",deviceId,credential.account_id,timestamp),
  sql(env.DB,"INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?1,?2,?3,?4,'active','account-method-v1',?5,?5,?6,?7)",sessionId,credential.account_id,deviceId,secretHash,timestamp,after(1800000),after(43200000)),
  sql(env.DB,'INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?1,?2,?3,?4)',sessionId,credential.login_method_id,credential.account_id,timestamp),
  sql(env.DB,'INSERT INTO nexus_password_receipts(challenge_id,account_id,login_method_id,session_id,created_at) VALUES(?1,?2,?3,?4,?5)',challenge.id,credential.account_id,credential.login_method_id,sessionId,timestamp),
  sql(env.DB,"INSERT INTO nexus_password_audit(id,account_id,action,created_at) VALUES(?1,?2,'login',?3)",receiptId,credential.account_id,timestamp)
 ];
 try{
  const result=await env.DB.batch(commands);
  if(result.length!==commands.length||result.some(row=>!row.success)||result[0]?.meta?.changes!==1)deny('AUTH_UNCONFIRMED',503);
  const receipt=await first(env.DB,'SELECT session_id FROM nexus_password_receipts WHERE challenge_id=?1 AND account_id=?2',challenge.id,credential.account_id);
  if(receipt?.session_id!==sessionId)deny('AUTH_UNCONFIRMED',503);
 }catch(error){if(error instanceof Rejected)throw error;deny('AUTH_UNCONFIRMED',503)}
 return {ok:true,sessionSecret:secret};
}
async function logout(env,data){
 if(!exact(data,['op','sessionHash'])||!isHash(data.sessionHash))deny('INVALID_INPUT');
 const timestamp=now();
 const session=await first(env.DB,[
  'SELECT s.id,s.subject_id FROM account_sessions s',
  'JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=s.subject_id',
  "JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=s.subject_id AND lm.kind='password'",
  "WHERE s.secret_hash=?1 AND s.status='active' AND s.revoked_at IS NULL"
 ].join(' '),data.sessionHash);
 if(!session)deny('AUTH_FAILED',401);
 await env.DB.batch([
  sql(env.DB,"UPDATE account_sessions SET status='revoked',revoked_at=?1,revoked_reason='password-logout' WHERE id=?2 AND status='active'",timestamp,session.id),
  sql(env.DB,"INSERT INTO nexus_password_audit(id,account_id,action,created_at) VALUES(?1,?2,'logout',?3)",uuid(),session.subject_id,timestamp)
 ]);
 return {ok:true,clearSession:true};
}
export async function handleInvitedPasswordService(request,env){
 try{
  const data=await envelope(request,env);
  const result=data.op==='enroll'?await enroll(env,data):
   data.op==='begin'?await begin(env,data):
   data.op==='finish'?await finish(env,data):await logout(env,data);
  return reply(result);
 }catch(error){return reply({error:{code:error instanceof Rejected?error.code:'PASSWORD_UNAVAILABLE'}},error instanceof Rejected?error.status:503)}
}
