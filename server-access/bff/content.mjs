import {decodeBlogLayout,validLayoutImage,compatibleArticle} from '../../core/blog-layout.js';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {HOME_SLOTS} from '../../core/content-contract.js';
import {hasVaryWildcard} from '../../core/private-response-policy.js';
import {readPhotoParts} from './media-parts.mjs';
import {controlService} from './account-control.mjs';
import {requestMediaHTTP2,createMediaHTTP2Session} from './media-http2.mjs';
const PATH='/api/v2/content/feed';
export function createContentHandler({env={},fetchImpl=fetch,mediaFetchImpl=fetchImpl===fetch?requestMediaHTTP2:fetchImpl}={}){
 return async(req,res)=>{
  if(!req.url?.startsWith('/api/v2/content/'))return false;
  const reply=(status,data)=>{const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff'});res.end(body);return true};
  try{
   if(env.CONTENT_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true')return reply(503,{error:{code:'CONTENT_UNAVAILABLE'}});
   if(req.url.length>512)return reply(400,{error:{code:'INVALID_INPUT'}});
   const url=new URL(req.url,GATEWAY_ORIGIN);
   if(url.hash)return reply(400,{error:{code:'INVALID_INPUT'}});
   if(url.searchParams.has('media')&&!/^[a-f0-9]{64}$/.test(url.searchParams.get('media')))return reply(400,{error:{code:'INVALID_INPUT'}});
   if(req.method!=='GET'||url.pathname!==PATH||req.url.split('?')[0]!==PATH||req.headers.host!==new URL(GATEWAY_ORIGIN).host)return reply(404,{error:{code:'NOT_FOUND'}});
   if([...url.searchParams.keys()].some(k=>!['slug','media'].includes(k))||url.searchParams.getAll('slug').length>1||url.searchParams.getAll('media').length>1||[...url.searchParams.keys()].length>1)return reply(400,{error:{code:'INVALID_INPUT'}});
   if(url.searchParams.has('media')&&env.BFF_CONTENT_MEDIA_PARTS_ENABLED==='true'){
    if(typeof env.ADMIN_SERVICE_KEY!=='string'||env.ADMIN_SERVICE_KEY.length<32)throw Error();
    const transport=mediaFetchImpl===requestMediaHTTP2?createMediaHTTP2Session():null,controller=new AbortController(),abort=()=>controller.abort();
    req.once?.('aborted',abort);res.once?.('close',abort);if(req.aborted)abort();
    const rpc=(value,options)=>controlService(env,fetchImpl,value,{mediaDiagnostics:true,mediaFetchImpl:transport?.request||mediaFetchImpl,...options});
    try{return reply(200,await readPhotoParts({sessionHash:null,expectedAccountId:null},url.searchParams.get('media'),rpc,{publishedOnly:true,signal:AbortSignal.any([AbortSignal.timeout(12000),controller.signal])}))}
    finally{req.removeListener?.('aborted',abort);res.removeListener?.('close',abort);transport?.close()}
   }
   const response=await fetchImpl(WORKER_ORIGIN+req.url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:{accept:'application/json'}});
   if(!response.headers.get('content-type')?.startsWith('application/json')||response.headers.has('set-cookie')||response.headers.get('cache-control')!=='no-store'||!hasVaryWildcard(response.headers.get('vary')))throw Error();
   const reader=response.body.getReader(),chunks=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>(url.searchParams.has('media')?150000:131072))throw Error();chunks.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(response.status!==200)return reply([400,404,503].includes(response.status)?response.status:502,{error:{code:'CONTENT_UNAVAILABLE'}});
   const keys=(o,list)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===list.sort().join(',');
   if(url.searchParams.has('media')){const m=data?.media;if(!keys(data,['media'])||!keys(m,['id','mime','data','width','height'])||m.id!==url.searchParams.get('media')||!/^[a-f0-9]{64}$/.test(m.id)||m.mime!=='image/jpeg'||typeof m.data!=='string'||m.data.length>131072||!/^[A-Za-z0-9+/]+={0,2}$/.test(m.data)||![m.width,m.height].every(n=>Number.isInteger(n)&&n>=1&&n<=1600))throw Error();return reply(200,data)}
   if(!keys(data,['home','posts'])||!data.home||typeof data.home!=='object'||Array.isArray(data.home)||Object.entries(data.home).some(([k,v])=>!Object.hasOwn(HOME_SLOTS,k)||typeof v!=='string'||v.length>HOME_SLOTS[k].max)||!Array.isArray(data.posts)||data.posts.length>20)throw Error();
   for(const p of data.posts)if(!keys(p,[...(url.searchParams.has('slug')?['slug','title','summary','body','publishedAt']:['slug','title','summary','publishedAt']),...(p.cover!==undefined?['cover']:[])])||typeof p.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||typeof p.title!=='string'||p.title.length>160||typeof p.summary!=='string'||p.summary.length>500||typeof p.publishedAt!=='string'||p.publishedAt.length>64||p.body!==undefined&&(typeof p.body!=='string'||p.body.length>20000)||p.cover!==undefined&&!validLayoutImage(p.cover))throw Error();
   for(const p of data.posts)if(p.body!==undefined)decodeBlogLayout(p.body);
   return reply(200,{...data,posts:data.posts.map(p=>p.body===undefined?p:compatibleArticle(p))});
  }catch(error){return reply([400,404,429,503].includes(error?.status)?error.status:502,{error:{code:'CONTENT_UNAVAILABLE'}})}
 };
}
