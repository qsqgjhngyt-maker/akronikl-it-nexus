import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {C12_BASE} from './check-academy-expansion.mjs';

export const BASE_M6 = '06dbd602d8315e887019157a9d0a069fc8cfc698';
const lessonIds = ["c.structures","c.enumerations","c.structure-arrays","c.structure-contracts"];
const pinFile = 'docs/ru/03-content/cp-next-01/M7_PRESENTATION_BYTES.json';
const pinned = [
  'core/academy-catalog.js',
  'core/academy-course-cards.js',
  'tests/shared-presentation-check.mjs',
  'tests/helpers/course-rollout-bytes.mjs',
];
const added = [
  ...lessonIds.flatMap(id => ['ru', 'en'].map(locale => 'courses/c/lessons/' + id + '.' + locale + '.json')),
  pinFile,
  'docs/ru/03-content/cp-next-01/M7_REVIEW_RU.md',
  'tests/academy-m7-scope.test.mjs',
  'tools/check-academy-m7.mjs',
];
const modified = [
  ...pinned,
  '.github/workflows/academy-expansion-regression.yml',
  '.github/workflows/cp-next-01-c-course.yml',
  'core/code-hub-presentation.js',
  'courses/c/curriculum.json',
  'courses/c/manifest.json',
  'locales/en/ui.json',
  'locales/ru/ui.json',
  'tests/c-course-browser-check.mjs',
  'tests/c-course-content.test.mjs',
  'tests/c-course-offline-browser-check.mjs',
  'tests/c-course-runtime-browser-check.mjs',
  'tests/c-course-runtime-matrix-check.mjs',
];
const expected = new Map([...added.map(file => [file, 'A']), ...modified.map(file => [file, 'M'])]);
const git = (...args) => execFileSync('git', ['-c', 'core.longpaths=true', ...args], {maxBuffer:16 * 1024 * 1024});
const blob = (rev, file) => git('show', rev + ':' + file);
const digest = (rev, file) => createHash('sha256').update(blob(rev, file)).digest('hex');
const json = (rev, file) => JSON.parse(blob(rev, file));

export function assertM7Delta(rows) {
  const missing = new Map(expected);
  for (const {file, status, mode} of rows) {
    assert.ok(missing.has(file), 'Путь вне области M7 или повтор — ' + file);
    assert.equal(status, missing.get(file), 'Допустимо только заявленное добавление или изменение — ' + file);
    assert.equal(mode, '100644', 'Допустим только обычный файл — ' + file);
    missing.delete(file);
  }
  assert.equal(missing.size, 0, 'Отсутствуют заявленные изменения — ' + [...missing.keys()].join(', '));
}

function verifyContentOrder(head) {
  const curriculumFile = 'courses/c/curriculum.json';
  const candidate = json(head, curriculumFile);
  const previous = json(BASE_M6, curriculumFile);
  const module = previous.modules.find(item => item.id === 'c.m7');
  assert.equal(module.status, 'planned');
  assert.deepEqual(module.topics.map(topic => topic.id), lessonIds);
  module.status = 'implemented';
  for (const topic of module.topics) topic.status = 'implemented';
  assert.deepEqual(candidate, {
    ...previous,
    availableModuleCount:previous.availableModuleCount + 1,
    availableTopicCount:previous.availableTopicCount + lessonIds.length,
    runtime:candidate.runtime,
  }, 'Изменился порядок или состав программы за пределами M7');

  const manifestFile = 'courses/c/manifest.json';
  const manifest = json(head, manifestFile);
  const prior = json(BASE_M6, manifestFile);
  assert.deepEqual(manifest, {
    ...prior,
    status:'module-7-candidate',
    description:manifest.description,
    availableModuleIds:[...prior.availableModuleIds, 'c.m7'],
    availableTopicIds:[...prior.availableTopicIds, ...lessonIds],
  }, 'Изменился набор уроков или маршрутов за пределами M7');
}

export function verifyM7({base, head}) {
  assert.equal(base, C12_BASE, 'Изменение базы требует новой сверки с MASTER');
  assert.match(head ?? '', /^[a-f0-9]{40}$/, 'Нужен точный SHA кандидата');
  git('merge-base', '--is-ancestor', base, BASE_M6);
  git('merge-base', '--is-ancestor', BASE_M6, head);
  const testedTree = git('rev-parse', 'HEAD^{tree}').toString().trim();
  assert.equal(testedTree, git('rev-parse', head + '^{tree}').toString().trim(), 'Проверяется другое дерево');
  assert.equal(git('status', '--porcelain=v1', '-z').length, 0, 'Требуется чистое дерево');

  const parts = git('diff', '--no-renames', '--name-status', '-z', BASE_M6, head).toString().split('\0');
  assert.equal(parts.pop(), '', 'Незавершённая запись Git');
  assert.equal(parts.length % 2, 0, 'Неполная запись Git');
  const delta = [];
  for (let index = 0; index < parts.length; index += 2) {
    const [status, file] = [parts[index], parts[index + 1]];
    const mode = git('ls-tree', '-z', head, '--', file).toString().split(' ', 1)[0];
    delta.push({file, status, mode});
  }
  assertM7Delta(delta);

  const pins = json(head, pinFile);
  assert.equal(pins.baseline, BASE_M6);
  assert.deepEqual(pins.files.map(pin => pin.path).sort(), [...pinned].sort());
  for (const pin of pins.files) {
    assert.equal(pin.beforeSha256, digest(BASE_M6, pin.path), pin.path + ' / M6');
    assert.equal(pin.newSha256, digest(head, pin.path), pin.path + ' / M7');
  }
  verifyContentOrder(head);

  return {status:'PASS', scope:'CP-NEXT-01 / C17 M7', base, previousM6:BASE_M6, sourceCommit:head, testedTree, delta};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = verifyM7({
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
