import {Buffer} from 'node:buffer';
import {generateRegistrationOptions,generateAuthenticationOptions,verifyRegistrationResponse,verifyAuthenticationResponse} from '@simplewebauthn/server';
const INTERNAL='/api/v2/account/internal/passkey';
const encoder=new TextEncoder();
const b64=bytes=>Buffer.from(bytes).toString('base64url');
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const id=()=>crypto.randomUUID();
const stamp=()=>new Date().toISOString();
const after=ms=>new Date(Date.now()+ms).toISOString();
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const sha=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
class Rejected extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status}}
const reject=(code,status)=>{throw new Rejected(code,status)};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'*','x-content-type-options':'nosniff'}});
const sql=(db,text,...args)=>db.prepare(text).bind(...args);
const first=(db,text,...args)=>sql(db,text,...args).first();
const all=async(db,text,...args)=>(await sql(db,text,...args).all()).results||[];
const keys=(object,allowed)=>!!object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).every(k=>allowed.includes(k));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function config(env){
 if(env.PASSKEY_ENABLED!=='true'||typeof env.PASSKEY_SERVICE_KEY!=='string'||env.PASSKEY_SERVICE_KEY.length<32||!env.DB)reject('PASSKEY_UNAVAILABLE',503);
 let origin;try{origin=new URL(env.PASSKEY_ORIGIN)}catch{reject('PASSKEY_UNAVAILABLE',503)}
 if(origin.origin!==env.PASSKEY_ORIGIN||origin.hostname!==env.PASSKEY_RP_ID||origin.username||origin.password||
   !(origin.protocol==='https:'||(env.ENVIRONMENT==='local'&&origin.protocol==='http:'&&origin.hostname==='localhost')))reject('PASSKEY_UNAVAILABLE',503);
 return{origin:origin.origin,rpID:origin.hostname};
}
async function boundedJSON(request){
 const reader=request.body?.getReader();if(!reader)reject('INVALID_INPUT');let length=0;const parts=[];
 try{while(true){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>65536)reject('INPUT_TOO_LARGE',413);parts.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{reject('INVALID_INPUT')}
 return{bytes,data};
}
async function ingress(request,env){
 const url=new URL(request.url);
 if(request.method!=='POST'||url.pathname!==INTERNAL||url.search||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')!=='application/json')reject('SERVICE_DENIED',401);
 const timestamp=request.headers.get('x-nexus-service-timestamp'),nonce=request.headers.get('x-nexus-service-nonce'),signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(timestamp||'')||! /^[a-f0-9]{32}$/.test(nonce||'')||!hash(signature)||Math.abs(Date.now()-Number(timestamp))>30000)reject('SERVICE_DENIED',401);
 const{bytes,data}=await boundedJSON(request);
 const digest=hex(await crypto.subtle.digest('SHA-256',bytes)),canonical=`v1\nPOST\n${INTERNAL}\n${timestamp}\n${nonce}\n${digest}`;
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.PASSKEY_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),p=>parseInt(p,16)),encoder.encode(canonical)))reject('SERVICE_DENIED',401);
 if(!keys(data,['op','input','flowHash','sessionHash','networkHash'])||Object.keys(data).length!==5||!hash(data.flowHash)||!hash(data.networkHash)||!(data.sessionHash===null||hash(data.sessionHash)))reject('SERVICE_DENIED',401);
 const saved=await sql(env.DB,'INSERT OR IGNORE INTO nexus_passkey_service_nonces(nonce,expires_at) VALUES(?1,?2)',nonce,new Date(Number(timestamp)+30000).toISOString()).run();
 if(!saved.success||saved.meta.changes!==1)reject('SERVICE_DENIED',401);
 await sql(env.DB,'DELETE FROM nexus_passkey_service_nonces WHERE expires_at<?1',stamp()).run();
 const bucket=Math.floor(Date.now()/60000),scope=await sha(data.networkHash+':'+data.op);
 const rate=await first(env.DB,'INSERT INTO nexus_passkey_rate_limits(scope_hash,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<40 RETURNING used',scope,bucket);
 if(!rate)reject('RATE_LIMITED',429);
 await sql(env.DB,'DELETE FROM nexus_passkey_rate_limits WHERE bucket<?1',bucket-2).run();
 await sql(env.DB,'DELETE FROM nexus_passkey_challenges WHERE id IN (SELECT id FROM nexus_passkey_challenges WHERE consumed_at IS NULL AND expires_at<?1 LIMIT 500)',stamp()).run();
 return data;
}
async function eligible(db,sessionHash,recent=false){
 if(!sessionHash)return null;
 const row=await first(db,`SELECT s.id,s.subject_id,s.created_at,a.display_name,slm.login_method_id FROM account_sessions s
 JOIN account_subjects a ON a.id=s.subject_id AND a.status='active'
 JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.status='active'
 WHERE s.secret_hash=?1 AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL
 AND s.idle_expires_at>?2 AND s.absolute_expires_at>?2`,sessionHash,stamp());
 if(!row)return null;
 const age=Date.now()-Date.parse(row.created_at);
 return recent&&(!Number.isFinite(age)||age<0||age>300000)?null:row;
}
async function registerOptions(env,settings,payload){
 const{input,flowHash,sessionHash}=payload;if(!keys(input,['inviteHash']))reject('INVALID_INPUT');
 let account,inviteHash=null,authorizedSessionId=null;
 if(hash(input.inviteHash)){
  const inv=await first(env.DB,`SELECT i.account_id,i.purpose,a.display_name FROM nexus_passkey_invites i
   JOIN account_subjects a ON a.id=i.account_id AND a.status='active'
   WHERE i.token_hash=?1 AND i.consumed_at IS NULL AND i.expires_at>?2`,input.inviteHash,stamp());
  if(!inv)reject('ENROLLMENT_REQUIRED',403);
  if(inv.purpose==='bootstrap'&&(await first(env.DB,"SELECT count(*) AS count FROM login_methods WHERE account_id=?1 AND kind='passkey' AND status='active'",inv.account_id)).count)reject('ENROLLMENT_REQUIRED',403);
  account={id:inv.account_id,display_name:inv.display_name};inviteHash=input.inviteHash;
 }else{
  if('inviteHash' in input)reject('INVALID_INPUT');
  const session=await eligible(env.DB,sessionHash,true);if(!session)reject('FRESH_LOGIN_REQUIRED',401);
  account={id:session.subject_id,display_name:session.display_name};authorizedSessionId=session.id;
 }
 await sql(env.DB,'INSERT INTO nexus_passkey_users(account_id,user_id) VALUES(?1,?2) ON CONFLICT(account_id) DO NOTHING',account.id,random()).run();
 const user=await first(env.DB,'SELECT user_id FROM nexus_passkey_users WHERE account_id=?1',account.id);
 const existing=await all(env.DB,`SELECT k.id,k.transports_json FROM nexus_passkey_credentials k JOIN login_methods lm ON lm.id=k.login_method_id WHERE k.account_id=?1 AND lm.status='active'`,account.id);
 if(existing.length>=10)reject('KEY_LIMIT',409);
 const options=await generateRegistrationOptions({rpName:'AKRONIKL IT NEXUS',rpID:settings.rpID,userID:Buffer.from(user.user_id,'base64url'),userName:account.display_name,userDisplayName:account.display_name,attestationType:'none',supportedAlgorithmIDs:[-7,-257],timeout:120000,authenticatorSelection:{residentKey:'required',userVerification:'required'},excludeCredentials:existing.map(k=>({id:k.id,transports:JSON.parse(k.transports_json)}))});
 const challengeId=id();await sql(env.DB,`INSERT INTO nexus_passkey_challenges(id,purpose,challenge,flow_hash,account_id,invite_hash,authorized_session_id,expires_at) VALUES(?1,'register',?2,?3,?4,?5,?6,?7)`,challengeId,options.challenge,flowHash,account.id,inviteHash,authorizedSessionId,after(120000)).run();
 return{challengeId,options};
}
async function authenticateOptions(env,settings,payload){
 if(!keys(payload.input,[])||Object.keys(payload.input).length)reject('INVALID_INPUT');
 const options=await generateAuthenticationOptions({rpID:settings.rpID,userVerification:'required',timeout:120000});
 const challengeId=id();await sql(env.DB,`INSERT INTO nexus_passkey_challenges(id,purpose,challenge,flow_hash,expires_at) VALUES(?1,'authenticate',?2,?3,?4)`,challengeId,options.challenge,payload.flowHash,after(120000)).run();return{challengeId,options};
}
async function verifyAndIssue(env,settings,payload,action){
 const{input,flowHash}=payload;
 if(!keys(input,['challengeId','response'])||typeof input.challengeId!=='string'||input.challengeId.length>80||!input.response)reject('INVALID_INPUT');
 const challenge=await first(env.DB,'SELECT * FROM nexus_passkey_challenges WHERE id=?1 AND purpose=?2 AND flow_hash=?3 AND consumed_at IS NULL AND expires_at>?4',input.challengeId,action,flowHash,stamp());
 if(!challenge)reject('CHALLENGE_REJECTED',401);
 let clientData;try{const raw=input.response.response?.clientDataJSON;if(typeof raw!=='string'||raw.length>16384||!/^[A-Za-z0-9_-]+$/.test(raw))reject('PASSKEY_REJECTED',401);clientData=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(raw,'base64url')))}catch{reject('PASSKEY_REJECTED',401)}
 if(clientData.crossOrigin===true||clientData.topOrigin!==undefined)reject('PASSKEY_REJECTED',401);
 let accountId,methodId,credential,oldVersion=null;
 if(action==='register'){
  accountId=challenge.account_id;
  const active=await first(env.DB,"SELECT id FROM account_subjects WHERE id=?1 AND status='active'",accountId);if(!active)reject('CHALLENGE_REJECTED',401);
  let verified;try{verified=await verifyRegistrationResponse({response:input.response,expectedChallenge:challenge.challenge,expectedOrigin:settings.origin,expectedRPID:settings.rpID,requireUserVerification:true})}catch{reject('PASSKEY_REJECTED',401)}
  if(!verified.verified||!verified.registrationInfo?.userVerified)reject('PASSKEY_REJECTED',401);
  const info=verified.registrationInfo;methodId=id();credential={...info.credential,deviceType:info.credentialDeviceType,backedUp:info.credentialBackedUp};
 }else{
  if(typeof input.response.id!=='string'||input.response.id.length>1400)reject('PASSKEY_REJECTED',401);
  const row=await first(env.DB,`SELECT k.*,u.user_id FROM nexus_passkey_credentials k
   JOIN nexus_passkey_users u ON u.account_id=k.account_id
   JOIN account_subjects a ON a.id=k.account_id AND a.status='active'
   JOIN login_methods lm ON lm.id=k.login_method_id AND lm.account_id=a.id AND lm.status='active'
   WHERE k.id=?1`,input.response.id);
  if(!row||input.response.response?.userHandle!==row.user_id)reject('PASSKEY_REJECTED',401);
  let verified;try{verified=await verifyAuthenticationResponse({response:input.response,expectedChallenge:challenge.challenge,expectedOrigin:settings.origin,expectedRPID:settings.rpID,requireUserVerification:true,credential:{id:row.id,publicKey:Buffer.from(row.public_key,'base64url'),counter:row.counter,transports:JSON.parse(row.transports_json)}})}catch{reject('PASSKEY_REJECTED',401)}
  if(!verified.verified||!verified.authenticationInfo?.userVerified)reject('PASSKEY_REJECTED',401);
  accountId=row.account_id;methodId=row.login_method_id;oldVersion=row.counter_version;
  credential={id:row.id,counter:verified.authenticationInfo.newCounter,backedUp:verified.authenticationInfo.credentialBackedUp};
 }
 // Identity and key material above come only from the verified ceremony and D1.
 // No caller-provided account/method/device/proof or legacy credential is accepted.
 const now=stamp(),commitId=id(),sessionId=action==='authenticate'?id():null,deviceId=action==='authenticate'?id():null,secret=action==='authenticate'?'nxs_'+random():null,secretHash=secret?await sha(secret):null;
 const commands=[sql(env.DB,'UPDATE nexus_passkey_challenges SET consumed_at=?1,commit_id=?2 WHERE id=?3 AND purpose=?4 AND flow_hash=?5 AND consumed_at IS NULL AND expires_at>?1',now,commitId,challenge.id,action,flowHash)];
 if(action==='register'){
  if(challenge.invite_hash){
   const invitation=await first(env.DB,'SELECT purpose FROM nexus_passkey_invites WHERE token_hash=?1 AND account_id=?2 AND consumed_at IS NULL AND expires_at>?3',challenge.invite_hash,accountId,now);
   if(!invitation)reject('CHALLENGE_REJECTED',401);
   if(invitation.purpose==='recovery'){
    commands.push(sql(env.DB,"UPDATE login_methods SET status='disabled',disabled_at=?1,version=version+1 WHERE account_id=?2 AND kind='passkey' AND status<>'disabled'",now,accountId));
    commands.push(sql(env.DB,"UPDATE account_sessions SET status='revoked',revoked_at=?1,revoked_reason='passkey-recovery' WHERE subject_id=?2 AND status='active'",now,accountId));
    commands.push(sql(env.DB,"UPDATE account_tokens SET status='revoked' WHERE subject_id=?1 AND status='active'",accountId));
   }
  }
  if(challenge.invite_hash)commands.push(sql(env.DB,'UPDATE nexus_passkey_invites SET consumed_at=?1,commit_id=?2 WHERE token_hash=?3 AND account_id=?4 AND consumed_at IS NULL AND expires_at>?1',now,commitId,challenge.invite_hash,accountId));
  commands.push(sql(env.DB,"INSERT INTO login_methods(id,account_id,kind,status,created_at) VALUES(?1,?2,'passkey','active',?3)",methodId,accountId,now));
  commands.push(sql(env.DB,`INSERT INTO nexus_passkey_credentials(id,account_id,login_method_id,public_key,counter,device_type,backed_up,transports_json,last_commit_id,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`,credential.id,accountId,methodId,b64(credential.publicKey),credential.counter,credential.deviceType,credential.backedUp?1:0,JSON.stringify(credential.transports||[]),commitId,now));
 }else commands.push(sql(env.DB,'UPDATE nexus_passkey_credentials SET counter=?1,counter_version=counter_version+1,backed_up=?2,last_commit_id=?3 WHERE id=?4 AND counter_version=?5',credential.counter,credential.backedUp?1:0,commitId,credential.id,oldVersion));
 if(action==='authenticate'){
 commands.push(sql(env.DB,"INSERT INTO account_devices(id,subject_id,label,status,first_seen_at,last_seen_at) VALUES(?1,?2,'Passkey browser','active',?3,?3)",deviceId,accountId,now));
 commands.push(sql(env.DB,"INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at) VALUES(?1,?2,?3,?4,'active','account-method-v1',?5,?5,?6,?7)",sessionId,accountId,deviceId,secretHash,now,after(1800000),after(43200000)));
 commands.push(sql(env.DB,'INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at) VALUES(?1,?2,?3,?4)',sessionId,methodId,accountId,now));
 }
 commands.push(sql(env.DB,'INSERT INTO nexus_passkey_audit(id,account_id,login_method_id,session_id,action,created_at) VALUES(?1,?2,?3,?4,?5,?6)',commitId,accountId,methodId,sessionId,action,now));
 commands.push(sql(env.DB,'INSERT INTO nexus_passkey_receipts(id,challenge_id,credential_id,account_id,login_method_id,session_id,device_id,action,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)',commitId,challenge.id,credential.id,accountId,methodId,sessionId,deviceId,action,now));
 try{const committed=await env.DB.batch(commands);if(committed.length!==commands.length||committed.some(x=>!x.success))reject('ISSUANCE_UNCONFIRMED',503)}catch{reject('ISSUANCE_UNCONFIRMED',503)}
 // Never retry ambiguous commits, and never expose a secret before confirmed batch.
 return secret?{ok:true,sessionSecret:secret}:{ok:true};
}
async function accountOperation(env,payload){
 const session=await eligible(env.DB,payload.sessionHash);if(!session)reject('SESSION_REQUIRED',401);
 if(payload.op==='logout'){
  if(!keys(payload.input,[])||Object.keys(payload.input).length)reject('INVALID_INPUT');
  await sql(env.DB,"UPDATE account_sessions SET status='revoked',revoked_at=?1,revoked_reason='passkey-logout' WHERE id=?2 AND status='active'",stamp(),session.id).run();return{ok:true,clearSession:true};
 }
 if(payload.op==='keys'){
  if(!keys(payload.input,[])||Object.keys(payload.input).length)reject('INVALID_INPUT');
  return{keys:await all(env.DB,`SELECT lm.id AS id,lm.status,k.created_at AS createdAt,k.device_type AS deviceType FROM nexus_passkey_credentials k JOIN login_methods lm ON lm.id=k.login_method_id WHERE k.account_id=?1 ORDER BY k.created_at`,session.subject_id)};
 }
 if(payload.op==='revoke'){
  if(!keys(payload.input,['methodId'])||typeof payload.input.methodId!=='string'||payload.input.methodId.length>80)reject('INVALID_INPUT');
  if(!await eligible(env.DB,payload.sessionHash,true))reject('FRESH_LOGIN_REQUIRED',401);
  const revoked=await sql(env.DB,`UPDATE login_methods SET status='disabled',disabled_at=?1,version=version+1
   WHERE id=?2 AND account_id=?3 AND kind='passkey' AND status='active'
   AND (SELECT count(*) FROM login_methods WHERE account_id=?3 AND status='active')>1`,stamp(),payload.input.methodId,session.subject_id).run();
  if(revoked.meta.changes!==1)reject('LAST_KEY_OR_NOT_FOUND',409);return{ok:true};
 }
 reject('NOT_FOUND',404);
}
export async function handlePasskeyService(request,env){
 try{const settings=config(env),payload=await ingress(request,env);let result;
  if(payload.op==='register-options')result=await registerOptions(env,settings,payload);
  else if(payload.op==='authenticate-options')result=await authenticateOptions(env,settings,payload);
  else if(payload.op==='register-verify')result=await verifyAndIssue(env,settings,payload,'register');
  else if(payload.op==='authenticate-verify')result=await verifyAndIssue(env,settings,payload,'authenticate');
  else result=await accountOperation(env,payload);
  return response(result);
 }catch(error){return response({error:{code:error instanceof Rejected?error.code:'PASSKEY_UNAVAILABLE'}},error instanceof Rejected?error.status:503)}
}
