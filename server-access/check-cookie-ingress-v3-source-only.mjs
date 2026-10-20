// Только source-unit checks: in-memory req/res и подставленный fetch. Нет сервера/сети.
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash,createHmac} from 'node:crypto';
import {readV2CookieContext as parser} from './bff/gateway-cookie-context.mjs';
import {createAccountReadHandler,sessionFromIngress as sessionParser,GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';
import {createPasskeyHandler} from './bff/passkey.mjs';
import {createOAuthHandler} from './bff/oauth.mjs';
import {createFeedbackHandler} from './bff/feedback.mjs';
import {createCloudSessionHandler} from './bff/cloud-session.mjs';
globalThis.fetch=()=>assert.fail('Network forbidden in source-only test');
const labOptions={env:{COOKIE_INGRESS_V3_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true'}};
const readV2CookieContext=(req,marker)=>parser(req,marker,labOptions);
const sessionFromIngress=req=>sessionParser(req,labOptions);
const CH='x-yc-apigateway-operation-context',marker='accountReadContract',key='SYNTHETIC_SOURCE_ONLY_HMAC_KEY_NOT_FOR_DEPLOYMENT';
const session='nxs_'+'S'.repeat(43),flow='nof_'+'F'.repeat(43),passkey='npf_'+'P'.repeat(43);
const cookie=`__Host-nexus_session=${session}; __Host-nexus_passkey_flow=${passkey}; __Host-nexus_oauth_flow=${flow}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
let tests=0,upstreamCalls=0;
const test=async(name,fn)=>{await fn();tests++;console.log('PASS '+name)};
function request({contract=marker,cookieValue=cookie,json,encoded,path='/api/v2/account',extra={}}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,[CH]:encoded??Buffer.from(json??JSON.stringify({[contract]:'v3'})).toString('base64'),...extra};
 if(cookieValue!==null)headers.cookie=cookieValue;
 return Object.assign(Readable.from([]),{headers,rawHeaders:Object.entries(headers).flat(),url:path,method:'GET'});
}
const rejected=req=>assert.throws(()=>readV2CookieContext(req,marker),{message:'INGRESS_REJECTED'});
const invoke=async(handler,req)=>{const res={status:0,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}};await handler(req,res);return res};
const envBase=labOptions.env;
function service(path,check,reply,status=200){return async(url,options)=>{
 upstreamCalls++;assert.equal(url,WORKER_ORIGIN+path);assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 const headers=new Headers(options.headers),stamp=headers.get('x-nexus-service-timestamp'),nonce=headers.get('x-nexus-service-nonce');
 assert.match(stamp,/^\d{13}$/);assert.match(nonce,/^[a-f0-9]{32}$/);
 assert.equal(headers.get('x-nexus-service-signature'),createHmac('sha256',key).update(`v1\nPOST\n${path}\n${stamp}\n${nonce}\n${hash(options.body)}`).digest('hex'));
 assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);check(JSON.parse(options.body));return Response.json(reply,{status});
}}
await test('V3: raw cookies для каждого существующего marker извлекаются из одного header',()=>{
 for(const contract of [marker,'passkeyIngressContract','oauthIngressContract','feedbackIngressContract']){
  const values=readV2CookieContext(request({contract}),contract);assert.equal(values.get('__Host-nexus_session'),session);assert.equal(values.get('__Host-nexus_oauth_flow'),flow);assert.equal(values.get('__Host-nexus_passkey_flow'),passkey);
 }
 assert.equal(sessionFromIngress(request()),session);
});
await test('V3: отсутствие raw Cookie даёт пустую карту; credential из context запрещён',()=>{
 assert.equal(readV2CookieContext(request({cookieValue:null}),marker).size,0);assert.equal(sessionFromIngress(request({cookieValue:null})),null);
 for(const name of ['cookieHeader','sessionCookie','oauthFlowCookie','flowCookie','accountId','role'])rejected(request({json:JSON.stringify({[marker]:'v3',[name]:session})}));
});
await test('V3: exact context shape, duplicate и escaped duplicate keys fail closed',()=>{
 for(const json of ['[]','null','{}',JSON.stringify({[marker]:'v4'}),JSON.stringify({other:'v3'}),`{"${marker}":"v3","${marker}":"v3"}`,`{"${marker}":"v3","accountReadContr\\u0061ct":"v3"}`,JSON.stringify({[marker]:{value:'v3'}})])rejected(request({json}));
});
await test('V3: canonical Base64, строгий UTF8, пределы длины сохраняются',()=>{
 const raw=Buffer.from(JSON.stringify({[marker]:'v3'})).toString('base64');
 for(const encoded of [raw+'=',raw+'\n','!bad',Buffer.from([0xff,0xfe]).toString('base64'),'A'.repeat(8193)])rejected(request({encoded}));
});
await test('V3: duplicate context/Cookie headers и некорректный rawHeaders запрещены',()=>{
 for(const name of [CH,'cookie']){const req=request();req.rawHeaders.push(name,req.headers[name]);rejected(req)}
 for(const rawHeaders of [null,['host'],['host',3]]){const req=request();req.rawHeaders=rawHeaders;rejected(req)}
 const missing=request();delete missing.headers[CH];missing.rawHeaders=Object.entries(missing.headers).flat();rejected(missing);
 const hidden=request({cookieValue:null});hidden.rawHeaders.push('Cookie',cookie);rejected(hidden);
});
await test('V3: повтор каждого protected имени запрещён, неизвестные пары не дают identity',()=>{
 for(const name of ['__Host-nexus_session','__Host-nexus_passkey_flow','__Host-nexus_oauth_flow','__Host-nexus_probe'])rejected(request({cookieValue:`${name}=x; ${name}=x`}));
 assert.equal(readV2CookieContext(request({cookieValue:'theme=a; theme=b'}),marker).get('theme'),'b');
});
await test('V3: Cookie RFC grammar, controls, Unicode, пустые пары и oversized значения запрещены',()=>{
 for(const cookieValue of ['', 'x=1;', 'x=1;;y=2','bad name=x','x="quoted"','x=a,b','x=a\\b','x=a b','x=ю','x=1\r\nInjected: 1','x='+'A'.repeat(4095)])rejected(request({cookieValue}));
 assert.equal(readV2CookieContext(request({cookieValue:'theme='}),marker).get('theme'),'');
});
await test('V2: stale/absent raw Cookie по-прежнему отклоняется; V3 не fallback',()=>{
 for(const cookieValue of [null,cookie.replace(session,'nxs_'+'N'.repeat(43))])rejected(request({cookieValue,json:JSON.stringify({[marker]:'v2',cookieHeader:cookie})}));
 const v1=request({cookieValue:null,json:JSON.stringify({[marker]:'v1',sessionCookie:session})});assert.equal(readV2CookieContext(v1,marker),undefined);assert.equal(sessionFromIngress(v1),session);
});
const account=createAccountReadHandler({env:{...envBase,ACCOUNT_READ_ENABLED:'true',ACCOUNT_SERVICE_KEY:key},fetchImpl:service('/api/v2/account/internal/read',value=>assert.deepEqual(value,{path:'/api/v2/account',sessionHash:hash(session)}),{account:{accountId:'synthetic-v3',displayName:'Synthetic V3',status:'active'},enrollmentAvailable:false,loginMethods:[{id:'synthetic-passkey',kind:'passkey',status:'active',createdAt:'2026-10-19T00:00:00.000Z',disabledAt:null}]})});
await test('Account handler: V3 сохраняет HMAC и DTO, не выдаёт credential',async()=>{
 const res=await invoke(account,request());assert.equal(res.status,200);assert.equal(res.body.account.accountId,'synthetic-v3');assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(JSON.stringify(res.body).includes(session),false);
});
const keys=createPasskeyHandler({env:{...envBase,PASSKEY_PROXY_ENABLED:'true',PASSKEY_SERVICE_KEY:key,PASSKEY_ORIGIN:GATEWAY_ORIGIN,PASSKEY_WORKER_ORIGIN:WORKER_ORIGIN},fetchImpl:service('/api/v2/account/internal/passkey',value=>{assert.equal(value.op,'keys');assert.equal(value.sessionHash,hash(session))},{keys:[]})});
await test('Passkey handler: V3 shared branch сохраняет credential validation/HMAC',async()=>{
 assert.equal((await invoke(keys,request({contract:'passkeyIngressContract',path:'/api/v2/account/passkey/keys'}))).status,200);
 const before=upstreamCalls;assert.equal((await invoke(keys,request({contract:'passkeyIngressContract',path:'/api/v2/account/passkey/keys',cookieValue:'__Host-nexus_session=bad'}))).status,401);assert.equal(upstreamCalls,before);
});
const oauth=createOAuthHandler({env:{...envBase,OAUTH_PROXY_ENABLED:'true',OAUTH_SERVICE_KEY:key,YANDEX_CLIENT_ID:'synthetic-v3-id',YANDEX_CLIENT_SECRET:'SYNTHETIC_V3_SECRET'},fetchImpl:service('/api/v2/account/internal/oauth',value=>{assert.equal(value.op,'claim');assert.equal(value.flowHash,hash(flow));assert.equal(value.stateHash,hash('D'.repeat(43)))},{error:{code:'TRANSACTION_REJECTED'}},401)});
const callback='/api/v2/account/oauth/yandex/callback?code=synthetic-invalid&state='+'D'.repeat(43)+'&cid=synthetic';
await test('OAuth handler: explicit V3 branch достигает claim, без provider exchange',async()=>{
 const res=await invoke(oauth,request({contract:'oauthIngressContract',path:callback,cookieValue:'__Host-nexus_oauth_flow='+flow}));assert.equal(res.status,401);assert.equal(res.body.error.code,'TRANSACTION_REJECTED');
 const before=upstreamCalls;const missing=await invoke(oauth,request({contract:'oauthIngressContract',path:callback,cookieValue:null}));assert.equal(missing.body.error.code,'FLOW_REQUIRED');assert.equal(upstreamCalls,before);
});
const feedback=createFeedbackHandler({env:{...envBase,FEEDBACK_PROXY_ENABLED:'true',FEEDBACK_SERVICE_KEY:key,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'true'},fetchImpl:service('/api/v2/feedback/internal',value=>{assert.equal(value.sessionHash,hash(session));assert.equal(value.expectedAccountId,'synthetic-v3')},{items:[]})});
await test('Feedback handler: V3 shared branch сохраняет account expectation/HMAC',async()=>{
 assert.equal((await invoke(feedback,request({path:'/api/v2/feedback/me',extra:{'x-nexus-feedback-account':'synthetic-v3'}}))).status,200);
 const before=upstreamCalls;assert.equal((await invoke(feedback,request({path:'/api/v2/feedback/me'}))).status,401);assert.equal(upstreamCalls,before);
});
const cloud=createCloudSessionHandler({env:{...envBase,CLOUD_SESSION_PROXY_ENABLED:'true',CLOUD_SERVICE_KEY:key},fetchImpl:service('/api/v2/cloud/internal',value=>{assert.equal(value.sessionCookie,session);assert.equal(value.expectedAccountId,'synthetic-v3');assert.equal(value.path,'/api/v1/me')},{accountId:'synthetic-v3'})});
await test('Cloud facade: V3 через Account parser сохраняет отдельный HMAC/expectation',async()=>{
 assert.equal((await invoke(cloud,request({path:'/api/v2/cloud/me',extra:{'x-nexus-cloud-account':'synthetic-v3'}}))).status,200);
 const before=upstreamCalls;assert.equal((await invoke(cloud,request({path:'/api/v2/cloud/me'}))).status,400);assert.equal(upstreamCalls,before);
});
await test('V3 rejection не достигает Account/Passkey/OAuth/Feedback/Cloud upstream',async()=>{
 const before=upstreamCalls;
 for(const [handler,contract,path,extra]of [[account,marker,'/api/v2/account',{}],[keys,'passkeyIngressContract','/api/v2/account/passkey/keys',{}],[oauth,'oauthIngressContract',callback,{}],[feedback,marker,'/api/v2/feedback/me',{'x-nexus-feedback-account':'synthetic-v3'}],[cloud,marker,'/api/v2/cloud/me',{'x-nexus-cloud-account':'synthetic-v3'}]]){
  const res=await invoke(handler,request({contract,path,extra,json:JSON.stringify({[contract]:'v3',cookieHeader:cookie})}));assert.equal(res.status,401);
 }
 assert.equal(upstreamCalls,before);
});
console.log(JSON.stringify({status:'PASS — SOURCE UNIT ONLY',tests,syntheticUpstreamCalls:upstreamCalls,networkRequests:0,serversStarted:0,browsersStarted:0,workersStarted:0,deployments:0,realCredentials:false,rawCookieFreshness:'NOT VERIFIED',iamAndSpoofBoundary:'NOT VERIFIED',v3Approval:'LOCAL_SOURCE_ONLY; cloud approval required'}));
