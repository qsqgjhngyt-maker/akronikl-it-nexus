// SESSION-REMEMBER-01 / D1 data adapter (UNWIRED, FEATURE DISABLED).
// This file is not imported from the Worker entry router. Do not deploy or
// apply 0017 until Owner/Security approval, signed ingress and gateway cookie
// policy have been verified end-to-end. No raw remember or session secrets in D1.
const command=(db,sql,...params)=>db.prepare(sql).bind(...params);
const secureHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const successChanged=r=>r?.success===true&&Number(r.meta?.changes)===1;
const now=()=>new Date().toISOString();
export function createRememberD1Repository(db,{alphaAccess}={}){
 if(!db?.prepare||!db?.batch||typeof alphaAccess!=='function')throw Error('REMEMBER_DISABLED_WITHOUT_D1_AND_ALPHA');
 return Object.freeze({
  async createGrant(row,proof){
   if(!secureHash(proof.sessionHash))return false;
   if(!await alphaAccess(row.accountId))return false;
   try{
    const result=await command(db,`INSERT INTO nexus_remembered_grants(
      id,account_id,device_id,login_method_id,source_session_id,current_hash,
      generation,status,created_at,expires_at,last_rotated_at)
      SELECT ?1,?2,?3,?4,s.id,?5,1,'active',?6,?7,?6
      FROM account_sessions s
      JOIN session_login_methods slm ON slm.session_id=s.id AND slm.account_id=s.subject_id
      JOIN login_methods lm ON lm.id=slm.login_method_id AND lm.status='active'
      WHERE s.secret_hash=?8 AND s.subject_id=?2 AND s.device_id=?3
       AND slm.login_method_id=?4 AND s.status='active' AND s.auth_strength='account-method-v1'
       AND s.revoked_at IS NULL AND s.idle_expires_at>?6 AND s.absolute_expires_at>?6
       AND (julianday(?6)-julianday(s.created_at)) BETWEEN 0 AND (5.0/1440)
      LIMIT 1`,row.id,row.accountId,row.deviceId,row.loginMethodId,row.currentHash,
      row.createdAt,row.expiresAt,proof.sessionHash).run();
    return successChanged(result);
   }catch{return false}
  },
  async getGrant(id){
   const r=await command(db,`SELECT id,account_id,device_id,login_method_id,current_hash,
      generation,status,created_at,expires_at,last_rotated_at
      FROM nexus_remembered_grants WHERE id=?1`,id).first();
   return r?{id:r.id,accountId:r.account_id,deviceId:r.device_id,
     loginMethodId:r.login_method_id,currentHash:r.current_hash,generation:r.generation,
     status:r.status,createdAt:r.created_at,expiresAt:r.expires_at,
     lastRotatedAt:r.last_rotated_at}:null;
  },
  async getCurrentAuthority(grant){
   const r=await command(db,`SELECT a.id account_id,a.status account_status,
        d.id device_id,d.status device_status,lm.id method_id,lm.status method_status
      FROM account_subjects a
      JOIN account_devices d ON d.subject_id=a.id AND d.id=?2
      JOIN login_methods lm ON lm.account_id=a.id AND lm.id=?3
      WHERE a.id=?1`,grant.accountId,grant.deviceId,grant.loginMethodId).first();
   if(!r)return null;
   return {accountId:r.account_id,deviceId:r.device_id,loginMethodId:r.method_id,
    accountStatus:r.account_status,deviceStatus:r.device_status,
    loginMethodStatus:r.method_status,alphaAllowed:await alphaAccess(r.account_id)};
  },
  async spentTokenStatus(id,hash){
   if(!secureHash(hash))return null;
   const r=await command(db,'SELECT grant_id,used_at FROM nexus_remembered_spent WHERE grant_id=?1 AND token_hash=?2',id,hash).first();
   return r?{id:r.grant_id,usedAt:r.used_at}:null;
  },
  async atomicRotateAndCreateSession(issue){
   if(!secureHash(issue.expectedHash)||!secureHash(issue.nextHash)||!secureHash(issue.sessionHash)||
      issue.sessionAuthStrength!=='remembered-device-v1')return false;
   if(!await alphaAccess(issue.accountId))return false;
   const s=[
    // Failure on duplicate spend or missing account/device/method aborts entire D1 batch.
    command(db,`INSERT INTO nexus_remembered_spent(token_hash,grant_id,used_at,expires_at)
      VALUES(?1,?2,?3,?4)`,issue.expectedHash,issue.grantId,issue.rotatedAt,issue.grantExpiresAt),
    command(db,`UPDATE nexus_remembered_grants SET current_hash=?1,
        generation=?2,last_rotated_at=?3,last_session_id=?4
      WHERE id=?5 AND current_hash=?6 AND generation=?7 AND status='active'
        AND expires_at>?3`,issue.nextHash,issue.nextGeneration,issue.rotatedAt,
      issue.sessionId,issue.grantId,issue.expectedHash,issue.nextGeneration-1),
    command(db,`INSERT INTO account_sessions(id,subject_id,device_id,secret_hash,
      status,auth_strength,created_at,last_seen_at,idle_expires_at,absolute_expires_at)
      VALUES(?1,?2,?3,?4,'active','remembered-device-v1',?5,?5,?6,?7)`,
      issue.sessionId,issue.accountId,issue.deviceId,issue.sessionHash,
      issue.rotatedAt,issue.sessionIdleExpiresAt,issue.sessionAbsoluteExpiresAt),
    command(db,`INSERT INTO session_login_methods(session_id,login_method_id,account_id,created_at)
      VALUES(?1,?2,?3,?4)`,issue.sessionId,issue.loginMethodId,issue.accountId,issue.rotatedAt),
    // No session/method/rotation => receipt trigger rejects, transaction rolls back.
    command(db,`INSERT INTO nexus_remembered_renewal_receipts
      (id,grant_id,session_id,generation,created_at)
      VALUES(?1,?2,?3,?4,?5)`,crypto.randomUUID(),issue.grantId,issue.sessionId,issue.nextGeneration,issue.rotatedAt)
   ];
   try{const results=await db.batch(s);return results.length===5&&results.every(successChanged)}
   catch{return false} // No errors/raw cookie/session contents in log output.
  },
  async revokeGrant(id,reason){
   const timestamp=now();
   try{
    const results=await db.batch([
     command(db,`UPDATE nexus_remembered_grants SET status='revoked',revoked_at=?1,revoked_reason=?2
       WHERE id=?3 AND status='active'`,timestamp,reason,id),
     command(db,`UPDATE account_sessions SET status='revoked',revoked_at=?1,
       revoked_reason='remember-revoked' WHERE status='active' AND id IN
       (SELECT session_id FROM nexus_remembered_renewal_receipts WHERE grant_id=?2)`,timestamp,id)
    ]);
    return successChanged(results[0]);
   }catch{return false}
  },
  async revokeAllForAccount(accountId,reason){
   const timestamp=now();
   try{
    const results=await db.batch([
     command(db,`UPDATE nexus_remembered_grants SET status='revoked',revoked_at=?1,
       revoked_reason=?2 WHERE account_id=?3 AND status='active'`,timestamp,reason,accountId),
     command(db,`UPDATE account_sessions SET status='revoked',revoked_at=?1,
       revoked_reason='remember-logout-all' WHERE status='active' AND id IN
       (SELECT r.session_id FROM nexus_remembered_renewal_receipts r
        JOIN nexus_remembered_grants g ON g.id=r.grant_id WHERE g.account_id=?2)`,timestamp,accountId)
    ]);
    return results[0]?.success?Number(results[0].meta?.changes)||0:0;
   }catch{return 0}
  }
 });
}
