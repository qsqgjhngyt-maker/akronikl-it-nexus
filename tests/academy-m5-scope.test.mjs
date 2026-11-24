import assert from 'node:assert/strict';
import test from 'node:test';
import {assertM5Delta, verifyM5, BASE_M4} from '../tools/check-academy-m5.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row = {file:'courses/c/lessons/c.text-project.en.json', status:'A', mode:'100644'};

test('Область M5 исключает прежние уроки, PERF-01 и защищённые контракты', () => {
  for (const file of [
    'courses/c/lessons/c.function-project.en.json',
    'courses/c/lessons/c.array-sort.ru.json',
    'courses/c/lessons/c.text-project.de.json',
    'courses/onec/curriculum.json',
    'courses/cpp/curriculum.json',
    'core/app.js',
    'core/blog-presentation.js',
    'pwa/offline-entry.js',
    'pwa/service-worker.js',
    'sandbox/runtime-router.js',
    'core/account-storage.js',
    'tools/check-academy-m4.mjs',
    'docs/ru/03-content/cp-next-01/M4_PRESENTATION_BYTES.json',
  ]) assert.throws(() => assertM5Delta([{...row, file}]), /Путь вне области M5/);
});

test('M5 требует полный набор обычных файлов, точный SHA и прежнюю базу PR', () => {
  assert.throws(() => assertM5Delta([row]), /Отсутствуют заявленные/);
  assert.throws(() => assertM5Delta([row,row]), /повтор/);
  for (const status of ['D', 'R100', 'T']) {
    assert.throws(() => assertM5Delta([{...row, status}]), /заявленное добавление или изменение/);
  }
  for (const mode of ['100755', '120000', '160000']) {
    assert.throws(() => assertM5Delta([{...row, mode}]), /обычный файл/);
  }
  assert.throws(() => verifyM5({base:'0'.repeat(40), head:BASE_M4}), /Изменение базы/);
  assert.throws(() => verifyM5({base:C12_BASE, head:'HEAD'}), /точный SHA/);
});
