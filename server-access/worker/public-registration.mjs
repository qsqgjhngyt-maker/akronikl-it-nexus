// Reuses the existing, verified invitation ceremony; never issues a session.
import {AlphaError,alphaSettings} from './alpha-admission.mjs';
const q=(env,text,...args)=>env.DB.prepare(text).bind(...args);
async function noUserData(env){
 const placeholders=new Set(['nexus_alpha_members','nexus_admin_invites','nexus_passkey_invites','nexus_passkey_users','nexus_passkey_challenges']);
 // D1 authorizes the documented PRAGMA statement, not SQLite's equivalent
 // table-valued function. Schema text narrows this bounded read to relevant tables.
 const tables=await q(env,"SELECT name,sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL").all();
 const relevant=(tables.results||[]).filter(row=>row.sql.toLowerCase().includes('account_subjects'));
 if(relevant.length>120)throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
 for(const row of relevant)if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.name))throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
 const lists=await Promise.all(relevant.map(async row=>({table:row.name,refs:(await q(env,`PRAGMA foreign_key_list("${row.name}")`).all()).results||[]})));
 const conditions=[];
 for(const list of lists)for(const ref of list.refs){
  if(ref.table.toLowerCase()!=='account_subjects'||placeholders.has(list.table))continue;
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ref.from))throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
  conditions.push(`NOT EXISTS(SELECT 1 FROM "${list.table}" protected WHERE protected."${ref.from}"=i.account_id)`);
 }
 // Include future FK references even when their ON DELETE action is CASCADE.
 return conditions.length?conditions.join(' AND '):'1';
}
export async function registrationPolicy(env){
 if(env.PUBLIC_PASSKEY_REGISTRATION_ENABLED!=='true'||env.ALPHA_ADMISSION_ENABLED!=='true')return {available:false,reason:'invitation'};
 const settings=await alphaSettings(env);
 if(settings.registration_mode!=='open')return {available:false,reason:'invitation'};
 const occupied=await q(env,'SELECT count(*) n FROM nexus_alpha_occupied').first();
 if(settings.limit_enabled===1&&occupied.n>=settings.max_testers)return {available:false,reason:'capacity'};
 return {available:true,reason:'open'};
}
// Only empty, expired PUBLIC placeholders can be collected. No signed-up account,
// administrator, invitation issued by an administrator or user data is selected.
// Any new/unknown FK dependency aborts the whole cleanup instead of cascading it.
async function collectExpired(env,stamp){
 const safe=await noUserData(env);
 const found=await q(env,`SELECT i.account_id FROM nexus_admin_invites i
 JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash
 JOIN nexus_alpha_members m ON m.account_id=i.account_id
 WHERE i.kind='public' AND i.state='ready' AND p.consumed_at IS NULL AND p.expires_at<=?1
 AND m.state='invited' AND m.reserved_until<=?1
 AND NOT EXISTS(SELECT 1 FROM login_methods l WHERE l.account_id=i.account_id)
 AND NOT EXISTS(SELECT 1 FROM nexus_account_profiles u WHERE u.account_id=i.account_id)
 AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=i.account_id)
 AND NOT EXISTS(SELECT 1 FROM nexus_passkey_challenges c WHERE c.account_id=i.account_id AND (c.consumed_at IS NOT NULL OR c.expires_at>?1)) AND (${safe})
 ORDER BY p.expires_at LIMIT 50`,stamp).all();
 for(const row of found.results||[]){
  const id=row.account_id,requestId=crypto.randomUUID();
  // Repeat the predicate within the transaction to protect a concurrent verify.
  const commands=[q(env,`INSERT INTO nexus_admin_write_guards(request_id,phase,valid)
   VALUES(?1,'before',EXISTS(SELECT 1 FROM nexus_admin_invites i JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash
   JOIN nexus_alpha_members m ON m.account_id=i.account_id WHERE i.account_id=?2 AND i.kind='public' AND i.state='ready'
   AND p.consumed_at IS NULL AND p.expires_at<=?3 AND m.state='invited' AND m.reserved_until<=?3
   AND NOT EXISTS(SELECT 1 FROM login_methods l WHERE l.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_account_profiles u WHERE u.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_passkey_challenges c WHERE c.account_id=i.account_id AND (c.consumed_at IS NOT NULL OR c.expires_at>?3)) AND (${safe})))`,requestId,id,stamp),
   q(env,'DELETE FROM nexus_passkey_challenges WHERE account_id=?1 AND consumed_at IS NULL AND expires_at<=?2',id,stamp),
   q(env,'DELETE FROM nexus_passkey_users WHERE account_id=?1',id),
   q(env,"DELETE FROM nexus_admin_invites WHERE account_id=?1 AND kind='public'",id),
   q(env,'DELETE FROM nexus_passkey_invites WHERE account_id=?1',id),
   q(env,"DELETE FROM nexus_alpha_members WHERE account_id=?1 AND state='invited'",id),
   q(env,'DELETE FROM account_subjects WHERE id=?1',id),
   q(env,'DELETE FROM nexus_admin_write_guards WHERE request_id=?1',requestId)];
  const result=await env.DB.batch(commands);if(result.some(r=>!r.success))throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
 }
}
export async function cancelPublicRegistration(env,{challengeId,flowHash}){
 const safe=await noUserData(env);
 const row=await q(env,`SELECT i.account_id FROM nexus_passkey_challenges c
 JOIN nexus_admin_invites i ON i.token_hash=c.invite_hash AND i.account_id=c.account_id
 JOIN nexus_alpha_members m ON m.account_id=i.account_id
 WHERE c.id=?1 AND c.flow_hash=?2 AND c.purpose='register' AND c.consumed_at IS NULL
 AND i.kind='public' AND i.state='ready' AND m.state='invited' AND (${safe})`,challengeId,flowHash).first();
 // An already expired/cancelled request is harmless. Do not disclose whether a
 // challenge belonging to another flow exists.
 if(!row)return {ok:true};
 const id=row.account_id,requestId=crypto.randomUUID();
 const result=await env.DB.batch([
  q(env,`INSERT INTO nexus_admin_write_guards(request_id,phase,valid) VALUES(?1,'before',EXISTS(
   SELECT 1 FROM nexus_passkey_challenges c JOIN nexus_admin_invites i ON i.token_hash=c.invite_hash AND i.account_id=c.account_id
   JOIN nexus_alpha_members m ON m.account_id=i.account_id WHERE c.id=?2 AND c.flow_hash=?3 AND c.account_id=?4
   AND c.purpose='register' AND c.consumed_at IS NULL AND i.kind='public' AND i.state='ready' AND m.state='invited'
   AND NOT EXISTS(SELECT 1 FROM login_methods l WHERE l.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_account_profiles u WHERE u.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants g WHERE g.account_id=i.account_id)
   AND NOT EXISTS(SELECT 1 FROM nexus_passkey_challenges x WHERE x.account_id=i.account_id AND x.consumed_at IS NOT NULL) AND (${safe})))`,requestId,challengeId,flowHash,id),
  q(env,'DELETE FROM nexus_passkey_challenges WHERE account_id=?1 AND consumed_at IS NULL',id),
  q(env,'DELETE FROM nexus_passkey_users WHERE account_id=?1',id),
  q(env,"DELETE FROM nexus_admin_invites WHERE account_id=?1 AND kind='public'",id),
  q(env,'DELETE FROM nexus_passkey_invites WHERE account_id=?1',id),
  q(env,"DELETE FROM nexus_alpha_members WHERE account_id=?1 AND state='invited'",id),
  q(env,'DELETE FROM account_subjects WHERE id=?1',id),
  q(env,'DELETE FROM nexus_admin_write_guards WHERE request_id=?1',requestId)
 ]);
 if(result.some(r=>!r.success))throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
 return {ok:true};
}
export async function reservePublicRegistration(env,{networkHash,inviteHash}){
 if(env.PUBLIC_PASSKEY_REGISTRATION_ENABLED!=='true'||env.ALPHA_ADMISSION_ENABLED!=='true')throw new AlphaError('REGISTRATION_CLOSED');
 const settings=await alphaSettings(env);
 if(settings.registration_mode!=='open')throw new AlphaError('REGISTRATION_CLOSED');
 const bucket=Math.floor(Date.now()/60000),stamp=new Date().toISOString();
 // These dedicated scopes share the bounded existing rate table. A denied
 // attempt also counts. They are throttles, never an identity check.
 const local=await q(env,'INSERT INTO nexus_passkey_rate_limits(scope_hash,bucket,used) VALUES(?1,?2,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<5 RETURNING used','signup:'+networkHash,bucket).first();
 const global=await q(env,"INSERT INTO nexus_passkey_rate_limits(scope_hash,bucket,used) VALUES('signup:global',?1,1) ON CONFLICT(scope_hash,bucket) DO UPDATE SET used=used+1 WHERE used<40 RETURNING used",bucket).first();
 if(!local||!global)throw new AlphaError('RATE_LIMITED',429);
 await collectExpired(env,stamp);
 const policy=await registrationPolicy(env);if(!policy.available)throw new AlphaError(policy.reason==='capacity'?'ALPHA_CAPACITY_REACHED':'REGISTRATION_CLOSED',policy.reason==='capacity'?409:403);
 const pending=await q(env,"SELECT count(*) n FROM nexus_admin_invites i JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash WHERE i.kind='public' AND i.state='ready' AND p.expires_at>?1",stamp).first();
 if(pending.n>=200)throw new AlphaError('RATE_LIMITED',429);
 const accountId=crypto.randomUUID(),expiresAt=new Date(Date.now()+120000).toISOString();
 try{
  const result=await env.DB.batch([
   q(env,"INSERT INTO account_subjects(id,display_name,status,created_at,updated_at) SELECT ?1,'Новый пользователь','active',?2,?2 WHERE EXISTS(SELECT 1 FROM nexus_alpha_settings WHERE id=1 AND enforced=1 AND registration_mode='open' AND version=?3)",accountId,stamp,settings.version),
   q(env,"INSERT INTO nexus_alpha_members(account_id,state,reserved_until,created_at,updated_at) VALUES(?1,'invited',?2,?3,?3)",accountId,expiresAt,stamp),
   q(env,"INSERT INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at) VALUES(?1,?2,'bootstrap',?3)",inviteHash,accountId,expiresAt),
   q(env,"INSERT INTO nexus_admin_invites(token_hash,account_id,kind,created_by,state,created_at) VALUES(?1,?2,'public','public-registration','ready',?3)",inviteHash,accountId,stamp)
  ]);
  if(result.some(r=>!r.success)||result[0].meta.changes!==1)throw Error('UNCONFIRMED');
 }catch(error){
  if(String(error.message).includes('ALPHA_CAPACITY_REACHED'))throw new AlphaError('ALPHA_CAPACITY_REACHED',409);
  if(String(error.message).includes('REGISTRATION_CLOSED'))throw new AlphaError('REGISTRATION_CLOSED');
  if(String(error.message).includes('PUBLIC_REGISTRATION_RATE_LIMITED'))throw new AlphaError('RATE_LIMITED',429);
  throw new AlphaError('REGISTRATION_UNAVAILABLE',503);
 }
 return inviteHash;
}
