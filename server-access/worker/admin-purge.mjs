// Destructive path: archived member, fresh admin Passkey, bounded preview, one-use approval, atomic D1 transaction.
import {query,first,rows,sha,random,deny,guard,audit,atomic} from './admin-service.mjs';
const ASSESSMENT_TABLES='nexus_assessment_usage nexus_assessment_nonces nexus_assessment_write_guards nexus_assessment_audit nexus_assessment_owners nexus_assessment_attempts nexus_assessment_uploads nexus_assessment_parts nexus_assessment_reviews nexus_assessment_appeals nexus_assessment_answer_keys nexus_assessment_auto_results'.split(' ');
const KNOWN=new Set(('workspaces workspace_members projects project_members project_access_policies project_revisions project_checkpoints project_invites audit_events project_snapshots account_subjects account_tokens account_devices account_sessions identity_security_events login_methods oauth_identities session_login_methods account_service_nonces nexus_passkey_users nexus_passkey_invites nexus_passkey_challenges nexus_passkey_credentials nexus_passkey_audit nexus_passkey_receipts nexus_passkey_service_nonces nexus_passkey_rate_limits feedback_permissions feedback_items feedback_revisions feedback_events feedback_rate_limits feedback_service_nonces nexus_oauth_service_nonces nexus_oauth_rate_limits nexus_oauth_transactions nexus_oauth_account_policies nexus_oauth_allowed_emails nexus_oauth_receipts nexus_oauth_verified_emails nexus_admin_grants nexus_alpha_settings nexus_alpha_members nexus_account_profiles nexus_admin_invites nexus_invite_enrollments nexus_admin_nonces nexus_admin_rate_limits nexus_admin_write_guards nexus_admin_audit nexus_admin_purge_approvals nexus_account_avatars nexus_admin_purge_links nexus_community_write_guards nexus_community_audit feedback_deleted_items feedback_replies nexus_content_posts nexus_content_home nexus_content_audit nexus_content_media nexus_content_media_audit nexus_content_media_uploads nexus_content_media_parts').split(' '));
const PROJECTS="SELECT id FROM projects WHERE owner_subject_id=?1 OR workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1)";
const SCOPE="SELECT json_object('schema',COALESCE((SELECT group_concat(v,'|') FROM(SELECT name||':'||COALESCE(sql,'') v FROM sqlite_master WHERE type IN('table','trigger','view') AND name NOT LIKE 'sqlite_%' ORDER BY type,name)),''),'memberVersion',(SELECT version FROM nexus_alpha_members WHERE account_id=?1),'accountUpdated',(SELECT updated_at FROM account_subjects WHERE id=?1),'projects',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||current_revision||':'||updated_at v FROM projects WHERE owner_subject_id=?1 OR workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1) ORDER BY id)),''),'feedback',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||version v FROM feedback_items WHERE author_id=?1 ORDER BY id)),''),'feedbackReplies',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||version v FROM feedback_replies WHERE author_id=?1 OR item_id IN(SELECT id FROM feedback_items WHERE author_id=?1) ORDER BY id)),''),'workspaces',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||updated_at v FROM workspaces WHERE owner_subject_id=?1 ORDER BY id)),''),'sharedRows',(SELECT count(*) FROM workspace_members WHERE workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1) AND subject_id<>?1)+(SELECT count(*) FROM project_members WHERE project_id IN(SELECT id FROM projects WHERE owner_subject_id=?1 OR workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1)) AND subject_id<>?1),'keys',(SELECT count(*) FROM nexus_passkey_credentials WHERE account_id=?1),'identities',(SELECT count(*) FROM oauth_identities WHERE account_id=?1),'sessions',(SELECT count(*) FROM account_sessions WHERE subject_id=?1),'avatarVersion',COALESCE((SELECT version FROM nexus_account_avatars WHERE account_id=?1),0)) AS value";
async function scope(env,id){
 // _cf_METADATA is workerd bookkeeping, confirmed in Cloudflare sqlite-metadata.h; never read or deleted.
 const tables=await rows(query(env.DB,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN('d1_migrations','_cf_KV','_cf_METADATA')"));
 if(tables.some(t=>!KNOWN.has(t.name)&&!ASSESSMENT_TABLES.includes(t.name)))deny('PURGE_SCHEMA_REVIEW_REQUIRED',409);
 const hasAssessment=tables.some(t=>ASSESSMENT_TABLES.includes(t.name));
 if(hasAssessment&&!ASSESSMENT_TABLES.every(name=>tables.some(t=>t.name===name)))deny('PURGE_SCHEMA_REVIEW_REQUIRED',409);
 const hasMedia=tables.some(t=>t.name==='nexus_content_media');
 let scopeSQL=hasMedia?SCOPE.replace("'avatarVersion'","'blogMediaReferences',(SELECT count(*) FROM nexus_content_media WHERE created_by=?1)+(SELECT count(*) FROM nexus_content_media_audit WHERE actor_id=?1),'avatarVersion'"):SCOPE;
 if(hasAssessment){
  // Чужие оценки не удаляем вместе с проверявшим. Этот будущий экспертный
  // случай требует отдельного решения, сейчас основной режим автоматический.
  if(await first(env.DB,'SELECT 1 ok FROM nexus_assessment_reviews WHERE reviewer_id=?1 AND account_id<>?1 LIMIT 1',id))deny('PURGE_SCHEMA_REVIEW_REQUIRED',409);
  const refs="'assessmentState',json_object('ownerBytes',COALESCE((SELECT bytes FROM nexus_assessment_owners WHERE account_id=?1),0),'owned',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||version||':'||status||':'||COALESCE(snapshot_hash,'') v FROM nexus_assessment_attempts WHERE account_id=?1 ORDER BY id)),''),'uploads',COALESCE((SELECT group_concat(v,'|') FROM(SELECT u.id||':'||u.snapshot_hash v FROM nexus_assessment_uploads u JOIN nexus_assessment_attempts a ON a.id=u.attempt_id WHERE a.account_id=?1 ORDER BY u.id)),''),'assigned',COALESCE((SELECT group_concat(v,'|') FROM(SELECT id||':'||version v FROM nexus_assessment_attempts WHERE reviewer_id=?1 AND account_id<>?1 ORDER BY id)),''),'authoredReviews',(SELECT count(*) FROM nexus_assessment_reviews WHERE reviewer_id=?1 AND account_id<>?1)),'avatarVersion'";
  scopeSQL=scopeSQL.replace("'avatarVersion'",refs);
 }
 if(tables.some(t=>t.name==='nexus_content_media_uploads')){
  // Не расширяем destructive path на новое хранилище: целевой аккаунт с rows блокируется.
  if((await first(env.DB,'SELECT COUNT(*) n FROM nexus_content_media_uploads WHERE account_id=?1',id)).n)deny('PURGE_SCHEMA_REVIEW_REQUIRED',409);
  scopeSQL=scopeSQL.replace("'avatarVersion'","'mediaUploadReferences',(SELECT COUNT(*) FROM nexus_content_media_uploads WHERE account_id=?1),'avatarVersion'");
 }
 if(hasMedia&&(await first(env.DB,'SELECT (SELECT count(*) FROM nexus_content_media WHERE created_by=?1)+(SELECT count(*) FROM nexus_content_media_audit WHERE actor_id=?1) n',id)).n)deny('PURGE_SCHEMA_REVIEW_REQUIRED',409);
 const shared=await first(env.DB,'SELECT (SELECT count(*) FROM workspace_members WHERE workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1) AND subject_id<>?1)+(SELECT count(*) FROM project_members WHERE project_id IN('+PROJECTS+') AND subject_id<>?1)+(SELECT count(*) FROM projects WHERE workspace_id IN(SELECT id FROM workspaces WHERE owner_subject_id=?1) AND owner_subject_id<>?1) n',id);
 if(shared.n)deny('SHARED_PROJECT_TRANSFER_REQUIRED',409);
 const external=await first(env.DB,"SELECT (SELECT count(*) FROM projects WHERE id IN("+PROJECTS+") AND latest_r2_key IS NOT NULL AND latest_r2_key NOT LIKE 'd1:%')+(SELECT count(*) FROM project_revisions WHERE project_id IN("+PROJECTS+") AND r2_key NOT LIKE 'd1:%') n",id);
 if(external.n)deny('PURGE_EXTERNAL_STORAGE_REVIEW_REQUIRED',409);
 const member=await first(env.DB,"SELECT m.version,p.username FROM nexus_alpha_members m LEFT JOIN nexus_account_profiles p ON p.account_id=m.account_id WHERE m.account_id=?1 AND m.state='removed'",id);
 if(!member)deny('REMOVE_BEFORE_PURGE',409);
 const encoded=(await first(env.DB,scopeSQL,id)).value;
 const counts=await first(env.DB,'SELECT (SELECT count(*) FROM projects WHERE id IN('+PROJECTS+')) projects,(SELECT count(*) FROM workspaces WHERE owner_subject_id=?1) workspaces,(SELECT count(*) FROM feedback_items WHERE author_id=?1) feedback,(SELECT count(*) FROM nexus_passkey_credentials WHERE account_id=?1) keys,(SELECT count(*) FROM oauth_identities WHERE account_id=?1) providers',id);
 if(hasAssessment)Object.assign(counts,await first(env.DB,'SELECT (SELECT count(*) FROM nexus_assessment_attempts WHERE account_id=?1) courseFinalAttempts,COALESCE((SELECT bytes FROM nexus_assessment_owners WHERE account_id=?1),0) courseFinalBytes',id));
 return {scopeSQL,member,encoded,hash:await sha(encoded),counts,hasAssessment};
}
export async function preparePurge(env,value,id){
 const plan=await scope(env,id),approval='npa_'+random(),expiresAt=new Date(Date.now()+120000).toISOString();
 await query(env.DB,'INSERT INTO nexus_admin_purge_approvals(token_hash,actor_id,session_id,target_id,target_version,scope_hash,expires_at) VALUES(?1,?2,?3,?4,?5,?6,?7)',await sha(approval),value.actor.account_id,value.actor.session_id,id,plan.member.version,plan.hash,expiresAt).run();
 return {approvalToken:approval,expiresAt,counts:plan.counts,confirmation:'DELETE '+(plan.member.username||id),serverDataOnly:true};
}
export async function executePurge(env,value,id){
 const {payload,actor}=value;
 if(typeof payload.approvalToken!=='string'||!/^npa_[A-Za-z0-9_-]{43}$/.test(payload.approvalToken)||typeof payload.confirmation!=='string')deny('INVALID_INPUT');
 const approvalHash=await sha(payload.approvalToken),stamp=new Date().toISOString(),plan=await scope(env,id);
 const approval=await first(env.DB,'SELECT * FROM nexus_admin_purge_approvals WHERE token_hash=?1',approvalHash);
 if(!approval||approval.actor_id!==actor.account_id||approval.session_id!==actor.session_id||approval.target_id!==id||approval.target_version!==payload.version||approval.consumed_at||approval.expires_at<=stamp||approval.scope_hash!==plan.hash)deny('PURGE_APPROVAL_REJECTED',409);
 if(payload.confirmation!=='DELETE '+(plan.member.username||id))deny('PURGE_CONFIRMATION_REQUIRED',400);
 const q=(sql,...args)=>query(env.DB,sql,...args);
 const commands=[
  guard(env.DB,payload.requestId,'before',"EXISTS(SELECT 1 FROM nexus_alpha_members WHERE account_id=?3 AND state='removed' AND version=?4) AND NOT EXISTS(SELECT 1 FROM nexus_admin_grants WHERE account_id=?3) AND EXISTS(SELECT 1 FROM nexus_admin_purge_approvals WHERE token_hash=?5 AND actor_id=?6 AND session_id=?7 AND consumed_at IS NULL AND expires_at>?8)",[id,payload.version,approvalHash,actor.account_id,actor.session_id,stamp]),
  // Snapshot is rechecked within this transaction before deleting anything.
  q('INSERT INTO nexus_admin_write_guards(request_id,phase,valid) VALUES(?2,\'after\',(('+plan.scopeSQL.replaceAll('?1','?3').replace(' AS value','')+')=?1))',plan.encoded,payload.requestId,id),
  q('UPDATE nexus_admin_purge_approvals SET consumed_at=?1 WHERE token_hash=?2',stamp,approvalHash),
  ...(plan.hasAssessment?[
   q('DELETE FROM nexus_assessment_audit WHERE actor_id=?1 OR attempt_id IN(SELECT id FROM nexus_assessment_attempts WHERE account_id=?1)',id),
   q('UPDATE nexus_assessment_attempts SET reviewer_id=NULL,version=version+1 WHERE reviewer_id=?1 AND account_id<>?1',id),
   // Только собственные работы, явно включённые в preview. Cascade освобождает
   // parts/results и счётчики хранения. Закрытые глобальные answer keys остаются.
   q('DELETE FROM nexus_assessment_attempts WHERE account_id=?1',id),
   q('DELETE FROM nexus_assessment_owners WHERE account_id=?1',id)
  ]:[]),
  q("INSERT INTO nexus_admin_purge_links(request_id,kind,item_id) SELECT ?2,'project',id FROM projects WHERE id IN("+PROJECTS+")",id,payload.requestId),
  q("INSERT INTO nexus_admin_purge_links(request_id,kind,item_id) SELECT ?2,'workspace',id FROM workspaces WHERE owner_subject_id=?1",id,payload.requestId),
  q("INSERT INTO nexus_admin_purge_links(request_id,kind,item_id) SELECT ?2,'oauth-tx',tx_id FROM nexus_oauth_receipts WHERE account_id=?1",id,payload.requestId),
  q("DELETE FROM audit_events WHERE actor_subject_id=?1 OR project_id IN(SELECT item_id FROM nexus_admin_purge_links WHERE request_id=?2 AND kind='project') OR workspace_id IN(SELECT item_id FROM nexus_admin_purge_links WHERE request_id=?2 AND kind='workspace')",id,payload.requestId),
  q("DELETE FROM projects WHERE id IN(SELECT item_id FROM nexus_admin_purge_links WHERE request_id=?1 AND kind='project')",payload.requestId),
  q('DELETE FROM workspaces WHERE owner_subject_id=?1',id),
  q('DELETE FROM workspace_members WHERE subject_id=?1',id),
  q('DELETE FROM project_members WHERE subject_id=?1',id),
  q('UPDATE workspace_members SET invited_by=NULL WHERE invited_by=?1',id),
  q('UPDATE project_members SET invited_by=NULL WHERE invited_by=?1',id),
  q('DELETE FROM project_access_policies WHERE subject_id=?1',id),
  q("UPDATE project_access_policies SET created_by='deleted-account' WHERE created_by=?1",id),
  q('DELETE FROM project_invites WHERE invited_subject_id=?1',id),
  q("UPDATE project_invites SET invited_by='deleted-account' WHERE invited_by=?1",id),
  ...['project_snapshots','project_revisions','project_checkpoints'].map(table=>q("UPDATE "+table+" SET created_by='deleted-account' WHERE created_by=?1",id)),
  q('DELETE FROM feedback_replies WHERE author_id=?1',id),
  q('DELETE FROM feedback_deleted_items WHERE author_id=?1',id),
  q('DELETE FROM feedback_events WHERE actor_id=?1',id),
  q('DELETE FROM feedback_items WHERE author_id=?1',id),
  q('DELETE FROM feedback_permissions WHERE account_id=?1',id),
  q('DELETE FROM feedback_rate_limits WHERE account_id=?1',id),
  q('DELETE FROM nexus_account_avatars WHERE account_id=?1',id),
  q('DELETE FROM nexus_account_profiles WHERE account_id=?1',id),
  q('DELETE FROM nexus_invite_enrollments WHERE challenge_id IN(SELECT id FROM nexus_passkey_challenges WHERE account_id=?1)',id),
  q('DELETE FROM nexus_passkey_receipts WHERE account_id=?1',id),
  q('DELETE FROM nexus_passkey_audit WHERE account_id=?1',id),
  q('DELETE FROM nexus_passkey_challenges WHERE account_id=?1 OR authorized_session_id IN(SELECT id FROM account_sessions WHERE subject_id=?1)',id),
  q('DELETE FROM nexus_passkey_credentials WHERE account_id=?1',id),
  q('DELETE FROM nexus_passkey_users WHERE account_id=?1',id),
  q('DELETE FROM nexus_admin_invites WHERE account_id=?1',id),
  q('DELETE FROM nexus_passkey_invites WHERE account_id=?1',id),
  q('DELETE FROM nexus_oauth_verified_emails WHERE account_id=?1',id),
  q('DELETE FROM nexus_oauth_receipts WHERE account_id=?1',id),
  q("DELETE FROM nexus_oauth_transactions WHERE authorized_account_id=?1 OR id IN(SELECT item_id FROM nexus_admin_purge_links WHERE request_id=?2 AND kind='oauth-tx')",id,payload.requestId),
  q('DELETE FROM nexus_oauth_allowed_emails WHERE account_id=?1',id),
  q('DELETE FROM nexus_oauth_account_policies WHERE account_id=?1',id),
  q('DELETE FROM oauth_identities WHERE account_id=?1',id),
  q('DELETE FROM session_login_methods WHERE account_id=?1',id),
  q('DELETE FROM login_methods WHERE account_id=?1',id),
  q('DELETE FROM identity_security_events WHERE subject_id=?1',id),
  q('DELETE FROM account_tokens WHERE subject_id=?1',id),
  q('DELETE FROM account_sessions WHERE subject_id=?1',id),
  q('DELETE FROM account_devices WHERE subject_id=?1',id),
  q('DELETE FROM nexus_admin_rate_limits WHERE scope=?1',id),
  q('DELETE FROM nexus_admin_purge_approvals WHERE target_id=?1',id),
  q('DELETE FROM nexus_alpha_members WHERE account_id=?1',id),
  q('DELETE FROM account_subjects WHERE id=?1',id),
  q('DELETE FROM nexus_admin_purge_links WHERE request_id=?1',payload.requestId),
  audit(env.DB,actor,payload.requestId,'purge',id,stamp)
 ];
 await atomic(env,commands);
 return {ok:true,deletedServerData:true,localCopiesRemotelyErased:false};
}
