// SESSION-REMEMBER-P1A. Synthetic private BFF <-> Worker and HttpOnly cookie tests.
// No production requests, no persistent storage, no leaked tokens in logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {randomBytes,randomUUID,createHmac,createHash} from 'node:crypto';
import {createRememberBffHandler} from '../server-access/bff/remember-device-transport.mjs';
import {createRememberInternalHandler} from '../server-access/worker/remember-device-internal.mjs';
import {createRememberDeviceCore,digestSecret} from '../server-access/worker/remember-device-core.mjs';
import {REMEMBER_INTERNAL_PATH,REMEMBER_COOKIE,SESSION_COOKIE} from '../server-access/remember-device-transport-contract.mjs';
import {GATEWAY_ORIGIN,WORKER_ORIGIN} from '../server-access/bff/account-read.mjs';
const KEY=Buffer.from('synthetic test key with enough entropy not for any real service').toString('hex');
const stamp=Date.UTC(2026,9,23,8,0,0);
const initialSession='nxs_'+randomBytes(32).toString('base64url');
const proof={accountId:'synthetic-account-1',deviceId:'synthetic-device-1',loginMethodId:'synthetic-method-1',recentProof:true,authStrength:'account-method-v1'};
function fixture(){
 let now=stamp,workerRequests=0,inserted=0;
 const rows=new Map(),spent=new Map(),issued=new Map(),nonces=new Set();
 const repo={
  async createGrant(row){rows.set(row.id,{...row});return true},
  async getGrant(id){return rows.get(id)?{...rows.get(id)}:null},
  async getCurrentAuthority(row){return {accountId:row.accountId,deviceId:row.deviceId,loginMethodId:row.loginMethodId,
   accountStatus:'active',deviceStatus:'active',loginMethodStatus:'active',alphaAllowed:true}},
  async spentTokenStatus(id,hash){const record=spent.get(hash);return record?.grantId===id?record:null},
  async atomicRotateAndCreateSession(issue){const row=rows.get(issue.grantId);
   if(!row||row.currentHash!==issue.expectedHash||row.status!=='active')return false;
   row.currentHash=issue.nextHash;row.generation=issue.nextGeneration;spent.set(issue.expectedHash,{grantId:issue.grantId,usedAt:issue.rotatedAt});
   issued.set(issue.sessionId,issue);return true},
  async revokeGrant(id){const row=rows.get(id);if(!row||row.status!=='active')return false;row.status='revoked';return true},
  async revokeAllForAccount(){return 0}
 };
 const db={prepare(sql){assert.match(sql,/INSERT OR IGNORE INTO account_service_nonces/);return {bind(nonce){return {async run(){
  if(nonces.has(nonce))return {success:true,meta:{changes:0}};
  nonces.add(nonce);inserted++;return {success:true,meta:{changes:1}};
 }}}}}};
 const core=createRememberDeviceCore({repository:repo,clock:()=>now});
 const env={REMEMBER_DEVICE_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',
  REMEMBER_SERVICE_KEY:KEY,DB:db};
 const worker=createRememberInternalHandler({env,core,clock:()=>now,
  resolveFreshProof:async cookie=>cookie===initialSession?{...proof,sessionHash:await digestSecret(cookie)}:null});
 const fetchImpl=async(url,options)=>{workerRequests++;assert.equal(url,WORKER_ORIGIN+REMEMBER_INTERNAL_PATH);
  assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
  return worker(new Request(url,options));};
 const bff=createRememberBffHandler({env,fetchImpl,clock:()=>now});
 const marker=Buffer.from(JSON.stringify({rememberIngressContract:'v3'})).toString('base64');
 function request(action,{cookie='',body=action==='enroll'?'{"remember":true}':'{}',origin=GATEWAY_ORIGIN,site='same-origin',
  context=marker,method='POST',extraHeaders=[]}={}){
  const rawHeaders=['Host',new URL(GATEWAY_ORIGIN).host,'Origin',origin,'Sec-Fetch-Site',site,
   'X-Nexus-Remember-Write','1','Content-Type','application/json',
   'X-Yc-Apigateway-Operation-Context',context,...(cookie?['Cookie',cookie]:[]),...extraHeaders];
  const headers={};for(let i=0;i<rawHeaders.length;i+=2)headers[rawHeaders[i].toLowerCase()]=rawHeaders[i+1];
  const req=Readable.from([Buffer.from(body)]);req.url='/api/v2/account/remember/'+action;req.method=method;req.rawHeaders=rawHeaders;req.headers=headers;
  const res={status:null,headers:null,body:null,writeHead(code,value){this.status=code;this.headers=value},end(value){this.body=String(value??'')}};
  return bff(req,res).then(()=>res);
 }
 return {request,rows,spent,issued,nonces,worker,
  get workerRequests(){return workerRequests},get inserted(){return inserted},advance(ms){now+=ms},setFlag(name,v){env[name]=v},
  get now(){return now},serviceKey:KEY};
}
const oneCookie=(response,name)=>{
 const entries=response.headers['set-cookie']||[];
 const pair=entries.find(value=>value.startsWith(name+'='));
 return pair?.split(';')[0]??null;
};
test('fail closed: disabled feature never talks to Worker',async()=>{
 const f=fixture();f.setFlag('REMEMBER_DEVICE_ENABLED','false');const r=await f.request('enroll',{cookie:`${SESSION_COOKIE}=${initialSession}`});
 assert.equal(r.status,404);assert.equal(f.workerRequests,0);assert.equal(f.rows.size,0);
});
test('same-origin/CSRF/host and method guards deny requests before calling Worker',async()=>{
 const f=fixture();for(const options of [{origin:'https://attacker.invalid'},{site:'cross-site'},{method:'GET'},
  {extraHeaders:['Authorization','Bearer synthetic']},{extraHeaders:['Host','wrong-host']}]){
  const r=await f.request('enroll',{cookie:`${SESSION_COOKIE}=${initialSession}`,...options});
  assert.equal(r.status,403);
 }assert.equal(f.workerRequests,0);
});
test('no valid signed ingress marker or duplicate remember cookie fails closed',async()=>{
 const f=fixture();const remember=`${REMEMBER_COOKIE}=nrd_12345678-1234-4234-8234-123456789abc.${'a'.repeat(43)}`;
 for(const options of [{context:Buffer.from('{"rememberIngressContract":"v2"}').toString('base64')},
  {context:'not-base64'}, {extraHeaders:['Cookie',remember]}]){
  const r=await f.request('renew',{cookie:remember,...options});assert.equal(r.status,403);
 }assert.equal(f.workerRequests,0);
});
test('enrollment requires valid current session and explicit opt in',async()=>{
 const f=fixture();assert.equal((await f.request('enroll',{cookie:`${SESSION_COOKIE}=${initialSession}`,body:'{}'})).status,400);
 assert.equal((await f.request('enroll',{cookie:''})).status,401);
 assert.equal((await f.request('enroll',{cookie:`${SESSION_COOKIE}=nxs_${'z'.repeat(43)}`})).status,401);
 assert.equal(f.rows.size,0);
});
test('enroll -> renew -> revoke: secrets only in HttpOnly cookies, weaker session, SHA in server repository',async()=>{
 const f=fixture();const enroll=await f.request('enroll',{cookie:`${SESSION_COOKIE}=${initialSession}`});
 assert.equal(enroll.status,204);assert.equal(enroll.body,'');
 const before=oneCookie(enroll,REMEMBER_COOKIE);assert.ok(before);
 assert.match(enroll.headers['set-cookie'][0],/; Path=\/; HttpOnly; Secure; SameSite=Strict/);
 assert.match(enroll.headers['set-cookie'][0],/Max-Age=2592000/);
 const rawBefore=before.slice((REMEMBER_COOKIE+'=').length);
 const row=[...f.rows.values()][0];assert.equal(row.currentHash,await digestSecret(rawBefore));
 assert.ok(!JSON.stringify([...f.rows.values()]).includes(rawBefore));
 const renewal=await f.request('renew',{cookie:before});assert.equal(renewal.status,204);assert.equal(renewal.body,'');
 const after=oneCookie(renewal,REMEMBER_COOKIE),session=oneCookie(renewal,SESSION_COOKIE);
 assert.ok(after);assert.notEqual(after,before);assert.ok(session);assert.equal(f.issued.size,1);
 assert.equal([...f.issued.values()][0].sessionAuthStrength,'remembered-device-v1');
 assert.equal((await f.request('renew',{cookie:before})).status,409);
 assert.equal(f.issued.size,1);
 const revoked=await f.request('revoke',{cookie:after});assert.equal(revoked.status,204);
 assert.match(revoked.headers['set-cookie'][0],/Max-Age=0/);
 assert.equal((await f.request('renew',{cookie:after})).status,401);
 assert.equal([...f.rows.values()][0].status,'revoked');
});
test('signature tampering and replay of signed internal RPC denied',async()=>{
 const f=fixture(),payload=JSON.stringify({action:'revoke',rememberCookie:'nrd_'+randomUUID()+'.'+randomBytes(32).toString('base64url'),sessionCookie:null,explicitOptIn:false});
 const nonce=randomBytes(16).toString('hex'),headers={'content-type':'application/json',
  'x-nexus-service-timestamp':String(f.now),'x-nexus-service-nonce':nonce,'x-nexus-service-signature':'f'.repeat(64)};
 const request=()=>new Request(WORKER_ORIGIN+REMEMBER_INTERNAL_PATH,{method:'POST',headers,body:payload});
 assert.equal((await f.worker(request())).status,401);assert.equal(f.nonces.size,0);
 const hash=createHash('sha256').update(payload).digest('hex'),canonical=`v1\nPOST\n${REMEMBER_INTERNAL_PATH}\n${f.now}\n${nonce}\n${hash}`;
 headers['x-nexus-service-signature']=createHmac('sha256',f.serviceKey).update(canonical).digest('hex');
 // Valid signed request consumes its nonce even when the grant itself does not exist.
 assert.equal((await f.worker(request())).status,401);assert.equal(f.nonces.size,1);
 assert.equal((await f.worker(request())).status,401);assert.equal(f.nonces.size,1);
});
test('same-origin no-store, sanitized response and no JS persistence code',async()=>{
 const f=fixture();const result=await f.request('enroll',{cookie:`${SESSION_COOKIE}=${initialSession}`});
 assert.equal(result.headers['cache-control'],'no-store');assert.equal(result.headers.vary,'*');
 assert.equal(result.headers['x-content-type-options'],'nosniff');assert.ok(!result.body.includes(initialSession));
 for(const token of result.headers['set-cookie'])assert.ok(token.includes('HttpOnly; Secure; SameSite=Strict'));
});
