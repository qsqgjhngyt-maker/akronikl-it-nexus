import {B1_NEW} from './helpers/cpp-clarity-b1-content.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {emptyClarityDraft,validateClarityDraft,answerIsChecked,clarityContentRevision} from '../core/cpp-clarity-r3-state.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
test('Типы: весь авторский источник дошёл до RU/EN; обязательное покрытие вне углубления',async()=>{
 for(const locale of ['ru','en']){const g=await read(`courses/cpp/gold/basics/data-types.${locale}.json`),a=g.teachingEdition,l=await read(`courses/clarity/lessons/cpp.data-types.${locale}.json`);
  for(const key of ['sections','selfcheck','practice','reading'])assert.deepEqual(l[key],a[key],key);
  for(const id of Object.values(a.coverage)){const section=l.sections.find(s=>s.id===id);assert.ok(section&&section.paragraphs.length>=2,id);}
  assert.equal(l.contentRevision,clarityContentRevision(l.id));assert.ok(l.sections[0].reveal);assert.equal(l.sections[0].reveal.tables[0].rows[0][1],'15 (int)');assert.equal(l.sections[0].reveal.tables[0].rows[1][1],'15.5 (double)');
  assert.ok(l.selfcheck.every(q=>l.sections.some(s=>s.id===q.recall)));assert.ok(l.practice.files[0].content.includes('parts{53}'));assert.ok(!l.practice.files[0].content.includes('parts / 10'));assert.ok(a.referenceProgram.includes('parts / 10'));
 }
});
test('Пересборка сохраняет материал образца и не меняет редакции вне согласованного первого блока',async()=>{
 const catalog=await read('courses/clarity/courses.json'),paths=catalog.flatMap(c=>c.topics.flatMap(t=>['ru','en'].map(locale=>`courses/${['cpp.programming-process','onec.p2.topic-1','onec.p7.topic-2'].includes(t.id)?'cpp-clarity-r3':'clarity'}/lessons/${t.id}.${locale}.json`)));
 const before=await Promise.all(paths.map(p=>readFile(p)));execFileSync(process.execPath,['tools/build-cpp-clarity-courses.mjs']);
 for(let i=0;i<paths.length;i++){assert.deepEqual(await readFile(paths[i]),before[i],paths[i]);if(!paths[i].includes('/cpp.data-types.')&&!B1_NEW.some(id=>paths[i].includes('/'+id+'.')))assert.deepEqual(before[i],execFileSync('git',['-c','core.longpaths=true','show','8b386e1f90bbe6bac5bf00677b223b36eb8e5fed:'+paths[i]],{maxBuffer:2e6}),paths[i]+' outside sample');}
});
test('Прежний ответ сохранён, но не считается проверенным для нового условия',()=>{const d=emptyClarityDraft('cpp.data-types');d.contentRevision='clarity-courses-v1';d.answers.predict={value:1,checked:true,contentRevision:'clarity-courses-v1'};validateClarityDraft(d.topicId,d,{persisted:false});assert.equal(answerIsChecked(d.answers.predict,clarityContentRevision(d.topicId)),false);assert.equal(d.answers.predict.value,1);});
