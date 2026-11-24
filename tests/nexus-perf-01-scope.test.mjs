import assert from 'node:assert/strict';
import test from 'node:test';
import {assertPerfDelta,verifyPerformanceScope,BASELINE} from '../tools/check-nexus-perf-01.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row={file:'core/app.js',status:'M',mode:'100644'};

test('PERF-01 допускает только указанные компоненты маршрутов и блога',()=>{
  for(const file of [
    'courses/c/lessons/c.array-sort.en.json','courses/cpp/curriculum.json',
    'core/account-storage.js','project-studio/project-store.js','server-access/package.json',
    'sandbox/runtime-router.js','pwa/service-worker.js','pwa/policy.js',
    'tools/check-cpp-course-perf.mjs','tools/check-academy-m4.mjs','version.json',
  ]) assert.throws(()=>assertPerfDelta([{...row,file}]),/Путь вне области PERF-01/);
});

test('PERF-01 привязан к точному исходнику и полному набору обычных файлов',()=>{
  assert.throws(()=>assertPerfDelta([row]),/Отсутствуют заявленные/);
  assert.throws(()=>assertPerfDelta([row,row]),/повтор/);
  assert.throws(()=>assertPerfDelta([{...row,status:'R100'}]),/заявленное добавление или изменение/);
  assert.throws(()=>assertPerfDelta([{...row,mode:'120000'}]),/обычный файл/);
  assert.throws(()=>verifyPerformanceScope({base:'0'.repeat(40),head:BASELINE}),/Изменение базы/);
  assert.throws(()=>verifyPerformanceScope({base:C12_BASE,head:'HEAD'}),/точный SHA/);
});
