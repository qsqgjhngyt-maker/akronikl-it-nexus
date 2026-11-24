import assert from 'node:assert/strict';
import test from 'node:test';
import {assertReviewDelta, verifyReview, C12_BASE, ACCEPTED_C17} from '../tools/check-academy-expansion.mjs';

const file = 'docs/ru/03-content/cp-next-01/REGRESSION_POLICY_RU.md';
const row = {file, status: 'A', mode: '100644'};

test('Допускается только перечисленная область CI и доказательств R1', () => {
  assert.doesNotThrow(() => assertReviewDelta([row]));
  for (const unexpected of [
    'styles/unapproved-p2.css',
    '.codex/agents/new.toml',
    '.github/workflows/new.yml',
    'core/account-storage.js',
    'sandbox/runtime-router.js',
    'courses/clarity/lessons/onec.p2.topic-3.ru.json',
    'courses/c/lessons/c.what-is-c.ru.json',
    'release/P4Q_RELEASE_SCOPE.json',
  ]) {
    assert.throws(() => assertReviewDelta([{...row, file: unexpected}]), /вне области R1/);
  }
});

test('Удаление, переименование и замена файла на исполняемый файл или ссылку отклоняются', () => {
  for (const status of ['D', 'R100', 'T']) {
    assert.throws(() => assertReviewDelta([{...row, status}]), /Удаление или переименование/);
  }
  for (const mode of ['100755', '120000', '160000']) {
    assert.throws(() => assertReviewDelta([{...row, mode}]), /обычный файл/);
  }
  assert.throws(() => assertReviewDelta([row, row]), /Повтор пути/);
});

test('Смена базы и неполный SHA кандидата требуют отдельной проверки', () => {
  assert.throws(() => verifyReview({base: 'a'.repeat(40), head: ACCEPTED_C17}), /Изменение базы/);
  assert.throws(() => verifyReview({base: C12_BASE, head: 'feature/c'}), /точный SHA кандидата/);
});
