import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateSchema} from '../../tools/content-contract-lib.mjs';
import {resolveLanguage} from '../../sandbox/languages.js';
import {loadBundle,validateBundle,contractFor,curriculumFor,appendPrototypeAttempt,clonePrototypeProject,previewHTML,buildCandidate,ROOT} from './foundation.mjs';

const bundle=loadBundle();
const clone=()=>structuredClone(bundle);
const bad=(change,pattern)=>{const b=clone();change(b);const r=validateBundle(b);assert.equal(r.ok,false);assert.match(r.errors.join('\n'),pattern)};
const attempt=(course,topic,id='attempt-1')=>({learnerScope:'synthetic-learner',courseId:course,topicId:topic,attemptId:id,contentRevision:'0.1.0',kind:'concept-only'});

test('Две программы и авторские материалы проходят структурный gate',()=>{
 const r=validateBundle(bundle);assert.equal(r.ok,true,r.errors.join('\n'));
 assert.equal(r.stats.courses,2);assert.equal(r.stats.modules,20);
 assert.equal(r.stats.authoredLessons,2);assert.equal(r.stats.authoredLocaleBodies,4);
 assert.equal(r.limits.native1C,'NOT RUN');assert.equal(r.limits.bslStaticAnalysis,'NOT RUN');
});
test('Языковой registry и существующая прикладная карточка не переименованы',()=>{
 for(const alias of ['onec','1c','bsl'])assert.equal(resolveLanguage(alias)?.id,'onec');
 assert.deepEqual(resolveLanguage('onec').extensions,['.bsl','.os']);
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'courses/catalog.json'),'utf8'));
 const applied=catalog.courses.find(c=>c.id==='1c-enterprise');assert.equal(applied.status,'planned');assert.equal(applied.route,null);
});
test('Оба индекса валидны по действующей общей CP-1.1 schema',()=>{
 for(const c of bundle.roadmap.courses){const p=contractFor(c,bundle.lessons.lessons);assert.deepEqual(validateSchema(bundle.schema,p),[]);assert.equal(p.status,'draft-contract');assert.equal(p.runtimeCompatibility.runtimeConsumption,'metadata-only');}
});
test('В программах собственные 8 и 12 модулей; профессиональный вход независим',()=>{
 assert.deepEqual(bundle.roadmap.courses.map(c=>c.modules.length),[8,12]);
 for(const c of bundle.roadmap.courses)assert.deepEqual(c.entryCourseRequirements,[]);
});
test('PLANNED темы не становятся authored только из-за наличия curriculum',()=>{
 const ids=new Set(bundle.lessons.lessons.map(l=>l.lessonId));
 const topics=bundle.roadmap.courses.flatMap(c=>curriculumFor(c,ids).modules.flatMap(m=>m.topics));
 assert.equal(topics.filter(t=>t.contentStatus==='authored-candidate').length,2);
 assert.ok(topics.filter(t=>t.contentStatus==='planned').length>0);
});
test('Повторный ID направления отклоняется',()=>bad(b=>{b.roadmap.courses[1].courseId=b.roadmap.courses[0].courseId},/Course ID|Повторный/));
test('Тема из другого курса отклоняется',()=>bad(b=>{b.lessons.lessons[0].courseId='onec-programming'},/не принадлежит/));
test('Повторный topic ID отклоняется',()=>bad(b=>{const m=b.roadmap.courses[0].modules[0];m.topics.push(structuredClone(m.topics[0]))},/Повторный/));
test('Цикл prerequisite отклоняется',()=>bad(b=>{b.roadmap.courses[0].modules[0].prerequisites=['a2']},/Цикл/));
test('Отсутствующий prerequisite отклоняется',()=>bad(b=>{b.roadmap.courses[0].modules[0].prerequisites=['missing']},/Отсутствующий/));
test('Незакреплённая версия общего блока отклоняется',()=>bad(b=>{b.lessons.lessons[0].sharedRefs[0]='onec.platform-configuration-data@latest'},/sharedRef/));
test('Неизвестный источник отклоняется',()=>bad(b=>{b.lessons.lessons[0].sourceRefs.push('UNKNOWN')},/sourceRef/));
test('Пустая английская теория отклоняется',()=>bad(b=>{b.lessons.lessons[0].en.sections=[]},/sections|структура/));
test('Расхождение правильных ответов RU/EN отклоняется',()=>bad(b=>{b.lessons.lessons[0].en.quiz[0].correctIndex=0},/ключи/));
test('Преждевременный AVAILABLE отклоняется',()=>bad(b=>{b.roadmap.courses[0].catalogStatus='available-alpha'},/AVAILABLE/));
test('Недоказанный runtime PASS отклоняется',()=>bad(b=>{b.shared.runtimeProfiles[1].executionVerified=true},/runtime PASS/));
test('Предложение миграции production отклоняется',()=>bad(b=>{b.shared.progressProposal.productionStorageMigration='automatic'},/Миграция/));
test('Неверное ожидание fixture выявляется как ошибка спецификации, не BSL',()=>bad(b=>{b.shared.serviceDeskFixture.requests[0].expectedAmount=301},/арифметики/));
test('Попытка A не засчитывается в P; исходный state не меняется',()=>{
 const state={attempts:[]},a=bundle.lessons.lessons[0],p=bundle.lessons.lessons[1];
 const next=appendPrototypeAttempt(state,attempt(a.courseId,a.lessonId),bundle.roadmap);
 assert.equal(state.attempts.length,0);assert.equal(next.attempts.length,1);
 assert.equal(next.attempts.filter(x=>x.courseId===p.courseId).length,0);
 assert.throws(()=>appendPrototypeAttempt(next,attempt(p.courseId,a.lessonId,'attempt-2'),bundle.roadmap),/COURSE_SCOPE/);
});
test('Новая ревизия сохраняет предыдущую попытку; повторный ID не перезаписывает',()=>{
 const l=bundle.lessons.lessons[0],one=appendPrototypeAttempt({attempts:[]},attempt(l.courseId,l.lessonId),bundle.roadmap);
 const two=appendPrototypeAttempt(one,{...attempt(l.courseId,l.lessonId,'attempt-2'),contentRevision:'0.2.0'},bundle.roadmap);
 assert.equal(one.attempts.length,1);assert.equal(two.attempts.length,2);assert.equal(two.attempts[0].contentRevision,'0.1.0');
 assert.throws(()=>appendPrototypeAttempt(two,attempt(l.courseId,l.lessonId),bundle.roadmap),/ALREADY_EXISTS/);
});
test('Прототип копирования не меняет исходник и не переносит прогресс/authority',()=>{
 const source={id:'source-1',courseId:'1c-enterprise',files:[{path:'Module.bsl',content:'// synthetic'}],progress:{passed:true},access:{owner:'synthetic'},attempts:[{}]};
 const before=structuredClone(source),copy=clonePrototypeProject(source,'onec-programming','copy-1');
 assert.deepEqual(source,before);assert.notEqual(copy.id,source.id);assert.deepEqual(copy.progress,{});assert.deepEqual(copy.attempts,[]);assert.equal(copy.access,undefined);
 copy.files[0].content='changed';assert.equal(source.files[0].content,'// synthetic');
 assert.throws(()=>clonePrototypeProject(source,'onec-programming','source-1'),/INVALID_COPY/);
});
test('Опасные пути прототипа импорта отклоняются',()=>{
 for(const file of ['../Module.bsl','/Module.bsl','C:\\data.bsl','a//b.bsl','a/./b.bsl']){
 assert.throws(()=>clonePrototypeProject({id:'source',courseId:'1c-enterprise',files:[{path:file,content:''}]},'onec-programming','copy'),/UNSAFE_FILE/);
 }
});
test('Превью экранирует HTML из материала и не использует storage/сетевые вызовы',()=>{
 const b=clone();b.lessons.lessons[0].ru.title='<img src=x onerror=alert(1)> </script><script>alert(1)</script>';
 const h=previewHTML(b);assert.ok(!h.includes('<img src=x'));assert.ok(h.includes('\\u003cimg'));
 assert.ok(h.includes("connect-src 'none'"));assert.ok(!/\.innerHTML\s*=|localStorage\.|sessionStorage\.|\bfetch\(/.test(h));
 const match=h.match(/<script>([\s\S]*)<\/script>/);assert.ok(match);new Function(match[1]);
 const expected=createHash('sha256').update(match[1]).digest('base64');assert.ok(h.includes(`'sha256-${expected}'`));
});
test('Сборка создаёт проверяемые файлы и не допускает overwrite',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'onec-study-')),out=path.join(temp,'candidate');
 try{
  const r=buildCandidate(out);assert.equal(r.validation.ok,true);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'BUILD_MANIFEST.json'),'utf8'));
  for(const row of manifest.files){const bytes=fs.readFileSync(path.join(out,row.path));assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256)}
  for(const c of bundle.roadmap.courses){const p=JSON.parse(fs.readFileSync(path.join(out,'courses',c.courseId,'content-package.json'),'utf8'));for(const rel of [p.sourceCompatibility.catalogPath,p.sourceCompatibility.manifestPath,p.sourceCompatibility.curriculumPath,p.sourceCompatibility.provenancePath,...Object.values(p.sourceCompatibility.contentPaths)])assert.ok(fs.existsSync(path.join(out,rel)),rel)}
  assert.throws(()=>buildCandidate(out),/OUTPUT_ALREADY_EXISTS/);assert.throws(()=>buildCandidate(ROOT),/SEPARATE_FROM_SOURCE/);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});
