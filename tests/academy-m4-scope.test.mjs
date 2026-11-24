import assert from 'node:assert/strict';
import test from 'node:test';
import {assertM4Delta, verifyM4, BASE_M3} from '../tools/check-academy-m4.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row = {file:'courses/c/lessons/c.array-sort.en.json', status:'A', mode:'100644'};

test('Область M4 исключает правки прежних и будущих уроков и защищённых контрактов', () => {
  for (const file of [
    'courses/c/lessons/c.what-is-c.en.json',
    'courses/c/lessons/c.guard-boundaries.ru.json',
    'courses/c/lessons/c.function-project.en.json',
    'courses/c/lessons/c.array-sort.de.json',
    'courses/c/lessons/c.null-terminated-strings.ru.json',
    'courses/onec/curriculum.json',
    'courses/cpp/curriculum.json',
    'project-studio/project-store.js',
    'pwa/service-worker.js',
    'sandbox/runtime-router.js',
    'core/account-storage.js',
    'tools/check-academy-m3.mjs',
    'docs/ru/03-content/cp-next-01/M3_PRESENTATION_BYTES.json',
  ]) assert.throws(() => assertM4Delta([{...row, file}]), /Путь вне области M4/);
});

test('M4 требует полный набор обычных файлов, точный SHA и прежнюю базу PR', () => {
  assert.throws(() => assertM4Delta([row]), /Отсутствуют заявленные/);
  assert.throws(() => assertM4Delta([row, row]), /повтор/);
  for (const status of ['D', 'R100', 'T']) {
    assert.throws(() => assertM4Delta([{...row, status}]), /заявленное добавление или изменение/);
  }
  for (const mode of ['100755', '120000', '160000']) {
    assert.throws(() => assertM4Delta([{...row, mode}]), /обычный файл/);
  }
  assert.throws(() => verifyM4({base:'0'.repeat(40), head:BASE_M3}), /Изменение базы/);
  assert.throws(() => verifyM4({base:C12_BASE, head:'HEAD'}), /точный SHA/);
});
