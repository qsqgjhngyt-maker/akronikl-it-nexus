import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {CLARITY_COURSES} from '../core/clarity-course-registry.mjs';
import {emptyClarityDraft,validateClarityDraft,validateInputSnapshot} from '../core/cpp-clarity-r3-state.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
test('all 151 canonical topics have a coherent RU/EN lesson, adjacent examples and distinct independent work',async()=>{
 const catalog=await read('courses/clarity/courses.json'),ids=catalog.flatMap(c=>c.topics.map(t=>t.id));assert.equal(new Set(ids).size,151);assert.deepEqual(new Set(ids),new Set(Object.keys(CLARITY_COURSES)));
 for(const c of catalog){const source=await read('courses/'+c.id+'/curriculum.json');assert.deepEqual(new Set(c.topics.map(t=>t.id)),new Set(c.id==='cpp'?source.lessons.map(t=>t.id):source.modules.flatMap(m=>m.topics.map(t=>t.topicId))));}
 for(const id of ids){const reg=CLARITY_COURSES[id],base=reg.pilot?'cpp-clarity-r3':'clarity',lessons=[];for(const locale of ['ru','en']){
  const l=await read(`courses/${base}/lessons/${id}.${locale}.json`);lessons.push(l);assert.equal(l.id,id);assert.equal(l.courseId,reg.courseId);assert.equal(l.locale,locale);assert.ok(l.goal.trim());assert.ok(l.sections.length>=5);assert.equal(new Set(l.sections.map(s=>s.id)).size,l.sections.length);
  assert.ok(l.sections.some(s=>(s.code&&typeof s.code.output==='string')||(reg.pilot&&s.tables?.some(t=>t.rows?.length))));assert.ok(l.sections.flatMap(s=>s.paragraphs).every(s=>typeof s==='string'&&s.trim()));
  for(const q of l.selfcheck){assert.equal(reg.questions[q.id],q.kind==='free'?'free':q.options.length);if(q.kind!=='free'){assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length);assert.equal(new Set(q.options).size,q.options.length,id+' ambiguous choices');}}
  assert.ok(l.practice.task&&l.practice.criteria.length);assert.ok(l.sections.some(s=>s.id===l.practice.returnAnchor),id+' example anchor');
  if(reg.runtime==='cpp-console'){assert.ok(l.practice.files.some(f=>f.path==='main.cpp'));assert.ok(l.practice.files.every(f=>typeof f.content==='string'));}
  if(reg.runtime==='qt-project')assert.equal(l.practice.metadata.target,'qt-wasm');
  assert.ok(!JSON.stringify(l).includes('data-gold-depth'));
  validateClarityDraft(id,emptyClarityDraft(id),{persisted:false});
 }
 assert.deepEqual(lessons[0].selfcheck.map(q=>[q.id,q.correct]),lessons[1].selfcheck.map(q=>[q.id,q.correct]),id+' locales');
 }
});
test('new topics remain a closed registry; applied and programming 1C cannot borrow each other’s draft',()=>{
 assert.throws(()=>emptyClarityDraft('onec.p99.topic-1'),/R3_TOPIC_REJECTED/);
 const draft=emptyClarityDraft('1c-enterprise.a1.orientation');assert.throws(()=>validateClarityDraft('onec.p1.architecture',draft,{persisted:false}),/R3_SCHEMA_INVALID/);
 draft.answers.invented={value:0,checked:false,contentRevision:'clarity-courses-v1'};assert.throws(()=>validateClarityDraft(draft.topicId,draft,{persisted:false}),/R3_QUESTION_REJECTED/);
});
test('multifile snapshots preserve compilation inputs and reject unknown fields and missing translation units',()=>{
 const input={languageId:'cpp',source:'int main(){}',stdin:'',entryFile:'main.cpp',files:[{path:'main.cpp',content:'int main(){}'},{path:'src/domain.cpp',content:'int f(){return 1;}'}],metadata:{entryFile:'main.cpp',activeFile:'main.cpp',workspaceRevision:0,includeRoots:['include'],translationUnits:['main.cpp','src/domain.cpp']}};
 assert.equal(validateInputSnapshot(input),input);assert.throws(()=>validateInputSnapshot({...input,metadata:{...input.metadata,secret:'no'}}),/R3_SCHEMA_INVALID/);assert.throws(()=>validateInputSnapshot({...input,metadata:{...input.metadata,translationUnits:['missing.cpp']}}),/R3_BUILD_FILE_MISSING/);
});
