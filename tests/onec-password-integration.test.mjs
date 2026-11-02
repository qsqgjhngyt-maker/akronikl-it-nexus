import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {Readable} from 'node:stream';
import {createHash,createHmac} from 'node:crypto';
import {createInvitedPasswordHandler} from '../server-access/bff/invited-password.mjs';
import {verifyPasswordSource,PASSWORD_SOURCE_PATHS} from '../tools/check-onec-password-integration.mjs';
const read=p=>({mode:'100644',bytes:fs.readFileSync(p)});
test('Интеграция сохраняет точные 39 файлов PR64 и не выдаёт review за deployment',()=>{
 const result=verifyPasswordSource();
 assert.equal(result.files.length,39);assert.equal(result.releaseEligible,false);
 assert.equal(result.deploymentApproved,false);assert.equal(result.productionChanged,false);
 assert.ok(!PASSWORD_SOURCE_PATHS.some(p=>p.startsWith('release/')||p.startsWith('courses/')));
});
test('Подмена bytes защищённого BFF не получает content-допуск',()=>{
 assert.throws(()=>verifyPasswordSource({read:p=>p==='server-access/bff/invited-password.mjs'?{...read(p),bytes:Buffer.from('changed')}:read(p)}),/approved identity source bytes/);
});
test('Ссылка или executable вместо identity source не получает content-допуск',()=>{
 for(const mode of ['120000','100755'])assert.throws(()=>verifyPasswordSource({read:p=>p==='core/account-control.js'?{...read(p),mode}:read(p)}),/mode/);
});

// Настоящий parser/handler; Gateway, cookie и Worker здесь синтетические.
// Это регрессия совместимости с v3, а не hosted IAM evidence.
const fakeSession='nxs_'+'Q'.repeat(43),rawCookie='__Host-nexus_session='+fakeSession;
const syntheticKey='SYNTHETIC_INTEGRATION_PASSWORD_SERVICE_KEY_ONLY';
const digest=v=>createHash('sha256').update(v).digest('hex');
async function logout({context={passwordIngressContract:'v3'},cookie=rawCookie,v3=true,alter=()=>{}}={}){
 let calls=0,status,headers,body,rpcError;
 const handler=createInvitedPasswordHandler({env:{INVITED_PASSWORD_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:String(v3),INVITED_PASSWORD_SERVICE_KEY:syntheticKey,INVITED_PASSWORD_ORIGIN:'https://nexus.invalid',INVITED_PASSWORD_WORKER_ORIGIN:'https://worker.invalid'},fetchImpl:async(url,init)=>{
  calls++;try{assert.equal(url,'https://worker.invalid/api/v2/account/internal/invited-password');
  const data=JSON.parse(init.body);assert.deepEqual(data,{op:'logout',sessionHash:digest(fakeSession)});
  const canonical=['v1','POST','/api/v2/account/internal/invited-password',init.headers['x-nexus-service-timestamp'],init.headers['x-nexus-service-nonce'],digest(init.body)].join('\n');
  assert.equal(init.headers['x-nexus-service-signature'],createHmac('sha256',syntheticKey).update(canonical).digest('hex'));
  return new Response('{"ok":true,"clearSession":true}',{status:200,headers:{'content-type':'application/json'}});}catch(error){rpcError=error;throw error;}
 }});
 const req=Readable.from([Buffer.from('{}')]);req.url='/api/v2/account/password/logout';req.method='POST';req.socket={remoteAddress:'192.0.2.1'};
 req.headers={host:'nexus.invalid',origin:'https://nexus.invalid','content-type':'application/json','x-nexus-password-write':'1','sec-fetch-site':'same-origin','x-yc-apigateway-operation-context':Buffer.from(JSON.stringify(context)).toString('base64'),...(cookie===null?{}:{cookie})};req.rawHeaders=Object.entries(req.headers).flat();alter(req);
 await handler(req,{writeHead(s,h){status=s;headers=h},end(value){body=JSON.parse(value)}});if(rpcError)throw rpcError;return{status,headers,body,calls};
}
test('Парольный logout v3 подписывает только hash сессии и очищает защищённую cookie',async()=>{
 const r=await logout();assert.equal(r.status,200);assert.equal(r.calls,1);
 const cookie=r.headers['set-cookie'].join('; ');for(const rule of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=0'])assert.ok(cookie.includes(rule));
 assert.equal(JSON.stringify(r.body).includes(fakeSession),false);
});
test('Парольный logout сохраняет прежний v2 ingress',async()=>{
 assert.equal((await logout({context:{passwordIngressContract:'v2',cookieHeader:rawCookie},v3:false})).status,200);
});
test('Выключенный v3, лишние context поля и неоднозначные Cookie отклонены до Worker',async()=>{
 const cases=[{v3:false},{context:{passwordIngressContract:'v3',cookieHeader:rawCookie}},{cookie:null},{cookie:rawCookie+'; '+rawCookie},{alter:req=>req.rawHeaders.push('Cookie',rawCookie)},{alter:req=>req.rawHeaders.push('X-Yc-Apigateway-Operation-Context',req.headers['x-yc-apigateway-operation-context'])},{alter:req=>req.headers.cookie+='x'}];
 for(const options of cases){const r=await logout(options);assert.equal(r.status,401);assert.equal(r.calls,0);}
});
