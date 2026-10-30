import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash,createHmac,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN,sessionFromIngress} from './account-read.mjs';
const INTERNAL='/api/v2/akronikl/internal',sha=b=>createHash('sha256').update(b).digest('hex');
export function createNexusDurableStore({env,fetchImpl=fetch}={}){
 const secret=env.AKRONIKL_SERVICE_KEY,encoded=env.AKRONIKL_VAULT_MASTER_KEY,key=Buffer.from(encoded??'','base64');
 if(typeof secret!=='string'||secret.length<32||key.length!==32||key.toString('base64')!==encoded)throw Error('CLOUD_VAULT_UNAVAILABLE');
 const context=new AsyncLocalStorage(),owner=id=>createHash('sha256').update('nexus-account-v1\0'+id).digest('base64url');
 function current(owned){const c=context.getStore();if(!c?.sessionHash||!c.accountId||owned!==undefined&&owned!==owner(c.accountId))throw Error('CLOUD_ACCOUNT_REQUIRED');return c;}
 const seal=(slot,value)=>{const c=current(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('nexus-akronikl-v1\0'+c.accountId+'\0'+slot));return Buffer.concat([iv,cipher.update(Buffer.from(JSON.stringify(value))),cipher.final(),cipher.getAuthTag()]).toString('base64');};
 const open=(slot,value)=>{try{const c=current(),b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from('nexus-akronikl-v1\0'+c.accountId+'\0'+slot));d.setAuthTag(b.subarray(-16));return JSON.parse(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString('utf8'));}catch{throw Error('CLOUD_VAULT_UNAVAILABLE');}};
 async function rpc(action,payload){
  const c=current(),body=Buffer.from(JSON.stringify({action,payload,sessionHash:c.sessionHash,expectedAccountId:c.accountId})),stamp=String(Date.now()),nonce=randomBytes(16).toString('hex');if(body.length>1950000)throw Error('CLOUD_SETTINGS_INVALID');
  const signature=createHmac('sha256',secret).update(`v1\nPOST\n${INTERNAL}\n${stamp}\n${nonce}\n${sha(body)}`).digest('hex');
  let r;try{r=await fetchImpl(WORKER_ORIGIN+INTERNAL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json','x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature},body});}catch{throw Error('CLOUD_VAULT_UNAVAILABLE');}
  if(r.redirected||!r.headers.get('content-type')?.startsWith('application/json')){await r.body?.cancel();throw Error('CLOUD_VAULT_UNAVAILABLE');}
  const reader=r.body?.getReader();if(!reader)throw Error('CLOUD_VAULT_UNAVAILABLE');const parts=[];let bytes=0;
  try{for(;;){const p=await reader.read();if(p.done)break;bytes+=p.value.length;if(bytes>1950000)throw Error('CLOUD_VAULT_UNAVAILABLE');parts.push(p.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  let data;try{data=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('CLOUD_VAULT_UNAVAILABLE');}
  if(!r.ok)throw Error(['CLOUD_ACCOUNT_REQUIRED','CLOUD_SETTINGS_CONFLICT','CLOUD_BUSY','CLOUD_RATE_LIMITED','CLOUD_SETTINGS_INVALID'].includes(data.code)?data.code:'CLOUD_VAULT_UNAVAILABLE');return data;
 }
 const publicRecord=r=>({providerId:r.providerId,modelId:r.modelId,options:r.options});
 const vault=Object.freeze({id:'nexus-d1-v1',protection:'AES-256-GCM / Nexus account / durable D1',
  async list(owned){current(owned);const data=await rpc('keys.list',{});if(!Array.isArray(data.records)||data.records.length>8)throw Error('CLOUD_VAULT_UNAVAILABLE');return data.records.map(r=>publicRecord(open(r.slot,r.ciphertext)));},
  async readState(owned,slot){current(owned);const r=await rpc('state.read',{slot});return {revision:r.revision,value:r.ciphertext?open(slot,r.ciphertext):null};},
  async writeState(owned,slot,value,revision){current(owned);if(Buffer.byteLength(JSON.stringify(value))>(slot==='chats'?1300000:12000))throw Error('CLOUD_SETTINGS_INVALID');const r=await rpc('state.write',{slot,revision,ciphertext:seal(slot,value)});return {revision:r.revision,value:structuredClone(value)};},
  async get(owned,providerId){current(owned);const slot='key:'+providerId,r=await rpc('state.read',{slot});return r.ciphertext?open(slot,r.ciphertext):null;},
  async put(owned,record,options={}){current(owned);const slot='key:'+record.providerId,providerEpoch=options.providerEpoch??(await rpc('provider.epoch',{providerId:record.providerId})).epoch,before=await rpc('state.read',{slot});await rpc('state.write',{slot,revision:before.revision,ciphertext:seal(slot,record),providerEpoch});return publicRecord(record);},
  async remove(owned,providerId){current(owned);await rpc('state.remove',{slot:'key:'+providerId});}
 });
 const tokenHash=token=>{if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('CLOUD_NOT_CONNECTED');return sha(token);};
 const leases=Object.freeze({
  async read(token){const hash=tokenHash(token),r=await rpc('lease.read',{tokenHash:hash});if(!r.lease)return null;return {...open('lease:'+hash,r.lease.ciphertext),version:r.lease.version,expiresAt:r.lease.expires_at};},
  async providerEpoch(providerId){return (await rpc('provider.epoch',{providerId})).epoch;},
  async save(token,value,{replaceToken=null}={}){const hash=tokenHash(token);await rpc('lease.save',{tokenHash:hash,version:value.version,providerId:value.selection.providerId,expiresAt:value.expiresAt,ciphertext:seal('lease:'+hash,value),replaceTokenHash:replaceToken?tokenHash(replaceToken):null,providerEpoch:value.providerEpoch??0});},
  async drop(token,version){await rpc('lease.drop',{tokenHash:tokenHash(token),version});},
  async acquire(token,version){const lockId=randomBytes(32).toString('hex');await rpc('lease.acquire',{tokenHash:tokenHash(token),version,lockId});return lockId;},
  async release(token,version,lockId){await rpc('lease.release',{tokenHash:tokenHash(token),version,lockId});}
 });
 return Object.freeze({vault,leases,beforeModelCall:kind=>rpc('limit.consume',{kind}),run(req,fn){const session=sessionFromIngress(req,{env}),accountId=req.headers['x-nexus-account-expectation'];return context.run({accountId,sessionHash:session?sha(session):null},fn);},origin:GATEWAY_ORIGIN});
}
