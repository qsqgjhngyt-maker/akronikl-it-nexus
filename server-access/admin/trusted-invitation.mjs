import {randomBytes,createHash} from 'node:crypto';
// Trusted administration only. This module has no endpoint, DB connection,
// default user, CLI execution or logger. Return the secret to the intended user
// through the operator UI, never through URLs or general evidence artifacts.
export function preparePasskeyInvitation({accountId,purpose='bootstrap',ttlSeconds=600}){
 if(typeof accountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/.test(accountId))throw Error('Explicit canonical account ID required');
 if(!['bootstrap','recovery'].includes(purpose)||!Number.isInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>600)throw Error('Invalid invitation policy');
 const token='npi_'+randomBytes(32).toString('base64url'),tokenHash=createHash('sha256').update(token).digest('hex'),expiresAt=new Date(Date.now()+ttlSeconds*1000).toISOString();
 const sql=`INSERT INTO nexus_passkey_invites(token_hash,account_id,purpose,expires_at)
 SELECT ?1,a.id,?3,?4 FROM account_subjects a WHERE a.id=?2 AND a.status='active'
 AND (?3='recovery' OR NOT EXISTS(SELECT 1 FROM login_methods lm
   WHERE lm.account_id=a.id AND lm.kind='passkey' AND lm.status='active'))`;
 return{token,sql,params:[tokenHash,accountId,purpose,expiresAt],accountId,purpose,expiresAt};
}
