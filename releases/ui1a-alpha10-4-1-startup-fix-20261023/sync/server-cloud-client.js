import {verifiedAccount,lockAccountStorage} from '../core/account-storage.js';
import {isServerAccountOrigin} from '../core/server-account-origin.js';

export const serverCloudSessionAvailable=()=>isServerAccountOrigin()&&Boolean(verifiedAccount());
export function cloudRoute(path){
 if(path==='/api/v1/me'||path==='/api/v1/projects')return path.replace('/api/v1/','/api/v2/cloud/');
 const match=/^\/api\/v1\/projects\/([^/]+)(?:\/audit)?$/.exec(path);
 if(match){try{const id=decodeURIComponent(match[1]);if(id&&id.length<=256&&id!=='.'&&id!=='..'&&!/[/\\\u0000-\u001f\u007f]/.test(id)&&encodeURIComponent(id)===match[1])return path.replace('/api/v1/','/api/v2/cloud/')}catch{}}
 throw Error('CLOUD_ROUTE_REJECTED');
}
export async function serverCloudRequest(path,{method='GET',body}={},fetchImpl=globalThis.fetch){
 if(!serverCloudSessionAvailable())throw Error('SERVER_SESSION_REQUIRED');
 const route=cloudRoute(path),verb=String(method).toUpperCase();
 if(!['GET','PUT'].includes(verb)||verb==='PUT'&&!/^\/api\/v2\/cloud\/projects\/[^/]+$/.test(route))throw Error('CLOUD_METHOD_REJECTED');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000),accountId=verifiedAccount().accountId;
 try{
  const response=await fetchImpl(route,{method:verb,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json','x-nexus-cloud-account':accountId,...(verb==='PUT'?{'content-type':'application/json','x-nexus-cloud-request':'1'}:{})},...(verb==='PUT'?{body:JSON.stringify(body)}:{})});
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('CLOUD_RESPONSE_INVALID');
  const raw=await response.text();if(raw.length>10*1024*1024)throw Error('CLOUD_RESPONSE_LIMIT');
  const payload=JSON.parse(raw);
  if(verifiedAccount()?.accountId!==accountId)throw Error('CLOUD_ACCOUNT_CHANGED');
  if(!response.ok){
   if(response.status===401||payload?.error?.code==='ACCOUNT_SESSION_CHANGED'){lockAccountStorage();if(typeof window!=='undefined')window.dispatchEvent(new Event('nexus:session-ended'))}
   const error=Error(payload?.error?.message||'Не удалось выполнить запрос Nexus Cloud.');error.status=response.status;error.code=payload?.error?.code;error.payload=payload;throw error;
  }
  if(path==='/api/v1/me'&&payload?.subject?.id!==accountId)throw Error('CLOUD_ACCOUNT_MISMATCH');
  return {payload,transport:'nexus-cookie'};
 }finally{clearTimeout(timer)}
}
