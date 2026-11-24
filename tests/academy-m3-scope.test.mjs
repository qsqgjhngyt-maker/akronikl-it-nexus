import assert from 'node:assert/strict';
import test from 'node:test';
import {assertM3Delta, verifyM3, BASE_M2} from '../tools/check-academy-m3.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row = {file:'courses/c/lessons/c.function-project.en.json', status:'A', mode:'100644'};

test('Область M3 исключает правки прежних и будущих уроков и защищённых контрактов', () => {
  for (const file of [
    'courses/c/lessons/c.what-is-c.en.json',
    'courses/c/lessons/c.guard-boundaries.ru.json',
    'courses/c/lessons/c.function-project.de.json',
    'courses/c/lessons/c.array-basics.ru.json',
    'courses/onec/curriculum.json',
    'courses/cpp/curriculum.json',
    'project-studio/project-store.js',
    'pwa/service-worker.js',
    'sandbox/runtime-router.js',
    'core/account-storage.js',
    'tools/check-academy-m2.mjs',
    'docs/ru/03-content/cp-next-01/M2_PRESENTATION_BYTES.json',
  ]) assert.throws(() => assertM3Delta([{...row, file}]), /Путь вне области M3/);
});

test('M3 требует полный набор обычных файлов, точный SHA и прежнюю базу PR', () => {
  assert.throws(() => assertM3Delta([row]), /Отсутствуют заявленные/);
  assert.throws(() => assertM3Delta([row,row]), /повтор/);
  assert.throws(() => assertM3Delta([{...row, status:'D'}]), /заявленное добавление или изменение/);
  for (const mode of ['100755', '120000', '160000']) {
    assert.throws(() => assertM3Delta([{...row, mode}]), /обычный файл/);
  }
  assert.throws(() => verifyM3({base:'0'.repeat(40), head:BASE_M2}), /Изменение базы/);
  assert.throws(() => verifyM3({base:C12_BASE, head:'HEAD'}), /точный SHA/);
});
