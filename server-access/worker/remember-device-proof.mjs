// SESSION-REMEMBER-P1A, isolated default-deny fresh enrollment resolver.
// A browser-supplied accountId/deviceId/authStrength is NEVER trusted.
import {digestSecret} from './remember-device-core.mjs';
import {alphaAccess} from './alpha-admission.mjs';
export function createRememberFreshProofResolver(db,{env={},clock=()=>Date.now(),allowAccount=alphaAccess}={}){
 if(!db?.prepare)throw Error('REMEMBER_DB_REQUIRED');
 return async sessionCookie=>{
  if(typeof sessionCookie!=='string'||!/^nxs_[A-Za-z0-9_-]{43}$/.test(sessionCookie))return null;
  const millis=clock();if(!Number.isSafeInteger(millis))return null;
  const at=new Date(millis).toISOString(),since=new Date(millis-300000).toISOString();
  try{
   const hash=await digestSecret(sessionCookie);
   const {results=[]}=await db.prepare(`SELECT s.id session_id,s.subject_id account_id,s.device_id,
      slm.login_method_id,s.created_at
      FROM account_sessions s
      JOIN account_subjects a ON a.id=s.subject_id AND a.status='active'
      JOIN account_devices d ON d.id=s.device_id AND d.subject_id=a.id AND d.status='active'
      JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=a.id
      JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.account_id=a.id
        AND lm.status='active'
      WHERE s.secret_hash=?1 AND s.status='active' AND s.auth_strength='account-method-v1'
       AND s.revoked_at IS NULL AND s.idle_expires_at>?2 AND s.absolute_expires_at>?2
       AND s.created_at<=?2 AND s.created_at>?3
       AND NOT EXISTS(SELECT 1 FROM nexus_alpha_members m
         WHERE m.account_id=a.id AND m.state IN('blocked','removed'))
      ORDER BY slm.login_method_id LIMIT 2`).bind(hash,at,since).all();
   if(results.length!==1)return null;
   const s=results[0];
   if(!s||typeof s.account_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(s.account_id)||
    typeof s.device_id!=='string'||!s.device_id||typeof s.login_method_id!=='string'||!s.login_method_id)return null;
   if(!await allowAccount(env,s.account_id))return null;
   return {accountId:s.account_id,deviceId:s.device_id,loginMethodId:s.login_method_id,
    authStrength:'account-method-v1',recentProof:true,sessionHash:hash};
  }catch{return null}
 };
}
