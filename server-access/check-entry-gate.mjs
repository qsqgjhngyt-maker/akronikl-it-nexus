// Только синтетические req/res/fetch: без listen(), браузера, аккаунтов и сети.
import assert from 'node:assert/strict';
import {createHash, createHmac} from 'node:crypto';
import {createEntryGateHandler, ENTRY_SHELL_URL} from './bff/entry-gate.mjs';
import {GATEWAY_ORIGIN, WORKER_ORIGIN} from './bff/account-read.mjs';
import {verifyAccountServiceRequest} from './worker/account-service-auth.js';

const session = 'nxs_' + 'A'.repeat(43);
const key = 'SYNTHETIC_ACCOUNT_SERVICE_KEY_ONLY_20261019';
const landing = Buffer.from('<!doctype html><p>SYNTHETIC_PUBLIC_LANDING</p>');
const shell = Buffer.from('<!doctype html><p>SYNTHETIC_AUTHENTICATED_SHELL</p>');
const internal = '/api/v2/account/internal/read';
const env = {NEXUS_ENTRY_GATE_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',ACCOUNT_READ_ENABLED:'true',ACCOUNT_SERVICE_KEY:key};
const dto = () => ({
  account:{accountId:'synthetic-account',displayName:'Synthetic',status:'active'},
  loginMethods:[{id:'synthetic-key',kind:'passkey',status:'active',createdAt:'2026-10-19T00:00:00.000Z',disabledAt:null}],
  enrollmentAvailable:false
});
const context = value => Buffer.from(JSON.stringify({accountReadContract:'v1',sessionCookie:value})).toString('base64');
function request({path='/',method='GET',credential=session,headers={},rawHeaders}={}) {
  const normalized={host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':context(credential),...headers};
  return {url:path,method,headers:normalized,rawHeaders:rawHeaders||Object.entries(normalized).flat()};
}
function response() {
  return {headersSent:false,status:null,headers:null,body:null,
    writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true},
    end(body){this.body=body===undefined?Buffer.alloc(0):Buffer.from(body)}};
}
let tests=0,accountCalls=0,shellCalls=0;
const allNonces=new Set();
function assertNoStore(res) {
  assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.headers.Vary,'*');
  assert.equal(res.headers['X-Content-Type-Options'],'nosniff');
  assert.ok(!res.headers['Set-Cookie']);
}
function makeFetch({account=()=>Response.json(dto()),html=()=>new Response(shell,{headers:{'content-type':'text/html; charset=utf-8'}})}={}) {
  return async(url,options)=>{
    assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
    assert.ok(options.signal instanceof AbortSignal);assert.equal(options.signal.aborted,false);
    const headers=new Headers(options.headers);
    assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);
    if(url===WORKER_ORIGIN+internal){
      accountCalls++;
      assert.equal(options.method,'POST');
      assert.ok(Buffer.byteLength(options.body)<=1024);
      assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),['path','sessionHash']);
      assert.deepEqual(JSON.parse(options.body),{path:'/api/v2/account',sessionHash:createHash('sha256').update(session).digest('hex')});
      assert.equal(options.body.includes(session),false);
      const timestamp=headers.get('x-nexus-service-timestamp'),nonce=headers.get('x-nexus-service-nonce');
      assert.match(timestamp,/^\d{13}$/);assert.ok(Math.abs(Date.now()-Number(timestamp))<=30000);
      assert.match(nonce,/^[a-f0-9]{32}$/);assert.equal(allNonces.has(nonce),false);allNonces.add(nonce);
      const digest=createHash('sha256').update(options.body).digest('hex');
      assert.equal(headers.get('x-nexus-service-signature'),createHmac('sha256',key).update(`v1\nPOST\n${internal}\n${timestamp}\n${nonce}\n${digest}`).digest('hex'));
      const verified=await verifyAccountServiceRequest(new Request(url,options),{
        ACCOUNT_SERVICE_KEY:key,ACCOUNT_INTERNAL_READ_ENABLED:'true',
        DB:{prepare(sql){assert.match(sql,/INSERT INTO account_service_nonces/);return{bind(actualNonce,expiresAt){assert.equal(actualNonce,nonce);assert.equal(expiresAt,new Date(Number(timestamp)+30000).toISOString());return{async run(){return{success:true,meta:{changes:1}}}}}}}}
      });
      assert.deepEqual(verified,{ok:true,path:'/api/v2/account',sessionHash:JSON.parse(options.body).sessionHash});
      return account();
    }
    shellCalls++;
    assert.equal(url,ENTRY_SHELL_URL);assert.equal(new URL(url).protocol,'https:');
    assert.equal(options.method,'GET');assert.deepEqual([...headers.entries()],[['accept','text/html']]);
    assert.equal(Object.hasOwn(options,'body'),false);
    return html();
  };
}
async function run(req,options={}) {
  const res=response();
  const handled=await createEntryGateHandler({env,landingBody:landing,fetchImpl:makeFetch(),...options})(req,res);
  if(handled)assertNoStore(res);
  return {handled,res};
}
async function check(name,fn){await fn();tests++;console.log('PASS '+name)}

await check('существующий HMAC verifier отклоняет tamper, replay и выход за bounds',async()=>{
  const seen=new Set();
  const verifierEnv={
    ACCOUNT_SERVICE_KEY:key,ACCOUNT_INTERNAL_READ_ENABLED:'true',
    DB:{prepare(){return{
      bind(nonce){return{
        async run(){
          if(seen.has(nonce))return{success:true,meta:{changes:0}};
          seen.add(nonce);return{success:true,meta:{changes:1}};
        }
      }}
    }}}
  };
  function signed({method='POST',path=internal,timestamp=String(Date.now()),nonce='b'.repeat(32),payload={path:'/api/v2/account',sessionHash:createHash('sha256').update(session).digest('hex')},headers={}}={}){
    const body=JSON.stringify(payload);
    const digest=createHash('sha256').update(body).digest('hex');
    const signature=createHmac('sha256',key).update(`v1\nPOST\n${internal}\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    return new Request(WORKER_ORIGIN+path,{method,...(method==='GET'?{}:{body}),headers:{'content-type':'application/json','x-nexus-service-timestamp':timestamp,'x-nexus-service-nonce':nonce,'x-nexus-service-signature':signature,...headers}});
  }
  const accepted=await verifyAccountServiceRequest(signed(),verifierEnv);assert.equal(accepted.ok,true);
  const replay=await verifyAccountServiceRequest(signed(),verifierEnv);assert.equal(replay.ok,false);
  for(const variation of [
    {method:'GET'},{path:internal+'?unexpected=1'},{path:'/wrong'},
    {timestamp:String(Date.now()-31000)},{timestamp:'123'},{nonce:'a'.repeat(31)},
    {headers:{cookie:'synthetic=only'}},{headers:{authorization:'Bearer synthetic-only'}},
    {headers:{'x-nexus-service-signature':'0'.repeat(64)}},
    {payload:{path:'/forbidden',sessionHash:'a'.repeat(64)}},
    {payload:{path:'/api/v2/account',sessionHash:'a'.repeat(63)}},
    {payload:{path:'/api/v2/account',sessionHash:'a'.repeat(64),accountId:'forbidden'}},
    {payload:{path:'/api/v2/account',sessionHash:'a'.repeat(1025)}}
  ])assert.equal((await verifyAccountServiceRequest(signed(variation),verifierEnv)).ok,false);
});
await check('flag OFF и посторонние пути не изменяют прежний handler',async()=>{
  let calls=0;const untouched=()=>{calls++;throw Error('Не должен вызываться')};
  for(const [req,override] of [[request(),{...env,NEXUS_ENTRY_GATE_ENABLED:'false'}],[request({path:'/other'}),env]]){
    const {handled,res}=await run(req,{env:override,fetchImpl:untouched});
    assert.equal(handled,false);assert.equal(res.headersSent,false);assert.equal(res.body,null);
  }assert.equal(calls,0);
});
await check('anonymous, invalid context, hints и неоднозначные Cookie не раскрывают shell',async()=>{
  const before=[accountCalls,shellCalls];
  for(const req of [
    request({credential:'-'}),request({headers:{'x-yc-apigateway-operation-context':'not-base64'}}),
    request({headers:{'x-yc-apigateway-operation-context':context('-'),'x-account-id':'synthetic-account','x-user-role':'admin'}}),
    request({headers:{cookie:`__Host-nexus_session=${session}; __Host-nexus_session=${session}`}}),
    request({headers:{cookie:'__Host-nexus_session=nxs_'+'B'.repeat(43)}}),
    request({rawHeaders:['host',new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context',context(session),'x-yc-apigateway-operation-context',context(session)]}),
    request({rawHeaders:['host',new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context',context(session),'cookie',`__Host-nexus_session=${session}`,'cookie',`__Host-nexus_session=${session}`],headers:{cookie:`__Host-nexus_session=${session}`}})
  ]){
    const {res}=await run(req);assert.equal(res.status,200);assert.deepEqual(res.body,landing);
  }
  const {res}=await run(request({path:'/nexus-shell.html',credential:'-'}));assert.equal(res.status,401);assert.equal(res.body.includes(shell),false);
  assert.deepEqual([accountCalls,shellCalls],before);
});
await check('неверный Host, Origin, method и query закрыты до upstream',async()=>{
  const before=[accountCalls,shellCalls];
  for(const [req,status] of [
    [request({headers:{host:'attacker.invalid'}}),403],
    [request({rawHeaders:['host',new URL(GATEWAY_ORIGIN).host,'host',new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context',context(session)]}),403],
    [request({headers:{origin:'https://attacker.invalid'}}),403],
    [request({headers:{authorization:'Bearer synthetic-only'}}),403],
    [request({method:'POST'}),405],[request({path:'/index.html?hint=admin'}),400]
  ]){const {res}=await run(req);assert.equal(res.status,status);assert.equal(res.body.includes(shell),false)}
  assert.deepEqual([accountCalls,shellCalls],before);
});
await check('private IAM prerequisite, Account flag и service key обязательны',async()=>{
  const before=[accountCalls,shellCalls];
  for(const override of [{...env,PRIVATE_GATEWAY_CONFIRMED:'false'},{...env,ACCOUNT_READ_ENABLED:'false'},{...env,ACCOUNT_SERVICE_KEY:''}]){
    const {res}=await run(request(),{env:override});assert.equal(res.status,503);assert.equal(res.body.includes(shell),false);
  }assert.deepEqual([accountCalls,shellCalls],before);
});
await check('expired/revoked/denied session не загружает HTML shell',async()=>{
  const before=shellCalls;
  for(const status of [401,403])for(const path of ['/','/index.html','/nexus-shell.html']){
    const {res}=await run(request({path}),{fetchImpl:makeFetch({account:()=>Response.json({error:{code:'SYNTHETIC_DENIED'}},{status})})});
    assert.equal(res.status,path==='/nexus-shell.html'?status:200);
    if(path!=='/nexus-shell.html')assert.deepEqual(res.body,landing);else assert.equal(res.body.includes(shell),false);
  }assert.equal(shellCalls,before);
});
await check('Account 503, network failure и invalid DTO закрыты с 502',async()=>{
  const before=shellCalls;
  const invalid=[
    null,{...dto(),account:{...dto().account,status:'disabled'}},{...dto(),enrollmentAvailable:true},
    {...dto(),roles:['admin']},{...dto(),loginMethods:[]},
    {...dto(),loginMethods:[{...dto().loginMethods[0],status:'disabled',disabledAt:'2026-10-19'}]},
    {...dto(),account:{...dto().account,accountId:''}},
    {...dto(),loginMethods:[dto().loginMethods[0],dto().loginMethods[0]]}
  ];
  for(const account of [()=>Response.json({error:'unavailable'},{status:503}),()=>{throw Error('SYNTHETIC_NETWORK_FAILURE')},...invalid.map(value=>()=>Response.json(value)),()=>new Response('<html>not json</html>',{headers:{'content-type':'text/html'}}),()=>new Response('x'.repeat(65537),{headers:{'content-type':'application/json'}})]){
    const {res}=await run(request(),{fetchImpl:makeFetch({account})});assert.equal(res.status,502);assert.equal(res.body.includes(shell),false);
  }assert.equal(shellCalls,before);
});
await check('только активный DTO разрешает фиксированный публичный HTTPS shell',async()=>{
  for(const path of ['/','/index.html','/nexus-shell.html']){
    const {handled,res}=await run(request({path,headers:{cookie:`__Host-nexus_session=${session}`,origin:GATEWAY_ORIGIN}}));
    assert.equal(handled,true);assert.equal(res.status,200);assert.deepEqual(res.body,shell);assert.equal(res.headers['Content-Length'],shell.length);
  }
});
await check('HEAD сохраняет статус/длину и никогда не возвращает тело',async()=>{
  const anonymous=await run(request({method:'HEAD',credential:'-'}));assert.equal(anonymous.res.status,200);assert.equal(anonymous.res.body.length,0);assert.equal(anonymous.res.headers['Content-Length'],landing.length);
  const authenticated=await run(request({method:'HEAD',path:'/nexus-shell.html'}));assert.equal(authenticated.res.status,200);assert.equal(authenticated.res.body.length,0);assert.equal(authenticated.res.headers['Content-Length'],shell.length);
});
await check('раскрытый Node fetch gzip HTML ограничивается decoded bytes',async()=>{
  const {res}=await run(request(),{fetchImpl:makeFetch({html:()=>new Response(shell,{headers:{'content-type':'text/html','content-encoding':'gzip','content-length':'20'}})})});
  assert.equal(res.status,200);assert.deepEqual(res.body,shell);assert.equal(res.headers['Content-Length'],shell.length);
  const oversized=await run(request(),{fetchImpl:makeFetch({html:()=>new Response(Buffer.alloc(256*1024+1,65),{headers:{'content-type':'text/html','content-encoding':'gzip','content-length':'20'}})})});
  assert.equal(oversized.res.status,502);
});
await check('ошибки GitHub, redirect, MIME и HTML >256KB закрыты',async()=>{
  for(const html of [
    ()=>new Response('not found',{status:404}),
    ()=>new Response('',{status:302,headers:{location:'https://attacker.invalid'}}),
    ()=>new Response(shell,{headers:{'content-type':'application/json'}}),
    ()=>new Response(Buffer.alloc(256*1024+1,65),{headers:{'content-type':'text/html'}}),
    ()=>new Response(shell,{headers:{'content-type':'text/html','content-length':String(256*1024+1)}}),
    ()=>new Response(shell,{headers:{'content-type':'text/html','content-length':String(shell.length+1)}}),
    ()=>{throw Error('SYNTHETIC_GITHUB_FAILURE')}
  ]){const {res}=await run(request(),{fetchImpl:makeFetch({html})});assert.equal(res.status,502);assert.equal(res.body.includes(shell),false)}
  const exact=Buffer.alloc(256*1024,65);
  const {res}=await run(request(),{fetchImpl:makeFetch({html:()=>new Response(exact,{headers:{'content-type':'text/html'}})})});assert.equal(res.status,200);assert.deepEqual(res.body,exact);
});
console.log(JSON.stringify({status:'PASS',tests,syntheticAccountRequests:accountCalls,syntheticShellRequests:shellCalls,networkRequests:0,serversStarted:0,browsersStarted:0,userDataAccessed:false,publicSourceRemainsPublic:true}));
