// Private conversations only: a public review never exposes its thread.
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const all=async s=>(await s.all()).results||[];
export class CommunityError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status}}
const deny=(code,status)=>{throw new CommunityError(code,status)};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===keys.sort().join(',');
export async function teamPermission(db,id,env={}){
 const legacy=await q(db,'SELECT can_moderate FROM feedback_permissions WHERE account_id=?1',id).first();
 if(legacy?.can_moderate===1)return true;
 return env.COMMUNITY_ENABLED==='true'&&!!await q(db,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",id).first();
}
const PERMISSION="(EXISTS(SELECT 1 FROM feedback_permissions WHERE account_id=?2 AND can_moderate=1) OR EXISTS(SELECT 1 FROM nexus_admin_grants WHERE account_id=?2 AND status='active'))";
// Revalidate session, membership, ownership and role inside the write transaction.
const SESSION="EXISTS(SELECT 1 FROM account_sessions s JOIN account_subjects a ON a.id=s.subject_id AND a.status='active' JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active' JOIN session_login_methods sm ON sm.session_id=s.id AND sm.account_id=a.id JOIN login_methods lm ON lm.id=sm.login_method_id AND lm.account_id=a.id AND lm.status='active' WHERE s.secret_hash=?3 AND s.subject_id=?2 AND s.status='active' AND s.revoked_at IS NULL AND s.idle_expires_at>?4 AND s.absolute_expires_at>?4)";
async function atomic(db,commands){try{const out=await db.batch(commands);if(out.some(r=>!r.success))deny('FEEDBACK_UNAVAILABLE',503)}catch(e){if(e instanceof CommunityError)throw e;deny('STALE_VERSION',409)}}
export async function communityOperation(env,value){
 const url=new URL(value.path,'https://nexus.invalid'),match=/^\/api\/v2\/feedback\/items\/([a-zA-Z0-9-]+)\/(delete|conversation|replies)(?:\/([a-zA-Z0-9-]+)\/delete)?$/.exec(url.pathname);
 if(!match)return undefined;
 if(env.COMMUNITY_ENABLED!=='true')deny('NOT_FOUND',404);
 if(url.search&&match[2]!=='conversation')deny('INVALID_INPUT');
 const {DB:db}=env,{actor,payload,method,sessionHash}=value,id=match[1];
 const item=await q(db,'SELECT * FROM feedback_items WHERE id=?1',id).first(),team=await teamPermission(db,actor.accountId,env);
 if(!item||item.author_id!==actor.accountId&&!team)deny('NOT_FOUND',404);
 if(match[2]==='conversation'&&method==='GET'){
  const offset=Number(url.searchParams.get('offset')||0);
  if([...url.searchParams.keys()].some(k=>k!=='offset')||url.searchParams.getAll('offset').length>1||!Number.isInteger(offset)||offset<0||offset>100000)deny('INVALID_INPUT');
  const replies=await all(q(db,'SELECT r.*,a.display_name FROM feedback_replies r JOIN account_subjects a ON a.id=r.author_id WHERE item_id=?1 ORDER BY created_at,id LIMIT 50 OFFSET ?2',id,offset));
  const total=(await q(db,'SELECT count(*) n FROM feedback_replies WHERE item_id=?1',id).first()).n;
  return {itemId:id,total,offset,replies:replies.map(r=>({id:r.id,body:r.body,team:!!r.is_team,authorName:r.is_team?'Команда Nexus':r.display_name,mine:r.author_id===actor.accountId,version:r.version,createdAt:r.created_at,deleted:!!r.deleted_at})),canReply:true};
 }
 if(method!=='POST')deny('NOT_FOUND',404);
 const stamp=new Date().toISOString(),actorId=actor.accountId;
 const guard=(requestId,extra,args=[])=>q(db,"INSERT INTO nexus_community_write_guards(request_id,valid) VALUES(?1,("+SESSION+" AND EXISTS(SELECT 1 FROM feedback_items WHERE id=?5 AND (author_id=?2 OR "+PERMISSION+")) AND "+extra+"))",requestId,actorId,sessionHash,stamp,id,...args);
 const audit=(requestId,action)=>q(db,'INSERT INTO nexus_community_audit(id,actor_id,item_id,action,created_at) VALUES(?1,?2,?3,?4,?5)',requestId,actorId,id,action,stamp);
 if(match[2]==='delete'){
  if(!exact(payload,['requestId','version'])||!uuid(payload.requestId)||payload.version!==item.version)deny('STALE_VERSION',409);
  await atomic(db,[guard(payload.requestId,'EXISTS(SELECT 1 FROM feedback_items WHERE id=?5 AND version=?6)',[payload.version]),q(db,'INSERT INTO feedback_deleted_items(id,author_id,request_key,deleted_at) SELECT id,author_id,request_key,?2 FROM feedback_items WHERE id=?1',id,stamp),audit(payload.requestId,'delete-item'),q(db,'DELETE FROM feedback_items WHERE id=?1',id)]);
  return {ok:true,deleted:true};
 }
 if(match[3]){
  if(!exact(payload,['requestId','version'])||!uuid(payload.requestId)||!Number.isInteger(payload.version))deny('INVALID_INPUT');
  const reply=await q(db,'SELECT * FROM feedback_replies WHERE id=?1 AND item_id=?2',match[3],id).first();
  if(!reply||reply.author_id!==actorId&&!team)deny('NOT_FOUND',404);
  if(reply.version!==payload.version||reply.deleted_at)deny('STALE_VERSION',409);
  await atomic(db,[guard(payload.requestId,'EXISTS(SELECT 1 FROM feedback_replies WHERE id=?6 AND item_id=?5 AND version=?7 AND deleted_at IS NULL AND (author_id=?2 OR '+PERMISSION+'))',[reply.id,payload.version]),q(db,'UPDATE feedback_replies SET body=NULL,deleted_at=?1,version=version+1 WHERE id=?2',stamp,reply.id),audit(payload.requestId,'delete-reply')]);
  return {ok:true,deleted:true};
 }
 if(!exact(payload,['requestId','body'])||!uuid(payload.requestId)||typeof payload.body!=='string'||payload.body.trim().length<1||payload.body.length>4000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(payload.body))deny('INVALID_INPUT');
 const body=payload.body.trim(),duplicate=await q(db,'SELECT body FROM feedback_replies WHERE item_id=?1 AND author_id=?2 AND request_key=?3',id,actorId,payload.requestId).first();
 if(duplicate){if(duplicate.body!==body)deny('REQUEST_CONFLICT',409);return {ok:true}}
 const rate=await q(db,'INSERT INTO feedback_rate_limits(account_id,bucket,used) VALUES(?1,?2,1) ON CONFLICT(account_id,bucket) DO UPDATE SET used=used+1 WHERE used<20 RETURNING used',actorId,Math.floor(Date.now()/3600000)).first();
 if(!rate)deny('RATE_LIMITED',429);
 const extra=team?PERMISSION:'EXISTS(SELECT 1 FROM feedback_items WHERE id=?5 AND author_id=?2)';
 await atomic(db,[guard(payload.requestId,extra),q(db,'INSERT INTO feedback_replies(id,item_id,author_id,body,is_team,request_key,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)',crypto.randomUUID(),id,actorId,body,+team,payload.requestId,stamp),audit(payload.requestId,'reply')]);
 return {ok:true};
}
