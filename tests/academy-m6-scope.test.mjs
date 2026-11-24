import assert from 'node:assert/strict';
import test from 'node:test';
import {assertM6Delta, verifyM6, BASE_M5} from '../tools/check-academy-m6.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row={file:'courses/c/lessons/c.pointer-lifetime-errors.en.json',status:'A',mode:'100644'};

test('Область M6 исключает прежние уроки, PERF-01 и защищённые контракты',()=>{
  for(const file of [
    'courses/c/lessons/c.text-project.en.json','courses/c/lessons/c.array-sort.ru.json',
    'courses/c/lessons/c.pointer-lifetime-errors.de.json','courses/cpp/curriculum.json',
    'courses/onec/curriculum.json','core/app.js','core/blog-presentation.js',
    'core/account-storage.js','pwa/offline-entry.js','pwa/service-worker.js',
    'sandbox/runtime-router.js','tools/check-academy-m5.mjs',
  ]) assert.throws(()=>assertM6Delta([{...row,file}]),/Путь вне области M6/);
});

test('M6 требует полный набор обычных файлов, точный SHA и прежнюю базу PR',()=>{
  assert.throws(()=>assertM6Delta([row]),/Отсутствуют заявленные/);
  assert.throws(()=>assertM6Delta([row,row]),/повтор/);
  for(const status of ['D','R100','T'])assert.throws(()=>assertM6Delta([{...row,status}]),/заявленное добавление или изменение/);
  for(const mode of ['100755','120000','160000'])assert.throws(()=>assertM6Delta([{...row,mode}]),/обычный файл/);
  assert.throws(()=>verifyM6({base:'0'.repeat(40),head:BASE_M5}),/Изменение базы/);
  assert.throws(()=>verifyM6({base:C12_BASE,head:'HEAD'}),/точный SHA/);
});
