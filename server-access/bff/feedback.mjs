import {createHash,createHmac,randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN,sessionFromIngress} from './account-read.mjs';
const INTERNAL='/api/v2/feedback/internal';
const reply=(res,status,body)=>{const data=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'*','x-content-type-options':'nosniff','content-length':Buffer.byteLength(data)});res.end(data)};
async function readBody(stream,max){let length=0;const chunks=[];for await(const part of stream){length+=part.length;if(length>max)throw Error('BODY_TOO_LARGE');chunks.push(part)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
async function readResponse(response){const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_RESPONSE');let size=0;const parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000)throw Error('RESPONSE_TOO_LARGE');parts.push(value)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}}
export function createFeedbackHandler({env={},fetchImpl=fetch}={}){
 return async(req,res)=>{
  if(env.FEEDBACK_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true')return reply(res,503,{error:{code:'FEEDBACK_UNAVAILABLE'}});
  const origin=env.FEEDBACK_GATEWAY_ORIGIN||GATEWAY_ORIGIN,host=new URL(origin).host;
  if(req.headers.host!==host||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'||req.headers.authorization)return reply(res,403,{error:{code:'ORIGIN_REJECTED'}});
  if(!['GET','POST','PATCH'].includes(req.method))return reply(res,405,{error:{code:'METHOD_NOT_ALLOWED'}});
  const path=new URL(req.url,origin);if(path.pathname.includes('%')||!/^\/api\/v2\/feedback\/(reviews|me|items|moderation|items\/[a-zA-Z0-9-]+(?:\/(withdraw|moderate|events))?)$/.test(path.pathname)||path.pathname!==req.url.split('?')[0])return reply(res,404,{error:{code:'NOT_FOUND'}});
  if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['x-nexus-feedback-write']!=='1'||req.headers['content-type']!=='application/json'||path.search))return reply(res,403,{error:{code:'WRITE_ORIGIN_REQUIRED'}});
  const isPublic=path.pathname==='/api/v2/feedback/reviews'&&req.method==='GET';
  const session=isPublic?null:sessionFromIngress(req);if(!isPublic&&!session)return reply(res,401,{error:{code:'SESSION_REQUIRED'}});
  try{
   let upstream;
   if(isPublic){upstream=await fetchImpl(WORKER_ORIGIN+req.url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000),headers:{accept:'application/json'}})}
   else{
    if(typeof env.FEEDBACK_SERVICE_KEY!=='string'||env.FEEDBACK_SERVICE_KEY.length<32)return reply(res,503,{error:{code:'FEEDBACK_UNAVAILABLE'}});
    const payload=req.method==='GET'?null:await readBody(req,20000),body=JSON.stringify({method:req.method,path:req.url,payload,sessionHash:createHash('sha256').update(session).digest('hex')});
    const stamp=String(Date.now()),nonce=randomBytes(16).toString('hex'),digest=createHash('sha256').update(body).digest('hex'),canonical=`v1\nPOST\n${INTERNAL}\n${stamp}\n${nonce}\n${digest}`;
    upstream=await fetchImpl(WORKER_ORIGIN+INTERNAL,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(5000),headers:{accept:'application/json','content-type':'application/json','x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':createHmac('sha256',env.FEEDBACK_SERVICE_KEY).update(canonical).digest('hex')}});
   }
   if(!upstream.headers.get('content-type')?.startsWith('application/json'))throw Error('UPSTREAM_INVALID');const data=await readResponse(upstream);
   const allowedCodes=['INVALID_INPUT','INVALID_CONTEXT','INPUT_TOO_LARGE','RATE_LIMITED','STALE_VERSION','STALE_REVISION','REQUEST_CONFLICT','INVALID_TRANSITION','NOT_FOUND','MODERATOR_REQUIRED','SESSION_REQUIRED','FEEDBACK_UNAVAILABLE'];
   if(!upstream.ok)return reply(res,[400,401,403,404,409,413,429,503].includes(upstream.status)?upstream.status:502,{error:{code:allowedCodes.includes(data?.error?.code)?data.error.code:'FEEDBACK_UNAVAILABLE'}});
   return reply(res,200,data);
  }catch(error){return reply(res,error.message==='BODY_TOO_LARGE'?413:error instanceof SyntaxError?400:502,{error:{code:error.message==='BODY_TOO_LARGE'?'INPUT_TOO_LARGE':error instanceof SyntaxError?'INVALID_INPUT':'FEEDBACK_UNAVAILABLE'}})}
 };
}
