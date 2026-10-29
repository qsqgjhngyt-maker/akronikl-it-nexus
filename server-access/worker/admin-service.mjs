// Private BFF -> Worker control plane. An admin grant never comes from request fields.
import {Buffer} from 'node:buffer';
import {AlphaError,alphaSettings} from './alpha-admission.mjs';
import {preparePurge,executePurge} from './admin-purge.mjs';
import {selfDeleteOperation} from './self-delete.mjs';
import {profileOperation} from './profile-service.mjs';
import {teamPermission} from './community-service.mjs';
import {contentOperation} from './content-service.mjs';
import {mediaPartsOperation} from './media-parts.mjs';
import {MEDIA_PARTS_PATH,PUBLIC_MEDIA_PARTS_PATH,MAX_ENVELOPE} from '../media-parts-contract.mjs';
import {assessmentOperation} from './assessment-service.mjs';
import {ASSESSMENT_PATH} from '../../course-final/transport-contract.js';
const INTERNAL='/api/v2/account/internal/control',BASE='/api/v2/account/control';
const encoder=new TextEncoder(),now=()=>new Date().toISOString();
export const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
export const first=(db,sql,...args)=>query(db,sql,...args).first();
export const rows=async statement=>(await statement.all()).results||[];
export const sha=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(value))).toString('hex');
export const random=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
export const deny=(code,status=400)=>{throw new AlphaError(code,status)};
export const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
export const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
export const validRequestId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export async function controlActor(env,sessionHash){
 return first(env.DB,"SELECT s.id session_id,s.subject_id account_id,s.created_at,lm.kind FROM account_sessions s JOIN account_subjects a ON a.id=s.subject_id AND a.status='active' JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active' JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.status='active' WHERE s.secret_hash=?1 AND s.status='active' AND s.auth_strength='account-method-v1' AND s.revoked_at IS NULL AND s.idle_expires_at>?2 AND s.absolute_expires_at>?2",sessionHash,now());
}
export const fresh=actor=>actor?.kind==='passkey'&&Number.isFinite(Date.parse(actor.created_at))&&Date.now()-Date.parse(actor.created_at)>=0&&Date.now()-Date.parse(actor.created_at)<300000;
async function envelope(request,env){
 if(env.ADMIN_CONTROL_ENABLED!=='true'||typeof env.ADMIN_SERVICE_KEY!=='string'||env.ADMIN_SERVICE_KEY.length<32||!env.DB)deny('CONTROL_UNAVAILABLE',503);
 const url=new URL(request.url);
 if(request.method!=='POST'||url.pathname!==INTERNAL||url.search||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')!=='application/json')deny('SERVICE_DENIED',401);
 const stamp=request.headers.get('x-nexus-service-timestamp'),nonce=request.headers.get('x-nexus-service-nonce'),signature=request.headers.get('x-nexus-service-signature');
 if(!/^\d{13}$/.test(stamp||'')||!/^[a-f0-9]{32}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(signature||'')||Math.abs(Date.now()-Number(stamp))>30000)deny('SERVICE_DENIED',401);
 const reader=request.body?.getReader();if(!reader)deny('INVALID_INPUT');const parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144)deny('INPUT_TOO_LARGE',413);parts.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 const bytes=Buffer.concat(parts,size),body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const digest=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
 const canonical=['v1','POST',INTERNAL,stamp,nonce,digest].join('\n');
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.ADMIN_SERVICE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Buffer.from(signature,'hex'),encoder.encode(canonical)))deny('SERVICE_DENIED',401);
 let data;try{data=JSON.parse(body)}catch{deny('INVALID_INPUT')}
 if(!exact(data,['path','method','payload','sessionHash','expectedAccountId']))deny('INVALID_INPUT');
 const publicParts=data.path===PUBLIC_MEDIA_PARTS_PATH;
 if(publicParts){
  // Только authenticated service -> published-only read. Не создаёт Account actor/grant.
  if(env.CONTENT_MEDIA_PARTS_ENABLED!=='true')deny('CONTENT_MEDIA_PARTS_UNAVAILABLE',503);
  if(size>MAX_ENVELOPE||data.method!=='POST'||data.sessionHash!==null||data.expectedAccountId!==null||!exact(data.payload,['requestId','phase','mediaId','index'])||data.payload.phase!=='read')deny('INVALID_INPUT');
 }else if(!['GET','POST'].includes(data.method)||typeof data.path!=='string'||data.path.length>512||!/^\/api\/v2\/account\/(?:control(?:\/|$)|profile(?:\/|$))/.test(data.path)||!validId(data.expectedAccountId)||!/^[a-f0-9]{64}$/.test(data.sessionHash||''))deny('INVALID_INPUT');
 if(data.path===MEDIA_PARTS_PATH&&size>MAX_ENVELOPE)deny('INPUT_TOO_LARGE',413);
 if((publicParts||data.path===MEDIA_PARTS_PATH)&&body!==JSON.stringify(data))deny('INVALID_INPUT');
 const partsRPC=publicParts||data.path===MEDIA_PARTS_PATH;
 if(partsRPC){
  // Повторная проверка после чтения тела; старый nonce нельзя оживить медленной передачей.
  if(Math.abs(Date.now()-Number(stamp))>30000)deny('SERVICE_DENIED',401);
  if(publicParts){
   // 16 независимых buckets по случайному service nonce: <=1920 RPC/min глобально.
   // Scope начинается с ! и не может совпасть с допустимым Account ID.
   const allowed=await query(env.DB,'INSERT INTO nexus_admin_rate_limits(scope,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope,bucket) DO UPDATE SET used=used+1 WHERE used<120 RETURNING used','!media-public-v1:'+nonce[0],Math.floor(Date.now()/60000)).first();
   if(!allowed)deny('RATE_LIMITED',429);
   await query(env.DB,"DELETE FROM nexus_admin_rate_limits WHERE (scope,bucket) IN(SELECT scope,bucket FROM nexus_admin_rate_limits WHERE scope GLOB '!media-public-v1:[0-9a-f]' AND bucket<?1 LIMIT 32)",Math.floor(Date.now()/60000)-1).run();
  }
  // Отдельное namespace: legacy nonces не удаляются и не меняют replay-политику.
  await query(env.DB,"DELETE FROM nexus_admin_nonces WHERE nonce IN(SELECT nonce FROM nexus_admin_nonces WHERE nonce LIKE 'mp1:%' AND expires_at<?1 LIMIT 128)",new Date(Date.now()-60000).toISOString()).run();
 }
 const assessment=data.path===ASSESSMENT_PATH;
 if(assessment){
  if(env.COURSE_FINAL_ENABLED!=='true')deny('ASSESSMENT_UNAVAILABLE',503);
  if(Math.abs(Date.now()-Number(stamp))>30000)deny('SERVICE_DENIED',401);
  await query(env.DB,'DELETE FROM nexus_assessment_nonces WHERE nonce IN(SELECT nonce FROM nexus_assessment_nonces WHERE expires_at<?1 ORDER BY expires_at LIMIT 128)',new Date(Date.now()-60000).toISOString()).run();
 }
 const inserted=assessment
  ?await query(env.DB,'INSERT OR IGNORE INTO nexus_assessment_nonces(nonce,expires_at) VALUES(?1,?2)',nonce,new Date(Number(stamp)+30000).toISOString()).run()
  :await query(env.DB,'INSERT OR IGNORE INTO nexus_admin_nonces(nonce,expires_at) VALUES(?1,?2)',partsRPC?'mp1:'+nonce:nonce,new Date(Number(stamp)+30000).toISOString()).run();
 if(!inserted.success||inserted.meta.changes!==1)deny('SERVICE_DENIED',401);
 if(publicParts)return data;
 const actor=await controlActor(env,data.sessionHash);if(!actor)deny('SESSION_REQUIRED',401);
 if(actor.account_id!==data.expectedAccountId)deny('ACCOUNT_SESSION_CHANGED',401);
 const rate=await query(env.DB,'INSERT INTO nexus_admin_rate_limits(scope,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope,bucket) DO UPDATE SET used=used+1 WHERE used<120 RETURNING used',actor.account_id,Math.floor(Date.now()/60000)).first();
 if(!rate)deny('RATE_LIMITED',429);
 return {...data,actor};
}
export function guard(db,requestId,phase,condition,args=[]){
 return query(db,'INSERT INTO nexus_admin_write_guards(request_id,phase,valid) VALUES(?1,?2,('+condition+'))',requestId,phase,...args);
}
export function audit(db,actor,requestId,action,targetId,stamp){
 return query(db,'INSERT INTO nexus_admin_audit(id,actor_id,session_id,action,target_id,created_at) VALUES(?1,?2,?3,?4,?5,?6)',requestId,actor.account_id,actor.session_id,action,targetId||null,stamp);
}
export async function atomic(env,commands){
 try{const result=await env.DB.batch(commands);if(result.some(r=>!r.success))deny('CONTROL_WRITE_UNCONFIRMED',503);return result}
 catch(error){
  if(error instanceof AlphaError)throw error;
  const message=String(error?.message||'');
  if(message.includes('ALPHA_CAPACITY_REACHED'))deny('ALPHA_CAPACITY_REACHED',409);
  if(message.includes('ALPHA_LIMIT_BELOW_OCCUPIED'))deny('ALPHA_LIMIT_BELOW_OCCUPIED',409);
  if(message.includes('nexus_account_profiles.username'))deny('USERNAME_UNAVAILABLE',409);
  if(message.includes('ADMIN_FRESH_PASSKEY_REQUIRED'))deny('ADMIN_FRESH_PASSKEY_REQUIRED',401);
  deny('CONTROL_CONFLICT',409);
 }
}
async function requireAdmin(env,actor,write=false){
 if(!await first(env.DB,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",actor.account_id))deny('ADMIN_REQUIRED',403);
 if(write&&!fresh(actor))deny('ADMIN_FRESH_PASSKEY_REQUIRED',401);
 if(write&&!await first(env.DB,'SELECT 1 ok FROM nexus_passkey_credentials k JOIN session_login_methods slm ON slm.login_method_id=k.login_method_id WHERE slm.session_id=?1 AND k.account_id=?2',actor.session_id,actor.account_id))deny('ADMIN_FRESH_PASSKEY_REQUIRED',401);
}
async function target(env,actor,id,version){
 if(!validId(id)||!Number.isInteger(version)||version<0)deny('INVALID_INPUT');
 if(id===actor.account_id||await first(env.DB,'SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1',id))deny('ADMIN_ACCOUNT_PROTECTED',403);
 const row=await first(env.DB,'SELECT * FROM nexus_alpha_members WHERE account_id=?1',id);
 if(!row){
  if(!await first(env.DB,'SELECT id FROM account_subjects WHERE id=?1',id))deny('NOT_FOUND',404);
  if(version!==0)deny('CONTROL_CONFLICT',409);
  return {state:'unadmitted',version:0};
 }
 if(row.version!==version)deny('CONTROL_CONFLICT',409);return row;
}
function validMutation(input,keys){if(!exact(input,['requestId',...keys])||!validRequestId(input.requestId))deny('INVALID_INPUT')}
async function operation(env,value){
 const {actor,method,payload}=value,url=new URL(value.path,'https://nexus.invalid'),path=url.pathname;
 if(path===PUBLIC_MEDIA_PARTS_PATH)return mediaPartsOperation(env,value,{publishedOnly:true});
 if(path.startsWith('/api/v2/account/profile'))return profileOperation(env,value);
 if(!await alphaSettings(env))deny('ALPHA_CONTROL_UNAVAILABLE',503);
 if([BASE+'/self-delete-capabilities',BASE+'/self-delete-preview',BASE+'/self-delete'].includes(path)&&!url.search)return selfDeleteOperation(env,value);
 if(path===ASSESSMENT_PATH&&!url.search)return assessmentOperation(env,value,{requireAdmin});
 if(path===BASE+'/capabilities'&&method==='GET'&&!url.search){
  const canManage=!!await first(env.DB,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",actor.account_id);
  return {canManage,canModerate:await teamPermission(env.DB,actor.account_id,env),canPurge:canManage&&env.ADMIN_PURGE_ENABLED==='true',freshPasskey:canManage&&fresh(actor)};
 }
 await requireAdmin(env,actor,method==='POST');
 if(path===MEDIA_PARTS_PATH){
  if(url.search||method!=='POST')deny('INVALID_INPUT');
  if(await first(env.DB,"SELECT 1 FROM nexus_alpha_members WHERE account_id=?1 AND state IN('blocked','removed')",actor.account_id))deny('ADMIN_REQUIRED',403);
  return mediaPartsOperation(env,value);
 }
 if(path===BASE+'/content')return contentOperation(env,value);
 if(path===BASE+'/providers'&&method==='GET'&&!url.search)return {authorized:true};
 if(path===BASE+'/users'&&method==='GET'){
  if([...url.searchParams.keys()].some(k=>!['state','offset'].includes(k))||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))deny('INVALID_INPUT');
  const state=url.searchParams.get('state')||'all',offset=Number(url.searchParams.get('offset')||0);
  if(!['all','active','blocked','removed','invited','unadmitted'].includes(state)||!Number.isInteger(offset)||offset<0||offset>100000)deny('INVALID_INPUT');
  const filter=" WHERE (?1='all' OR COALESCE(m.state,'unadmitted')=?1)";
  const from=' FROM account_subjects a LEFT JOIN nexus_alpha_members m ON m.account_id=a.id LEFT JOIN nexus_account_profiles p ON p.account_id=a.id';
  const total=await first(env.DB,'SELECT count(*) n'+from+filter,state);
  const list=await rows(query(env.DB,"SELECT a.id,a.display_name,a.status,a.created_at,p.username,m.state,m.version,m.reason,EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=a.id AND g.status='active') administrator,EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=a.id) protected_account,(SELECT max(created_at) FROM account_sessions s WHERE s.subject_id=a.id) last_login,(SELECT count(*) FROM account_sessions s WHERE s.subject_id=a.id AND s.status='active' AND s.revoked_at IS NULL AND s.idle_expires_at>?2 AND s.absolute_expires_at>?2) active_sessions"+from+filter+' ORDER BY a.created_at DESC,a.id LIMIT 50 OFFSET ?3',state,now(),offset));
  const settings=await first(env.DB,'SELECT registration_mode,max_testers,limit_enabled,version FROM nexus_alpha_settings WHERE id=1'),occupied=await first(env.DB,'SELECT count(*) n FROM nexus_alpha_occupied'),active=await first(env.DB,"SELECT count(*) n FROM nexus_alpha_members WHERE state='active' AND account_id NOT IN(SELECT account_id FROM nexus_admin_grants WHERE status='active')");
  return {users:list.map(r=>({accountId:r.id,username:r.username||null,displayName:r.display_name,state:r.administrator?'administrator':r.state||'unadmitted',version:r.version||0,createdAt:r.created_at,lastLoginAt:r.last_login||null,activeSessions:r.active_sessions,reason:r.reason||'',protected:!!r.protected_account})),total:total.n,offset,settings:{registrationMode:settings.registration_mode,maxTesters:settings.max_testers,limitEnabled:settings.limit_enabled===1,version:settings.version},counts:{active:active.n,occupied:occupied.n,reserved:occupied.n-active.n}};
 }
 if(path===BASE+'/audit'&&method==='GET'&&!url.search)return {events:await rows(query(env.DB,'SELECT action,target_id targetId,created_at createdAt FROM nexus_admin_audit ORDER BY created_at DESC,id DESC LIMIT 100'))};
 if(method!=='POST'||url.search)deny('NOT_FOUND',404);
 if(path===BASE+'/settings'){
  validMutation(payload,['version','maxTesters','limitEnabled','registrationMode']);
  if(typeof payload.limitEnabled!=='boolean'||!Number.isInteger(payload.version)||payload.version<1||!Number.isInteger(payload.maxTesters)||payload.maxTesters<1||payload.maxTesters>10000||!['open','invite_only'].includes(payload.registrationMode))deny('INVALID_INPUT');
  const stamp=now();
  await atomic(env,[guard(env.DB,payload.requestId,'before','EXISTS(SELECT 1 FROM nexus_alpha_settings WHERE id=1 AND version=?3)',[payload.version]),query(env.DB,'UPDATE nexus_alpha_settings SET registration_mode=?1,max_testers=?2,limit_enabled=?4,version=version+1 WHERE id=1 AND version=?3',payload.registrationMode,payload.maxTesters,payload.version,payload.limitEnabled?1:0),audit(env.DB,actor,payload.requestId,'settings',null,stamp)]);
  return {ok:true};
 }
 if(path===BASE+'/invites'){
  validMutation(payload,['ttlMinutes']);
  if(!Number.isInteger(payload.ttlMinutes)||payload.ttlMinutes<10||payload.ttlMinutes>10080)deny('INVALID_INPUT');
  const secret='npi_'+random(),hash=await sha(secret),id=crypto.randomUUID(),stamp=now(),expiresAt=new Date(Date.now()+payload.ttlMinutes*60000).toISOString();
  await atomic(env,[guard(env.DB,payload.requestId,'before','1'),query(env.DB,"INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) VALUES(?1,'Новый участник','active',?2,?2)",id,stamp),query(env.DB,"INSERT INTO nexus_alpha_members(account_id,state,reserved_until,created_at,updated_at) VALUES(?1,'invited',?2,?3,?3)",id,expiresAt,stamp),query(env.DB,"INSERT INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at) VALUES(?1,?2,'bootstrap',?3)",hash,id,expiresAt),query(env.DB,"INSERT INTO nexus_admin_invites(token_hash,account_id,created_by,state,created_at) VALUES(?1,?2,?3,'ready',?4)",hash,id,actor.account_id,stamp),audit(env.DB,actor,payload.requestId,'invite',id,stamp)]);
  return {ok:true,accountId:id,invitationToken:secret,expiresAt};
 }
 const match=new RegExp('^'+BASE+'/users/([A-Za-z0-9][A-Za-z0-9._:-]{0,159})/(action|purge-preview|purge)$').exec(path);
 if(!match)deny('NOT_FOUND',404);
 const id=match[1];
 if(match[2]==='action'){
  validMutation(payload,['version','action']);
  if(!['block','remove','restore','revoke-invite','admit'].includes(payload.action))deny('INVALID_INPUT');
  const member=await target(env,actor,id,payload.version);
  if(payload.action==='admit'&&member.state!=='unadmitted'||payload.action==='restore'&&!['removed','blocked'].includes(member.state)||payload.action==='revoke-invite'&&member.state!=='invited')deny('INVALID_STATE',409);
  if(payload.action==='restore'&&!await first(env.DB,"SELECT 1 ok FROM login_methods WHERE account_id=?1 AND status='active'",id))deny('RESTORE_WITHOUT_LOGIN_METHOD',409);
  const state=['restore','admit'].includes(payload.action)?'active':payload.action==='block'?'blocked':'removed',stamp=now();
  const condition=member.state==='unadmitted'?"EXISTS(SELECT 1 FROM account_subjects WHERE id=?3) AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members WHERE account_id=?3) AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants WHERE account_id=?3)":"EXISTS(SELECT 1 FROM nexus_alpha_members WHERE account_id=?3 AND version=?4) AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants WHERE account_id=?3)";
  const change=member.state==='unadmitted'?query(env.DB,'INSERT INTO nexus_alpha_members(account_id,state,reason,created_at,updated_at) VALUES(?1,?2,?3,?4,?4)',id,state,payload.action,stamp):query(env.DB,'UPDATE nexus_alpha_members SET state=?1,version=version+1,reason=?2,updated_at=?3 WHERE account_id=?4 AND version=?5',state,payload.action,stamp,id,payload.version);
  await atomic(env,[guard(env.DB,payload.requestId,'before',condition,member.state==='unadmitted'?[id]:[id,payload.version]),change,audit(env.DB,actor,payload.requestId,payload.action,id,stamp)]);
  return {ok:true};
 }
 if(env.ADMIN_PURGE_ENABLED!=='true')deny('PURGE_NOT_ENABLED',403);
 await target(env,actor,id,payload?.version);
 if(match[2]==='purge-preview'){validMutation(payload,['version']);return preparePurge(env,value,id)}
 validMutation(payload,['version','approvalToken','confirmation']);return executePurge(env,value,id);
}
export async function handleAdminService(request,env){
 try{return reply(await operation(env,await envelope(request,env)))}
 catch(error){return reply({error:{code:error instanceof AlphaError?error.code:'CONTROL_UNAVAILABLE'}},error instanceof AlphaError?error.status:503)}
}
