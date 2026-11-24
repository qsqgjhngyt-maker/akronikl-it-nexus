import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';

for (const name of ['NEXUS_FRONTEND_DIR', 'NEXUS_PLAYWRIGHT_MODULE', 'NEXUS_CHROME_PATH', 'NEXUS_PINNED_RUNTIME_DIR', 'NEXUS_C_EVIDENCE_DIR']) {
  assert.ok(process.env[name], `${name} is required for synthetic browser verification`);
}
process.env.NEXUS_JSCPP_FIXTURE ||= path.join(process.env.NEXUS_PINNED_RUNTIME_DIR, 'jscpp.js');
// Playwright 1.56 uses a separate opt-in for interception of Service Worker requests.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const out = path.resolve(process.env.NEXUS_C_EVIDENCE_DIR);
await mkdir(out, {recursive: true});
const manifestBytes = await readFile(path.join(process.env.NEXUS_FRONTEND_DIR, 'BUILD_MANIFEST.json'));
const manifest = JSON.parse(manifestBytes);
const importPath = '/' + manifest.prefix + 'core/c-course-workspace.mjs';
const source = `#include <stdio.h>
#if __STDC_VERSION__ != 201710L
#error C17 is required for this exercise
#endif
int scale(int value);
int main(void) {
  int value;
  if (scanf("%d", &value) != 1) return 2;
  printf("result %d\\n", scale(value));
  fprintf(stderr, "C17 %ld\\n", __STDC_VERSION__);
  return 0;
}`;

const fixture = await onlineRuntimeFixture();
const {page, origin} = fixture;
try {
  await page.goto(origin + '/#view=home');
  await page.locator('.visual-home').waitFor();
  const verified = await fixture.waitReady();
  assert.ok(verified.publicReady);

  async function mount(locale) {
    await page.evaluate(async ({importPath, source, locale}) => {
      const module = await import(importPath);
      let host = document.querySelector('#synthetic-c-fixture');
      if (!host) {
        host = document.createElement('div');
        host.id = 'synthetic-c-fixture';
        document.querySelector('#app').replaceChildren(host);
      }
      window.cWorkspace = module.mount({
        host, locale, lesson: {
          id: 'c.synthetic-browser-fixture',
          practice: {
            stdin: '4',
            files: [{path:'main.c', content:source}, {path:'scale.c', source:'int scale(int value) { return value * 3; }'}],
          },
        },
        onRun: ({result, current}) => {
          window.cResult = {
            current, languageId:result.languageId, compiler:result.compiler, target:result.target,
            exitCode:result.exitCode, stdout:result.stdout, stderr:result.stderr, translationUnits:result.translationUnits,
          };
        },
      });
    }, {importPath, source, locale});
  }

  await mount('ru');
  const input = page.locator('[data-c-stdin]');
  await input.click();
  await input.press('Control+a');
  await input.press('7');
  assert.equal(await input.inputValue(), '7', JSON.stringify(await input.evaluate(element => ({
    focused: element === document.activeElement, active: document.activeElement?.tagName,
    editable: !element.disabled && !element.readOnly, inert: Boolean(element.closest('[inert]')),
  }))));
  await page.locator('[data-c-run]').click();
  await page.waitForFunction(() => !document.querySelector('[data-c-run]').disabled, null, {timeout: 240000});
  const result = await page.evaluate(() => window.cResult);
  assert.ok(result, JSON.stringify({
    status: await page.locator('[data-c-result]').textContent(),
    diagnostic: await page.locator('[data-c-compiler]').textContent(),
    errors: fixture.errors,
  }));
  assert.equal(result.current, true);
  assert.equal(result.languageId, 'c');
  assert.equal(result.target, 'wasm32-wasip1');
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'result 21\n');
  assert.equal(result.stderr, 'C17 201710\n');
  assert.deepEqual(result.translationUnits.sort(), ['main.c', 'scale.c']);
  assert.match(await page.locator('[data-c-result]').textContent(), /C17 · Clang\/WASI/);
  await page.screenshot({path: path.join(out, 'c17-run.png')});
  console.log('C17_WASI_RUN_PASS '+JSON.stringify(result));

  await page.locator('#editor').fill('int main(void) { return 0 }');
  await page.locator('[data-c-run]').click();
  await page.waitForFunction(() => document.querySelector('[data-c-result]').textContent.includes('остановил компиляцию'));
  const diagnostic = await page.locator('[data-c-compiler]').textContent();
  assert.match(diagnostic, /main\.c:1:\d+: error:/);
  assert.equal(await page.locator('#codeStudioProblems').isVisible(), true);
  assert.equal(await page.locator('[data-c-stdout]').textContent(), '(пусто)');
  await page.screenshot({path: path.join(out, 'c17-compile-diagnostic.png')});
  console.log('C17_WASI_COMPILE_DIAGNOSTIC_PASS '+diagnostic.split('\n').find(line => line.includes('error:')));

  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-c-starter]').click();
  assert.equal(await page.locator('#editor').inputValue(), 'int main(void) { return 0 }');
  assert.equal(await page.evaluate(() => window.cWorkspace.dispose()), true);
  await page.reload();
  await page.locator('.visual-home').waitFor();
  await mount('en');
  assert.equal(await page.locator('#editor').inputValue(), 'int main(void) { return 0 }');
  assert.equal(await page.locator('[data-c-stdin]').inputValue(), '7');
  assert.match(await page.locator('[data-c-save]').textContent(), /restored/);
  const accountScoped = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(key => key.includes('c-course:v1:'));
    return keys.length > 0 && keys.every(key => key.startsWith(
      'akronikl:it-nexus:account-store:v1:synthetic-runtime-online:'));
  });
  assert.equal(accountScoped, true);
  async function openPractice(lessonId, title) {
    await page.goto(origin + '/#course=c&lesson=' + lessonId + '&stage=practice&locale=en');
    await page.getByRole('heading', {level:1, name:title, exact:true}).waitFor();
    await page.locator('[data-c-workspace] #editor').waitFor();
  }

  async function runPractice(expectedOutput, exitCode) {
    await page.locator('[data-c-run]').click();
    await page.waitForFunction(() => !document.querySelector('[data-c-run]').disabled, null, {timeout:240000});
    assert.equal(await page.locator('[data-c-stdout]').textContent(), expectedOutput);
    assert.match(await page.locator('[data-c-result]').textContent(), new RegExp('C17 · Clang/WASI · exit code ' + exitCode + '$'));
  }

  await openPractice('c.function-test-cases', 'Testing functions separately');
  await page.locator('[data-c-stdin]').fill('');
  await runPractice('49 0\nfail 50 expected 5 got 0\n51 5\npassed 2\n', 1);
  const bonusEditor = page.locator('#editor');
  const bonusStarter = await bonusEditor.inputValue();
  assert.ok(bonusStarter.includes('score > 50'));
  await bonusEditor.fill(bonusStarter.replace('score > 50', 'score >= 50'));
  await runPractice('49 0\n50 5\n51 5\npassed 3\n', 0);
  await page.screenshot({path:path.join(out, 'm3-bonus-boundary.png')});

  await openPractice('c.function-project', 'Project: unit conversion');
  const project = JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR, manifest.prefix,
    'courses/c/lessons/c.function-project.en.json')));
  const solution = project.practice.referenceSolution.source;
  const main = solution.indexOf('int main(void)');
  assert.ok(main > 0);
  const editor = page.locator('#editor');
  await editor.fill(solution.slice(0, main) + 'int main(void) {\n' +
    '    printf("%d %d\\n", minutes_to_seconds(2), kilometers_to_meters(3));\n    return 0;\n}\n');
  await page.locator('[data-c-stdin]').fill('');
  await runPractice('120 3000\n', 0);
  await page.screenshot({path:path.join(out, 'm3-direct-calls.png')});
  await editor.fill(solution);
  await page.locator('[data-c-stdin]').fill('3\n2\n');
  await runPractice('invalid\n', 0);

  await openPractice('c.array-sort', 'Simple sorting and checking the result');
  const sortingEditor = page.locator('#editor');
  const sortingStarter = await sortingEditor.inputValue();
  const selectsLargest = 'sorted[i] > sorted[least]';
  assert.ok(sortingStarter.includes(selectsLargest));
  await page.locator('[data-c-stdin]').fill('4\n3\n-1\n3\n2\n');
  await runPractice('3 -1 3 2\n3 3 2 -1\n', 0);
  await sortingEditor.fill(sortingStarter.replace(selectsLargest, 'sorted[i] < sorted[least]'));
  await runPractice('3 -1 3 2\n-1 2 3 3\n', 0);
  await page.screenshot({path:path.join(out, 'm4-sorted-copy.png')});
  await page.locator('[data-c-stdin]').fill('0\n');
  await runPractice('empty\n', 0);
  console.log('C17_M4_SORT_PASS source unchanged, duplicates preserved, empty set handled');

  await openPractice('c.text-project', 'Project: line filter');
  const filterEditor = page.locator('#editor');
  const filterStarter = await filterEditor.inputValue();
  const exactKey = 'strcmp(line, "ERR") == 0';
  assert.ok(filterStarter.includes(exactKey));
  await runPractice('ERR\nrejected 1\n', 0);
  await filterEditor.fill(filterStarter.replace(exactKey, 'strncmp(line, "ERR", 3) == 0'));
  await runPractice('ERR fan\nERR\nrejected 1\n', 0);
  await page.screenshot({path:path.join(out, 'm5-line-filter.png')});
  console.log('C17_M5_FILTER_PASS prefix and rejection count confirmed in the lesson editor');

  await openPractice('c.pointer-lifetime-errors', 'Lifetime and pointer errors');
  const pointerEditor = page.locator('#editor');
  const pointerStarter = await pointerEditor.inputValue();
  const copyStep = '/* TODO: copy the temporary reading into the output object. */';
  assert.ok(pointerStarter.includes(copyStep));
  await runPractice('17\n', 0);
  await pointerEditor.fill(pointerStarter.replace(copyStep, '*out = temporary;'));
  await runPractice('27\n', 0);
  await page.screenshot({path:path.join(out, 'm6-output-pointer.png')});
  await page.locator('[data-c-stdin]').fill('27x\n');
  await runPractice('invalid\n', 0);
  console.log('C17_M6_OUT_PASS valid reading copied, malformed value rejected without writing');

  await openPractice('c.structure-contracts', 'Record invariants and operations');
  const recordEditor = page.locator('#editor');
  const recordStarter = await recordEditor.inputValue();
  const missingCheck = '/* TODO: reject an existing identifier before making a change. */';
  assert.ok(recordStarter.includes(missingCheck));
  await runPractice('ok\nfull\n101:1 203:2 321:1\n', 0);
  await recordEditor.fill(recordStarter.replace(missingCheck,
    'if (request != NULL) { return "duplicate"; }'));
  await runPractice('ok\nduplicate\n101:1 203:2 321:1\n', 0);
  await page.screenshot({path:path.join(out, 'm7-record-invariant.png')});
  await page.locator('[data-c-stdin]').fill('1 101 1 2 999 2\n');
  await runPractice('duplicate\nmissing\n101:1 203:2\n', 0);
  console.log('C17_M7_RECORD_PASS duplicate checked before capacity; rejection preserves records');

  await openPractice('c.dynamic-record-project', 'Project: resizable record list');
  const growEditor = page.locator('#editor');
  const growStarter = await growEditor.inputValue();
  const missedCount = '/* TODO: advance the counter before comparing to the requested failure. */';
  assert.ok(growStarter.includes(missedCount));
  await runPractice('ok 3 4 60\n', 0);
  const fixedGrowth = growStarter.replace(missedCount, '++policy->attempts;');
  await growEditor.fill(fixedGrowth);
  await runPractice('allocation-failed 2 2 30\n', 0);
  assert.ok(fixedGrowth.includes('    destroy(&queue);'));
  await growEditor.fill(fixedGrowth.replace('    destroy(&queue);',
    '    for (size_t i = 0; i < queue.used; ++i) {\n' +
    '        printf("%zu:%d\\n", queue.items[i].id, queue.items[i].value);\n' +
    '    }\n    destroy(&queue);'));
  await runPractice('allocation-failed 2 2 30\n1:10\n2:20\n', 0);
  await page.screenshot({path:path.join(out, 'm8-record-prefix.png')});
  await page.locator('[data-c-stdin]').fill('20 30 0\n');
  await runPractice('ok 3 4 60\n1:10\n2:20\n3:30\n', 0);
  await page.locator('[data-c-stdin]').fill('20 30 2\n');
  await runPractice('allocation-failed 2 2 30\n1:10\n2:20\n', 0);
  console.log('C17_M8_GROWTH_PASS deterministic failure retains the exact accepted record prefix');

  await openPractice('c.result-artifacts', 'Input files and result artifacts');
  const artifactLesson = JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR, manifest.prefix,
    'courses/c/lessons/c.result-artifacts.en.json'),'utf8'));
  const artifactPath = 'stock-totals.tsv';
  const fileTab = file => page.locator('.code-file-tab[data-open-file="'+file+'"]');
  const resultPanel = page.locator('[data-runtime-files]');
  const artifactEditor = page.locator('#editor');
  await runPractice('ok\n',0);
  assert.match(await resultPanel.textContent(), /stock-totals\.tsv \(0 B\)/);
  assert.equal(await fileTab(artifactPath).count(),0);
  await artifactEditor.fill(artifactLesson.practice.referenceSolution.source);
  assert.equal(await resultPanel.count(),0);
  await runPractice('ok\n',0);
  assert.match(await resultPanel.textContent(), /stock-totals\.tsv \(19 B\)/);
  const [download] = await Promise.all([
    page.waitForEvent('download'), resultPanel.getByRole('button',{name:'Download',exact:true}).click(),
  ]);
  assert.equal(download.suggestedFilename(),artifactPath);
  const artifact = 'records\ttotal\n2\t11\n';
  assert.deepEqual(await readFile(await download.path()),Buffer.from(artifact));
  assert.equal(await fileTab(artifactPath).count(),0);
  await resultPanel.getByRole('button',{name:'Save result files to project'}).click();
  await fileTab(artifactPath).waitFor();
  await page.reload();
  await page.locator('[data-c-workspace] #editor').waitFor();
  await fileTab(artifactPath).click();
  assert.equal(await artifactEditor.inputValue(),artifact);
  await fileTab('input/stock.tsv').click();
  await artifactEditor.fill('12\t8\n26\t3junk\n');
  await runPractice('invalid line 2\n',1);
  assert.equal(await resultPanel.count(),0);
  await fileTab(artifactPath).click();
  assert.equal(await artifactEditor.inputValue(),artifact);
  await page.screenshot({path:path.join(out,'m9-artifact-restore.png')});
  await fileTab('input/stock.tsv').click();
  await artifactEditor.fill('12\t9\n26\t3\n');
  await runPractice('ok\n',0);
  await page.waitForFunction(()=>document.querySelector('[data-c-save]').textContent.includes('saved'));
  const baselineDraft = await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(key=>key.includes('c-course:v1:')&&key.endsWith('c.result-artifacts'));
    return {key,raw:localStorage.getItem(key)};
  });
  assert.ok(baselineDraft.key&&baselineDraft.raw);
  await page.evaluate(({key,raw})=>{
    const other=JSON.parse(raw);
    other.stdin='from a second tab';
    localStorage.setItem(key,JSON.stringify(other));
  },baselineDraft);
  await resultPanel.locator('[data-save-runtime-files]').click();
  assert.match(await page.locator('[data-c-save]').textContent(),/newer version/);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).stdin,baselineDraft.key),'from a second tab');
  await page.evaluate(({key,raw})=>{
    localStorage.setItem(key,raw);
    window.nexusOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem=function(target,value){
      if(target===key)throw new DOMException('Synthetic draft quota','QuotaExceededError');
      return window.nexusOriginalSetItem.call(this,target,value);
    };
  },baselineDraft);
  await resultPanel.locator('[data-save-runtime-files]').click();
  assert.match(await page.locator('[data-c-save]').textContent(),/could not be saved/);
  await fileTab(artifactPath).click();
  assert.equal(await artifactEditor.inputValue(),artifact);
  await page.evaluate(()=>{Storage.prototype.setItem=window.nexusOriginalSetItem;delete window.nexusOriginalSetItem;});
  await resultPanel.locator('[data-save-runtime-files]').click();
  assert.equal(await artifactEditor.inputValue(),'records\ttotal\n2\t12\n');
  console.log('C17_M9_ARTIFACT_PASS exact bytes, download, explicit save, reload and preserved report on invalid input');

  await openPractice('c.translation-units', 'Translation units and linking');
  await runPractice('trays=1\n', 0);
  await fileTab('tray.c').click();
  const tray = await page.locator('#editor').inputValue();
  assert.ok(tray.includes('return items / 3;'));
  const repairedTray = tray.replace('return items / 3;', 'return (items + 2) / 3;');
  await page.locator('#editor').fill(repairedTray);
  await runPractice('trays=2\n', 0);
  await page.reload();
  await page.locator('[data-c-workspace] #editor').waitFor();
  await fileTab('tray.c').click();
  assert.equal(await page.locator('#editor').inputValue(),repairedTray);
  await fileTab('tray.h').click();
  assert.match(await page.locator('#editor').inputValue(),/trays_needed/);
  console.log('C17_M10_UNITS_PASS implementation changed independently, both C files linked, project restored');

  await openPractice('c.capstone-delivery','Evidence and project delivery');
  const capstone = JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR, manifest.prefix,
    'courses/c/lessons/c.capstone-delivery.en.json'),'utf8'));
  const initialReport = capstone.practice.files.find(file=>file.path==='summary.tsv').content;
  const finalReport = capstone.practice.cases[0].outputFiles['summary.tsv'];
  await fileTab('summary.tsv').click();
  assert.equal(await page.locator('#editor').inputValue(),initialReport);
  await fileTab('inventory.c').click();
  const inventoryEdit = capstone.practice.referenceSolution.files['inventory.c'] + '\n/* Checked report order. */\n';
  await page.locator('#editor').fill(inventoryEdit);
  await fileTab('main.c').click();
  const beforeReport = await page.locator('#editor').inputValue();
  assert.notEqual(beforeReport,capstone.practice.referenceSolution.source);
  await runPractice('reported\n',0);
  const resultSize = bytes => new TextEncoder().encode(bytes).length;
  assert.ok((await resultPanel.textContent()).includes('('+resultSize(initialReport+finalReport)+' B)'));
  await page.locator('#editor').fill(capstone.practice.referenceSolution.source);
  await runPractice('reported\n',0);
  assert.ok((await resultPanel.textContent()).includes('('+resultSize(finalReport)+' B)'));
  await fileTab('summary.tsv').click();
  assert.equal(await page.locator('#editor').inputValue(),initialReport);
  await resultPanel.locator('[data-save-runtime-files]').click();
  assert.equal(await page.locator('#editor').inputValue(),finalReport);
  await page.reload();
  await page.locator('[data-c-workspace] #editor').waitFor();
  await fileTab('summary.tsv').click();
  assert.equal(await page.locator('#editor').inputValue(),finalReport);
  await fileTab('inventory.c').click();
  assert.equal(await page.locator('#editor').inputValue(),inventoryEdit);
  await fileTab('main.c').click();
  assert.equal(await page.locator('#editor').inputValue(),capstone.practice.referenceSolution.source);
  await page.screenshot({path:path.join(out,'m12-capstone-restored.png')});
  console.log('C17_M12_CAPSTONE_PASS multi-file compile, exact report, explicit save, source and artifact restored');

  assert.deepEqual(fixture.errors, []);
  console.log('C17_DRAFT_RESTORE_PASS editor/stdin preserved after reload and locale switch; starter confirmation rejected; synthetic verified account storage');
  await writeFile(path.join(out, 'c17-workspace.json'), JSON.stringify({
    status: 'PASS', generation: manifest.assetGeneration, version: manifest.version,
    buildManifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    result, diagnostic, accountScoped, editorRestored: true, stdinRestored: true, starterDismissalPreservedDraft: true,
    module3: {bonusBeforeExit:1, bonusAfterExit:0, directCalls:'120 3000', unknownUnit:'invalid'},
    module4: {original:'3 -1 3 2', starter:'3 3 2 -1', sorted:'-1 2 3 3', empty:'empty'},
    module5: {starter:'ERR\nrejected 1\n', prefix:'ERR fan\nERR\nrejected 1\n'},
    module6: {starter:'17', copied:'27', rejected:'invalid'},
    module7: {starter:'full', fixed:'duplicate', snapshot:'101:1 203:2 321:1', unchangedOnRejection:true},
    module8: {rejected:'1:10\n2:20\n', successful:'1:10\n2:20\n3:30\n', repeatVerified:true},
  }, null, 2) + '\n');
} finally {
  await fixture.close();
}
