import assert from 'node:assert/strict';
import test from 'node:test';
import {assertM2Delta, verifyM2, ACCEPTED_R1} from '../tools/check-academy-m2.mjs';
import {C12_BASE} from '../tools/check-academy-expansion.mjs';

const row = {file:'courses/c/lessons/c.read-input.ru.json', status:'A', mode:'100644'};

test('Разрешение M2 не распространяется на существующие уроки, другие модули и контракты', () => {
  for (const file of [
    'courses/c/lessons/c.what-is-c.ru.json',
    'courses/c/lessons/c.functions.ru.json',
    'courses/c/lessons/c.read-input.de.json',
    'courses/onec/curriculum.json',
    'courses/cpp/curriculum.json',
    'pwa/service-worker.js',
    'sandbox/runtime-router.js',
    'core/account-storage.js',
    'tools/check-academy-expansion.mjs',
  ]) assert.throws(() => assertM2Delta([{...row, file}]), /Путь вне области M2/);
});

test('Точный пакет M2 обязателен; удаление, подмена типа и дубли исключены', () => {
  assert.throws(() => assertM2Delta([row]), /Отсутствуют заявленные/);
  assert.throws(() => assertM2Delta([row, row]), /повтор/);
  assert.throws(() => assertM2Delta([{...row, status:'D'}]), /заявленное добавление или изменение/);
  assert.throws(() => assertM2Delta([{...row, mode:'120000'}]), /обычный файл/);
  assert.throws(() => verifyM2({base:'0'.repeat(40), head:ACCEPTED_R1}), /Изменение базы/);
  assert.throws(() => verifyM2({base:C12_BASE, head:'HEAD'}), /точный SHA/);
});
