import {createHash,createHmac,randomBytes} from 'node:crypto';
import {fetch} from 'undici';
const productionDB='0995b7f0-2e4c-42a5-a25f-422d4b741d59';
export const stageName=name=>typeof name==='string'&&/^nexus-password-staging-[a-f0-9]{12}$/.test(name);
export function validateStage(s){
 if(s.schema!==1||s.purpose!=='invited-password-isolated-staging'||!stageName(s.name)||
  typeof s.databaseId!=='string'||s.databaseId===productionDB||!/^[a-f0-9-]{36}$/.test(s.databaseId)||
  s.workerOrigin!==`https://${s.name}.${s.subdomain}.workers.dev`||!/^[-a-z0-9]+$/.test(s.subdomain))throw Error('STAGING_TARGET_REJECTED');
 return s;
}
export async function stagingRPC(s,path,key,payload){
 validateStage(s);
 if(!['/api/v2/account/internal/read','/api/v2/account/internal/control','/api/v2/account/internal/invited-password'].includes(path))throw Error('STAGING_PATH_REJECTED');
 const body=JSON.stringify(payload),timestamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
 const hash=createHash('sha256').update(body).digest('hex');
 const signature=createHmac('sha256',key).update(['v1','POST',path,timestamp,nonce,hash].join('\n')).digest('hex');
 return fetch(s.workerOrigin+path,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature}});
}
