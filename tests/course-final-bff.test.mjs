import test from'node:test';import assert from'node:assert/strict';import{Readable}from'node:stream';import{readFile}from'node:fs/promises';import{createHash,randomUUID}from'node:crypto';
import{controlFixture}from'./helpers/control-fixture.mjs';import{handleAdminService}from'../server-access/worker/admin-service.mjs';import{createAccountControlHandler}from'../server-access/bff/account-control.mjs';
import{GATEWAY_ORIGIN,WORKER_ORIGIN}from'../server-access/bff/account-read.mjs';import{ASSESSMENT_PATH}from'../course-final/transport-contract.js';import{QUESTION_MAX}from'../course-final/contract.js';
const sha=v=>createHash('sha256').update(v).digest('hex'),id=()=>randomUUID();
async function fixture(){
 const f=await controlFixture();f.db.exec(await readFile('server-access/migrations/0018_course_final.sql','utf8'));f.env.COURSE_FINAL_ENABLED='true';f.env.COURSE_FINAL_EXPERT_ENABLED='true';const student=f.seed('synthetic-bff-student');
 const env={...f.env,ACCOUNT_CONTROL_PROXY_ENABLED:'true',PRIVATE_GATEWAY_CONFIRMED:'true',COOKIE_INGRESS_V3_ENABLED:'true',BFF_COURSE_FINAL_ENABLED:'true'};let mode='normal',calls=[];
 async function transport(url,options){
  assert.equal(url,WORKER_ORIGIN+'/api/v2/account/internal/control');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(Buffer.byteLength(options.body)<=262144);assert.equal(options.body.includes(student.secret),false);
  const p=JSON.parse(options.body).payload;calls.push(p.phase);let r=await handleAdminService(new Request(url,options),f.env);
  if(p.phase==='parts'&&r.status===200&&mode!=='normal'){
   const data=await r.json(),headers=new Headers(r.headers);
   if(mode==='digest')data.parts[0].sha256='0'.repeat(64);
   if(mode==='owner')data.uploadId=id();
   if(mode==='cookie')headers.set('set-cookie','SYNTHETIC_FORBIDDEN');
   if(mode==='cache')headers.set('cache-control','public, max-age=60');
   return new Response(JSON.stringify(data),{headers});
  }return r;
 }
 async function invoke(payload,{actor=student,expected=actor.id,origin=GATEWAY_ORIGIN,enabled=true}={}){
  const headers={host:new URL(GATEWAY_ORIGIN).host,origin,'content-type':'application/json','x-nexus-account-control':'1','x-nexus-account-expectation':expected,'x-yc-apigateway-operation-context':Buffer.from('{"accountControlContract":"v3"}').toString('base64'),cookie:'__Host-nexus_session='+actor.secret};
  const req=Object.assign(Readable.from([Buffer.from(JSON.stringify(payload))]),{url:ASSESSMENT_PATH,method:'POST',headers,rawHeaders:Object.entries(headers).flat()});let status,body,head;
  await createAccountControlHandler({env:{...env,BFF_COURSE_FINAL_ENABLED:enabled?'true':'false'},fetchImpl:transport})(req,{writeHead(s,h){status=s;head=h},end(v){body=v}});
  assert.equal(head['cache-control'],'no-store');assert.equal(head.vary,'*');assert.equal(head['set-cookie'],undefined);assert.equal(body.includes(actor.secret),false);return{status,body:JSON.parse(body)};
 }
 async function uploaded({invalid=false}={}){
  const open=await invoke({phase:'open',requestId:id(),parentAttemptId:null,trackId:'taskflow'});assert.equal(open.status,200);const a=open.body.attempt;
  const source={title:'SYNTHETIC transport',manifest:{sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']},workspace:{entryFile:'src/main.cpp',files:[{path:'src/main.cpp',content:'// '+'Синтетика'.repeat(1000)+'\nint main(){return 0;}\n',languageId:'cpp'}],languageId:'cpp'}};
  const bundle={schemaVersion:1,assessmentId:'cpp.course-final.v1',taskVersion:'1.0.0',rubricVersion:'1.0.0',variant:a.variant,answers:Object.fromEntries(Object.keys(QUESTION_MAX).filter(k=>!k.startsWith('P')).map(k=>[k,'SYNTHETIC explanation'])),practical:{P1:source,P2:source,P3:source,P4:source},project:{trackId:'taskflow',source},report:'Synthetic transport proof only'};if(invalid)bundle.owner='SYNTHETIC_FORBIDDEN';
  const bytes=Buffer.from(JSON.stringify(bundle)),count=Math.ceil(bytes.length/32768);assert.ok(count>1);
  const b=await invoke({phase:'begin',requestId:id(),attemptId:a.id,snapshotHash:sha(bytes),totalBytes:bytes.length,chunkCount:count});assert.equal(b.status,200);const upload=b.body.upload;
  for(let i=0;i<count;i++){const part=bytes.subarray(i*32768,(i+1)*32768);assert.equal((await invoke({phase:'put',requestId:id(),attemptId:a.id,uploadId:upload.id,index:i,data:part.toString('base64'),sha256:sha(part)})).status,200)}
  return{a,upload,bytes,bundle,submit:{phase:'submit',requestId:id(),attemptId:a.id,uploadId:upload.id}};
 }
 return{...f,student,env,invoke,uploaded,calls,setMode:v=>{mode=v}};
}
test('public BFF собирает/проверяет multipart UTF-8 source до единственного certify',async()=>{
 const f=await fixture();try{const d=await f.uploaded(),r=await f.invoke(d.submit);assert.equal(r.status,200);assert.equal(r.body.attempt.status,'submitted');assert.equal(r.body.attempt.snapshotHash,sha(d.bytes));assert.equal(f.calls.filter(p=>p==='certify').length,1);
  const stored=f.db.prepare('SELECT completeness FROM nexus_assessment_attempts WHERE id=?').get(d.a.id);assert.equal(JSON.parse(stored.completeness).practical.P4,true);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_reviews').get().n,0);
  const before=f.calls.filter(p=>p==='certify').length;assert.equal((await f.invoke(d.submit)).status,200);assert.equal(f.calls.filter(p=>p==='certify').length,before,'idempotent receipt does not resubmit source');
 }finally{f.close()}
});
test('клиент не может выбрать certify, подменить owner или обойти origin/сессию',async()=>{
 const f=await fixture();try{
  assert.equal((await f.invoke({phase:'certify',requestId:id(),completeness:{project:true}})).status,400);assert.equal(f.calls.length,0);
  assert.equal((await f.invoke({phase:'open',requestId:id(),trackId:'taskflow',parentAttemptId:null,owner:'other'})).status,400);assert.equal(f.calls.length,0);
  assert.equal((await f.invoke({phase:'capabilities'},{origin:'https://synthetic.invalid'})).status,403);assert.equal(f.calls.length,0);
  assert.equal((await f.invoke({phase:'capabilities'},{expected:'synthetic-other-account'})).status,401);
  const before=f.calls.length;const disabled=await f.invoke({phase:'capabilities'},{enabled:false});assert.equal(disabled.status,200);assert.equal(disabled.body.enabled,false);assert.equal(f.calls.length,before);
 }finally{f.close()}
});
for(const mode of['digest','owner','cookie','cache'])test('повреждённый/private-unsafe upstream '+mode+' не фиксирует сдачу',async()=>{
 const f=await fixture();try{const d=await f.uploaded();f.setMode(mode);const r=await f.invoke(d.submit);assert.notEqual(r.status,200);assert.equal(f.calls.includes('certify'),false);assert.equal(f.db.prepare('SELECT status FROM nexus_assessment_attempts WHERE id=?').get(d.a.id).status,'draft');assert.ok(f.db.prepare('SELECT count(*) n FROM nexus_assessment_parts').get().n>1)}finally{f.close()}
});
test('неверная source schema остаётся черновиком, не становится заверенным snapshot',async()=>{
 const f=await fixture();try{const d=await f.uploaded({invalid:true}),r=await f.invoke(d.submit);assert.equal(r.status,400);assert.equal(r.body.error.code,'ASSESSMENT_BUNDLE_INVALID');assert.equal(f.calls.includes('certify'),false)}finally{f.close()}
});
