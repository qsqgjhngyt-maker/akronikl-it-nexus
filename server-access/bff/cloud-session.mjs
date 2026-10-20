// Same-origin Cloud facade для уже подтверждённой Account-сессии. По умолчанию закрыто.
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {GATEWAY_ORIGIN,WORKER_ORIGIN,sessionFromIngress} from './account-read.mjs';
const BASE='/api/v2/cloud',INTERNAL=BASE+'/internal';
const MAX_REQUEST=1_550_000,MAX_RESPONSE=2_100_000;
const reply=(res,status,body)=>{const data=JSON.stringify(body);res.writeHead(status,{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'*',
  'x-content-type-options':'nosniff','content-length':Buffer.byteLength(data)});res.end(data);return true};
function legacyPath(method,path) {
  if(typeof path!=='string'||path.length>2048||!path.startsWith(BASE+'/')||/[?#\\]/.test(path))return null;
  const rest=path.slice(BASE.length);
  if(method==='GET'&&(rest==='/me'||rest==='/projects'))return '/api/v1'+rest;
  const match=/^\/projects\/([^/]+)(\/audit)?$/.exec(rest);
  if(!match||!['GET','PUT'].includes(method)||match[2]&&method!=='GET')return null;
  try{const id=decodeURIComponent(match[1]);if(!id||id.length>256||id==='.'||id==='..'||
    /[/\\\u0000-\u001f\u007f]/.test(id)||encodeURIComponent(id)!==match[1])return null;
    return '/api/v1'+rest;}catch{return null}
}
async function readNodeBody(req,max){let length=0;const parts=[];
  for await(const part of req){length+=part.length;if(length>max)throw Error('INPUT_TOO_LARGE');parts.push(part)}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)))}
  catch{throw Error('INVALID_INPUT')}
}
async function readResponse(response){const reader=response.body?.getReader();if(!reader)throw Error();
  let length=0;const parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;
    length+=value.byteLength;if(length>MAX_RESPONSE)throw Error();parts.push(value)}
    return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts));
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
export function createCloudSessionHandler({env={},fetchImpl=fetch}={}) {
  return async(req,res)=>{
    if(typeof req.url!=='string'||!req.url.startsWith(BASE+'/'))return false;
    if(env.CLOUD_SESSION_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true'||
       typeof env.CLOUD_SERVICE_KEY!=='string'||env.CLOUD_SERVICE_KEY.length<32)
      return reply(res,503,{error:{code:'CLOUD_UNAVAILABLE'}});
    if(req.headers.host!==new URL(GATEWAY_ORIGIN).host||
       req.headers.origin&&req.headers.origin!==GATEWAY_ORIGIN||
       req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'||req.headers.authorization)
      return reply(res,403,{error:{code:'ORIGIN_REJECTED'}});
    if(!['GET','PUT'].includes(req.method))return reply(res,405,{error:{code:'METHOD_NOT_ALLOWED'}});
    const path=legacyPath(req.method,req.url);if(!path)return reply(res,404,{error:{code:'NOT_FOUND'}});
    if(req.method==='PUT'&&(req.headers.origin!==GATEWAY_ORIGIN||
       req.headers['x-nexus-cloud-request']!=='1'||req.headers['content-type']!=='application/json'))
      return reply(res,403,{error:{code:'WRITE_ORIGIN_REQUIRED'}});
    const sessionCookie=sessionFromIngress(req,{env});
    if(!sessionCookie)return reply(res,401,{error:{code:'SESSION_REQUIRED'}});
    // Это ожидание document, а не identity proof. Worker сравнит его с действительной cookie session.
    // Защищает старую вкладку A от чтения/записи данных B после смены общей HttpOnly cookie.
    const expectedAccountId=req.headers['x-nexus-cloud-account'];
    if(typeof expectedAccountId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))
      return reply(res,400,{error:{code:'ACCOUNT_EXPECTATION_REQUIRED'}});
    try{
      const payload=req.method==='GET'?null:await readNodeBody(req,MAX_REQUEST);
      if(req.method==='PUT'&&(!payload||typeof payload!=='object'||Array.isArray(payload)))
        return reply(res,400,{error:{code:'INVALID_INPUT'}});
      const body=JSON.stringify({method:req.method,path,payload,sessionCookie,expectedAccountId});
      const stamp=String(Date.now()),nonce=randomBytes(16).toString('hex');
      const digest=createHash('sha256').update(body).digest('hex');
      const canonical=`v1\nPOST\n${INTERNAL}\n${stamp}\n${nonce}\n${digest}`;
      const upstream=await fetchImpl(WORKER_ORIGIN+INTERNAL,{method:'POST',body,redirect:'error',
        credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{
          accept:'application/json','content-type':'application/json',
          'x-nexus-service-timestamp':stamp,'x-nexus-service-nonce':nonce,
          'x-nexus-service-signature':createHmac('sha256',env.CLOUD_SERVICE_KEY).update(canonical).digest('hex')
        }});
      if(!upstream.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error();
      const raw=await readResponse(upstream);
      if(raw.includes(sessionCookie)||raw.includes(env.CLOUD_SERVICE_KEY))throw Error();
      const data=JSON.parse(raw);
      if(!upstream.ok){const code=data?.error?.code;
        return reply(res,[400,401,403,404,409,413,429,503].includes(upstream.status)?upstream.status:502,
          {error:{code:typeof code==='string'&&/^[A-Z_]{2,64}$/.test(code)?code:'CLOUD_UNAVAILABLE',
            ...(code==='REVISION_CONFLICT'?{details:data.error.details}:{})}})}
      return reply(res,200,data);
    }catch(error){const status=error?.message==='INPUT_TOO_LARGE'?413:
      error?.message==='INVALID_INPUT'?400:502;
      return reply(res,status,{error:{code:status===413?'INPUT_TOO_LARGE':status===400?'INVALID_INPUT':'CLOUD_UNAVAILABLE'}})}
  };
}
