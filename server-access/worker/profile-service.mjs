import {validateAvatarEnvelope} from './avatar-envelope.mjs';
import {alphaAccess} from './alpha-admission.mjs';
import {query,first,deny,exact,validRequestId,guard,atomic} from './admin-service.mjs';
async function dto(env,accountId){
 const account=await first(env.DB,'SELECT a.display_name,p.username FROM account_subjects a LEFT JOIN nexus_account_profiles p ON p.account_id=a.id WHERE a.id=?1',accountId);
 const avatar=await first(env.DB,'SELECT jpeg_base64,version FROM nexus_account_avatars WHERE account_id=?1',accountId);
 return {accountId,username:account.username||null,displayName:account.display_name,avatar:avatar?.jpeg_base64?'data:image/jpeg;base64,'+avatar.jpeg_base64:null,avatarVersion:avatar?.version||0};
}
export async function profileOperation(env,value){
 const {actor,method,payload}=value;
 if(!await alphaAccess(env,actor.account_id))deny('ALPHA_ACCESS_CLOSED',403);
 if(value.path==='/api/v2/account/profile'&&method==='GET')return dto(env,actor.account_id);
 const upload=value.path==='/api/v2/account/profile/avatar',remove=value.path==='/api/v2/account/profile/avatar/remove';
 if(method!=='POST'||!upload&&!remove)deny('NOT_FOUND',404);
 if(!exact(payload,['requestId','version',...(upload?['jpegBase64']:[])])||!validRequestId(payload.requestId)||!Number.isInteger(payload.version)||payload.version<0)deny('INVALID_INPUT');
 const image=upload?validateAvatarEnvelope(payload.jpegBase64):null,stamp=new Date().toISOString();
 const condition="EXISTS(SELECT 1 FROM account_sessions s JOIN account_subjects a ON a.id=s.subject_id AND a.status='active' WHERE s.id=?3 AND s.subject_id=?4 AND s.status='active' AND s.revoked_at IS NULL AND s.idle_expires_at>?5 AND s.absolute_expires_at>?5) AND COALESCE((SELECT version FROM nexus_account_avatars WHERE account_id=?4),0)=?6";
 const commands=[guard(env.DB,payload.requestId,'before',condition,[actor.session_id,actor.account_id,stamp,payload.version])];
 if(upload)commands.push(query(env.DB,'INSERT INTO nexus_account_avatars(account_id,jpeg_base64,version,updated_at) VALUES(?1,?2,1,?3) ON CONFLICT(account_id) DO UPDATE SET jpeg_base64=excluded.jpeg_base64,version=version+1,updated_at=excluded.updated_at',actor.account_id,image,stamp));
 else commands.push(query(env.DB,'INSERT INTO nexus_account_avatars(account_id,jpeg_base64,version,updated_at) VALUES(?1,NULL,1,?2) ON CONFLICT(account_id) DO UPDATE SET jpeg_base64=NULL,version=version+1,updated_at=excluded.updated_at',actor.account_id,stamp));
 await atomic(env,commands);return dto(env,actor.account_id);
}
