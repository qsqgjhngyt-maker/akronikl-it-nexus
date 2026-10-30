// Own-account deletion has a separate authority and approval purpose from admin purge.
import {first,query,rows,deny,exact,validRequestId} from './admin-service.mjs';
import {preparePurge,executePurge} from './admin-purge.mjs';
const BASE='/api/v2/account/control/';
export const SQL_NOW="strftime('%Y-%m-%dT%H:%M:%fZ','now')";
// Rechecked inside the destructive transaction. A method name alone is no proof.
export const SELF_SESSION_SQL=`EXISTS(SELECT 1 FROM account_sessions s
 JOIN account_subjects a ON a.id=s.subject_id AND a.status='active'
 JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id AND lm.status='active'
 WHERE s.id=?7 AND s.subject_id=?3 AND s.status='active' AND s.revoked_at IS NULL
 AND s.auth_strength='account-method-v1' AND s.idle_expires_at>${SQL_NOW} AND s.absolute_expires_at>${SQL_NOW}
 AND julianday(s.created_at)<=julianday('now') AND julianday(s.created_at)>julianday('now','-5 minutes')
 AND ((lm.kind='passkey' AND EXISTS(SELECT 1 FROM nexus_passkey_credentials k WHERE k.account_id=a.id AND k.login_method_id=lm.id))
 OR (lm.kind='oauth' AND EXISTS(SELECT 1 FROM oauth_identities oi JOIN nexus_oauth_receipts r
 ON r.account_id=oi.account_id AND r.login_method_id=oi.login_method_id AND r.provider=oi.provider
 AND r.issuer=oi.issuer AND r.provider_subject=oi.provider_subject
 WHERE oi.account_id=a.id AND oi.login_method_id=lm.id AND r.session_id=s.id AND r.device_id=d.id))))`;
export async function selfDeleteOperation(env,value){
 const {actor,method,payload}=value,path=value.path;
 if(!((path===BASE+'self-delete-capabilities'&&method==='GET')||([BASE+'self-delete-preview',BASE+'self-delete'].includes(path)&&method==='POST')))deny('NOT_FOUND',404);
 if(env.ACCOUNT_SELF_DELETE_ENABLED!=='true')deny('SELF_DELETE_UNAVAILABLE',503);
 const protectedAccount=!!await first(env.DB,'SELECT 1 FROM nexus_admin_grants WHERE account_id=?1',actor.account_id);
 const member=await first(env.DB,"SELECT version FROM nexus_alpha_members WHERE account_id=?1 AND state='active'",actor.account_id);
 const freshLogin=!!await first(env.DB,'SELECT 1 ok WHERE '+SELF_SESSION_SQL.replaceAll('?7','?2').replaceAll('?3','?1'),actor.account_id,actor.session_id);
 if(path===BASE+'self-delete-capabilities'&&method==='GET'){
  const hasPasskey=!!await first(env.DB,"SELECT 1 FROM nexus_passkey_credentials k JOIN login_methods lm ON lm.id=k.login_method_id AND lm.account_id=k.account_id AND lm.status='active' WHERE k.account_id=?1",actor.account_id);
  const providers=await rows(query(env.DB,"SELECT DISTINCT oi.provider FROM oauth_identities oi JOIN login_methods lm ON lm.id=oi.login_method_id AND lm.account_id=oi.account_id AND lm.status='active' WHERE oi.account_id=?1 AND oi.provider IN('google','yandex','vk') ORDER BY oi.provider",actor.account_id));
  return {accountId:actor.account_id,canDelete:!!member&&!protectedAccount,protected:protectedAccount,freshLogin,version:member?.version||0,hasPasskey,providers:providers.map(p=>p.provider)};
 }
 if(protectedAccount)deny('ADMIN_ACCOUNT_PROTECTED',403);
 if(!member)deny('INVALID_STATE',409);
 if(!freshLogin)deny('SELF_DELETE_FRESH_LOGIN_REQUIRED',401);
 const preview=path===BASE+'self-delete-preview';
 if(method!=='POST'||!exact(payload,preview?['requestId','version']:['requestId','version','approvalToken','confirmation'])||!validRequestId(payload.requestId)||!Number.isSafeInteger(payload.version)||payload.version<1)deny('INVALID_INPUT');
 if(payload.version!==member.version)deny('CONTROL_CONFLICT',409);
 return preview?preparePurge(env,value,actor.account_id,{self:true}):executePurge(env,value,actor.account_id,{self:true});
}
