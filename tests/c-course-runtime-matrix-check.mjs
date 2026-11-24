import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {c17Program,c17Vectors} from './helpers/c17-vectors.mjs';
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
  const request = {...c17Program(program, fixture), stdin:fixture.stdin};
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
    for (const vector of c17Vectors(edition)) add(edition, vector.kind, vector.id, vector.program, vector.fixture);
  }
}
assert.equal(editions.length, course.availableTopicIds.length * 2);
assert.equal(new Set(editions.map(({id,locale}) => id+'/'+locale)).size, editions.length);
assert.ok(records.filter(record => record.kind === 'example').length >= 82);
assert.ok(records.filter(record => record.kind === 'reference').length >= 584);
assert.ok(records.filter(record => record.kind === 'diagnostic').length >= 76);
assert.ok(requests.size >= 371);
const byRequest = new Map();
for (const record of records) {
  const pair = byRequest.get(record.digest) ?? [];
  pair.push(record);
  byRequest.set(record.digest,pair);
}
for(const rows of byRequest.values()){
  const coverage = new Map();
  for(const record of rows){
    assert.deepEqual(record.expected,rows[0].expected);
    const key=record.lessonId+'/'+record.kind;
    const counts=coverage.get(key)??{ru:0,en:0};
    counts[record.locale]++;
    coverage.set(key,counts);
  }
  for(const counts of coverage.values()) assert.equal(counts.ru,counts.en);
}
const shardIndex = process.env.NEXUS_C_RUNTIME_SHARD;
assert.ok(shardIndex === undefined || /^[0-4]$/.test(shardIndex), 'Invalid C17 runtime shard');
const shardCount = shardIndex === undefined ? 1 : 5;
const selectedRequests = new Map([...requests].filter((_, index) => index % shardCount === Number(shardIndex ?? 0)));
const selectedRecords = records.filter(record => selectedRequests.has(record.digest));
const expectedRequests = Math.ceil((requests.size - Number(shardIndex ?? 0)) / shardCount);
assert.equal(selectedRequests.size, expectedRequests);
assert.equal(selectedRecords.length, [...selectedRequests.keys()].reduce((count,digest)=>count+byRequest.get(digest).length,0));

const fixture = await onlineRuntimeFixture();
const executed = new Map();
let infrastructureError;
try {
  await fixture.page.goto(fixture.origin + '/#view=home');
  await fixture.page.locator('.visual-home').waitFor();
  await fixture.waitReady();
  for (const [digest, request] of selectedRequests) {
    const result = await fixture.page.evaluate(async ({runtimeModule, request}) => {
      const {pickProvider} = await import(runtimeModule);
      const {provider} = await pickProvider(request);
      if (provider.id !== 'wasm-cpp') throw Error('C must use the pinned Clang/WASI browser provider');
      try {
        const result = await provider.run(request);
        return {
          phase: 'run', provider: provider.id, languageId:result.languageId, target:result.target,
          compiler:result.compiler, elapsedMs:result.elapsedMs, stdout:result.stdout, stderr:result.stderr,
          exitCode:result.exitCode, translationUnits:result.translationUnits, outputFiles:result.outputFiles,
        };
      } catch (error) {
        return {phase:error.code === 'WASM_LINK_ERROR' ? 'link' : error.anxPhase ?? null, code:error.code, stdout:'', stderr:error.anxCompilerOutput || error.message};
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

const evidence = selectedRecords.map(record => {
  const actual = executed.get(record.digest);
  const {stdout, stderr, exitCode, phase, stderrIncludes, outputFiles} = record.expected;
  const pass = Boolean(actual) && stdout === actual.stdout &&
    (phase ? phase === actual.phase : actual.phase === 'run' && actual.languageId === 'c' &&
      actual.target === 'wasm32-wasip1' && actual.provider === 'wasm-cpp') &&
    (exitCode === undefined || exitCode === actual.exitCode) &&
    (stderr === undefined || stderr === actual.stderr) &&
    (outputFiles === undefined || isDeepStrictEqual(actual.outputFiles ?? {}, outputFiles)) &&
    (stderrIncludes ?? []).every(match => actual.stderr.includes(match)) &&
    (record.kind !== 'diagnostic' || phase === 'run' || /WASM_(COMPILE|LINK)_ERROR/.test(actual.code));
  return {...record, actual, pass};
});
const failed = evidence.filter(record => !record.pass);
const totals = Object.fromEntries(['example', 'reference', 'diagnostic'].map(kind => [kind, selectedRecords.filter(record => record.kind === kind).length]));
const status = failed.length || infrastructureError || fixture.errors.length ? 'FAIL' : 'PASS';
await writeFile(path.join(out, 'c17-runtime-matrix.json'), JSON.stringify({
  status, sourceCommit, sourceTree, generation:build.assetGeneration, version:build.version, buildManifestSha256:hash(buildBytes),
  editions, totals, uniqueRequests:selectedRequests.size, realRuns:executed.size, failedCases:failed.length,
  shard:{index:Number(shardIndex ?? 0),count:shardCount,fullRequests:requests.size,fullCases:records.length},
  infrastructureError, browserErrors: fixture.errors, cases: evidence,
  transport: 'Chromium · exact local SHA-256-pinned Clang/WASI bytes · verified service worker · synthetic account',
}, null, 2) + '\n');
console.log('C17_MATRIX_' + status + ' ' + JSON.stringify({
  editions:editions.length, ...totals, uniqueRequests:selectedRequests.size, realRuns:executed.size, failed:failed.length,
  shard:Number(shardIndex ?? 0), shardCount,
}));
for (const item of failed) console.log(JSON.stringify({lessonId:item.lessonId, locale:item.locale, kind:item.kind, id:item.id,
  expected:item.expected, actual:item.actual}));
if (infrastructureError) console.error(infrastructureError);
if (fixture.errors.length) console.error(fixture.errors);
if (status === 'FAIL') process.exitCode = 1;
