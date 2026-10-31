import test from'node:test';import assert from'node:assert/strict';
import{loadConsolidatedBundle,validateConsolidatedBundle}from'../tools/check-onec-consolidation.mjs';
import{createCandidateStore,courseKey,copyProject,gradeQuiz,progressFor}from'../courses/onec-education/model.mjs';
const bundle=loadConsolidatedBundle(),clone=()=>structuredClone(bundle);
const candidateStore=(storage,id)=>createCandidateStore(storage,id,bundle.courses.find(c=>c.courseId===id));
function bad(change,code){const b=clone();change(b);const r=validateConsolidatedBundle(b);assert.equal(r.ok,false);assert.match(r.errors.join('\n'),code);}
test('Все 95 исходных тем рассмотрены; 80 ID сохранены, четыре добавления сохранены, A2/P2 разработаны',()=>{const r=validateConsolidatedBundle(bundle);assert.equal(r.ok,true,r.errors.join('\n'));assert.equal(r.stats.canonicalTopics,84);});
test('Пропущенная или продублированная тема сравнения отклоняется',()=>{bad(b=>b.mapping.entries.pop(),/EXHAUSTIVE_95_MAPPING/);bad(b=>b.mapping.entries[1]=b.mapping.entries[0],/EXHAUSTIVE_95_MAPPING/);});
test('Архив #62 защищён hashes; исходная функция сохраняется точно',()=>{bad(b=>b.sourceFiles['authoring/onec/lessons.json']+=' ',/SOURCE62_HASH/);bad(b=>b.nativeModule=b.nativeModule.replace('Минуты \* ТарифЗаЧас / 60','0'),/EXACT_SERVICE_COST_FUNCTION/);});
test('Третий Course ID, чужая тема и потеря исходного ID отклоняются',()=>{bad(b=>b.courses[0].courseId='onec-programming',/CANONICAL_COURSE_IDS/);bad(b=>b.lessons[0].courseId='1c-enterprise',/LESSON_COURSE_SCOPE/);bad(b=>b.courses[0].modules[0].topics[0].topicId='onec.p1.renamed',/BASELINE_TOPIC_PRESERVED/);});
test('Циклы и отсутствующие prerequisites отклоняются',()=>{bad(b=>b.courses[0].modules[0].prerequisites=['onec.p2'],/PREREQUISITE_CYCLE/);bad(b=>b.courses[0].modules[0].prerequisites=['onec.missing'],/MISSING_PREREQUISITE/);});
test('latest вместо shared version, неизвестный источник и пустой EN отклоняются',()=>{bad(b=>b.lessons[0].sharedRefs=['onec.shared.v1@latest'],/SHARED_PIN/);bad(b=>b.lessons[0].sources=['unknown'],/UNKNOWN_SOURCE/);bad(b=>b.lessons.find(l=>l.locale==='en').sections=[],/EMPTY_THEORY/);bad(b=>b.lessons.find(l=>l.topicId==='1c-enterprise.a1.interface').contentRevision='0.2.0-consolidated',/CONTENT_REVISION/);});
test('Изменение ключа, scope, автоматический зачёт и AVAILABLE отклоняются',()=>{bad(b=>b.contracts[0].runtimeCompatibility.progressStateKey='new-key',/PROGRESS_KEY_PRESERVED/);bad(b=>b.contracts[0].topics[0].moduleId='onec.p2',/CP11_MODULE_SCOPE/);bad(b=>b.mapping.entries[0].progressAlias=true,/MAPPING_TARGET_OR_CREDIT/);bad(b=>b.manifests[0].catalogStatus='available-alpha',/UNACCEPTED_AVAILABLE/);});
test('Недоказанные futureExtensions и придуманный environment PASS отклоняются',()=>{bad(b=>b.contracts[0].futureExtensions.masteryModel='implemented',/UNPROVED_FUTURE_EXTENSIONS/);bad(b=>b.supplement.labs.find(x=>x.id==='environment-record').template.executionVerified=true,/UNKNOWN_ENVIRONMENT_NOT_PASS/);});
test('Неверная арифметическая спецификация и ключи RU/EN отклоняются',()=>{bad(b=>b.supplement.labs.find(x=>x.id==='service-cost').cases[0].expected=301,/SERVICE_COST_SPECIFICATION/);bad(b=>b.lessons.find(l=>l.locale==='en').quiz[0].correct=99,/RU_EN_ANSWER_KEYS/);});
test('Исходные shared v1 и REQ-данные не заменены материалом #62',()=>{bad(b=>b.preservedFixture+=' ',/SERVICE_DESK_BYTES_PRESERVED/);bad(b=>b.preservedShared+=' ',/SHARED_V1_BYTES_PRESERVED/);});
test('Старые progress, attempts и provenance не переписываются при чтении новой ревизии',()=>{
 const saved={schemaVersion:1,courseId:'onec',lessons:{'onec.p1.architecture':{completed:true,labAttested:true,attempts:[{at:'2026-10-30T00:00:00Z',grade:{passed:true,kind:'local-self-check'},answers:[1,0,2]}]}},projects:[{id:'preserve',courseId:'onec',note:'ORIGINAL',origin:{sourceProjectId:'older',sourceCourseId:'1c-enterprise',credit:'none'}}]},raw=JSON.stringify(saved),map=new Map([[courseKey('onec'),raw]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},s=candidateStore(storage,'onec');
 assert.deepEqual(s.read(),saved);assert.equal(map.get(courseKey('onec')),raw);assert.equal(progressFor(bundle.courses.find(c=>c.courseId==='onec'),s.read()).done,1);
 assert.throws(()=>s.complete('onec.p1.architecture',true,'0.2.0-consolidated'),/CURRENT_REVISION_ATTEMPT_REQUIRED/);assert.equal(map.get(courseKey('onec')),raw);
 s.attempt('onec.p1.architecture',gradeQuiz([{correct:0}],[0]),[0],{attemptId:'new-attempt',contentRevision:'0.2.0-consolidated',sharedRefs:['onec.shared.v1@1.0.0']});
 assert.deepEqual(s.read().lessons['onec.p1.architecture'].attempts[0],saved.lessons['onec.p1.architecture'].attempts[0]);assert.deepEqual(s.read().projects,saved.projects);s.complete('onec.p1.architecture',true,'0.2.0-consolidated');assert.equal(s.read().lessons['onec.p1.architecture'].completionHistory[0].kind,'preserved-prior-self-report');
 const before=map.get(courseKey('onec'));assert.throws(()=>s.attempt('onec.p1.architecture',gradeQuiz([{correct:0}],[0]),[0],{attemptId:'new-attempt'}),/ATTEMPT_EXISTS/);assert.equal(map.get(courseKey('onec')),before);
});
test('Новая копия не использует ID источника и не переносит authority',()=>{const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},a=candidateStore(storage,'1c-enterprise'),p=candidateStore(storage,'onec');a.createProject({id:'source',note:'synthetic'});assert.throws(()=>copyProject(a,p,'source','source'),/NEW_PROJECT_ID_REQUIRED/);copyProject(a,p,'source','new');assert.deepEqual(p.read().lessons,{});assert.equal(p.read().projects[0].origin.credit,'none');});

test('REVIEW-02: неизвестная и PLANNED тема не создают attempt/completion; старые записи не очищаются',()=>{
 const old={schemaVersion:1,courseId:'onec',lessons:{'onec.p1.not-in-curriculum':{completed:true,attempts:[{at:'prior',grade:{kind:'local-self-check',passed:true}}]}},projects:[{id:'old-project',note:'original',origin:{sourceProjectId:'source',credit:'none'}}]},raw=JSON.stringify(old),map=new Map([[courseKey('onec'),raw]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},planned=structuredClone(bundle.courses[0]);planned.modules[2].status='PLANNED';const store=createCandidateStore(storage,'onec',planned),grade=gradeQuiz([{correct:0}],[0]);
 assert.deepEqual(store.read(),old);assert.equal(progressFor(bundle.courses[0],store.read()).done,0);
 for(const [id,error]of [['onec.p1.not-in-curriculum',/UNKNOWN_TOPIC/],['onec.p3.topic-1',/TOPIC_NOT_IMPLEMENTED/],['1c-enterprise.a1.orientation',/FOREIGN_TOPIC/]]){
  assert.throws(()=>store.attempt(id,grade,[0]),error);assert.throws(()=>store.complete(id,true),error);assert.equal(map.get(courseKey('onec')),raw);
 }
 store.attempt('onec.p1.architecture',grade,[0]);assert.deepEqual(store.read().lessons['onec.p1.not-in-curriculum'],old.lessons['onec.p1.not-in-curriculum']);assert.deepEqual(store.read().projects,old.projects);
});
test('Без curriculum запись зачёта закрыта; чтение/заметки остаются совместимыми',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},store=createCandidateStore(storage,'onec');
 assert.throws(()=>store.attempt('onec.p1.architecture',gradeQuiz([{correct:0}],[0]),[0]),/CURRICULUM_REQUIRED/);assert.throws(()=>store.complete('onec.p1.architecture',true),/CURRICULUM_REQUIRED/);assert.equal(map.size,0);
 store.createProject({id:'note',note:'compatible'});assert.equal(store.read().projects[0].note,'compatible');assert.throws(()=>createCandidateStore(storage,'onec',bundle.courses.find(c=>c.courseId==='1c-enterprise')),/INVALID_CURRICULUM/);
});

test('Редакционная ревизия A1.3 не присваивается старому самоотчёту задним числом',()=>{
 const id='1c-enterprise.a1.interface',key=courseKey('1c-enterprise'),oldAttempt={attemptId:'prior-A',at:'prior',grade:{passed:true,kind:'local-self-check'},answers:[1,0,2],contentRevision:'0.2.0-consolidated'},raw=JSON.stringify({schemaVersion:1,courseId:'1c-enterprise',lessons:{[id]:{completed:true,completionRevision:'0.2.0-consolidated',attempts:[oldAttempt]}},projects:[]}),map=new Map([[key,raw]]),store=candidateStore({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},'1c-enterprise');
 assert.equal(progressFor(bundle.courses.find(c=>c.courseId==='1c-enterprise'),store.read()).done,1);assert.throws(()=>store.complete(id,true,'0.2.1-review'),/CURRENT_REVISION_ATTEMPT_REQUIRED/);assert.equal(map.get(key),raw);
 store.attempt(id,gradeQuiz([{correct:0}],[0]),[0],{attemptId:'review-A',contentRevision:'0.2.1-review'});store.complete(id,true,'0.2.1-review');assert.deepEqual(store.read().lessons[id].attempts[0],oldAttempt);assert.equal(store.read().lessons[id].completionHistory[0].contentRevision,'0.2.0-consolidated');
});
