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
  assert.deepEqual(fixture.errors, []);
  console.log('C17_DRAFT_RESTORE_PASS editor/stdin preserved after reload and locale switch; starter confirmation rejected; synthetic verified account storage');
  await writeFile(path.join(out, 'c17-workspace.json'), JSON.stringify({
    status: 'PASS', generation: manifest.assetGeneration, version: manifest.version,
    buildManifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    result, diagnostic, accountScoped, editorRestored: true, stdinRestored: true, starterDismissalPreservedDraft: true,
  }, null, 2) + '\n');
} finally {
  await fixture.close();
}
