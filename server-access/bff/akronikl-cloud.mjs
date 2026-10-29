// Feature-only route; uses the existing Nexus session ingress + signed Account read.
import {createAccountReadHandler,GATEWAY_ORIGIN,sessionFromIngress} from './account-read.mjs';
import {readV2CookieContext} from './gateway-cookie-context.mjs';
import {createCloudSettingsHost} from '../../tools/qa-akronikl/cloud-settings-gateway.mjs';
import {createCloudVault} from '../../tools/qa-akronikl/cloud-vault.mjs';
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
export function createNexusAccountResolver(options={}){
 const read=createAccountReadHandler(options);
 const resolve=async req=>{
  // Expectations detect account switches; they never establish the account.
  const expected=req.headers['x-nexus-account-expectation'];
  if(typeof expected!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(expected)||req.rawHeaders?.filter((v,i)=>i%2===0&&v.toLowerCase()==='x-nexus-account-expectation').length!==1)return null;
  let status=0,data=null;
  const res={writeHead(s){status=s;},end(bytes){try{data=JSON.parse(String(bytes));}catch{}}};
  // The original headers/rawHeaders and Gateway cookie envelope remain intact.
  await read({url:'/api/v2/account',method:'GET',headers:req.headers,rawHeaders:req.rawHeaders},res);
  return status===200&&data?.account?.status==='active'&&data.account.accountId===expected?data.account.accountId:null;
 };resolve.sessionBinding=req=>{const session=sessionFromIngress(req,{env:options.env});return session?createHash('sha256').update(session).digest('hex'):null;};return resolve;
}
export function createNexusCloudVault(env){
 const encoded=env.AKRONIKL_VAULT_MASTER_KEY;
 if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]{43}=$/u.test(encoded))throw Error('CLOUD_VAULT_UNAVAILABLE');
 const key=Buffer.from(encoded,'base64');if(key.length!==32||key.toString('base64')!==encoded||!env.AKRONIKL_VAULT_FILE)throw Error('CLOUD_VAULT_UNAVAILABLE');
 const codec={protect:async bytes=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(bytes),c.final(),c.getAuthTag()]);},
  unprotect:async bytes=>{if(bytes.length<28)throw Error();const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]);}};
 return createCloudVault({file:path.resolve(env.AKRONIKL_VAULT_FILE),codec,protection:'AES-256-GCM server secret'});
}
export async function createNexusCloudHandler({env={},fetchImpl=fetch,vault,createAdapter,onOutcome,localSpeech=null}={}){
 const generationEnabled=env.AKRONIKL_CLOUD_ENABLED==='true';
 if(!generationEnabled&&env.AKRONIKL_STATE_ENABLED!=='true')return Object.freeze({handle:async()=>false,close(){},revokeAccount(){}});
 const resolveAccount=createNexusAccountResolver({env,fetchImpl});
 const host=await createCloudSettingsHost({origin:GATEWAY_ORIGIN,secureCookies:true,resolveAccount,vault:vault??createNexusCloudVault(env),generationEnabled,localSpeech,...(createAdapter?{createAdapter}:{}),onOutcome});
 return Object.freeze({...host,async handle(req,res){
  if(req.url==='/api/v2/account/passkey/logout'&&req.method==='POST'){
   let session;try{session=readV2CookieContext(req,'passkeyIngressContract',{env})?.get('__Host-nexus_session');}catch{}
   if(session){const bound=createHash('sha256').update(session).digest('hex');res.once('finish',()=>{if(res.statusCode===200)host.revokeBinding(bound);});}return false;
  }
  return host.handle(req,res);
 }});
}
