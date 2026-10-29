import{verifiedAccount}from'../core/account-storage.js';import{SERVER_ACCOUNT_ORIGIN}from'../core/server-account-origin.js';import{hasVaryWildcard}from'../core/private-response-policy.js';
import{ASSESSMENT_PATH,ASSESSMENT_ERROR_CODES,validateAssessmentRequest,validateAssessmentDTO}from'./transport-contract.js';
const error=code=>Object.assign(Error(code),{code}),allowed=new Set([...ASSESSMENT_ERROR_CODES,'SESSION_REQUIRED','ACCOUNT_SESSION_CHANGED','RATE_LIMITED','CONTROL_CONFLICT','NOT_FOUND']);
async function json(response){
 if(response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||response.headers.get('cache-control')!=='no-store'||!hasVaryWildcard(response.headers.get('vary')))throw error('ASSESSMENT_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw error('ASSESSMENT_UNAVAILABLE');const chunks=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;if((size+=value.byteLength)>262144)throw error('ASSESSMENT_RESPONSE_INVALID');chunks.push(value)}}catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function assessmentRequest(payload,{accountId=verifiedAccount()?.accountId,signal,fetchImpl=globalThis.fetch}={}){
 validateAssessmentRequest(payload);if(location.origin!==SERVER_ACCOUNT_ORIGIN||!accountId||verifiedAccount()?.accountId!==accountId)throw error('SESSION_REQUIRED');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetchImpl(ASSESSMENT_PATH,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal,headers:{accept:'application/json','content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':accountId},body:JSON.stringify(payload)}),data=await json(response);
  if(verifiedAccount()?.accountId!==accountId)throw error('ACCOUNT_SESSION_CHANGED');
  if(!response.ok){const code=allowed.has(data?.error?.code)?data.error.code:'ASSESSMENT_UNAVAILABLE';if(['SESSION_REQUIRED','ACCOUNT_SESSION_CHANGED'].includes(code))globalThis.window?.dispatchEvent(new Event('nexus:session-ended'));throw Object.assign(error(code),{status:response.status})}
  return validateAssessmentDTO(data,payload.phase,accountId);
 }finally{clearTimeout(timer)}
}
