// Публичное чтение курса C через настоящий Service Worker после закрытия Chrome.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { nativeOfflineFixture } from './helpers/native-offline-fixture.mjs';

const frontend = path.resolve(process.env.NEXUS_FRONTEND_DIR);
const buildBytes = await readFile(path.join(frontend, 'BUILD_MANIFEST.json'));
const build = JSON.parse(buildBytes);
const courseManifest = JSON.parse(await readFile(path.join(frontend, build.prefix, 'courses/c/manifest.json')));
const firstId = courseManifest.availableTopicIds[0];
const firstEnglish = JSON.parse(await readFile(path.join(frontend, build.prefix, 'courses/c/lessons/' + firstId + '.en.json')));
const fixture = await nativeOfflineFixture('c-course-read');
let page;
let cold = false;
const observed = new Map();
const checks = [];

async function capture(name) {
  await page.screenshot({ path:path.join(fixture.out, name + '.png'), animations:'disabled' });
}

async function check(name, fn) {
  const started = performance.now();
  await fn();
  checks.push({ name, status:'PASS', durationMs:Math.round(performance.now() - started) });
  console.log('PASS ' + name);
}

try {
  page = await fixture.launch();
  await check('Подготовка подлинного публичного пакета', async () => {
    await page.goto(fixture.origin + '/offline.html#view=academy');
    const ready = await fixture.waitReady();
    assert.equal(ready.protocol, 'nexus-verified-public-v1');
    assert.equal(ready.generation, build.assetGeneration);
    assert.equal(ready.publicReady, true);
    await page.locator('[data-academy-course="c"]').waitFor();
  });
  await fixture.closeBrowser();
  fixture.networkDown();
  cold = true;
  page = await fixture.launch();
  await fixture.context.setOffline(true);
  await page.setViewportSize({ width:390,height:844 });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== fixture.origin) return;
    const file = url.pathname.slice(1);
    if (!file.startsWith(build.prefix + 'courses/c/') &&
        !file.startsWith(build.prefix + 'core/c-course') && file !== 'offline.html') return;
    observed.set(file, {
      sha256:response.headers()['x-nexus-verified-sha256'], fromServiceWorker:response.fromServiceWorker(),
    });
  });
  const root = page.locator('[data-c-course]');
  await check('После перезапуска C открывается из Академии без сервера', async () => {
    await page.goto(fixture.origin + '/offline.html#view=academy');
    await page.locator('a[data-academy-course="c"]').click();
    await root.getByRole('heading', { level:1, name:courseManifest.title.ru }).waitFor();
    assert.equal(await root.locator('.c-outline a').count(), 32);
    await capture('cold-academy-c-390');
    await root.locator('.c-outline a').first().click();
    await root.locator('.c-stages [aria-current="page"]').filter({ hasText:'Объяснение' }).waitFor();
    assert.ok(await root.locator('pre code').count());
    await capture('cold-first-lesson-ru-390');
  });
  await check('RU/EN открываются, справка и эталон читаются, запуска и личной записи нет', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=' + firstId + '&locale=en');
    await root.getByRole('heading', { level:1, name:firstEnglish.title, exact:true }).waitFor();
    await root.getByText('Lesson reference', { exact:true }).click();
    assert.ok(await root.locator('.c-glossary[open] dd').count());
    await root.locator('footer').getByRole('link', { name:'Next: self-check →' }).click();
    await root.locator('footer').getByRole('link', { name:'Go to practice →' }).click();
    await root.getByText('Reference solution', { exact:true }).click();
    assert.match(await root.innerText(), /offline lesson is available for reading/);
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    assert.equal(await page.evaluate(async prefix => {
      const { verifiedAccount } = await import('/' + prefix + 'core/account-storage.js');
      return verifiedAccount();
    }, build.prefix), null);
    await capture('cold-reference-en-390');
  });
  await check('Последний урок M1 ведёт в M2 без сети, оба языка доступны', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.m1-project&stage=practice&locale=ru');
    await root.locator('footer').getByRole('link', {name:/Следующий урок: Чтение строки/}).click();
    await root.getByRole('heading', {level:1, name:'Чтение строки и проверка ввода'}).waitFor();
    await capture('cold-m2-ru-390');
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.read-input&stage=practice&locale=en');
    await root.getByRole('heading', {level:1, name:'Reading a line and validating it'}).waitFor();
    await root.getByText('Reference solution', {exact:true}).click();
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    await capture('cold-m2-reference-en-390');
  });
  await check('Последний урок M2 ведёт в M3 без сети, проект читается на английском', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.guard-boundaries&stage=practice&locale=ru');
    await root.locator('footer').getByRole('link', {name:/Следующий урок: Объявление, определение и вызов/}).click();
    await root.getByRole('heading', {level:1, name:'Объявление, определение и вызов', exact:true}).waitFor();
    await capture('cold-m3-ru-390');
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.function-project&stage=practice&locale=en');
    await root.getByRole('heading', {level:1, name:'Project: unit conversion', exact:true}).waitFor();
    await root.getByText('Reference solution', {exact:true}).click();
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    await capture('cold-m3-project-en-390');
  });
  await check('Последний урок M3 ведёт в M4 без сети, сортировка читается на английском', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.function-project&stage=practice&locale=ru');
    await root.locator('footer').getByRole('link', {name:/Следующий урок: Массив и границы индекса/}).click();
    await root.getByRole('heading', {level:1, name:'Массив и границы индекса', exact:true}).waitFor();
    await capture('cold-m4-ru-390');
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.array-sort&stage=practice&locale=en');
    await root.getByRole('heading', {level:1, name:'Simple sorting and checking the result', exact:true}).waitFor();
    await root.getByText('Reference solution', {exact:true}).click();
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    await capture('cold-m4-sort-en-390');
  });
  await check('Последний урок M4 ведёт в M5 без сети, фильтр строк читается на английском', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.array-sort&stage=practice&locale=ru');
    await root.locator('footer').getByRole('link', {name:/Следующий урок: Символы и завершающий ноль/}).click();
    await root.getByRole('heading', {level:1, name:"Символы и завершающий ноль", exact:true}).waitFor();
    await capture('cold-m5-ru-390');
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.text-project&stage=practice&locale=en');
    await root.getByRole('heading', {level:1, name:"Project: line filter", exact:true}).waitFor();
    await root.getByText('Reference solution', {exact:true}).click();
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    await capture('cold-m5-filter-en-390');
  });
  await check('Последний урок M5 ведёт в M6 без сети, эталон указателей читается по-английски', async () => {
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.text-project&stage=practice&locale=ru');
    await root.locator('footer').getByRole('link', {name:/Следующий урок: Адрес и разыменование/}).click();
    await root.getByRole('heading', {level:1, name:'Адрес и разыменование', exact:true}).waitFor();
    await capture('cold-m6-ru-390');
    await page.goto(fixture.origin + '/offline.html#course=c&lesson=c.pointer-lifetime-errors&stage=practice&locale=en');
    await root.getByRole('heading', {level:1, name:'Lifetime and pointer errors', exact:true}).waitFor();
    await root.getByText('Reference solution', {exact:true}).click();
    assert.equal(await root.locator('#editor,[data-c-run],[data-c-complete]').count(), 0);
    await capture('cold-m6-reference-en-390');
  });
  await check('Ресурсы C пришли из Service Worker с SHA из сборки', async () => {
    const expected = [
      'offline.html', ...[
        'core/c-course.mjs', 'core/c-course.css', 'courses/c/manifest.json', 'courses/c/curriculum.json',
        'courses/c/lessons/' + firstId + '.ru.json', 'courses/c/lessons/' + firstId + '.en.json',
        'courses/c/lessons/c.m1-project.ru.json', 'courses/c/lessons/c.read-input.ru.json', 'courses/c/lessons/c.read-input.en.json',
        'courses/c/lessons/c.guard-boundaries.ru.json', 'courses/c/lessons/c.functions.ru.json', 'courses/c/lessons/c.function-project.en.json',
        'courses/c/lessons/c.function-project.ru.json', 'courses/c/lessons/c.array-bounds.ru.json', 'courses/c/lessons/c.array-sort.en.json',
        'courses/c/lessons/c.array-sort.ru.json', 'courses/c/lessons/c.null-terminated-strings.ru.json', 'courses/c/lessons/c.text-project.en.json',
        'courses/c/lessons/c.text-project.ru.json', 'courses/c/lessons/c.addresses-and-pointers.ru.json', 'courses/c/lessons/c.pointer-lifetime-errors.en.json',
      ].map(file => build.prefix + file),
    ];
    const manifest = new Map(build.files.map(record => [record.file, record.sha256]));
    for (const file of expected) {
      assert.deepEqual(observed.get(file), { sha256:manifest.get(file), fromServiceWorker:true }, file);
    }
    assert.equal(fixture.requests.filter(request => request.path.startsWith('/api/') && request.method !== 'GET').length, 0);
    assert.deepEqual(fixture.errors, []);
  });
} catch (error) {
  process.exitCode = 1;
  checks.push({ status:'FAIL', error:error.stack });
  console.error(error.stack);
  if (page) await capture('FAILURE').catch(() => {});
} finally {
  await fixture.finish({
    status:process.exitCode ? 'FAIL' : 'PASS', cold, checks,
    buildManifestSha256:createHash('sha256').update(buildBytes).digest('hex'),
    observed:Object.fromEntries(observed),
  });
}
