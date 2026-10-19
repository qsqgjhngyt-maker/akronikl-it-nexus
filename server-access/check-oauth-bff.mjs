// Только mocked HTTPS/req/res; RSA signature проверяется настоящим crypto.verify.
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash,createHmac,generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {createOAuthHandler} from './bff/oauth.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';
import {configuredOAuthProviders,oauthCallbackURL} from './bff/oauth-providers.mjs';
const INTERNAL='/api/v2/account/internal/oauth',PREFIX='/api/v2/account/oauth/';
const sha=value=>createHash('sha256').update(value).digest('hex');
const key='SYNTHETIC_OAUTH_SERVICE_KEY_ONLY_20261019';
const session='nxs_'+'S'.repeat(43),accessToken='SYNTHETIC_PROVIDER_ACCESS_TOKEN',refreshToken='SYNTHETIC_PROVIDER_REFRESH_TOKEN';
const sessionB='nxs_'+'T'.repeat(43),accountA='synthetic-account-a',accountB='synthetic-account-b';
const env={OAUTH_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',OAUTH_SERVICE_KEY:key,
 GOOGLE_CLIENT_ID:'synthetic.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'SYNTHETIC_GOOGLE_SECRET',
 YANDEX_CLIENT_ID:'synthetic-yandex-client',YANDEX_CLIENT_SECRET:'SYNTHETIC_YANDEX_SECRET',VK_CLIENT_ID:'123456',MAILRU_CLIENT_ID:'configured-but-unsupported',MAILRU_CLIENT_SECRET:'SYNTHETIC_MAILRU_SECRET'};
const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),wrongRSA=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...rsa.publicKey.export({format:'jwk'}),kid:'synthetic-rsa',alg:'RS256',use:'sig'};
let tests=0;
function request({path=PREFIX+'providers',method='GET',body,flow=null,sessionValue=null,headers={},rawHeaders}={}){
 const normalized={host:new URL(GATEWAY_ORIGIN).host,'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({oauthIngressContract:'v1',sessionCookie:sessionValue||'-',oauthFlowCookie:flow||'-'})).toString('base64'),
  ...(method==='POST'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-oauth-request':'1','sec-fetch-site':'same-origin'}:{}),...headers};
 const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
 req.url=path;req.method=method;req.headers=normalized;req.rawHeaders=rawHeaders||Object.entries(normalized).flat();return req;
}
const response=()=>({headersSent:false,status:null,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true},end(body){this.body=body||''}});
function fixture(settings={}){
 const transactions=new Map(),nonces=new Set(),calls=[],completed=[];let lastClaim=null;
 function jwt(){
  const seconds=Math.floor(Date.now()/1000),claims={iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,azp:env.GOOGLE_CLIENT_ID,sub:'synthetic-google-sub',iat:seconds,exp:seconds+3600,nonce:lastClaim.nonce,email:'synthetic@gmail.com',email_verified:true,name:'Synthetic user',...settings.claims};
  const header={alg:'RS256',kid:'synthetic-rsa',typ:'JWT',...settings.jwtHeader};
  const input=Buffer.from(JSON.stringify(header)).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url');
  return input+'.'+sign('RSA-SHA256',Buffer.from(input),settings.wrongSigningKey?wrongRSA.privateKey:rsa.privateKey).toString('base64url');
 }
 const fetchImpl=async(url,options)=>{
  const target=new URL(url),headers=new Headers(options.headers);calls.push({origin:target.origin,path:target.pathname});
  assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
  assert.equal(headers.has('cookie'),false);
  if(url===WORKER_ORIGIN+INTERNAL){
   assert.equal(options.method,'POST');assert.equal(headers.has('authorization'),false);
   const timestamp=headers.get('x-nexus-service-timestamp'),nonce=headers.get('x-nexus-service-nonce');
   assert.match(timestamp,/^\d{13}$/);assert.ok(Math.abs(Number(timestamp)-Date.now())<30000);assert.match(nonce,/^[a-f0-9]{32}$/);assert.equal(nonces.has(nonce),false);nonces.add(nonce);
   assert.equal(headers.get('x-nexus-service-signature'),createHmac('sha256',key).update(`v1\nPOST\n${INTERNAL}\n${timestamp}\n${nonce}\n${sha(options.body)}`).digest('hex'));
   assert.equal(options.body.includes(session),false);const data=JSON.parse(options.body);
   if(data.op==='begin'){
    assert.deepEqual(Object.keys(data).sort(),['op','provider','intent','stateHash','flowHash','codeVerifier','nonce',...(data.intent==='link'?['sessionHash','expectedAccountId']:[])].sort());
    assert.match(data.stateHash,/^[a-f0-9]{64}$/);assert.match(data.flowHash,/^[a-f0-9]{64}$/);assert.match(data.codeVerifier,/^[A-Za-z0-9_-]{43}$/);assert.match(data.nonce,/^[A-Za-z0-9_-]{43}$/);
    if(data.intent==='link'){
     const actor=data.sessionHash===sha(session)?accountA:data.sessionHash===sha(sessionB)?accountB:null;
     assert.ok(actor);assert.match(data.expectedAccountId,/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/);
     if(actor!==data.expectedAccountId)return Response.json({error:{code:'ACCOUNT_SESSION_CHANGED'}},{status:401});
    }
    const row={...data,txId:randomUUID(),claimed:false};transactions.set(data.stateHash,row);
    return Response.json({ok:true,txId:row.txId,expiresAt:new Date(Date.now()+600000).toISOString()});
   }
   if(data.op==='claim'){
    assert.deepEqual(Object.keys(data).sort(),['flowHash','op','provider','stateHash']);
    const row=transactions.get(data.stateHash);
    if(!row||row.claimed||row.flowHash!==data.flowHash||row.provider!==data.provider)return Response.json({error:{code:'TRANSACTION_REJECTED'}},{status:401});
    row.claimed=true;lastClaim=row;return Response.json({ok:true,txId:row.txId,codeVerifier:row.codeVerifier,nonce:row.nonce,intent:row.intent});
   }
   assert.equal(data.op,'complete');assert.equal(data.txId,lastClaim.txId);assert.equal(data.flowHash,lastClaim.flowHash);
   assert.deepEqual(Object.keys(data).sort(),['flowHash','op','profile','txId']);
   assert.deepEqual(Object.keys(data.profile).sort(),['displayName','email','emailVerified','issuer','subject']);completed.push(data.profile);
   if(settings.denyComplete)return Response.json({error:{code:'OWNER_EMAIL_REQUIRED'}},{status:403});
   return Response.json({ok:true,sessionSecret:session});
  }
  assert.equal(headers.get('x-nexus-service-signature'),null);
  if(settings.providerRedirect)return new Response('',{status:302,headers:{location:'https://attacker.invalid'}});
  if(settings.providerFailure)throw Error('SYNTHETIC_NETWORK_FAILURE');
  if(url==='https://oauth2.googleapis.com/token'){
   const body=new URLSearchParams(options.body);assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('client_secret'),env.GOOGLE_CLIENT_SECRET);assert.equal(body.get('code_verifier'),lastClaim.codeVerifier);assert.equal(body.get('redirect_uri'),oauthCallbackURL('google'));
   assert.equal(headers.has('authorization'),false);
   return Response.json({token_type:'Bearer',expires_in:3600,access_token:accessToken,refresh_token:refreshToken,id_token:jwt(),...settings.token});
  }
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:settings.jwks||[jwk]});
  if(url==='https://oauth.yandex.ru/token'){
   const body=new URLSearchParams(options.body);assert.equal(body.get('client_secret'),env.YANDEX_CLIENT_SECRET);assert.equal(body.get('code_verifier'),lastClaim.codeVerifier);
   return Response.json({token_type:'bearer',expires_in:31536000,access_token:accessToken,...settings.token});
  }
  if(url==='https://login.yandex.ru/info?format=json'){
   assert.equal(headers.get('authorization'),'OAuth '+accessToken);assert.equal(target.searchParams.has('oauth_token'),false);
   return Response.json({id:'synthetic-yandex-sub',client_id:env.YANDEX_CLIENT_ID,login:'synthetic',default_email:'synthetic@yandex.ru',real_name:'Synthetic Yandex',...settings.yandexUser});
  }
  if(target.origin==='https://id.vk.ru'&&target.pathname==='/oauth2/auth'){
   assert.equal(target.searchParams.get('grant_type'),'authorization_code');assert.equal(target.searchParams.get('code_verifier'),lastClaim.codeVerifier);assert.equal(target.searchParams.get('device_id'),'synthetic-device');
   assert.equal(new URLSearchParams(options.body).get('code'),'synthetic-code');assert.equal(target.searchParams.has('access_token'),false);
   return Response.json({access_token:accessToken,refresh_token:refreshToken,token_type:'Bearer',expires_in:3600,user_id:123456,state:target.searchParams.get('state'),...settings.token});
  }
  if(target.origin==='https://id.vk.ru'&&target.pathname==='/oauth2/user_info'){
   assert.equal(new URLSearchParams(options.body).get('access_token'),accessToken);assert.equal(target.searchParams.has('access_token'),false);
   return Response.json({user:{user_id:'123456',email:'synthetic@vk.invalid',first_name:'Synthetic',last_name:'VK',...settings.vkUser}});
  }
  throw Error('UNEXPECTED_SYNTHETIC_ENDPOINT');
 };
 return{handler:createOAuthHandler({env,fetchImpl}),calls,completed,transactions};
}
async function invoke(handler,req){const res=response();const handled=await handler(req,res);if(handled){assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');assert.equal(res.headers['referrer-policy'],'no-referrer')}return{handled,res}};
async function start(f,provider='google',intent='login'){
 const {res}=await invoke(f.handler,request({path:PREFIX+provider+'/start',method:'POST',body:{intent},...(intent==='link'?{sessionValue:session,headers:{'x-nexus-oauth-account':accountA}}: {})}));assert.equal(res.status,200,JSON.stringify(res.body));
 const data=JSON.parse(res.body),url=new URL(data.authorizationURL);assert.equal(url.searchParams.get('response_type'),'code');assert.equal(url.searchParams.get('redirect_uri'),oauthCallbackURL(provider));
 assert.equal(url.searchParams.has('client_secret'),false);assert.equal(url.searchParams.has('code_verifier'),false);
 const cookie=res.headers['set-cookie'][0];assert.match(cookie,/; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600$/);
 return{state:url.searchParams.get('state'),flow:cookie.match(/^__Host-nexus_oauth_flow=([^;]+)/)[1],provider,authorizationURL:url.href};
}
function callback(flow,patch={}){
 const params=new URLSearchParams({code:'synthetic-code',state:flow.state,...(flow.provider==='vk'?{device_id:'synthetic-device'}:{}),...patch});
 return request({path:PREFIX+flow.provider+'/callback?'+params.toString(),flow:flow.flow,headers:{'sec-fetch-site':'cross-site',cookie:'__Host-nexus_oauth_flow='+flow.flow}});
}
const check=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};

await check('providers показывает только configured supported; Mail.ru отсутствует',async()=>{
 assert.deepEqual(configuredOAuthProviders({}),[]);assert.equal(configuredOAuthProviders(env).some(x=>x.id==='mailru'),false);
 const f=fixture(),{res}=await invoke(f.handler,request());assert.equal(res.status,200);assert.deepEqual(JSON.parse(res.body).providers.map(x=>x.id),['google','yandex','vk']);assert.equal(f.calls.length,0);
 const untouched=await invoke(f.handler,request({path:'/other'}));assert.equal(untouched.handled,false);assert.equal(untouched.res.headersSent,false);
 const disabled=createOAuthHandler({env:{}});assert.equal((await invoke(disabled,request())).res.status,503);
 const unconfigured=createOAuthHandler({env:{OAUTH_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',OAUTH_SERVICE_KEY:key}});assert.deepEqual(JSON.parse((await invoke(unconfigured,request())).res.body),{providers:[]});
 assert.equal((await invoke(f.handler,request({path:PREFIX+'mailru/start',method:'POST',body:{intent:'login'}}))).res.status,503);
});
await check('start защищён Host/Origin/write header и strict JSON',async()=>{
 const f=fixture();
 for(const req of [request({path:PREFIX+'google/start',method:'POST',body:{intent:'login'},headers:{origin:'https://attacker.invalid'}}),
  request({path:PREFIX+'google/start',method:'POST',body:{intent:'login'},headers:{host:'attacker.invalid'}}),
  request({path:PREFIX+'google/start',method:'POST',body:{intent:'login'},headers:{'x-nexus-oauth-request':'0'}}),
  request({path:PREFIX+'google/start',method:'POST',body:{intent:'login'},headers:{'sec-fetch-site':'cross-site'}})])assert.equal((await invoke(f.handler,req)).res.status,403);
 for(const body of [{intent:'login',accountId:'forbidden'},'{"intent":"login","intent":"link"}',[],{intent:'password'}])assert.equal((await invoke(f.handler,request({path:PREFIX+'google/start',method:'POST',body}))).res.status,400);
 assert.equal(f.calls.length,0);
 assert.equal((await invoke(f.handler,request({path:PREFIX+'google/start',method:'POST',body:{intent:'link'},headers:{'x-nexus-oauth-account':accountA}}))).res.status,401);
});
await check('cross-tab link требует exactly-one expectation и отклоняет cookie B/expected A',async()=>{
 const f=fixture(),path=PREFIX+'google/start';
 for(const headers of [{},{'x-nexus-oauth-account':'../invalid'}]){
  const before=f.calls.length;const {res}=await invoke(f.handler,request({path,method:'POST',body:{intent:'link'},sessionValue:session,headers}));assert.equal(res.status,400);assert.equal(f.calls.length,before);
 }
 const req=request({path,method:'POST',body:{intent:'link'},sessionValue:session,headers:{'x-nexus-oauth-account':accountA}});req.rawHeaders.push('x-nexus-oauth-account',accountA);
 assert.equal((await invoke(f.handler,req)).res.status,400);
 const changed=await invoke(f.handler,request({path,method:'POST',body:{intent:'link'},sessionValue:sessionB,headers:{'x-nexus-oauth-account':accountA}}));assert.equal(changed.res.status,401);assert.equal(JSON.parse(changed.res.body).error.code,'ACCOUNT_SESSION_CHANGED');assert.equal(changed.res.headers['set-cookie'],undefined);assert.equal(f.transactions.size,0);assert.equal(f.completed.length,0);assert.equal(f.calls.some(x=>x.origin!==WORKER_ORIGIN),false);
 const before=f.calls.length;
 assert.equal((await invoke(f.handler,request({path,method:'POST',body:{intent:'login'},headers:{'x-nexus-oauth-account':accountA}}))).res.status,400);assert.equal(f.calls.length,before);
});
await check('valid Google signature → только HttpOnly session cookie и fixed root',async()=>{
 const f=fixture(),flow=await start(f);const {res}=await invoke(f.handler,callback(flow));assert.equal(res.status,303,res.body);assert.equal(res.headers.location,GATEWAY_ORIGIN+'/');
 assert.equal(res.body,'');assert.match(res.headers['set-cookie'][0],/^__Host-nexus_session=nxs_[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200$/);assert.match(res.headers['set-cookie'][1],/SameSite=Lax; Max-Age=0$/);
 assert.equal(f.completed[0].emailVerified,true);assert.equal(f.completed[0].subject,'synthetic-google-sub');
 const visible=JSON.stringify({body:res.body,location:res.headers.location,authorizationURL:flow.authorizationURL});for(const secret of [accessToken,refreshToken,env.GOOGLE_CLIENT_SECRET,session])assert.equal(visible.includes(secret),false);
 assert.equal((await invoke(f.handler,callback(flow))).res.status,401);
});
await check('wrong state/flow/duplicate state прекращают callback до provider exchange',async()=>{
 for(const kind of ['state','flow','duplicate']){
  const f=fixture(),flow=await start(f);let req=callback(flow);
  if(kind==='state')req=callback(flow,{state:'Z'.repeat(43)});
  if(kind==='flow')req=request({path:req.url,flow:'nof_'+'Z'.repeat(43)});
  if(kind==='duplicate')req.url+='&state='+flow.state;
  const {res}=await invoke(f.handler,req);assert.ok([400,401].includes(res.status));assert.equal(f.calls.some(x=>x.origin==='https://oauth2.googleapis.com'),false);assert.equal(f.completed.length,0);
 }
});
await check('Google wrong signature/alg/kid/nonce/aud/azp/expiry/iat/issuer отвергаются',async()=>{
 const seconds=Math.floor(Date.now()/1000);
 for(const settings of [{wrongSigningKey:true},{jwtHeader:{alg:'HS256'}},{jwtHeader:{kid:'unknown'}},
  {claims:{nonce:'wrong'}},{claims:{aud:'wrong-client'}},{claims:{azp:'wrong-client'}},{claims:{aud:[env.GOOGLE_CLIENT_ID,'other'],azp:undefined}},
  {claims:{exp:seconds-1}},{claims:{iat:seconds+120}},{claims:{iat:seconds-700}},{claims:{iss:'https://attacker.invalid'}},{claims:{at_hash:'wrong'}}]){
  const f=fixture(settings),flow=await start(f);const {res}=await invoke(f.handler,callback(flow));assert.equal(res.status,401,JSON.stringify(settings));assert.equal(f.completed.length,0);assert.equal(res.headers['set-cookie'].some(x=>x.startsWith('__Host-nexus_session=')),false);
 }
});
await check('third-party Google email и string email_verified не дают owner email proof',async()=>{
 for(const claims of [{email:'synthetic@example.invalid',email_verified:true},{email_verified:'true'}]){
  const f=fixture({claims}),flow=await start(f);assert.equal((await invoke(f.handler,callback(flow))).res.status,303);assert.equal(f.completed[0].emailVerified,false);
 }
});
await check('provider redirects/network errors и invalid token fail closed без session',async()=>{
 for(const settings of [{providerRedirect:true},{providerFailure:true},{token:{token_type:'wrong'}},{token:{access_token:''}}]){
  const f=fixture(settings),flow=await start(f),{res}=await invoke(f.handler,callback(flow));assert.ok([401,502].includes(res.status));assert.equal(f.completed.length,0);assert.equal(res.body.includes(accessToken),false);assert.equal(res.headers['set-cookie'].some(x=>x.startsWith('__Host-nexus_session=')),false);
 }
});
await check('Yandex authenticated native login@yandex.ru даёт узкий current-email proof',async()=>{
 const f=fixture(),flow=await start(f,'yandex'),{res}=await invoke(f.handler,callback(flow));assert.equal(res.status,303);assert.deepEqual(f.completed[0],{issuer:'https://login.yandex.ru',subject:'synthetic-yandex-sub',email:'synthetic@yandex.ru',emailVerified:true,displayName:'Synthetic Yandex'});
 const dotted=fixture({yandexUser:{login:'synthetic.user',default_email:'synthetic.user@yandex.ru'}}),dottedFlow=await start(dotted,'yandex');assert.equal((await invoke(dotted.handler,callback(dottedFlow))).res.status,303);assert.equal(dotted.completed[0].emailVerified,true);
 for(const client_id of ['other-client',undefined]){
  const wrong=fixture({yandexUser:{client_id}}),badFlow=await start(wrong,'yandex');assert.equal((await invoke(wrong.handler,callback(badFlow))).res.status,401);assert.equal(wrong.completed.length,0);
 }
});
await check('Yandex optional bounded cid не меняет state/PKCE/profile identity',async()=>{
 const f=fixture(),flow=await start(f,'yandex'),cid='synthetic_correlation-'.padEnd(256,'A');
 const {res}=await invoke(f.handler,callback(flow,{cid}));assert.equal(res.status,303,res.body);
 assert.deepEqual(f.completed[0],{issuer:'https://login.yandex.ru',subject:'synthetic-yandex-sub',email:'synthetic@yandex.ru',emailVerified:true,displayName:'Synthetic Yandex'});
 assert.equal(JSON.stringify({headers:res.headers,body:res.body}).includes(cid),false);
 const wrong=fixture(),wrongFlow=await start(wrong,'yandex');
 const rejected=await invoke(wrong.handler,callback(wrongFlow,{cid:'synthetic-cid',state:'Z'.repeat(43)}));
 assert.equal(rejected.res.status,401);assert.equal(JSON.parse(rejected.res.body).error.code,'TRANSACTION_REJECTED');
 assert.equal(wrong.completed.length,0);assert.equal(wrong.calls.some(x=>x.origin==='https://oauth.yandex.ru'),false);
});
await check('cid закрыт для других providers, дубликатов, неизвестных и недопустимых значений',async()=>{
 for(const cid of ['', 'A'.repeat(257), 'contains space', 'contains/slash', 'contains.dot', 'кириллица', 'line\nbreak']){
  const f=fixture(),flow=await start(f,'yandex'),before=f.calls.length;
  const {res}=await invoke(f.handler,callback(flow,{cid}));assert.equal(res.status,400);assert.equal(JSON.parse(res.body).error.code,'INVALID_INPUT');
  assert.equal(f.calls.length,before);assert.equal(f.completed.length,0);
 }
 for(const kind of ['duplicate','unknown','google','vk']){
  const provider=['google','vk'].includes(kind)?kind:'yandex',f=fixture(),flow=await start(f,provider),before=f.calls.length;
  const req=callback(flow,{cid:'synthetic-cid'});if(kind==='duplicate')req.url+='&cid=second-cid';if(kind==='unknown')req.url+='&unknown=synthetic';
  const {res}=await invoke(f.handler,req);assert.equal(res.status,400);assert.equal(JSON.parse(res.body).error.code,'INVALID_INPUT');
  assert.equal(f.calls.length,before);assert.equal(f.completed.length,0);
 }
});
await check('Yandex external/contact/spoofed/missing login и aliases не дают owner email proof',async()=>{
 for(const yandexUser of [
  {default_email:'someone.else@yandex.ru',email_verified:true},
  {default_email:'synthetic@example.invalid',email_verified:true},
  {default_email:'synthetic@yandex.ru.attacker.invalid',email_verified:true},
  {default_email:'synthetic@sub.yandex.ru',email_verified:true},
  {default_email:'synthetic@ya.ru',email_verified:true},
  {login:undefined,email_verified:true},{login:'',email_verified:true},{login:'synthetic@yandex.ru',email_verified:true},
  {login:'synthetic.user',default_email:'synthetic-user@yandex.ru',email_verified:true},
  {login:'synthetic-user',default_email:'synthetic.user@yandex.ru',email_verified:true},
  {login:'synthetic',default_email:'synthetic+tag@yandex.ru',email_verified:true}
 ]){
  const f=fixture({yandexUser}),flow=await start(f,'yandex');assert.equal((await invoke(f.handler,callback(flow))).res.status,303);assert.equal(f.completed[0].emailVerified,false);assert.equal(f.completed[0].subject,'synthetic-yandex-sub');
 }
});
await check('VK PKCE/device_id, token state и user_id проверяются',async()=>{
 const f=fixture(),flow=await start(f,'vk');assert.equal(new URL(flow.authorizationURL).searchParams.get('code_challenge_method'),'s256');assert.equal((await invoke(f.handler,callback(flow))).res.status,303);assert.equal(f.completed[0].subject,'123456');assert.equal(f.completed[0].emailVerified,false);
 for(const settings of [{token:{state:'wrong'}},{vkUser:{user_id:'different-user'}}]){const bad=fixture(settings),badFlow=await start(bad,'vk');assert.equal((await invoke(bad.handler,callback(badFlow))).res.status,401);assert.equal(bad.completed.length,0)}
});
await check('link sessionHash из private ingress; fixed account redirect; Worker denial не раскрывает secret',async()=>{
 const f=fixture(),flow=await start(f,'google','link');assert.equal((await invoke(f.handler,callback(flow))).res.headers.location,GATEWAY_ORIGIN+'/#view=account');
 const denied=fixture({denyComplete:true}),deniedFlow=await start(denied);const {res}=await invoke(denied.handler,callback(deniedFlow));assert.equal(res.status,403);assert.equal(JSON.parse(res.body).error.code,'OWNER_EMAIL_REQUIRED');assert.equal(res.headers['set-cookie'].some(x=>x.startsWith('__Host-nexus_session=')),false);
});
await check('ambiguous Cookie и ingress/context hints закрыты до claim',async()=>{
 const f=fixture(),flow=await start(f);const base=callback(flow);
 for(const req of [request({path:base.url,flow:flow.flow,headers:{cookie:`__Host-nexus_oauth_flow=${flow.flow}; __Host-nexus_oauth_flow=${flow.flow}`}}),
  request({path:base.url,flow:flow.flow,headers:{cookie:'__Host-nexus_oauth_flow=nof_'+'Z'.repeat(43)}}),
  request({path:base.url,flow:flow.flow,headers:{'x-yc-apigateway-operation-context':Buffer.from(JSON.stringify({oauthIngressContract:'v1',sessionCookie:'-',oauthFlowCookie:flow.flow,role:'owner'})).toString('base64')}})]){
  const before=f.calls.length;assert.equal((await invoke(f.handler,req)).res.status,401);assert.equal(f.calls.length,before);
 }
});
console.log(JSON.stringify({status:'PASS',tests,networkRequests:0,serversStarted:0,browsersStarted:0,realProviderCredentials:false,googleSignature:'RSA-2048 real verification',providerTokensStored:false}));
