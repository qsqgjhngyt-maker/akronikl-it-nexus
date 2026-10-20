const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
export class AlphaError extends Error {
 constructor(code,status=403){super(code);this.code=code;this.status=status}
}
export const validUsername=value=>typeof value==='string'&&/^[a-z][a-z0-9._-]{2,31}$/.test(value)&&!new Set(['admin','administrator','root','owner','system','support','nexus','api','security','login']).has(value);
export const validDisplayName=value=>typeof value==='string'&&value===value.trim()&&value.length>=1&&value.length<=80&&!/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value);
export async function alphaSettings(env){
 if(env.ALPHA_ADMISSION_ENABLED!=='true')return null;
 try{
  const settings=await query(env.DB,'SELECT * FROM nexus_alpha_settings WHERE id=1').first();
  if(!settings||settings.enforced!==1)throw new Error();
  return settings;
 }catch{throw new AlphaError('ALPHA_CONTROL_UNAVAILABLE',503)}
}
export async function alphaAccess(env,accountId){
 const settings=await alphaSettings(env);if(!settings)return true;
 if(await query(env.DB,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",accountId).first())return true;
 return !!await query(env.DB,"SELECT 1 ok FROM nexus_alpha_members WHERE account_id=?1 AND state='active'",accountId).first();
}
// New OAuth admission is appended to the existing atomic issuance transaction.
export async function oauthAdmissionCommands(env,accountId,stamp){
 const settings=await alphaSettings(env);if(!settings)return [];
 if(await query(env.DB,"SELECT 1 ok FROM nexus_admin_grants WHERE account_id=?1 AND status='active'",accountId).first())return [];
 const member=await query(env.DB,'SELECT state FROM nexus_alpha_members WHERE account_id=?1',accountId).first();
 if(member){if(member.state!=='active')throw new AlphaError('ALPHA_ACCESS_CLOSED');return []}
 if(settings.registration_mode!=='open')throw new AlphaError('ALPHA_INVITATION_REQUIRED');
 const occupied=await query(env.DB,'SELECT count(*) n FROM nexus_alpha_occupied').first();
 if(settings.limit_enabled===1&&occupied.n>=settings.max_testers)throw new AlphaError('ALPHA_CAPACITY_REACHED',409);
 return [query(env.DB,"INSERT INTO nexus_alpha_members(account_id,state,created_at,updated_at) SELECT ?1,'active',?2,?2 WHERE (SELECT registration_mode FROM nexus_alpha_settings WHERE id=1)='open' AND (SELECT version FROM nexus_alpha_settings WHERE id=1)=?3",accountId,stamp,settings.version)];
}
export async function managedInvitation(env,tokenHash){
 if(env.ALPHA_ADMISSION_ENABLED!=='true')return null;
 const settings=await alphaSettings(env);
 const row=await query(env.DB,"SELECT i.*,p.expires_at,p.consumed_at,m.state AS member_state FROM nexus_admin_invites i JOIN nexus_passkey_invites p ON p.token_hash=i.token_hash JOIN nexus_alpha_members m ON m.account_id=i.account_id WHERE i.token_hash=?1",tokenHash).first();
 if(!row||row.state!=='ready'||row.member_state!=='invited'||row.consumed_at||row.expires_at<=new Date().toISOString())throw new AlphaError('ENROLLMENT_REQUIRED');
 if(row.kind==='public'&&(env.PUBLIC_PASSKEY_REGISTRATION_ENABLED!=='true'||settings.registration_mode!=='open'))throw new AlphaError('REGISTRATION_CLOSED');
 return row;
}
