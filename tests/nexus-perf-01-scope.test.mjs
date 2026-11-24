import assert from 'node:assert/strict';
import test from 'node:test';
import {assertPerfDelta,assertPerfHybridDelta,verifyPerformanceScope,BASELINE} from '../tools/check-nexus-perf-01.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row={file:'core/app.js',status:'M',mode:'100644'};

test('PERF-01 и R3 допускают только указанные компоненты маршрутов и блога',()=>{
  for(const file of [
    'courses/c/lessons/c.array-sort.en.json','courses/cpp/curriculum.json',
    'core/account-storage.js','project-studio/project-store.js','server-access/package.json',
    'sandbox/runtime-router.js','pwa/service-worker.js','pwa/policy.js',
    'tools/check-cpp-course-perf.mjs','tools/check-academy-m4.mjs','version.json',
  ]) {
    assert.throws(()=>assertPerfDelta([{...row,file}]),/Путь вне области PERF-01/);
    assert.throws(()=>assertPerfHybridDelta([{...row,file}]),/Путь вне области PERF-01-R3/);
  }
  assert.throws(()=>assertPerfHybridDelta([{...row,file:'core/blog-presentation.js'}]),/Путь вне области PERF-01-R3/);
  assert.throws(()=>assertPerfHybridDelta([{...row,file:'core/academy-catalog.js'}]),/Путь вне области PERF-01-R3/);
});

test('PERF-01 привязан к точному исходнику и полному набору обычных файлов',()=>{
  assert.throws(()=>assertPerfDelta([row]),/Отсутствуют заявленные/);
  assert.throws(()=>assertPerfDelta([row,row]),/повтор/);
  assert.throws(()=>assertPerfDelta([{...row,status:'R100'}]),/заявленное добавление или изменение/);
  assert.throws(()=>assertPerfDelta([{...row,mode:'120000'}]),/обычный файл/);
  const resume={...row,file:'core/nexus-learning-resume.js',status:'A'};
  assert.throws(()=>assertPerfHybridDelta([row,resume]),/Отсутствуют заявленные/);
  assert.throws(()=>assertPerfHybridDelta([row,resume,resume]),/повтор/);
  assert.throws(()=>assertPerfHybridDelta([{...resume,status:'M'}]),/заявленное добавление или изменение/);
  assert.throws(()=>assertPerfHybridDelta([{...resume,mode:'120000'}]),/обычный файл/);
  assert.throws(()=>verifyPerformanceScope({base:'0'.repeat(40),head:BASELINE}),/Изменение базы/);
  assert.throws(()=>verifyPerformanceScope({base:C12_BASE,head:'HEAD'}),/точный SHA/);
});
