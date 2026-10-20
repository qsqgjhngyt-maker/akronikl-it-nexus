import assert from 'node:assert/strict';
import {createContentHandler} from './bff/content.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';
const env={CONTENT_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true'},host=new URL(GATEWAY_ORIGIN).host;
let calls=0,tests=0;
const valid={home:{title:'Nexus'},posts:[{slug:'synthetic',title:'Title',summary:'Summary',publishedAt:new Date().toISOString()}]};
const upstream=async(url,options)=>{calls++;assert.equal(url,WORKER_ORIGIN+'/api/v2/content/feed');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(Object.keys(options.headers).join(','),'accept');return Response.json(valid,{headers:{'cache-control':'no-store',vary:'*'}})};
async function invoke({path='/api/v2/content/feed',method='GET',headers={host},override={},fetchImpl=upstream}={}){
 const req={url:path,method,headers},res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}};
 await createContentHandler({env:{...env,...override},fetchImpl})(req,res);if(res.headers){assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');assert.equal(res.headers['set-cookie'],undefined)}return res;
}
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
await check('public feed returns only published DTO and forwards no browser credentials',async()=>{
 const r=await invoke({headers:{host,cookie:'SYNTHETIC_NOT_FORWARDED',authorization:'SYNTHETIC_NOT_FORWARDED'}});assert.equal(r.status,200);assert.deepEqual(r.body,valid);
});
await check('default-off, wrong host/method and duplicate query stay closed before upstream',async()=>{
 for(const options of [{override:{CONTENT_PROXY_ENABLED:undefined}},{override:{PRIVATE_GATEWAY_CONFIRMED:'false'}},{headers:{host:'synthetic.invalid'}},{method:'POST'},{path:'/api/v2/content/feed?slug=a&slug=b'},{path:'/api/v2/content/feed?token=synthetic'}]){
  const before=calls;assert.ok((await invoke(options)).status>=400);assert.equal(calls,before);
 }
});
await check('Set-Cookie/cache mistakes, unknown fields and unknown home slots cannot pass the BFF',async()=>{
 for(const [data,headers]of [[valid,{'cache-control':'no-store',vary:'*','set-cookie':'synthetic'}],[valid,{'cache-control':'public',vary:'*'}],[{...valid,sessionSecret:'SYNTHETIC'}, {'cache-control':'no-store',vary:'*'}],[{home:{constructor:'SYNTHETIC'},posts:[]},{'cache-control':'no-store',vary:'*'}],[{...valid,posts:[{...valid.posts[0],accessToken:'SYNTHETIC'}]},{'cache-control':'no-store',vary:'*'}]]){
  const r=await invoke({fetchImpl:async()=>Response.json(data,{headers})});assert.equal(r.status,502);
 }
});
console.log(JSON.stringify({status:'PASS',tests,cloudRequests:0,realCredentials:false}));
