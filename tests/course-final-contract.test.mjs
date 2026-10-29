import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{calculateReview,QUESTION_MAX,PROJECT_RUBRIC,DEFENSE_RUBRIC,validateSubmissionBundle,ASSESSMENT_ID,TASK_VERSION,RUBRIC_VERSION}from'../course-final/contract.js';
const review=()=>({exam:{...QUESTION_MAX},project:{...PROJECT_RUBRIC},defense:{...DEFENSE_RUBRIC},feedback:'Synthetic expert feedback for the submitted source.',defenseMode:'written',defenseEvidence:'Synthetic explanation and new control change were checked.',guiObserved:true,authorshipVerified:true,controlChangeVerified:true,blockingReasons:[]});
test('40/50/10, самостоятельные пороги и обязательные наблюдения',()=>{
 assert.equal(calculateReview(review()).weighted,100);assert.equal(calculateReview(review()).status,'passed');
 const low=review();low.exam.P1=0;low.exam.P2=0;low.exam.P3=0;assert.equal(calculateReview(low).status,'requires-revision');assert.ok(calculateReview(low).weighted>60);
 for(const key of['guiObserved','authorshipVerified','controlChangeVerified']){const r=review();r[key]=false;assert.equal(calculateReview(r).status,'requires-revision')}
 const r=review();r.blockingReasons=['Reproducible data-loss defect'];assert.equal(calculateReview(r).status,'requires-revision');
});
test('лишние grade/owner и неверные баллы отвергаются',()=>{
 for(const change of[r=>r.owner='other',r=>r.exam.C01=3,r=>r.exam.C01=NaN,r=>r.project.tests=-1,r=>r.defense.model=0.3,r=>delete r.exam.P4]){const r=review();change(r);assert.throws(()=>calculateReview(r))}
});
test('72 RU/EN задания имеют проверяемое покрытие и отдельные versioned IDs',async()=>{
 const ids=new Set(),lessonIds=new Set(JSON.parse(await readFile('courses/cpp/curriculum.json')).lessons.map(l=>l.id));
 for(const variant of['a','b','c']){const b=JSON.parse(await readFile('courses/cpp/final/exam-'+variant+'.json'));assert.equal(b.items.length,24);assert.equal(b.items.reduce((n,q)=>n+q.points,0),100);assert.deepEqual(Object.values(b.coverage),[12,12,18,18,22,18]);
  for(const q of b.items){assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(q.prompt.ru.length>80&&q.prompt.en.length>80);assert.equal(q.rubric.reduce((n,r)=>n+r.points,0),q.points);for(const ref of q.lessonRefs)assert.ok(lessonIds.has(ref));assert.equal(Object.hasOwn(q,'correctAnswer'),false);assert.equal(Object.hasOwn(q,'solution'),false)}
 }assert.equal(ids.size,72);
});
test('submission не смешивает итоговую попытку с прежним progress или credentials',()=>{
 const answers=Object.fromEntries(Object.keys(QUESTION_MAX).filter(k=>!k.startsWith('P')).map(k=>[k,'']));
 const bundle={schemaVersion:1,assessmentId:ASSESSMENT_ID,taskVersion:TASK_VERSION,rubricVersion:RUBRIC_VERSION,variant:'A',answers,practical:{P1:null,P2:null,P3:null,P4:null},project:{trackId:'taskflow',source:null},report:'Partial work for expert review'};
 assert.equal(validateSubmissionBundle(bundle,{variant:'A',trackId:'taskflow',mode:'expert'}),bundle);
 assert.throws(()=>validateSubmissionBundle({...bundle,owner:'other'},{variant:'A',trackId:'taskflow',mode:'expert'}));
 assert.throws(()=>validateSubmissionBundle({...bundle,report:'nxs_'+'A'.repeat(43)},{variant:'A',trackId:'taskflow',mode:'expert'}));
 assert.throws(()=>validateSubmissionBundle(bundle,{variant:'B',trackId:'taskflow',mode:'expert'}));
});
