import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {readV2CookieContext as parse} from './bff/gateway-cookie-context.mjs';
import {sessionFromIngress,createAccountReadHandler,GATEWAY_ORIGIN,WORKER_ORIGIN} from './bff/account-read.mjs';
import {createPasskeyHandler} from './bff/passkey.mjs';
import {createOAuthHandler} from './bff/oauth.mjs';
import {createFeedbackHandler} from './bff/feedback.mjs';
import {createCloudSessionHandler} from './bff/cloud-session.mjs';
import {createEntryGateHandler,ENTRY_SHELL_URL} from './bff/entry-gate.mjs';
const CH='x-yc-apigateway-operation-context',marker='accountReadContract';
const session='nxs_'+'Q'.repeat(43),other='nxs_'+'R'.repeat(43),flow='nof_'+'T'.repeat(43);
const cookie='__Host-nexus_session='+session,opts={env:{COOKIE_INGRESS_V3_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true'}};
const sha=s=>createHash('sha256').update(s).digest('hex');
let tests=0;
async function test(name,fn){await fn();tests++;console.log('PASS '+name)}
function request({contract=marker,json,cookieValue=cookie,version='v3',path='/api/v2/account',extra={}}={}){
 const headers={host:new URL(GATEWAY_ORIGIN).host,[CH]:Buffer.from(json??JSON.stringify({[contract]:version})).toString('base64'),...extra};
 if(cookieValue!==null)headers.cookie=cookieValue;
 return Object.assign(Readable.from([]),{headers,rawHeaders:Object.entries(headers).flat(),method:'GET',url:path});
}
const reject=(req,reason,options=opts)=>assert.throws(()=>parse(req,marker,options),e=>e.message==='INGRESS_REJECTED'&&(!reason||e.cookieContextReason===reason));
const invoke=async(handler,req)=>{const res={status:0,headers:{},body:null,writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=body}};await handler(req,res);return res};
await test('D01 positive: explicit per-call config accepts v3; default remains closed',()=>{
 assert.equal(parse(request(),marker,opts).get('__Host-nexus_session'),session);
 reject(request(),'v3_disabled',{});assert.equal(sessionFromIngress(request()),null);
});
await test('D01 negative: every near-true flag, private gate and request override rejected',()=>{
 for(const value of [undefined,null,false,true,1,'1','TRUE',' true','true ','false',''])for(const flag of ['COOKIE_INGRESS_V3_ENABLED','PRIVATE_GATEWAY_CONFIRMED']){
  reject(request(),'v3_disabled',{env:{...opts.env,[flag]:value}});
 }
 reject(request({extra:{'cookie-ingress-v3-enabled':'true','x-private-gateway-confirmed':'true'}}),'v3_disabled',{});
});
await test('D01 regression: ambient process env cannot enable a handler',()=>{
 const saved=process.env.COOKIE_INGRESS_V3_ENABLED;
 try{process.env.COOKIE_INGRESS_V3_ENABLED='true';reject(request(),'v3_disabled',{})}finally{if(saved===undefined)delete process.env.COOKIE_INGRESS_V3_ENABLED;else process.env.COOKIE_INGRESS_V3_ENABLED=saved}
});
await test('D02 positive/regression: exact raw and normalized headers on HTTP/1 and HTTP/2',()=>{
 for(const major of [1,2]){const req=request();req.httpVersionMajor=major;req.httpVersion=major===2?'2.0':'1.1';if(major===2)req.rawHeaders.unshift(':method','GET',':path','/api/v2/account');assert.equal(parse(req,marker,opts).get('__Host-nexus_session'),session)}
});
await test('D02 negative: disagreeing raw/normalized Cookie or context rejected',()=>{
 for(const name of ['cookie',CH]){const req=request();req.rawHeaders[req.rawHeaders.findIndex(x=>x===name)+1]=name==='cookie'?'__Host-nexus_session='+other:Buffer.from('{"accountReadContract":"v2"}').toString('base64');reject(req,'v3_header_inconsistent')}
});
await test('D02 negative: duplicate/mixed case headers and HTTP/2 split Cookie fail closed',()=>{
 for(const major of [1,2])for(const name of ['Cookie','COOKIE','X-Yc-ApiGateway-Operation-Context']){const req=request();req.httpVersionMajor=major;req.rawHeaders.push(name,name.toLowerCase()==='cookie'?'theme=x':req.headers[CH]);reject(req)}
});
await test('D03 positive: legal ASCII boundary lengths and cookie octets',()=>{
 for(const value of ['x=','x=abc==','x=!#$%&\'()*+-./0123:<=>?@[]^_`{|}~','x='+'A'.repeat(4094)])assert.ok(parse(request({cookieValue:value}),marker,opts) instanceof Map);
});
await test('D03 negative: HTAB, controls, Unicode, quoted and oversized Cookie',()=>{
 for(const value of ['\tx=1','x=1\t','x=1;\ty=2','x=1\n','x=1\r\nX: a','x=\u007f','x=ю','x="a"','x=a,b','x=a\\b','x=1;;y=2','x=1;','x='+'A'.repeat(4095)])reject(request({cookieValue:value}),'v3_raw_cookie_syntax');
});
await test('V3 strict context: every protected marker, no credentials/identity/extra keys',()=>{
 for(const contract of [marker,'passkeyIngressContract','oauthIngressContract','feedbackIngressContract']){
  assert.equal(parse(request({contract}),contract,opts).get('__Host-nexus_session'),session);
  for(const key of ['cookieHeader','sessionCookie','flowCookie','oauthFlowCookie','accountId','role','__proto__']){const raw=`{"${contract}":"v3","${key}":"synthetic"}`;assert.throws(()=>parse(request({contract,json:raw}),contract,opts),{message:'INGRESS_REJECTED'})}
 }
});
await test('V3 strict JSON: duplicate and escaped duplicate markers, arrays, nested shapes',()=>{
 for(const json of ['null','[]','{}','{"accountReadContract":"v3","accountReadContract":"v3"}','{"accountReadContract":"v3","accountReadContr\\u0061ct":"v3"}','{"accountReadContract":{"value":"v3"}}'])reject(request({json}));
});
await test('V3 no downgrade: unknown/malformed contract cannot select V1/V2',()=>{
 for(const version of ['v3.1','V3','v4','v3 ','',null,{},[]])reject(request({version}));
 for(const markerValue of [null,'cookieHeader','bad-marker','',3])assert.throws(()=>parse(request(),markerValue,opts),{message:'INGRESS_REJECTED'});
});
await test('V3 strict Base64/UTF8/BOM and size boundaries fail closed',()=>{
 const good=request().headers[CH];
 for(const encoded of [good+'=',good+'\n','!bad',Buffer.from([0xff]).toString('base64'),Buffer.from('\ufeff{"accountReadContract":"v3"}').toString('base64'),'A'.repeat(8193)]){const req=request();req.headers[CH]=encoded;req.rawHeaders=Object.entries(req.headers).flat();reject(req)}
});
await test('V3 absence is an empty Map; unknown cookie never yields session',()=>{
 for(const cookieValue of [null,'theme=dark','__host-nexus_session='+session,'__Host-nexus_session=','__Host-nexus_session=bad'])assert.equal(sessionFromIngress(request({cookieValue}),opts),null);
 assert.equal(parse(request({cookieValue:null}),marker,opts).size,0);
});
await test('V3 duplicate protected names reject regardless of order/value',()=>{
 for(const name of ['__Host-nexus_session','__Host-nexus_passkey_flow','__Host-nexus_oauth_flow','__Host-nexus_probe'])for(const tail of ['x','y',''])reject(request({cookieValue:`${name}=x; theme=a; ${name}=${tail}`}),'v3_protected_duplicate');
});
await test('V3 freshness LOCAL MODEL: no cross-request cache, reordered/unrelated cookies safe',()=>{
 for(const value of [session,other,session])assert.equal(sessionFromIngress(request({cookieValue:'theme=x; __Host-nexus_session='+value}),opts),value);
 assert.equal(sessionFromIngress(request({cookieValue:null}),opts),null);
 const a=parse(request(),marker,opts);a.clear();assert.equal(parse(request(),marker,opts).get('__Host-nexus_session'),session);
});
await test('V1/V2 regression: explicit gate off leaves historical context authority intact',()=>{
 const v1=request({json:JSON.stringify({accountReadContract:'v1',sessionCookie:session}),cookieValue:null});
 assert.equal(sessionFromIngress(v1),session); // V1 intentionally uses trusted context, not raw Cookie.
 const v2=request({json:JSON.stringify({accountReadContract:'v2',cookieHeader:cookie})});assert.equal(sessionFromIngress(v2),session);
 for(const cookieValue of [null,'__Host-nexus_session='+other])assert.equal(sessionFromIngress(request({json:JSON.stringify({accountReadContract:'v2',cookieHeader:cookie}),cookieValue})),null);
});
const key='SYNTHETIC_V31_HMAC_KEY_LOCAL_ONLY_NEVER_DEPLOY';
const common={...opts.env,ACCOUNT_READ_ENABLED:'true',ACCOUNT_SERVICE_KEY:key,PASSKEY_PROXY_ENABLED:'true',PASSKEY_SERVICE_KEY:key,PASSKEY_ORIGIN:GATEWAY_ORIGIN,PASSKEY_WORKER_ORIGIN:WORKER_ORIGIN,OAUTH_PROXY_ENABLED:'true',OAUTH_SERVICE_KEY:key,YANDEX_CLIENT_ID:'synthetic-client',YANDEX_CLIENT_SECRET:'SYNTHETIC_LOCAL_ONLY',FEEDBACK_PROXY_ENABLED:'true',FEEDBACK_SERVICE_KEY:key,FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED:'true',CLOUD_SESSION_PROXY_ENABLED:'true',CLOUD_SERVICE_KEY:key,NEXUS_ENTRY_GATE_ENABLED:'true'};
let calls=0;
const dto={account:{accountId:'synthetic-account',displayName:'Synthetic',status:'active'},loginMethods:[],enrollmentAvailable:false};
const service=async(url,options)=>{
 calls++;assert.equal(new Headers(options.headers).has('cookie'),false);
 const payload=JSON.parse(options.body);
 const recognized=(payload.sessionHash===sha(session)||payload.sessionCookie===session);
 if(!recognized)return Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});
 if(url.endsWith('/read'))return Response.json(dto);
 if(url.endsWith('/passkey'))return Response.json({keys:[]});
 if(url.endsWith('/feedback/internal'))return Response.json({items:[]});
 if(url.endsWith('/cloud/internal'))return Response.json({accountId:'synthetic-account'});
 assert.fail('Unexpected upstream');
};
function handlers(env){return[
 [createAccountReadHandler({env,fetchImpl:service}),marker,'/api/v2/account',{}],
 [createPasskeyHandler({env,fetchImpl:service}),'passkeyIngressContract','/api/v2/account/passkey/keys',{}],
 [createFeedbackHandler({env,fetchImpl:service}),marker,'/api/v2/feedback/me',{'x-nexus-feedback-account':'synthetic-account'}],
 [createCloudSessionHandler({env,fetchImpl:service}),marker,'/api/v2/cloud/me',{'x-nexus-cloud-account':'synthetic-account'}],
 [createOAuthHandler({env,fetchImpl:async()=>{calls++;return Response.json({error:{code:'TRANSACTION_REJECTED'}},{status:401})}}),'oauthIngressContract','/api/v2/account/oauth/yandex/callback?code=synthetic&state='+'U'.repeat(43),{}],
 [createEntryGateHandler({env,landingBody:Buffer.from('<p>PUBLIC_SYNTHETIC</p>'),fetchImpl:service}),marker,'/nexus-shell.html',{}]
];}
await test('D01 handler negative/regression: V3 default-off blocks ALL six consumers before upstream',async()=>{
 for(const value of [undefined,'false',true]){const before=calls;for(const[handler,contract,path,extra]of handlers({...common,COOKIE_INGRESS_V3_ENABLED:value}))assert.equal((await invoke(handler,request({contract,path,extra}))).status,401);assert.equal(calls,before)}
});
await test('V3 absence/invalid/duplicate: ALL private consumers reject authorization',async()=>{
 for(const cookieValue of [null,'__Host-nexus_session=bad','__Host-nexus_session='+session+'; __Host-nexus_session='+other]){
  const before=calls;for(const[handler,contract,path,extra]of handlers(common))assert.equal((await invoke(handler,request({contract,path,extra,cookieValue}))).status,401);
  // Legacy Passkey keys delegates missing-session denial to its authenticated Worker.
  assert.equal(calls-before,cookieValue===null?1:0);
 }
});
await test('D02 handlers negative: raw/normalized disagreement cannot authorize or reach upstream',async()=>{
 const before=calls;for(const[handler,contract,path,extra]of handlers(common)){const req=request({contract,path,extra});req.rawHeaders[req.rawHeaders.indexOf('cookie')+1]='__Host-nexus_session='+other;assert.equal((await invoke(handler,req)).status,401)}assert.equal(calls,before);
});
await test('V3 session auth positive: Account/Passkey/Feedback/Cloud accept recognized synthetic session',async()=>{
 for(const[handler,contract,path,extra]of handlers(common).slice(0,4)){const res=await invoke(handler,request({contract,path,extra}));assert.equal(res.status,200);assert.equal(JSON.stringify(res).includes(session),false)}
});
await test('V3 substituted well-formed session is only parsed; session lookup still rejects auth',async()=>{
 for(const[handler,contract,path,extra]of handlers(common).slice(0,4)){const res=await invoke(handler,request({contract,path,extra,cookieValue:'__Host-nexus_session='+other}));assert.equal(res.status,401)}
});
await test('D01 entry gate positive/regression: V3 env reaches parser and recognized account opens shell',async()=>{
 let accountCalls=0,shellCalls=0;
 const handler=createEntryGateHandler({env:common,landingBody:Buffer.from('<p>PUBLIC_SYNTHETIC</p>'),fetchImpl:async(url,options)=>{
  if(url===ENTRY_SHELL_URL){shellCalls++;return new Response('<p>SYNTHETIC_AUTHENTICATED_SHELL</p>',{headers:{'content-type':'text/html'}})}
  accountCalls++;const payload=JSON.parse(options.body);assert.equal(url,WORKER_ORIGIN+'/api/v2/account/internal/read');
  if(payload.sessionHash!==sha(session))return Response.json({error:{code:'SESSION_REQUIRED'}},{status:401});
  return Response.json({...dto,loginMethods:[{id:'synthetic-method',kind:'passkey',status:'active',createdAt:'2026-10-19T00:00:00.000Z',disabledAt:null}]});
 }});
 assert.equal((await invoke(handler,request({path:'/nexus-shell.html'}))).status,200);
 assert.equal((await invoke(handler,request({path:'/nexus-shell.html',cookieValue:'__Host-nexus_session='+other}))).status,401);
 assert.equal(accountCalls,2);assert.equal(shellCalls,1);
});
await test('V3 OAuth flow positive reaches transaction verifier; unknown flow remains 401',async()=>{
 const before=calls,[handler,contract,path,extra]=handlers(common)[4];const res=await invoke(handler,request({contract,path,extra,cookieValue:'__Host-nexus_oauth_flow='+flow}));assert.equal(calls,before+1);assert.equal(res.status,401);assert.equal(JSON.parse(res.body).error.code,'TRANSACTION_REJECTED');
});
await test('D04 diagnostic regression: V3 errors expose only existing synthetic enum and keep HTTP401',async()=>{
 const pairs=['__Host-nexus_session=nxs_'+'A'.repeat(43),'__Host-nexus_oauth_flow=nof_'+'B'.repeat(43)];
 const [handler,contract,path]=handlers({...common,COOKIE_INGRESS_V3_ENABLED:'false'})[4];
 const res=await invoke(handler,request({contract,path,cookieValue:pairs.join('; '),extra:{'x-nexus-transport-probe':'cookie-shape-v1'}}));
 assert.equal(res.status,401);assert.deepEqual(JSON.parse(res.body),{error:{code:'INGRESS_REJECTED',probeReason:'v2_rejected'}});
 for(const hidden of [...pairs,'v3_disabled','v3_header_inconsistent'])assert.equal(res.body.includes(hidden),false);
});
console.log(JSON.stringify({status:'LOCAL PASS',tests,networkRequests:0,serversStarted:0,realCredentials:false,cloudFreshness:'LIVE NOT RUN',effectiveIAM:'PARTIAL',wireMarker:'v3',implementation:'V3.1 candidate'}));
