import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {clarityLessons,clarityIds,clarityPrograms} from './helpers/cpp-clarity-programs.mjs';
import {academyGoldMarkup} from '../core/academy-gold-presentation.js';
const all=await clarityLessons();
test('20 тем, RU/EN: одинаковые исходники, входы и наблюдения при самостоятельных текстах',()=>{
 assert.equal(all.length,40);
 for(const id of clarityIds){const a=all.find(g=>g.lessonId===id&&g.locale==='ru'),b=all.find(g=>g.lessonId===id&&g.locale==='en');
  assert.equal(a.clarity.example.code,b.clarity.example.code);assert.equal(a.clarity.example.stdin,b.clarity.example.stdin);assert.equal(a.clarity.example.expectedStdout,b.clarity.example.expectedStdout);
  assert.deepEqual(a.clarity.training.variants,b.clarity.training.variants);assert.equal(a.clarity.laboratory.referenceCode,b.clarity.laboratory.referenceCode);assert.deepEqual(a.clarity.laboratory.cases,b.clarity.laboratory.cases);
  assert.ok(!/[А-Яа-яЁё]/.test(JSON.stringify(b.clarity)),id);
 }
});
test('Код и обычный stdout находятся до углубления; эталон лабораторной не подставлен в заготовку',()=>{
 for(const g of all){const html=academyGoldMarkup(g),end=html.indexOf('data-gold-depth>');assert.ok(end>0);const main=html.slice(0,end);
  assert.ok(main.includes('data-clarity-example'));assert.ok(main.includes(g.clarity.example.expectedStdout.replaceAll('&','&amp;')));assert.ok(main.includes('<table>'));
  assert.equal((html.match(/id="cppLab"/g)||[]).length,1);assert.ok(main.includes('data-clarity-open="example"'));assert.ok(main.includes('data-clarity-open="training"'));assert.ok(main.includes('data-clarity-open="laboratory"'));
  assert.notEqual(g.clarity.laboratory.starterCode,g.clarity.laboratory.referenceCode);assert.ok(!g.clarity.laboratory.starterCode.includes(g.clarity.laboratory.referenceCode));
 }
 const g=structuredClone(all[0]);g.clarity.model[0]='<img src=x onerror=alert(1)>';g.clarity.example.trace[0].why='<script>bad</script>';const html=academyGoldMarkup(g);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
});
test('Критерий функции различает false, выходной параметр и неверные реализации',async()=>{
 const programs=await clarityPrograms(),good=programs.find(x=>x.name==='functions-atomic-rejection'),mutants=programs.filter(x=>x.name.startsWith('negative-'));
 assert.equal(good.cases[0].stdout,'0 17\n1 12\n');assert.equal(mutants.length,2);assert.ok(mutants.every(x=>x.cases[0].stdout!==good.cases[0].stdout));
 const g=JSON.parse(await readFile('courses/cpp/gold/structured/functions-contracts.ru.json'));assert.ok(g.laboratory.rubric.some(x=>x.includes('result=17')));assert.ok(!g.laboratory.rubric.some(x=>x.includes('O(n)')));
});
