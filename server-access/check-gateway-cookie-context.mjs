// Синтетические req/res и HMAC upstream; без сети, браузера, сервера и настоящих credential.
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash,createHmac} from 'node:crypto';
import {readV2CookieContext} from './bff/gateway-cookie-context.mjs';
import {createAccountReadHandler,sessionFromIngress,GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';
import {createPasskeyHandler} from './bff/passkey.mjs';
import {createOAuthHandler} from './bff/oauth.mjs';
const marker='accountReadContract',contextHeader='x-yc-apigateway-operation-context';
const session='nxs_'+'S'.repeat(43),flow='npf_'+'P'.repeat(43),oauth='nof_'+'O'.repeat(43),newSession='nxs_'+'N'.repeat(43);
const cookie=`__Host-nexus_session=${session}; __Host-nexus_passkey_flow=${flow}; __Host-nexus_oauth_flow=${oauth}; theme=light`;
const key='SYNTHETIC_COOKIE_CONTEXT_HMAC_KEY_ONLY',sha=value=>createHash('sha256').update(value).digest('hex');
let tests=0;
const test=async(name,run)=>{await run();tests++;console.log('PASS '+name)};
function request({contract=marker,contextCookie=cookie,actualCookie=cookie,contextJSON,contextEncoded,path='/api/v2/account',method='GET',body,extraHeaders={}}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,
  [contextHeader]:contextEncoded??Buffer.from(contextJSON??JSON.stringify({[contract]:'v2',cookieHeader:contextCookie})).toString('base64'),
  ...(actualCookie===undefined?{}:{cookie:actualCookie}),
  ...(method==='POST'?{origin:GATEWAY_ORIGIN,'content-type':'application/json','x-nexus-passkey-write':'1','sec-fetch-site':'same-origin'}:{}),...extraHeaders};
 const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
 Object.assign(req,{headers,rawHeaders:Object.entries(headers).flat(),url:path,method,socket:{remoteAddress:'127.0.0.1'}});return req;
}
const noActual=(options={})=>{const req=request(options);delete req.headers.cookie;req.rawHeaders=Object.entries(req.headers).flat();return req};
const rejected=req=>assert.throws(()=>readV2CookieContext(req,marker),{message:'INGRESS_REJECTED'});
const response=()=>({status:null,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}});
const invoke=async(handler,req)=>{const res=response();await handler(req,res);return res};

await test('V2: три protected cookies извлекаются из одного полного header',()=>{
 const values=readV2CookieContext(request(),marker);
 assert.ok(values instanceof Map);assert.equal(values.get('__Host-nexus_session'),session);assert.equal(values.get('__Host-nexus_passkey_flow'),flow);assert.equal(values.get('__Host-nexus_oauth_flow'),oauth);
 assert.equal(sessionFromIngress(request()),session);
});
await test('V2: порядок и внешние пробелы пар не меняют результат',()=>{
 const actual=`theme=light;\t__Host-nexus_oauth_flow=${oauth};__Host-nexus_session=${session} ; __Host-nexus_passkey_flow=${flow}`;
 assert.equal(readV2CookieContext(request({actualCookie:actual}),marker).get('__Host-nexus_session'),session);
});
await test('V2: отсутствие Cookie требует sentinel и отсутствия raw header с обеих сторон',()=>{
 assert.equal(readV2CookieContext(noActual({contextCookie:'-'}),marker).size,0);
 rejected(noActual());rejected(request({contextCookie:'-'}));rejected(request({actualCookie:''}));rejected(noActual({contextCookie:''}));
 const mismatch=noActual({contextCookie:'-'});mismatch.rawHeaders.push('Cookie',cookie);rejected(mismatch);
});
await test('V2: stale context, изменение, потеря или добавление любой пары запрещены',()=>{
 for(const actualCookie of [cookie.replace(session,'nxs_'+'X'.repeat(43)),cookie.replace('; theme=light',''),cookie+'; extra=1'])rejected(request({actualCookie}));
});
await test('V2: повтор любого защищённого имени запрещён даже при идентичных значениях',()=>{
 for(const name of ['__Host-nexus_session','__Host-nexus_passkey_flow','__Host-nexus_oauth_flow','__Host-nexus_probe']){
  const duplicated=`${name}=same; ${name}=same`;rejected(request({contextCookie:duplicated,actualCookie:duplicated}));
 }
});
await test('V2: неизвестные повторяющиеся пары сохраняются в полном сравнении',()=>{
 const extra=cookie+'; experiment=one; experiment=two';
 assert.equal(readV2CookieContext(request({contextCookie:extra,actualCookie:extra}),marker).get('__Host-nexus_session'),session);
 rejected(request({contextCookie:extra,actualCookie:cookie+'; experiment=two'}));
});
await test('V2: Cookie grammar, Unicode, управляющие символы, длина и пустые пары fail closed',()=>{
 for(const value of ['bad name=x','x="quoted"','x=a,b','x=a\\b','x=with space','x=ю','x=a\r\nOther: 1','x=1;;y=2','x=1;','noequals','x='+'A'.repeat(4095)])rejected(request({contextCookie:value,actualCookie:value}));
 const empty=readV2CookieContext(request({contextCookie:'theme=',actualCookie:'theme='}),marker);assert.equal(empty.get('theme'),'');
});
await test('V2: повтор context/Cookie headers и повреждённые rawHeaders запрещены',()=>{
 const duplicateCookie=request();duplicateCookie.rawHeaders.push('Cookie','theme=light');rejected(duplicateCookie);
 const duplicateContext=request();duplicateContext.rawHeaders.push(contextHeader,duplicateContext.headers[contextHeader]);rejected(duplicateContext);
 for(const rawHeaders of [null,['host'],['host',3]]){const req=request();req.rawHeaders=rawHeaders;rejected(req)}
 const noContext=request();delete noContext.headers[contextHeader];noContext.rawHeaders=Object.entries(noContext.headers).flat();rejected(noContext);
});
await test('V2: строгие canonical Base64/UTF8/flat metadata исключают неоднозначность',()=>{
 const json=JSON.stringify({[marker]:'v2',cookieHeader:cookie});
 for(const contextEncoded of [Buffer.from(json).toString('base64')+'=',Buffer.from([0xff,0xfe]).toString('base64'),'!not-base64','A'.repeat(8193)])rejected(request({contextEncoded}));
 for(const contextJSON of [JSON.stringify({[marker]:'v2',cookieHeader:cookie,role:'owner'}),`{"${marker}":"v2","${marker}":"v2","cookieHeader":${JSON.stringify(cookie)}}`,JSON.stringify({[marker]:'v3',cookieHeader:cookie}),JSON.stringify({[marker]:'v2',cookieHeader:{value:cookie}}),'[]','null'])rejected(request({contextJSON}));
});
await test('V1 сохраняет старый отдельный parser и прежний context-only transport',()=>{
 const account=noActual({contextJSON:JSON.stringify({accountReadContract:'v1',sessionCookie:session})});
 assert.equal(readV2CookieContext(account,marker),undefined);assert.equal(sessionFromIngress(account),session);
});

const calls=[],nonces=new Set();
function verifyService(url,options,path){
 assert.equal(url,WORKER_ORIGIN+path);assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 const headers=new Headers(options.headers),stamp=headers.get('x-nexus-service-timestamp'),nonce=headers.get('x-nexus-service-nonce');
 assert.match(stamp,/^\d{13}$/);assert.ok(Math.abs(Number(stamp)-Date.now())<30000);assert.match(nonce,/^[a-f0-9]{32}$/);assert.equal(nonces.has(nonce),false);nonces.add(nonce);
 assert.equal(headers.get('x-nexus-service-signature'),createHmac('sha256',key).update(`v1\nPOST\n${path}\n${stamp}\n${nonce}\n${sha(options.body)}`).digest('hex'));
 assert.equal(headers.has('cookie'),false);assert.equal(headers.has('authorization'),false);
 assert.equal(options.body.includes(session),false);assert.equal(options.body.includes(flow),false);assert.equal(options.body.includes(oauth),false);
 const value=JSON.parse(options.body);calls.push(value);return value;
}
const account=createAccountReadHandler({env:{ACCOUNT_READ_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',ACCOUNT_SERVICE_KEY:key},fetchImpl:async(url,options)=>{
 const value=verifyService(url,options,'/api/v2/account/internal/read');assert.deepEqual(value,{path:'/api/v2/account',sessionHash:sha(session)});
 return Response.json({account:{accountId:'synthetic-account',displayName:'Synthetic',status:'active'},enrollmentAvailable:false,loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active',createdAt:'2026-10-19T00:00:00.000Z',disabledAt:null}]});
}});
await test('Реальный Account handler: V2 multi-cookie → HMAC hashed session → проверенный DTO',async()=>{
 const res=await invoke(account,request());assert.equal(res.status,200);assert.equal(res.body.account.accountId,'synthetic-account');assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.headers.Vary,'*');
});
await test('Реальный Account handler: stale/отсутствующий raw Cookie не достигает upstream',async()=>{
 const before=calls.length;
 for(const req of [noActual(),request({actualCookie:cookie.replace(session,newSession)}),noActual({contextCookie:'-'})])assert.equal((await invoke(account,req)).status,401);
 assert.equal(calls.length,before);
});
let expectedFlow=null;
const passkey=createPasskeyHandler({env:{PASSKEY_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',PASSKEY_SERVICE_KEY:key,PASSKEY_ORIGIN:GATEWAY_ORIGIN,PASSKEY_WORKER_ORIGIN:WORKER_ORIGIN},fetchImpl:async(url,options)=>{
 const value=verifyService(url,options,'/api/v2/account/internal/passkey');assert.equal(value.sessionHash,sha(session));
 if(value.op==='authenticate-options'){expectedFlow=value.flowHash;assert.notEqual(value.flowHash,sha(flow));return Response.json({challengeId:'synthetic-challenge',options:{challenge:'synthetic-options'}})}
 if(value.op==='authenticate-verify'){assert.equal(value.flowHash,expectedFlow);assert.deepEqual(value.input,{challengeId:'synthetic-challenge',response:{fixture:true}});return Response.json({ok:true,sessionSecret:newSession})}
 assert.equal(value.op,'keys');return Response.json({keys:[{id:'synthetic-method',status:'active',createdAt:'2026-10-19T00:00:00.000Z',deviceType:'multiDevice'}]});
}});
await test('Реальный Passkey handler: options/verify multi-cookie не подменяют flow/session',async()=>{
 const options=await invoke(passkey,request({contract:'passkeyIngressContract',path:'/api/v2/account/passkey/authenticate/options',method:'POST',body:{}}));
 assert.equal(options.status,200);assert.equal(options.headers['cache-control'],'no-store');assert.equal(options.headers.vary,'*');
 const fresh=options.headers['set-cookie'][0].match(/^__Host-nexus_passkey_flow=([^;]+)/)[1];
 const current=cookie.replace(flow,fresh);
 const verified=await invoke(passkey,request({contract:'passkeyIngressContract',contextCookie:current,actualCookie:current,path:'/api/v2/account/passkey/authenticate/verify',method:'POST',body:{challengeId:'synthetic-challenge',response:{fixture:true}}}));
 assert.equal(verified.status,200);assert.deepEqual(verified.body,{ok:true});assert.ok(verified.headers['set-cookie'].some(value=>value.startsWith('__Host-nexus_session='+newSession+';')));
 const keys=await invoke(passkey,request({contract:'passkeyIngressContract',path:'/api/v2/account/passkey/keys'}));assert.equal(keys.status,200);assert.equal(keys.body.keys.length,1);
});
await test('Реальный Passkey handler: mismatch/дубликаты/невалидный credential запрещены до upstream',async()=>{
 const before=calls.length;
 for(const req of [noActual({contract:'passkeyIngressContract',path:'/api/v2/account/passkey/keys'}),request({contract:'passkeyIngressContract',actualCookie:cookie.replace(session,newSession),path:'/api/v2/account/passkey/keys'}),request({contract:'passkeyIngressContract',contextCookie:'__Host-nexus_session=bad',actualCookie:'__Host-nexus_session=bad',path:'/api/v2/account/passkey/keys'})]){
  const res=await invoke(passkey,req);assert.equal(res.status,401);assert.equal(res.body.error.code,'INGRESS_REJECTED');
 }
 assert.equal(calls.length,before);
});
const syntheticSession='__Host-nexus_session=nxs_'+'A'.repeat(43),syntheticFlow='__Host-nexus_oauth_flow=nof_'+'B'.repeat(43),syntheticPasskey='__Host-nexus_passkey_flow=npf_'+'C'.repeat(43);
const syntheticCookie=[syntheticSession,syntheticPasskey,syntheticFlow].join('; ');
const probePath='/api/v2/account/oauth/yandex/callback?code=synthetic-invalid&state='+'D'.repeat(43)+'&cid=synthetic';
const probeHandler=createOAuthHandler({env:{OAUTH_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',OAUTH_SERVICE_KEY:key,YANDEX_CLIENT_ID:'synthetic-yandex-client',YANDEX_CLIENT_SECRET:'SYNTHETIC_COOKIE_CONTEXT_SECRET'},fetchImpl:()=>assert.fail('Rejected ingress must not reach upstream')});
function probeRequest(options={}){
 return request({contract:'oauthIngressContract',path:probePath,contextCookie:syntheticFlow,actualCookie:syntheticCookie,extraHeaders:{'x-nexus-transport-probe':'cookie-shape-v1'},...options});
}
await test('OAuth synthetic-only probe: mismatch раскрывает только фиксированный V2 enum',async()=>{
 const res=await invoke(probeHandler,probeRequest());
 assert.equal(res.status,401);assert.deepEqual(res.body,{error:{code:'INGRESS_REJECTED',probeReason:'v2_cookie_mismatch_expected_F'}});
 assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers.vary,'*');
 for(const value of [syntheticSession,syntheticFlow,syntheticPasskey,'cookieHeader'])assert.equal(JSON.stringify(res.body).includes(value),false);
});
await test('OAuth probe enum закрыт для обычного запроса, неизвестного cookie и повторного probe header',async()=>{
 const normal=probeRequest({extraHeaders:{}}),unknown=probeRequest({actualCookie:syntheticCookie+'; theme=light'}),duplicate=probeRequest();
 duplicate.rawHeaders.push('x-nexus-transport-probe','cookie-shape-v1');
 for(const req of [normal,unknown,duplicate,noActual({contract:'oauthIngressContract',path:probePath,contextCookie:syntheticFlow,extraHeaders:{'x-nexus-transport-probe':'cookie-shape-v1'}})]){
  const res=await invoke(probeHandler,req);assert.equal(res.status,401);assert.deepEqual(res.body,{error:{code:'INGRESS_REJECTED'}});
 }
});
await test('OAuth synthetic-only probe: V1/other shape и V2 presence отличаются без credential',async()=>{
 for(const [options,reason] of [
  [{contextJSON:JSON.stringify({oauthIngressContract:'v1',cookieHeader:syntheticFlow})},'shape'],
  [{contextJSON:JSON.stringify({oauthIngressContract:'v3',cookieHeader:syntheticFlow})},'shape_other'],
  [{contextCookie:'-'},'v2_absent_context'],
  [{contextJSON:JSON.stringify({oauthIngressContract:'v2',cookieHeader:syntheticFlow,extra:true})},'v2_context_shape']
 ]){
  const res=await invoke(probeHandler,probeRequest(options));assert.equal(res.status,401);assert.deepEqual(res.body,{error:{code:'INGRESS_REJECTED',probeReason:reason}});
 }
});
await test('OAuth synthetic-only probe: expected fixture классифицируется только в фиксированный enum',async()=>{
 for(const [contextCookie,actualCookie,suffix] of [
  [syntheticSession,syntheticFlow,'S'],[syntheticPasskey,syntheticFlow,'P'],
  [[syntheticFlow,syntheticSession,syntheticPasskey].join('; '),syntheticFlow,'SPF'],
  ['__Host-nexus_session=nxs_'+'Z'.repeat(43),syntheticFlow,'OTHER']
 ]){
  const res=await invoke(probeHandler,probeRequest({contextCookie,actualCookie}));assert.equal(res.status,401);
  assert.deepEqual(res.body,{error:{code:'INGRESS_REJECTED',probeReason:'v2_cookie_mismatch_expected_'+suffix}});
 }
});
console.log(JSON.stringify({status:'PASS',tests,networkRequests:0,serversStarted:0,browsersStarted:0,realCredentials:false,legacyV1Preserved:true,v2ContextOnlyForbidden:true}));
