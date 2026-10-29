// Только synthetic SQLite: проверка существующего явного destructive workflow.
// Реальные аккаунты и production не затрагиваются.
import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash,randomUUID}from'node:crypto';import{controlFixture}from'./helpers/control-fixture.mjs';
import{AUTOMATIC_POLICY,THEORY_IDS,PRACTICAL_CHECKS,PROJECT_CHECKS,DEFENSE_CHECKS,emptyChecks,calculateAutomatic}from'../course-final/automatic-policy.js';
const id=()=>randomUUID(),sha=v=>createHash('sha256').update(v).digest('hex');
async function fixture(){const f=await controlFixture();f.db.exec(await readFile('server-access/migrations/0018_course_final.sql','utf8'));return f}
function seedWork(f,actor){
 const a=id(),u=id(),hash=sha('x'),time=new Date().toISOString();f.db.prepare('INSERT INTO nexus_assessment_owners(account_id) VALUES(?)').run(actor.id);
 f.db.prepare("INSERT INTO nexus_assessment_attempts(id,account_id,assessment_id,task_version,rubric_version,variant,track_id,ordinal,create_request_id,created_at) VALUES(?,?,'cpp.course-final.v1','1.0.0','1.0.0','A','taskflow',1,?,?)").run(a,actor.id,id(),time);
 f.db.prepare('INSERT INTO nexus_assessment_uploads VALUES(?,?,?,?,?,?)').run(u,a,hash,1,1,time);f.db.prepare('INSERT INTO nexus_assessment_parts VALUES(?,?,?,?,?,?)').run(u,actor.id,0,1,hash,Buffer.from('x'));
 f.db.prepare("UPDATE nexus_assessment_attempts SET status='assessed',snapshot_hash=?,upload_id=?,version=version+1 WHERE id=?").run(hash,u,a);
 const proof={policy:AUTOMATIC_POLICY,choices:Object.fromEntries(THEORY_IDS.map(k=>[k,null])),practical:Object.fromEntries(Object.entries(PRACTICAL_CHECKS).map(([k,max])=>[k,emptyChecks(max)])),project:emptyChecks(PROJECT_CHECKS),defense:emptyChecks(DEFENSE_CHECKS),codeChanged:false},keys=Object.fromEntries(THEORY_IDS.map(k=>[k,'o1'])),result=JSON.stringify(calculateAutomatic(proof,keys));
 f.db.prepare('INSERT INTO nexus_assessment_auto_results VALUES(?,?,?,?,?,?)').run(a,actor.id,hash,result,time,Buffer.byteLength(result));return{a,u,bytes:1+Buffer.byteLength(result)};
}
const remove=(f,actor)=>f.db.prepare("UPDATE nexus_alpha_members SET state='removed',version=2 WHERE account_id=?").run(actor.id);
const preview=(f,actor)=>f.call('/api/v2/account/control/users/'+actor.id+'/purge-preview',{method:'POST',payload:{requestId:id(),version:2}});
const execute=(f,actor,p)=>f.call('/api/v2/account/control/users/'+actor.id+'/purge',{method:'POST',payload:{requestId:id(),version:2,approvalToken:p.approvalToken,confirmation:p.confirmation}});
test('preview явно перечисляет итоговые работы; согласованный purge удаляет только собственные снимки и освобождает quota',async()=>{
 const f=await fixture();try{const target=f.seed('synthetic-purge-final'),other=f.seed('synthetic-keep-final'),own=seedWork(f,target),keep=seedWork(f,other);f.db.prepare('INSERT INTO nexus_assessment_answer_keys VALUES(?,?,?,?)').run(AUTOMATIC_POLICY,'A','0'.repeat(64),'{}');remove(f,target);
 const p=await preview(f,target);assert.equal(p.status,200);assert.equal(p.body.counts.courseFinalAttempts,1);assert.equal(p.body.counts.courseFinalBytes,own.bytes);const r=await execute(f,target,p.body);assert.equal(r.status,200);
 for(const table of['nexus_assessment_owners','nexus_assessment_attempts','nexus_assessment_parts','nexus_assessment_auto_results'])assert.equal(f.db.prepare('SELECT count(*) n FROM '+table+' WHERE account_id=?').get(target.id).n,0);
 assert.equal(f.db.prepare('SELECT snapshot_hash FROM nexus_assessment_attempts WHERE id=?').get(keep.a).snapshot_hash,sha('x'));assert.equal(f.db.prepare('SELECT bytes,attempts_count FROM nexus_assessment_usage').get().bytes,keep.bytes);assert.equal(f.db.prepare('SELECT attempts_count FROM nexus_assessment_usage').get().attempts_count,1);assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_owners WHERE account_id=?').get(other.id).bytes,keep.bytes);assert.equal(f.db.prepare('SELECT count(*) n FROM nexus_assessment_answer_keys').get().n,1);assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(target.id),undefined);
 }finally{f.close()}
});
test('новая assessment schema не блокирует purge не связанного с курсом аккаунта',async()=>{
 const f=await fixture();try{const target=f.seed('synthetic-purge-unrelated'),other=f.seed('synthetic-keep-work'),keep=seedWork(f,other);remove(f,target);const p=await preview(f,target);assert.equal(p.status,200);assert.equal(p.body.counts.courseFinalAttempts,0);assert.equal((await execute(f,target,p.body)).status,200);assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes,keep.bytes);assert.ok(f.db.prepare('SELECT id FROM nexus_assessment_attempts WHERE id=?').get(keep.a))}finally{f.close()}
});
test('новый snapshot/version после preview отменяет destructive commit и сохраняет работы',async()=>{
 const f=await fixture();try{const target=f.seed('synthetic-purge-race'),own=seedWork(f,target);remove(f,target);const p=await preview(f,target);assert.equal(p.status,200);f.beforeBatch(()=>f.db.prepare('UPDATE nexus_assessment_attempts SET version=version+1 WHERE id=?').run(own.a));const r=await execute(f,target,p.body);assert.equal(r.status,409);assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(target.id));assert.equal(f.db.prepare('SELECT bytes FROM nexus_assessment_usage').get().bytes,own.bytes);assert.ok(f.db.prepare('SELECT upload_id FROM nexus_assessment_parts WHERE upload_id=?').get(own.u))}finally{f.close()}
});
test('неизвестная или неполная schema не получает разрешение destructive path',async()=>{
 for(const change of[db=>db.exec('CREATE TABLE unknown_future_data(id TEXT)'),db=>db.exec('DROP TABLE nexus_assessment_answer_keys')]){const f=await fixture();try{const target=f.seed('synthetic-purge-schema');remove(f,target);change(f.db);const r=await preview(f,target);assert.equal(r.status,409);assert.equal(r.body.error.code,'PURGE_SCHEMA_REVIEW_REQUIRED');assert.ok(f.db.prepare('SELECT id FROM account_subjects WHERE id=?').get(target.id))}finally{f.close()}}
});
