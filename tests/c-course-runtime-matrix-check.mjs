import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';

for (const name of ['NEXUS_FRONTEND_DIR', 'NEXUS_PLAYWRIGHT_MODULE', 'NEXUS_CHROME_PATH', 'NEXUS_PINNED_RUNTIME_DIR', 'NEXUS_C_EVIDENCE_DIR']) {
  assert.ok(process.env[name], `${name} is required for synthetic browser verification`);
}
process.env.NEXUS_JSCPP_FIXTURE ||= path.join(process.env.NEXUS_PINNED_RUNTIME_DIR, 'jscpp.js');
// Playwright 1.56 uses a separate opt-in for interception of Service Worker requests.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

const readJSON = async filename => JSON.parse(await readFile(filename, 'utf8'));
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(process.env.NEXUS_C_EVIDENCE_DIR);
await mkdir(out, {recursive: true});
const buildBytes = await readFile(path.join(process.env.NEXUS_FRONTEND_DIR, 'BUILD_MANIFEST.json'));
const build = JSON.parse(buildBytes);
const sourceDir = path.join(root, 'courses/c');
const git = (...args) => execFileSync('git', ['-c','core.longpaths=true', ...args], {cwd:root, encoding:'utf8'}).trim();
const sourceCommit = git('rev-parse', 'HEAD');
const sourceTree = git('rev-parse', 'HEAD^{tree}');
assert.equal(git('status', '--porcelain=v1'), '', 'The runtime matrix requires the exact committed source');
const builtDir = path.join(process.env.NEXUS_FRONTEND_DIR, build.prefix, 'courses/c');
const course = await readJSON(path.join(sourceDir, 'manifest.json'));
const runtimeModule = '/' + build.prefix + 'sandbox/sandbox.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const editions = [];
const records = [];
const requests = new Map();

function add(edition, kind, id, program, fixture) {
  const entryFile = program.metadata?.entryFile ?? 'main.c';
  const extras = Array.isArray(program.files)
    ? Object.fromEntries(program.files.map(file => [file.path, file.content ?? file.source]))
    : program.files ?? {};
  const source = program.source ?? extras[entryFile];
  assert.equal(typeof source, 'string', edition.id + ' ' + kind + ' ' + id);
  const files = Object.fromEntries(Object.entries({...extras, [entryFile]: source}).sort(([left], [right]) => left.localeCompare(right)));
  const request = {languageId: 'c', source, files, entryFile, stdin: fixture.stdin};
  const digest = hash(JSON.stringify(request));
  requests.set(digest, request);
  const {id: lessonId, locale} = edition;
  records.push({lessonId, locale, kind, id, digest, expected: fixture});
}

for (const id of course.availableTopicIds) {
  for (const locale of course.availableLocales) {
    const filename = `${id}.${locale}.json`;
    const bytes = await readFile(path.join(sourceDir, 'lessons', filename));
    const builtBytes = await readFile(path.join(builtDir, 'lessons', filename));
    const edition = JSON.parse(bytes);
    assert.equal(edition.id, id);
    assert.equal(edition.locale, locale);
    const sha256 = hash(bytes);
    assert.equal(hash(builtBytes), sha256, `Unexpected packaged lesson bytes: ${filename}`);
    editions.push({id, locale, sha256});
    const worked = edition.sections.filter(section => section.code);
    assert.ok(worked.length > 0, `${id} ${locale} example missing`);
    for (const {id: sectionId, code} of worked) {
      add(edition, 'example', sectionId, code, {stdin: code.stdin ?? '', stdout: code.output, stderr: code.stderr, exitCode: code.exitCode ?? 0});
      for (const [index, vector] of (code.cases ?? []).entries()) {
        add(edition, 'example', `${sectionId}:${index + 1}`, code, {
          stdin: vector.input ?? vector.stdin ?? '', stdout: vector.output ?? vector.stdout,
          stderr: vector.stderr, exitCode: vector.exitCode ?? 0,
        });
      }
    }
    const {referenceSolution, cases} = edition.practice;
    assert.ok(cases.length > 0 && referenceSolution, `${id} ${locale} practice fixtures missing`);
    for (const [index, item] of cases.entries()) {
      add(edition, 'reference', `${index + 1}: ${item.label}`, referenceSolution, {
        stdin: item.input ?? '', stdout: item.output, stderr: item.stderr, exitCode: item.exitCode ?? 0,
      });
    }
    for (const [index, item] of (edition.diagnosticExercises ?? []).entries()) {
      add(edition, 'diagnostic', String(index + 1), item, {
        stdin: item.stdin ?? '', stdout: item.expectedStdout ?? '', phase: item.phase,
        stderrIncludes: item.stderrIncludes ?? [], exitCode: item.expectedExitCode,
      });
    }
  }
}
assert.equal(editions.length, 38);
assert.equal(records.filter(record => record.kind === 'example').length, 38);
assert.equal(records.filter(record => record.kind === 'reference').length, 192);
assert.equal(records.filter(record => record.kind === 'diagnostic').length, 32);
assert.ok(records.some(record => record.kind === 'diagnostic'));

const fixture = await onlineRuntimeFixture();
const executed = new Map();
let infrastructureError;
try {
  await fixture.page.goto(fixture.origin + '/#view=home');
  await fixture.page.locator('.visual-home').waitFor();
  await fixture.waitReady();
  for (const [digest, request] of requests) {
    const result = await fixture.page.evaluate(async ({runtimeModule, request}) => {
      const {pickProvider} = await import(runtimeModule);
      const {provider} = await pickProvider(request);
      if (provider.id !== 'wasm-cpp') throw Error('C must use the pinned Clang/WASI browser provider');
      try {
        const result = await provider.run(request);
        return {
          phase: 'run', provider: provider.id, languageId:result.languageId, target:result.target,
          compiler:result.compiler, elapsedMs:result.elapsedMs, stdout:result.stdout, stderr:result.stderr,
          exitCode:result.exitCode, translationUnits:result.translationUnits,
        };
      } catch (error) {
        return {phase:error.anxPhase ?? null, code:error.code, stdout:'', stderr:error.anxCompilerOutput || error.message};
      }
    }, {runtimeModule, request});
    executed.set(digest, result);
    if (executed.size === 1) console.log('C17_MATRIX_FIRST ' + JSON.stringify(result));
  }
} catch (error) {
  infrastructureError = String(error?.stack ?? error);
} finally {
  await fixture.close();
}

const evidence = records.map(record => {
  const actual = executed.get(record.digest);
  const {stdout, stderr, exitCode, phase, stderrIncludes} = record.expected;
  const pass = Boolean(actual) && stdout === actual.stdout &&
    (phase ? phase === actual.phase : actual.phase === 'run' && actual.languageId === 'c' &&
      actual.target === 'wasm32-wasip1' && actual.provider === 'wasm-cpp') &&
    (exitCode === undefined || exitCode === actual.exitCode) &&
    (stderr === undefined || stderr === actual.stderr) &&
    (stderrIncludes ?? []).every(match => actual.stderr.includes(match)) &&
    (record.kind !== 'diagnostic' || phase === 'run' || /WASM_(COMPILE|LINK)_ERROR/.test(actual.code));
  return {...record, actual, pass};
});
const failed = evidence.filter(record => !record.pass);
const totals = Object.fromEntries(['example', 'reference', 'diagnostic'].map(kind => [kind, records.filter(record => record.kind === kind).length]));
const status = failed.length || infrastructureError || fixture.errors.length ? 'FAIL' : 'PASS';
await writeFile(path.join(out, 'c17-runtime-matrix.json'), JSON.stringify({
  status, sourceCommit, sourceTree, generation:build.assetGeneration, version:build.version, buildManifestSha256:hash(buildBytes),
  editions, totals, uniqueRequests: requests.size, realRuns: executed.size, failedCases: failed.length,
  infrastructureError, browserErrors: fixture.errors, cases: evidence,
  transport: 'Chromium · exact local SHA-256-pinned Clang/WASI bytes · verified service worker · synthetic account',
}, null, 2) + '\n');
console.log('C17_MATRIX_' + status + ' ' + JSON.stringify({
  editions: editions.length, ...totals, uniqueRequests: requests.size, realRuns: executed.size, failed: failed.length,
}));
for (const item of failed) console.log(JSON.stringify({lessonId:item.lessonId, locale:item.locale, kind:item.kind, id:item.id,
  expected:item.expected, actual:item.actual}));
if (infrastructureError) console.error(infrastructureError);
if (fixture.errors.length) console.error(fixture.errors);
if (status === 'FAIL') process.exitCode = 1;
