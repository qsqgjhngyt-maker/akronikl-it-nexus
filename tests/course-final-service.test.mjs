import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{randomUUID,createHash}from'node:crypto';
import{controlFixture}from'./helpers/control-fixture.mjs';
import{ASSESSMENT_PATH}from'../course-final/transport-contract.js';
import{QUESTION_MAX,PROJECT_RUBRIC,DEFENSE_RUBRIC}from'../course-final/contract.js';
const sha=v=>createHash('sha256').update(v).digest('hex'),request=()=>randomUUID();
const expert=()=>({exam:{...QUESTION_MAX},project:{...PROJECT_RUBRIC},defense:{...DEFENSE_RUBRIC},feedback:'SYNTHETIC expert feedback; no real student assessed.',defenseMode:'written',defenseEvidence:'SYNTHETIC control change and explanation checked in this protocol test.',guiObserved:true,authorshipVerified:true,controlChangeVerified:true,blockingReasons:[]});
async function fixture(){
 const f=await controlFixture();f.db.exec(await readFile('server-access/migrations/0018_course_final.sql','utf8'));f.env.COURSE_FINAL_ENABLED='true';f.env.COURSE_FINAL_EXPERT_ENABLED='true';
 const student=f.seed('synthetic-student'),teacher=f.seed('synthetic-teacher'),other=f.seed('synthetic-other');
 const call=(payload,actor=student)=>f.call(ASSESSMENT_PATH,{method:'POST',payload,actor});
 const open=(actor=student,parentAttemptId=null)=>call({phase:'open',requestId:request(),trackId:'taskflow',parentAttemptId},actor);
 async function uploaded(a){
  const source={title:'SYNTHETIC source',manifest:{sourceRoots:['src'],includeRoots:['include'],testRoots:['tests']},workspace:{entryFile:'src/main.cpp',languageId:'cpp',files:[{path:'src/main.cpp',content:'int main(){return 0;}\n',languageId:'cpp'}]}};
  const answers=Object.fromEntries(Object.keys(QUESTION_MAX).filter(k=>!k.startsWith('P')).map(k=>[k,'SYNTHETIC answer'])),practical=Object.fromEntries(['P1','P2','P3','P4'].map(k=>[k,source]));
  const bundle={schemaVersion:1,assessmentId:'cpp.course-final.v1',taskVersion:'1.0.0',rubricVersion:'1.0.0',variant:a.variant,answers,practical,project:{trackId:a.trackId,source},report:'SYNTHETIC protocol source, not an actual learner result'},bytes=Buffer.from(JSON.stringify(bundle)),snapshotHash=sha(bytes);
  const begin=await call({phase:'begin',requestId:request(),attemptId:a.id,snapshotHash,totalBytes:bytes.length,chunkCount:1});assert.equal(begin.status,200);const u=begin.body.upload;
  const put={phase:'put',requestId:request(),attemptId:a.id,uploadId:u.id,index:0,data:bytes.toString('base64'),sha256:sha(bytes)};
  assert.equal((await call(put)).status,200);
  const proof={phase:'certify',intent:'submit',requestId:request(),attemptId:a.id,uploadId:u.id,snapshotHash,totalBytes:bytes.length,expectedVersion:a.version,automatic:null,completeness:{answers:Object.fromEntries(Object.keys(answers).map(k=>[k,true])),practical:{P1:true,P2:true,P3:true,P4:true},project:true}};
  return{bytes,bundle,u,put,proof};
 }
 return{...f,student,teacher,other,callAssessment:call,open,uploaded};
}
test('private signed protocol: snapshot, ACL, ручная оценка, коррекция, апелляция и пересдача',async()=>{
 const f=await fixture();try{
  const c=(p,actor)=>f.callAssessment(p,actor),accounts=f.db.prepare('SELECT id,display_name,status,updated_at FROM account_subjects ORDER BY id').all();f.db.prepare('INSERT INTO nexus_admin_nonces VALUES(?,?)').run('legacy-replay-retained','2000-01-01');
  const caps=await c({phase:'capabilities'});assert.equal(caps.status,200);assert.equal(caps.body.canAssign,false);
  const opened=await f.open();assert.equal(opened.status,200);const a=opened.body.attempt;assert.equal(a.ordinal,1);
  assert.equal((await c({phase:'detail',attemptId:a.id},f.other)).status,404);
  const data=await f.uploaded(a),charged=f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes;
  assert.equal(charged,data.bytes.length);assert.equal((await c({...data.put,requestId:request()})).status,200);assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes,charged);
  assert.equal((await c({phase:'parts',attemptId:a.id,uploadId:data.u.id,offset:0},f.other)).status,404);
  const parts=await c({phase:'parts',attemptId:a.id,uploadId:data.u.id,offset:0});assert.equal(Buffer.from(parts.body.parts[0].data,'base64').equals(data.bytes),true);
  assert.throws(()=>f.db.prepare('UPDATE nexus_assessment_parts SET data=?').run(Buffer.alloc(data.bytes.length)));
  assert.equal((await c({phase:'submit',requestId:request(),attemptId:a.id,uploadId:data.u.id})).status,400,'Worker does not accept uncertified public submit');
  const submitted=await c(data.proof);assert.equal(submitted.status,200);assert.equal(submitted.body.attempt.snapshotHash,sha(data.bytes));
  assert.equal((await c({...data.put,requestId:request()})).status,409);
  assert.equal((await c({phase:'detail',attemptId:a.id},f.owner)).status,404,'administrator is not automatically a source reviewer');
  let now=submitted.body.attempt;
  assert.equal((await c({phase:'assign',requestId:request(),attemptId:a.id,expectedVersion:now.version,reviewerId:f.student.id},f.owner)).status,403);
  const assigned=await c({phase:'assign',requestId:request(),attemptId:a.id,expectedVersion:now.version,reviewerId:f.teacher.id},f.owner);assert.equal(assigned.status,200);now=assigned.body.attempt;
  const input={phase:'review',requestId:request(),attemptId:a.id,expectedVersion:now.version,previousReviewId:null,review:expert()};
  assert.equal((await c(input,f.student)).status,403);assert.equal((await c(input,f.other)).status,404);
  const graded=await c(input,f.teacher);assert.equal(graded.status,200);assert.equal(graded.body.review.result.status,'passed');assert.equal(graded.body.review.result.weighted,100);assert.equal(graded.body.review.result.empiricallyValidated,false);
  const original=f.db.prepare('SELECT * FROM nexus_assessment_reviews WHERE id=?').get(graded.body.review.id);assert.throws(()=>f.db.prepare("UPDATE nexus_assessment_reviews SET result='{}' WHERE id=?").run(original.id));
  const correction=expert();correction.exam.P1=correction.exam.P2=correction.exam.P3=0;
  const revised=await c({...input,requestId:request(),expectedVersion:graded.body.attempt.version,previousReviewId:original.id,review:correction},f.teacher);assert.equal(revised.status,200);assert.equal(revised.body.review.result.status,'requires-revision');assert.deepEqual(f.db.prepare('SELECT * FROM nexus_assessment_reviews WHERE id=?').get(original.id),original);
  const appeal=await c({phase:'appeal',requestId:request(),attemptId:a.id,reviewId:revised.body.review.id,text:'SYNTHETIC: please clarify the diagnosis criterion.'});assert.equal(appeal.status,200);
  const detail=await c({phase:'detail',attemptId:a.id});assert.equal(detail.body.history.length,2);assert.equal(detail.body.appeals.length,1);assert.equal(detail.body.review.result.status,'requires-revision');
  const next=await f.open(f.student,a.id);assert.equal(next.status,200);assert.notEqual(next.body.attempt.variant,a.variant);assert.equal(next.body.attempt.parentAttemptId,a.id);assert.equal((await f.open(f.student,a.id)).status,409);
  assert.equal(f.db.prepare("SELECT nonce FROM nexus_admin_nonces WHERE nonce='legacy-replay-retained'").get().nonce,'legacy-replay-retained');assert.deepEqual(f.db.prepare('SELECT id,display_name,status,updated_at FROM account_subjects ORDER BY id').all(),accounts);
  assert.equal((await c({phase:'detail',attemptId:a.id,grade:100})).status,400);
 }finally{f.close()}
});
test('CAS запрещает позднюю оценку после переназначения; отзыв сессии сохраняет source',async()=>{
 const f=await fixture();try{
  const a=(await f.open()).body.attempt,d=await f.uploaded(a);let now=(await f.callAssessment(d.proof)).body.attempt;
  now=(await f.callAssessment({phase:'assign',requestId:request(),attemptId:a.id,expectedVersion:now.version,reviewerId:f.teacher.id},f.owner)).body.attempt;
  f.beforeBatch(()=>f.db.prepare('UPDATE nexus_assessment_attempts SET reviewer_id=?,version=version+1 WHERE id=?').run(f.other.id,a.id));
  const r=await f.callAssessment({phase:'review',requestId:request(),attemptId:a.id,expectedVersion:now.version,previousReviewId:null,review:expert()},f.teacher);assert.equal(r.status,409);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_reviews').get().n,0);
  f.db.prepare("UPDATE account_sessions SET status='revoked' WHERE id=?").run(f.student.session);assert.equal((await f.callAssessment({phase:'parts',attemptId:a.id,uploadId:d.u.id,offset:0})).status,401);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_parts').get().n,1);
 }finally{f.close()}
});
test('новый replay namespace и отключённый feature не меняют старые replay records',async()=>{
 const f=await fixture();try{
  const req=f.signed(ASSESSMENT_PATH,{method:'POST',actor:f.student,payload:{phase:'capabilities'}}),{handleAdminService}=await import('../server-access/worker/admin-service.mjs');
  assert.equal((await handleAdminService(req.clone(),f.env)).status,200);assert.equal((await handleAdminService(req.clone(),f.env)).status,401);
  const before=f.db.prepare('SELECT count(*) n FROM nexus_assessment_nonces').get().n;
  assert.equal((await f.call(ASSESSMENT_PATH,{method:'POST',actor:f.student,payload:{phase:'capabilities'}},{...f.env,COURSE_FINAL_ENABLED:'false'})).status,503);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_nonces').get().n,before);
 }finally{f.close()}
});
test('отзыв сессии между проверкой и commit откатывает загрузку',async()=>{
 const f=await fixture();try{
  const a=(await f.open()).body.attempt;f.beforeBatch(()=>f.db.prepare("UPDATE account_sessions SET status='revoked' WHERE id=?").run(f.student.session));
  const r=await f.callAssessment({phase:'begin',requestId:request(),attemptId:a.id,snapshotHash:sha('abc'),totalBytes:3,chunkCount:1});assert.equal(r.status,409);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_uploads').get().n,0);
 }finally{f.close()}
});
test('nonce/роль администратора не дают позднее назначение после отзыва grant',async()=>{
 const f=await fixture();try{
  const a=(await f.open()).body.attempt,d=await f.uploaded(a),s=(await f.callAssessment(d.proof)).body.attempt;
  f.beforeBatch(()=>f.db.prepare("UPDATE nexus_admin_grants SET status='revoked' WHERE account_id=?").run(f.owner.id));
  const r=await f.callAssessment({phase:'assign',requestId:request(),attemptId:a.id,expectedVersion:s.version,reviewerId:f.teacher.id},f.owner);assert.equal(r.status,409);assert.equal(f.db.prepare('SELECT reviewer_id FROM nexus_assessment_attempts WHERE id=?').get(a.id).reviewer_id,null);
 }finally{f.close()}
});
test('одновременные разные bytes одной части не получают ложное подтверждение',async()=>{
 const f=await fixture();try{
  const a=(await f.open()).body.attempt,b=await f.callAssessment({phase:'begin',requestId:request(),attemptId:a.id,snapshotHash:sha('abc'),totalBytes:3,chunkCount:1}),u=b.body.upload;
  f.beforeBatch(()=>f.db.prepare('INSERT INTO nexus_assessment_parts(upload_id,account_id,part_index,bytes,sha256,data) VALUES(?,?,0,3,?,?)').run(u.id,f.student.id,sha('def'),Buffer.from('def')));
  const r=await f.callAssessment({phase:'put',requestId:request(),attemptId:a.id,uploadId:u.id,index:0,data:Buffer.from('abc').toString('base64'),sha256:sha('abc')});assert.equal(r.status,409);assert.equal(r.body.error.code,'ASSESSMENT_PART_CONFLICT');assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes,3);
 }finally{f.close()}
});
test('source quota отклоняет часть до изменения source/счётчиков',async()=>{
 const f=await fixture();try{
  const a=(await f.open()).body.attempt,b=await f.callAssessment({phase:'begin',requestId:request(),attemptId:a.id,snapshotHash:sha('abc'),totalBytes:3,chunkCount:1}),u=b.body.upload;
  f.db.prepare('UPDATE nexus_assessment_owners SET bytes=? WHERE account_id=?').run(24*1024*1024-2,f.student.id);
  const r=await f.callAssessment({phase:'put',requestId:request(),attemptId:a.id,uploadId:u.id,index:0,data:Buffer.from('abc').toString('base64'),sha256:sha('abc')});assert.equal(r.status,409);assert.equal(r.body.error.code,'ASSESSMENT_QUOTA');assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_parts').get().n,0);assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes,0);
 }finally{f.close()}
});
