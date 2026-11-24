import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const C12_BASE = 'a944f7221f76622a1d6bb41f5159e0f1cfa3a614';
export const ACCEPTED_C17 = 'db1fc4dadb3d662180db0d3dc673115556726d2a';

const reviewFiles = new Set([
  '.github/workflows/academy-expansion-regression.yml',
  'docs/ru/03-content/cp-next-01/REGRESSION_POLICY_RU.md',
  'tests/academy-expansion-regression.test.mjs',
  'tools/check-academy-expansion.mjs',
]);
const protectedC12 = [
  'courses/cpp', 'courses/cpp-clarity-r3', 'courses/clarity', 'courses/reference',
  'courses/onec', 'courses/1c-enterprise', 'courses/onec-education', 'review/cpp-clarity-r3',
  'core/storage.js', 'core/account-storage.js', 'core/identity.js', 'core/migrations',
  'project-studio', 'sync', 'server-access', 'cloudflare', 'course-final',
  'sandbox/workers', 'sandbox/runtime-assets.js', 'sandbox/runtime-router.js', 'runtime-packs',
  'pwa/local-vault.js', 'pwa/local-editor.js', 'pwa/offline-learning.js', 'pwa/runtime-manifest.js',
  'pwa/policy.js', 'pwa/service-worker.js', 'service-worker.js',
  'releases', 'entry-assets', 'release', 'release-candidate.json', 'version.json',
  '.github/workflows/academy-gold-cpp-module-1.yml',
  '.github/workflows/academy-gold-cpp-module-2-preflight.yml',
  '.github/workflows/academy-gold-cpp-module-3-publication.yml',
  '.github/workflows/cpp-clarity-01.yml',
  'tools/p4q-release-scope.mjs', 'tools/cpp-course-completion-scope.mjs',
  'tools/startup-intro-ci-route.mjs', 'tools/current-platform-ci-route.mjs',
  'tools/content-publication-route.mjs', 'tools/check-cpp-clarity.mjs',
  'tools/check-cpp-clarity-preservation.mjs',
  'docs/ru/03-content/CPP_COURSE_COMPLETION_SCOPE.json',
  'docs/ru/03-content/reference-courses-20261112',
  'tests/cpp-clarity-onec-p2-negative-controls.mjs',
];
const pinnedSha = /^[a-f0-9]{40}$/;
const git = (...args) => execFileSync('git', ['-c', 'core.longpaths=true', ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
});
const NUL = '\0';

export function assertReviewDelta(rows) {
  const seen = new Set();
  for (const {file, status, mode} of rows) {
    assert.ok(reviewFiles.has(file), 'Изменение вне области R1 — ' + file);
    assert.ok(!seen.has(file), 'Повтор пути — ' + file);
    assert.ok(status === 'A' || status === 'M', 'Удаление или переименование запрещено — ' + file);
    assert.equal(mode, '100644', 'Допустим только обычный файл — ' + file);
    seen.add(file);
  }
}

function readDelta(before, after) {
  const parts = git('diff', '--no-renames', '--name-status', '-z', before, after).split(NUL);
  assert.equal(parts.pop(), '', 'Незавершённый список Git');
  assert.equal(parts.length % 2, 0, 'Неполная запись Git');
  const rows = [];
  for (let index = 0; index < parts.length; index += 2) {
    const [status, file] = [parts[index], parts[index + 1]];
    const mode = git('ls-tree', '-z', after, '--', file).split(' ', 1)[0];
    rows.push({file, status, mode});
  }
  return rows;
}

export function verifyReview({base, head}) {
  assert.match(base ?? '', pinnedSha, 'Нужен точный SHA базы');
  assert.match(head ?? '', pinnedSha, 'Нужен точный SHA кандидата');
  assert.equal(base, C12_BASE, 'Изменение базы требует новой сверки с MASTER');
  git('merge-base', '--is-ancestor', base, ACCEPTED_C17);
  git('merge-base', '--is-ancestor', ACCEPTED_C17, head);
  const testedTree = git('rev-parse', 'HEAD^{tree}').trim();
  assert.equal(testedTree, git('rev-parse', head + '^{tree}').trim(), 'Проверяемые байты не совпадают с кандидатом');
  assert.equal(git('status', '--porcelain=v1', '-z'), '', 'Для проверки нужно чистое дерево');
  const baselineDelta = git('diff', '--name-only', '-z', base, head, '--', ...protectedC12);
  assert.equal(baselineDelta, '', 'Защищённые контракты C12 отличаются от базы — ' + baselineDelta.replaceAll(NUL, ', '));
  const delta = readDelta(ACCEPTED_C17, head);
  assertReviewDelta(delta);
  return {
    status: 'PASS',
    scope: 'CP-NEXT-01-R1 / candidate regression',
    base,
    acceptedC17: ACCEPTED_C17,
    sourceCommit: head,
    testedTree,
    delta,
    protectedC12,
    productBytesChangedSinceAcceptedC17: false,
    historicalReleaseRequested: false,
    releaseEligible: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = verifyReview({
    base: process.env.NEXUS_REGRESSION_BASE || C12_BASE,
    head: process.env.NEXUS_REGRESSION_HEAD || git('rev-parse', 'HEAD').trim(),
  });
  const evidence = process.env.NEXUS_ACADEMY_EVIDENCE;
  if (evidence) {
    await mkdir(evidence, {recursive: true});
    await writeFile(path.join(evidence, 'SCOPE.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result));
}
