import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {C12_BASE} from './check-academy-expansion.mjs';

export const ACCEPTED_R1 = '5548c03d5016096466fb057ae3192572678b0850';
const M2_IDS = ['c.read-input', 'c.conditions', 'c.counted-loops', 'c.sentinel-loops', 'c.guard-boundaries'];
const pinPath = 'docs/ru/03-content/cp-next-01/M2_PRESENTATION_BYTES.json';
const presentationPaths = [
  'core/academy-catalog.js',
  'core/academy-course-cards.js',
  'tests/shared-presentation-check.mjs',
  'tests/helpers/course-rollout-bytes.mjs',
];
const additions = [
  ...M2_IDS.flatMap(id => ['ru', 'en'].map(locale => 'courses/c/lessons/' + id + '.' + locale + '.json')),
  pinPath,
  'docs/ru/03-content/cp-next-01/M2_REVIEW_RU.md',
  'tests/academy-m2-scope.test.mjs',
  'tools/check-academy-m2.mjs',
];
const changes = [
  ...presentationPaths,
  '.github/workflows/academy-expansion-regression.yml',
  '.github/workflows/cp-next-01-c-course.yml',
  'core/c-course.mjs',
  'core/code-hub-presentation.js',
  'courses/c/curriculum.json',
  'courses/c/manifest.json',
  'locales/en/ui.json',
  'locales/ru/ui.json',
  'tests/c-course-browser-check.mjs',
  'tests/c-course-content.test.mjs',
  'tests/c-course-offline-browser-check.mjs',
  'tests/c-course-runtime-matrix-check.mjs',
];
const expected = new Map([...additions.map(file => [file, 'A']), ...changes.map(file => [file, 'M'])]);
const sha = /^[a-f0-9]{40}$/;
const git = (...args) => execFileSync('git', ['-c', 'core.longpaths=true', ...args], {maxBuffer:16 * 1024 * 1024});
const digest = (revision, file) => createHash('sha256').update(git('show', revision + ':' + file)).digest('hex');

export function assertM2Delta(rows) {
  const missing = new Map(expected);
  for (const {file, status, mode} of rows) {
    assert.ok(missing.has(file), 'Путь вне области M2 или повтор — ' + file);
    assert.equal(status, missing.get(file), 'Допустимо только заявленное добавление или изменение — ' + file);
    assert.equal(mode, '100644', 'Допустим только обычный файл — ' + file);
    missing.delete(file);
  }
  assert.equal(missing.size, 0, 'Отсутствуют заявленные изменения — ' + [...missing.keys()].join(', '));
}

export function verifyM2({base, head}) {
  assert.equal(base, C12_BASE, 'Изменение базы требует новой сверки с MASTER');
  assert.match(head ?? '', sha, 'Нужен точный SHA кандидата');
  git('merge-base', '--is-ancestor', base, ACCEPTED_R1);
  git('merge-base', '--is-ancestor', ACCEPTED_R1, head);
  const testedTree = git('rev-parse', 'HEAD^{tree}').toString().trim();
  assert.equal(testedTree, git('rev-parse', head + '^{tree}').toString().trim(), 'Проверяется другое дерево');
  assert.equal(git('status', '--porcelain=v1', '-z').length, 0, 'Требуется чистое дерево');

  const parts = git('diff', '--no-renames', '--name-status', '-z', ACCEPTED_R1, head).toString().split('\0');
  assert.equal(parts.pop(), '', 'Незавершённая запись Git');
  assert.equal(parts.length % 2, 0, 'Неполная запись Git');
  const delta = [];
  for (let index = 0; index < parts.length; index += 2) {
    const [status, file] = [parts[index], parts[index + 1]];
    const mode = git('ls-tree', '-z', head, '--', file).toString().split(' ', 1)[0];
    delta.push({file, status, mode});
  }
  assertM2Delta(delta);

  const pins = JSON.parse(git('show', head + ':' + pinPath));
  assert.equal(pins.baseline, ACCEPTED_R1);
  assert.deepEqual(pins.files.map(pin => pin.path).sort(), [...presentationPaths].sort());
  for (const pin of pins.files) {
    assert.equal(pin.beforeSha256, digest(ACCEPTED_R1, pin.path), pin.path + ' / R1');
    assert.equal(pin.newSha256, digest(head, pin.path), pin.path + ' / M2');
  }

  const oldCurriculum = JSON.parse(git('show', ACCEPTED_R1 + ':courses/c/curriculum.json'));
  const newCurriculum = JSON.parse(git('show', head + ':courses/c/curriculum.json'));
  const expectedModules = oldCurriculum.modules;
  const m2 = expectedModules.find(module => module.id === 'c.m2');
  assert.deepEqual(m2.topics.map(topic => topic.id), M2_IDS);
  m2.status = 'implemented';
  for (const topic of m2.topics) topic.status = 'implemented';
  assert.deepEqual(newCurriculum.modules, expectedModules, 'Состав и порядок программы совпадают с R1');

  return {status:'PASS', scope:'CP-NEXT-01 / C17 M2', base, acceptedR1:ACCEPTED_R1, sourceCommit:head, testedTree, delta};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = verifyM2({
    base:process.env.NEXUS_REGRESSION_BASE || C12_BASE,
    head:process.env.NEXUS_REGRESSION_HEAD || git('rev-parse', 'HEAD').toString().trim(),
  });
  const evidence = process.env.NEXUS_ACADEMY_EVIDENCE;
  if (evidence) {
    await mkdir(evidence, {recursive:true});
    await writeFile(path.join(evidence, 'SCOPE.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result));
}
