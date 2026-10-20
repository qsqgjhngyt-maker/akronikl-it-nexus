import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {controlFixture} from '../tests/helpers/control-fixture.mjs';
import {createAccountControlHandler} from './bff/account-control.mjs';
import {GATEWAY_ORIGIN} from './bff/account-read.mjs';
import {handleAdminService} from './worker/admin-service.mjs';
const f=await controlFixture(),base='/api/v2/account/control';
const env={...f.env,ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',YANDEX_CLIENT_ID:'synthetic-yandex',YANDEX_CLIENT_SECRET:'SYNTHETIC_SECRET_ONLY'};
let calls=0,tests=0;
function request({path=base+'/users',method='GET',body,actor=f.owner,headers={},duplicate}={}){
 const h={host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+actor.secret,'x-nexus-account-expectation':actor.id,...(method==='POST'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-account-control':'1','sec-fetch-site':'same-origin'}:{}),...headers};
 for(const key of Object.keys(h))if(h[key]===undefined)delete h[key];
 const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
 Object.assign(req,{url:path,method,headers:h,rawHeaders:Object.entries(h).flat()});
 if(duplicate)req.rawHeaders.push(...duplicate);return req;
}
const fetchImpl=async(url,options)=>{
 calls++;assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
 const h=new Headers(options.headers);assert.equal(h.has('cookie'),false);assert.equal(h.has('authorization'),false);
 assert.equal(options.body.includes(f.owner.secret),false);
 return handleAdminService(new Request(url,options),f.env);
};
async function invoke(req,overrides={},impl=fetchImpl){
 const handler=createAccountControlHandler({env:{...env,...overrides},fetchImpl:impl});
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}};
 const handled=await handler(req,res);
 if(handled){assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');assert.equal(res.headers['set-cookie'],undefined)}
 return {...res,handled};
}
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
try{
 await check('actual private BFF/Worker returns authorized list; only session hash crosses boundary',async()=>{
  const result=await invoke(request());assert.equal(result.status,200);assert.equal(result.body.users.length,1);
  assert.equal(result.body.users[0].protected,true);assert.equal(JSON.stringify(result.body).includes(f.owner.secret),false);
 });
 await check('default OFF and missing V3/private flags deny before upstream',async()=>{
  for(const override of [{ACCOUNT_CONTROL_PROXY_ENABLED:'false'},{PRIVATE_GATEWAY_CONFIRMED:'false'},{COOKIE_INGRESS_V3_ENABLED:'false'},{ADMIN_SERVICE_KEY:undefined}]){
   const before=calls;const result=await invoke(request(),override);assert.ok(result.status>=400);assert.equal(calls,before);
  }
 });
 await check('absent/duplicate/split/malformed Cookie and forged context never authorize',async()=>{
  for(const options of [
   {headers:{cookie:undefined}},
   {headers:{cookie:'__Host-nexus_session=synthetic-invalid'}},
   {headers:{cookie:'__Host-nexus_session='+f.owner.secret+'; __Host-nexus_session='+f.owner.secret}},
   {duplicate:['Cookie','__Host-nexus_session='+f.owner.secret]},
   {headers:{'x-yc-apigateway-operation-context':Buffer.from('{"passkeyIngressContract":"v3"}').toString('base64')}},
   {duplicate:['x-yc-apigateway-operation-context',Buffer.from('{"accountControlContract":"v3"}').toString('base64')]}
  ]){const before=calls;const result=await invoke(request(options));assert.equal(result.status,401);assert.equal(calls,before)}
 });
 await check('Host/Origin/authorization and duplicate expectation headers are rejected locally',async()=>{
  for(const options of [{headers:{host:'synthetic.invalid'}},{headers:{origin:'https://synthetic.invalid'}},{headers:{authorization:''}},{duplicate:['x-nexus-account-expectation',f.owner.id]},{headers:{'x-nexus-account-expectation':'../bad'}}]){
   const before=calls;assert.ok((await invoke(request(options))).status>=400);assert.equal(calls,before);
  }
 });
 await check('write CSRF, duplicate content type and noncanonical duplicate JSON are rejected',async()=>{
  for(const options of [
   {headers:{origin:undefined}},
   {duplicate:['content-type','application/json']},
   {headers:{'x-nexus-account-control':'0'}},
   {headers:{'sec-fetch-site':'cross-site'}},
   {body:'{"requestId":"synthetic","ttlMinutes":60,"ttlMinutes":120}'},
   {body:'[]'}
  ]){
   const before=calls;const result=await invoke(request({path:base+'/invites',method:'POST',body:{requestId:crypto.randomUUID(),ttlMinutes:60},...options}));assert.ok(result.status>=400);assert.equal(calls,before);
  }
 });
 const learner=f.seed('synthetic-user',{username:'tester.one'});
 await check('ordinary session and captured account mismatch remain closed across BFF',async()=>{
  const denied=await invoke(request({actor:learner}));assert.equal(denied.status,403);
  const changed=await invoke(request({headers:{'x-nexus-account-expectation':learner.id}}));assert.equal(changed.status,401);assert.equal(changed.body.error.code,'ACCOUNT_SESSION_CHANGED');
 });
 await check('provider readiness discloses only missing setting names and fixed callback URLs',async()=>{
  const result=await invoke(request({path:base+'/providers'}));assert.equal(result.status,200);
  assert.deepEqual(result.body.providers.map(p=>[p.id,p.configured]),[['yandex',true],['google',false],['vk',false]]);
  assert.deepEqual(result.body.providers[1].missing,['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']);
  assert.equal(JSON.stringify(result.body).includes(env.YANDEX_CLIENT_SECRET),false);
  assert.equal(result.body.providers.some(p=>p.id==='apple'),false);
 });
 await check('upstream Set-Cookie, cache errors, redirects and credential-bearing DTOs fail closed',async()=>{
  for(const variant of ['cookie','cache','redirect','extra']){
   const impl=async()=>new Response(JSON.stringify({canManage:true,canPurge:true,freshPasskey:true,...(variant==='extra'?{sessionSecret:'SYNTHETIC_NEVER_EXPOSE'}:{})}),{status:variant==='redirect'?302:200,headers:{'content-type':'application/json','cache-control':variant==='cache'?'public':'no-store','vary':'*',...(variant==='cookie'?{'set-cookie':'synthetic=only'}:{})}});
   const result=await invoke(request({path:base+'/capabilities'}),{},impl);assert.equal(result.status,502);assert.equal(JSON.stringify(result.body).includes('SYNTHETIC_NEVER_EXPOSE'),false);
  }
 });
 await check('own profile endpoint does not accept another account selector',async()=>{
  assert.equal((await invoke(request({path:'/api/v2/account/profile',actor:learner}))).status,200);
  const before=calls,result=await invoke(request({path:'/api/v2/account/profile?accountId='+f.owner.id,actor:learner}));assert.equal(result.status,400);assert.equal(calls,before);
 });
 console.log(JSON.stringify({status:'PASS',tests,realCredentials:false,networkRequests:0,productionWrites:0}));
}finally{f.close()}
