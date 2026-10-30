// Sliding inactivity deadline for an already eligible session; absolute lifetime stays unchanged.
export async function touchEligibleAccountSession(db,sessionHash,stamp=new Date().toISOString(),env={}){
 const time=Date.parse(stamp);if(!Number.isFinite(time))throw Error('SESSION_STAMP_INVALID');
 const next=new Date(time+30*60*1000).toISOString();
 const admission=env.ALPHA_ADMISSION_ENABLED==='true'?`AND EXISTS(SELECT 1 FROM nexus_alpha_settings WHERE id=1 AND enforced=1)
 AND (EXISTS(SELECT 1 FROM nexus_admin_grants WHERE account_id=s.id AND status='active')
 OR EXISTS(SELECT 1 FROM nexus_alpha_members WHERE account_id=s.id AND state='active' AND (access_expires_at IS NULL OR access_expires_at>?2)))`:'';
 const row=await db.prepare(`UPDATE account_sessions SET
 last_seen_at=MAX(last_seen_at,?2),idle_expires_at=MIN(absolute_expires_at,MAX(idle_expires_at,?3))
 WHERE secret_hash=?1 AND status='active' AND revoked_at IS NULL
 AND auth_strength='account-method-v1' AND idle_expires_at>?2 AND absolute_expires_at>?2
 AND EXISTS(SELECT 1 FROM account_subjects s
 JOIN account_devices d ON d.id=account_sessions.device_id AND d.subject_id=s.id AND d.status='active'
 JOIN session_login_methods slm ON slm.session_id=account_sessions.id AND slm.account_id=s.id
 JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=s.id AND lm.status='active'
 WHERE s.id=account_sessions.subject_id AND s.status='active' ${admission})
 RETURNING subject_id`).bind(sessionHash,stamp,next).first();
 return row?.subject_id??null;
}
