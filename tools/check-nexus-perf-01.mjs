import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {C12_BASE} from './check-academy-expansion.mjs';

export const BASELINE = '05cb4f09c0d47dd66b91b167e288c9d001fde47c';
export const PERF_R1 = 'ad12a8915d099df0b42f1eb79a79302125780e9b';
const pinsFile = 'docs/ru/03-content/cp-next-01/PERF01_PRESENTATION_BYTES.json';
const hybridPinsFile = 'docs/ru/03-content/cp-next-01/PERF01_HYBRID_BYTES.json';
const pinned = [
  'core/app.js',
  'core/blog-presentation.js',
  'core/learning-views.js',
  'pwa/offline-entry.js',
  'tests/helpers/course-rollout-bytes.mjs',
  'tests/platform-startup-browser-check.mjs',
];
const added = [
  pinsFile,
  'docs/ru/03-content/cp-next-01/PERF01_REVIEW_RU.md',
  'tests/nexus-perf-01-scope.test.mjs',
  'tools/check-nexus-perf-01.mjs',
  'tools/measure-nexus-performance.mjs',
  'tools/check-academy-scalability-browser.mjs',
];
const modified = [
  ...pinned,
  '.github/workflows/academy-expansion-regression.yml',
  'tests/platform-lazy-imports.test.mjs',
  'tests/platform-startup-load.test.mjs',
  'tests/shared-learning-views-check.mjs',
];
const expected = new Map([...added.map(file => [file, 'A']), ...modified.map(file => [file, 'M'])]);
const hybridPinned = [
  'core/app.js',
  'core/learning-views.js',
  'core/nexus-learning-discovery.js',
  'core/nexus-learning-resume.js',
  'tests/helpers/course-rollout-bytes.mjs',
  'tests/platform-startup-browser-check.mjs',
];
const hybridExpected = new Map([
  ...hybridPinned.map(file => [file, file === 'core/nexus-learning-resume.js' ? 'A' : 'M']),
  [hybridPinsFile, 'A'],
  ['docs/ru/03-content/cp-next-01/PERF01_HYBRID_RU.md', 'A'],
  ['tests/platform-lazy-imports.test.mjs', 'M'],
  ['tests/platform-startup-load.test.mjs', 'M'],
  ['tests/nexus-perf-01-scope.test.mjs', 'M'],
  ['tools/check-nexus-perf-01.mjs', 'M'],
]);
const git = (...args) => execFileSync('git', ['-c','core.longpaths=true', ...args], {maxBuffer:16 * 1024 * 1024});
const blob = (revision, file) => git('show', revision + ':' + file);
const digest = (revision, file) => createHash('sha256').update(blob(revision, file)).digest('hex');

export function assertPerfDelta(rows) {
  assertExactDelta(rows, expected, 'PERF-01');
}

export function assertPerfHybridDelta(rows) {
  assertExactDelta(rows, hybridExpected, 'PERF-01-R3');
}

function assertExactDelta(rows, expectedDelta, scope) {
  const missing = new Map(expectedDelta);
  for (const {file, status, mode} of rows) {
    assert.ok(missing.has(file), 'Путь вне области ' + scope + ' или повтор — ' + file);
    assert.equal(status, missing.get(file), 'Допустимо только заявленное добавление или изменение — ' + file);
    assert.equal(mode, '100644', 'Допустим только обычный файл — ' + file);
    missing.delete(file);
  }
  assert.equal(missing.size, 0, 'Отсутствуют заявленные изменения — ' + [...missing.keys()].join(', '));
}

function pathsBetween(base,head) {
  const parts = git('diff', '--no-renames', '--name-status', '-z', base, head).toString().split('\0');
  assert.equal(parts.pop(), '', 'Незавершённая запись Git');
  assert.equal(parts.length % 2, 0, 'Неполная запись Git');
  const delta = [];
  for (let index = 0; index < parts.length; index += 2) {
    const [status, file] = [parts[index], parts[index+1]];
    const mode = git('ls-tree', '-z', head, '--', file).toString().split(' ',1)[0];
    delta.push({file,status,mode});
  }
  return delta;
}

function assertPins({base,head,file,paths,delta}) {
  const pins = JSON.parse(blob(head, file));
  const states = new Map(delta.map(row => [row.file, row.status]));
  assert.equal(pins.baseline, base);
  assert.deepEqual(pins.files.map(pin => pin.path).sort(), [...paths].sort());
  for (const pin of pins.files) {
    const before = states.get(pin.path) === 'A' ? null : digest(base, pin.path);
    assert.equal(pin.beforeSha256, before, pin.path + ' / база');
    assert.equal(pin.newSha256, digest(head, pin.path), pin.path + ' / PERF-01');
  }
}

export function verifyPerformanceScope({base, head}) {
  assert.equal(base, C12_BASE, 'Изменение базы требует новой сверки с MASTER');
  assert.match(head ?? '', /^[a-f0-9]{40}$/, 'Нужен точный SHA кандидата');
  git('merge-base', '--is-ancestor', base, BASELINE);
  git('merge-base', '--is-ancestor', BASELINE, PERF_R1);
  git('merge-base', '--is-ancestor', PERF_R1, head);
  const testedTree = git('rev-parse', 'HEAD^{tree}').toString().trim();
  assert.equal(testedTree, git('rev-parse', head + '^{tree}').toString().trim(), 'Проверяется другое дерево');
  assert.equal(git('status', '--porcelain=v1', '-z').length, 0, 'Требуется чистое дерево');

  const r1 = pathsBetween(BASELINE, PERF_R1);
  assertPerfDelta(r1);
  assertPins({base:BASELINE,head:PERF_R1,file:pinsFile,paths:pinned,delta:r1});
  const hybrid = head === PERF_R1 ? [] : pathsBetween(PERF_R1,head);
  if (head !== PERF_R1) {
    assertPerfHybridDelta(hybrid);
    assertPins({base:PERF_R1,head,file:hybridPinsFile,paths:hybridPinned,delta:hybrid});
  }
  const budget = JSON.parse(execFileSync(process.execPath,['tools/check-cpp-course-perf.mjs'],{encoding:'utf8'}));
  assert.ok(budget.staticBytes <= budget.capBytes * 0.95, 'Минимум 5% запаса в стартовом графе PERF-01');
  return {status:'PASS',scope:hybrid.length?'PERF-01-R3':'PERF-01',base,baseline:BASELINE,
    sourceCommit:head,testedTree,delta:pathsBetween(BASELINE,head),r1Source:PERF_R1,r1,hybrid,budget};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = verifyPerformanceScope({
    base:process.env.NEXUS_REGRESSION_BASE || C12_BASE,
    head:process.env.NEXUS_REGRESSION_HEAD || git('rev-parse','HEAD').toString().trim(),
  });
  const evidence = process.env.NEXUS_ACADEMY_EVIDENCE;
  if (evidence) {
    await mkdir(evidence,{recursive:true});
    await writeFile(path.join(evidence,'SCOPE.json'),JSON.stringify(result,null,2)+'\n');
  }
  console.log(JSON.stringify(result));
}
