import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './account-read.mjs';
import {HOME_SLOTS} from '../../core/content-contract.js';
const PATH='/api/v2/content/feed';
export function createContentHandler({env={},fetchImpl=fetch}={}){
 return async(req,res)=>{
  if(!req.url?.startsWith('/api/v2/content/'))return false;
  const reply=(status,data)=>{const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store',vary:'*','x-content-type-options':'nosniff'});res.end(body);return true};
  try{
   if(env.CONTENT_PROXY_ENABLED!=='true'||env.PRIVATE_GATEWAY_CONFIRMED!=='true')return reply(503,{error:{code:'CONTENT_UNAVAILABLE'}});
   const url=new URL(req.url,GATEWAY_ORIGIN);
   if(req.method!=='GET'||url.pathname!==PATH||req.url.split('?')[0]!==PATH||req.headers.host!==new URL(GATEWAY_ORIGIN).host)return reply(404,{error:{code:'NOT_FOUND'}});
   if([...url.searchParams.keys()].some(k=>k!=='slug')||url.searchParams.getAll('slug').length>1)return reply(400,{error:{code:'INVALID_INPUT'}});
   const response=await fetchImpl(WORKER_ORIGIN+req.url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),headers:{accept:'application/json'}});
   if(!response.headers.get('content-type')?.startsWith('application/json')||response.headers.has('set-cookie')||response.headers.get('cache-control')!=='no-store'||response.headers.get('vary')!=='*')throw Error();
   const reader=response.body.getReader(),chunks=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>131072)throw Error();chunks.push(value)}}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(response.status!==200)return reply([400,404,503].includes(response.status)?response.status:502,{error:{code:'CONTENT_UNAVAILABLE'}});
   const keys=(o,list)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===list.sort().join(',');
   if(!keys(data,['home','posts'])||!data.home||typeof data.home!=='object'||Array.isArray(data.home)||Object.entries(data.home).some(([k,v])=>!Object.hasOwn(HOME_SLOTS,k)||typeof v!=='string'||v.length>HOME_SLOTS[k].max)||!Array.isArray(data.posts)||data.posts.length>20)throw Error();
   for(const p of data.posts)if(!keys(p,url.searchParams.has('slug')?['slug','title','summary','body','publishedAt']:['slug','title','summary','publishedAt'])||typeof p.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||typeof p.title!=='string'||p.title.length>160||typeof p.summary!=='string'||p.summary.length>500||typeof p.publishedAt!=='string'||p.publishedAt.length>64||p.body!==undefined&&(typeof p.body!=='string'||p.body.length>20000))throw Error();
   return reply(200,data);
  }catch{return reply(502,{error:{code:'CONTENT_UNAVAILABLE'}})}
 };
}
