// Браузерный UX-гейт для настоящего bootstrap Nexus с синтетическим аккаунтом.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GATEWAY_ORIGIN } from '../server-access/bff/account-read.mjs';
import { staticMime } from '../pwa/static-mime.js';
import { decodeFixturePathname, resolveFixtureFile } from './helpers/public-fixture-path.mjs';

const { NEXUS_FRONTEND_DIR, NEXUS_NATIVE_EVIDENCE, NEXUS_PLAYWRIGHT_MODULE, NEXUS_CHROME_PATH } = process.env;
assert.ok(NEXUS_FRONTEND_DIR && NEXUS_NATIVE_EVIDENCE && NEXUS_PLAYWRIGHT_MODULE, 'Browser evidence settings are required');
const out = path.resolve(NEXUS_NATIVE_EVIDENCE);
await mkdir(out, { recursive: true });
const frontend = path.resolve(NEXUS_FRONTEND_DIR);
const buildBytes = await readFile(path.join(frontend, 'BUILD_MANIFEST.json'));
const build = JSON.parse(buildBytes);
const prefix = '/' + build.prefix;
const json = async file => JSON.parse(await readFile(resolveFixtureFile(frontend, build.prefix + file)));
const manifest = await json('courses/c/manifest.json');
const topicIds = manifest.availableTopicIds;
const lessonCount = topicIds.length;
assert.equal(lessonCount, 41);
const lessons = {};
for (const locale of ['ru', 'en']) {
  lessons[locale] = await Promise.all(manifest.availableTopicIds.map(id => json('courses/c/lessons/' + id + '.' + locale + '.json')));
}
const { chromium } = await import(pathToFileURL(NEXUS_PLAYWRIGHT_MODULE));
const account = { accountId:'synthetic-c-ux-owner', displayName:'Synthetic C learner', status:'active' };
const accountResponse = {
  account,
  loginMethods:[{ id:'synthetic-c-ux-key', kind:'passkey', status:'active', createdAt:'2026-11-24T00:00:00Z', disabledAt:null }],
  enrollmentAvailable:false,
};
const publicResponses = new Map([
  ['/api/v2/account', accountResponse],
  ['/api/v2/account/profile', { ...account, username:null, avatar:null, avatarVersion:0 }],
  ['/api/v2/account/oauth/providers', { providers:[] }],
  ['/api/v2/account/control/capabilities', { canManage:false, canModerate:false, canPurge:false, freshPasskey:false }],
  ['/api/v2/content/feed', { posts:[], home:{} }],
  ['/api/v2/feedback/reviews', { reviews:[], ratings:0, average:0, total:0 }],
  ['/api/akronikl/cloud/preferences', { revision:0, value:null }],
]);
const stageText = {
  ru:['Объяснение','Самопроверка','Практика','Дальше: самопроверка →','Перейти к практике →','Следующий урок: ','Вернуться к программе →','Эталонное решение','Справка по теме','Отметить изученным','Продолжить: '],
  en:['Explanation','Self-check','Practice','Next: self-check →','Go to practice →','Next lesson: ','Back to the course outline →','Reference solution','Lesson reference','Mark as studied','Resume: '],
};
const results = [];
const pageErrors = [];
const requests = [];
const missingAssets = [];
const screenshots = [];
let browser;
let currentPage;

async function screenshot(page, name) {
  const file = name + '.png';
  await page.screenshot({ path:path.join(out, file), animations:'disabled' });
  screenshots.push(file);
}

async function openContext(width) {
  const context = await browser.newContext({ viewport:{ width,height:900 }, reducedMotion:'reduce', hasTouch:width<400 });
  await context.addInitScript(() => {
    // Онлайн-вход на точной сборке. Отдельный native тест проверяет реальный SW.
    if (window === window.top && navigator.serviceWorker) {
      navigator.serviceWorker.register = async () => { throw Error('C_COURSE_ONLINE_FIXTURE_NO_SW'); };
    }
  });
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== GATEWAY_ORIGIN) return route.abort();
    const pathname = decodeFixturePathname(url.pathname);
    if (pathname.startsWith('/api/')) {
      requests.push({ pathname, method:req.method() });
      const body = req.method() === 'GET' ? publicResponses.get(pathname) : null;
      return route.fulfill({
        status:body ? 200 : 403, contentType:'application/json',
        headers:{ 'cache-control':'no-store', vary:'*' },
        body:JSON.stringify(body ?? { error:{ code:'C_COURSE_SYNTHETIC_DENIED' } }),
      });
    }
    const file = pathname === '/' ? 'nexus-shell.html' : pathname.slice(1);
    if (pathname.startsWith(prefix) && /(?:\/courses\/c\/|\/core\/c-course[.-])/.test(pathname)) {
      requests.push({ pathname, method:req.method(), width });
    }
    try {
      return route.fulfill({
        status:200, contentType:staticMime(file), body:await readFile(resolveFixtureFile(frontend, file)),
      });
    } catch {
      missingAssets.push(pathname);
      return route.fulfill({ status:404, body:'C_COURSE_SYNTHETIC_NOT_FOUND' });
    }
  });
  const page = await context.newPage();
  currentPage = page;
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => pageErrors.push(error.message));
  return { context, page };
}

const course = page => page.locator('[data-c-course]');
function bottom(page, name) {
  return course(page).locator('footer.c-actions').getByRole('link', { name, exact:true });
}

async function lessonReady(page, lesson, stage) {
  const root = course(page);
  await root.getByRole('heading', { level:1, name:lesson.title, exact:true }).waitFor();
  await root.locator('.c-stages [aria-current="page"]').filter({ hasText:stage }).waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector('[data-c-course] link')?.sheet));
  assert.equal(await root.getAttribute('lang'), lesson.locale);
}

async function checkLayout(page, label) {
  const metrics = await page.evaluate(() => {
    const host = document.querySelector('[data-c-course]');
    const links = [...host.querySelectorAll('.c-neighbors .btn, .c-stages .btn, footer.c-actions .btn')];
    const overflows = [...host.querySelectorAll('pre')].filter(pre =>
      pre.getBoundingClientRect().width && pre.scrollWidth > pre.clientWidth + 1 && !pre.closest('.code-studio')
    ).length;
    const wrappedStages = [...host.querySelectorAll('.c-stages .btn')].filter(link => {
      const label = document.createRange();
      label.selectNodeContents(link);
      return label.getClientRects().length > 1;
    }).map(link => link.textContent);
    return {
      width:innerWidth,
      viewportOverflow:document.documentElement.scrollWidth > innerWidth + 1,
      outsideLink:links.some(link => {
        const box = link.getBoundingClientRect();
        return box.left < -1 || box.right > innerWidth + 1;
      }),
      smallestTarget:Math.min(...links.map(link => link.getBoundingClientRect().height)),
      overflows,
      wrappedStages,
    };
  });
  assert.equal(metrics.viewportOverflow, false, label + ' page has horizontal overflow');
  assert.equal(metrics.outsideLink, false, label + ' route controls exceed the viewport');
  assert.ok(metrics.smallestTarget >= 43, label + ' route target is below 44 CSS px');
  assert.equal(metrics.overflows, 0, label + ' code or output is clipped');
  assert.deepEqual(metrics.wrappedStages, [], label + ' stage label is split');
}

async function selectCourseLocale(page, locale) {
  await page.locator('#visualSettings summary').click();
  await page.locator('#courseLocale').click();
  await page.locator('#courseLocaleMenu [data-value="' + locale + '"]').click();
}

async function openCourse(page, locale, width) {
  await page.goto(GATEWAY_ORIGIN + '/#view=academy');
  const card = page.locator('a[data-academy-course="c"]');
  await card.waitFor();
  assert.match(await card.innerText(), /Модули 1–8|Modules 1–8/);
  assert.equal(requests.filter(request => request.width === width).length, 0, 'Academy should not preload C modules or lessons');
  await card.click();
  await course(page).getByRole('heading', { level:1, name:manifest.title.ru }).waitFor();
  if (locale === 'en') {
    await selectCourseLocale(page, 'en');
    await course(page).getByRole('heading', { level:1, name:manifest.title.en }).waitFor();
  }
  assert.equal(await course(page).locator('.c-outline a').count(), manifest.availableTopicIds.length);
  assert.ok(await course(page).locator('details.c-panel').count() > 0);
  assert.equal(await course(page).locator('details.c-panel a').count(), 0, 'Planned topics must not link to unavailable lessons');
}

async function rejectWrites(page, keyPart) {
  await page.evaluate(keyPart => {
    const write = Storage.prototype.setItem;
    window.restoreSyntheticWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function(key, value) {
      if (key.includes(keyPart)) throw new DOMException('Test write failure', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  }, keyPart);
}

async function checkDraft(page, first, next, words, {studied = 0, complete = true} = {}) {
  const editor = course(page).locator('#editor');
  const stdin = course(page).locator('[data-c-stdin]');
  const source = '#include <stdio.h>\nint main(void) { puts("UX_SYNTHETIC"); }\n';
  const input = 'mock stdin';
  await editor.fill(source);
  await stdin.fill(input);
  const reference = course(page).getByText(words[7], { exact:true });
  await reference.click();
  await checkLayout(page, 'Visible reference');
  assert.equal(await editor.inputValue(), source);
  assert.equal(await stdin.inputValue(), input);
  const originalHash = new URL(page.url()).hash;
  await rejectWrites(page, 'c-course:v1:draft:');
  const changed = source + '// unsaved\n';
  await editor.fill(changed);
  await bottom(page, words[5] + next.title + ' →').click();
  await course(page).locator('[data-c-status]').filter({ hasText:/Navigation stopped|Переход остановлен/ }).waitFor();
  assert.equal(new URL(page.url()).hash, originalHash);
  assert.equal(await editor.inputValue(), changed);
  assert.equal(await stdin.inputValue(), input);
  await screenshot(page, 'desktop-save-failure-' + first.id);
  await page.evaluate(() => window.restoreSyntheticWrite());
  await bottom(page, words[5] + next.title + ' →').click();
  await lessonReady(page, next, words[0]);
  await page.goBack();
  await lessonReady(page, first, words[2]);
  assert.equal(await editor.inputValue(), changed);
  assert.equal(await stdin.inputValue(), input);
  await page.reload();
  await lessonReady(page, first, words[2]);
  assert.equal(await editor.inputValue(), changed);
  assert.equal(await stdin.inputValue(), input);
  await selectCourseLocale(page, 'ru');
  await lessonReady(page, lessons.ru.find(lesson => lesson.id === first.id), stageText.ru[2]);
  assert.equal(await editor.inputValue(), changed);
  await selectCourseLocale(page, 'en');
  await lessonReady(page, first, words[2]);
  assert.equal(await editor.inputValue(), changed);
  assert.equal(await stdin.inputValue(), input);
  await course(page).locator('.c-lesson-header .back-link').click();
  await course(page).getByRole('heading', { level:1, name:manifest.title[first.locale] }).waitFor();
  assert.match(await course(page).locator('header.c-panel').innerText(), new RegExp('Studied ' + studied + ' / ' + lessonCount));
  await course(page).getByRole('link', { name:words[10] + first.title, exact:true }).click();
  await lessonReady(page, first, words[2]);
  assert.equal(await editor.inputValue(), changed);
  assert.equal(await course(page).locator('[data-c-complete]').getAttribute('aria-pressed'), 'false');
  if (complete) {
    await course(page).getByRole('button', { name:words[9], exact:true }).click();
    assert.equal(await course(page).locator('[data-c-complete]').getAttribute('aria-pressed'), 'true');
  }
}

async function checkSelfcheckWriteFailure(page, first, words) {
  await course(page).locator('.c-stages').getByRole('link', { name:words[1], exact:true }).click();
  await lessonReady(page, first, words[1]);
  const response = course(page).locator('textarea[data-c-explanation]').first();
  const answer = 'The called function prints a line.';
  await rejectWrites(page, 'c-course:v1:responses:');
  await response.fill(answer);
  const canLeave = () => page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable:true })));
  assert.equal(await canLeave(), false, 'Unsaved self-check must cancel beforeunload on repeated write failure');
  assert.equal(await response.inputValue(), answer);
  await page.evaluate(() => window.restoreSyntheticWrite());
  assert.equal(await canLeave(), true, 'Beforeunload may proceed once the response can be saved');
  await page.reload();
  await lessonReady(page, first, words[1]);
  assert.equal(await response.inputValue(), answer);
}

try {
  browser = await chromium.launch({ headless:true, executablePath:NEXUS_CHROME_PATH,
    args:['--disable-background-networking', '--disable-component-update'] });
  for (const width of [1366, 390, 320]) {
    for (const locale of ['ru', 'en']) {
      const started = performance.now();
      requests.length = 0;
      const { context, page } = await openContext(width);
      try {
        const words = stageText[locale];
        await openCourse(page, locale, width);
        if (width !== 390) await screenshot(page, 'academy-c-' + locale + '-' + width);
        await course(page).locator('.c-outline a').first().click();
        for (const [index, lesson] of lessons[locale].entries()) {
          const label = locale + '/' + width + '/' + lesson.id;
          const previous = lessons[locale][index - 1], next = lessons[locale][index + 1];
          await lessonReady(page, lesson, words[0]);
          await checkLayout(page, label + '/explanation');
          assert.equal(await course(page).locator('.c-neighbors a').count(), Number(Boolean(previous)) + Number(Boolean(next)));
          if (next) assert.equal(await course(page).locator('.c-neighbors a').last().innerText(), words[5] + next.title + ' →');
          if (index === 0) {
            const presence = page.locator('body > [data-akronikl-presence]');
            await presence.waitFor({ state:'attached' });
            assert.equal(await presence.isVisible(), width > 390, 'Mobile C controls need a clear tap area');
            await page.locator('.nexus-footer-actions [data-akronikl-open]').waitFor();
            await course(page).getByText(words[8], { exact:true }).click();
            await checkLayout(page, label + '/reference');
            await course(page).getByText(words[8], { exact:true }).click();
            await page.evaluate(() => window.scrollTo(0, 0));
            await screenshot(page, 'lesson-top-' + locale + '-' + width);
          }
          await bottom(page, words[3]).click();
          await lessonReady(page, lesson, words[1]);
          await checkLayout(page, label + '/selfcheck');
          assert.ok(await course(page).locator('[data-c-question]').count() >= 3);
          if (index === 0) {
            const question = lesson.selfcheck[0];
            const panel = course(page).locator('[data-c-question="0"]');
            await panel.getByRole('radio').nth(question.correct).check();
            await panel.locator('[data-c-check]').click();
            assert.equal(await panel.locator('[data-c-feedback]').innerText(), question.feedback[question.correct]);
          }
          await bottom(page, words[4]).click();
          await lessonReady(page, lesson, words[2]);
          await checkLayout(page, label + '/practice');
          assert.ok(await course(page).locator('[data-c-workspace] #editor').count());
          const reference = course(page).getByText(words[7], { exact:true });
          await reference.click();
          await checkLayout(page, label + '/reference-solution');
          if (index === 0) {
            await screenshot(page, 'reference-solution-' + locale + '-' + width);
            await bottom(page, words[5] + next.title + ' →').scrollIntoViewIfNeeded();
            await screenshot(page, 'next-lesson-' + locale + '-' + width);
          }
          await reference.click();
          if (next) {
            await bottom(page, words[5] + next.title + ' →').click();
          } else {
            await bottom(page, words[6]).click();
            await course(page).getByRole('heading', { level:1, name:manifest.title[locale] }).waitFor();
          }
        }
        if (width === 1366 && locale === 'en') {
          await course(page).locator('.c-outline a').first().click();
          await lessonReady(page, lessons.en[0], words[0]);
          const practice = course(page).locator('.c-stages').getByRole('link', { name:words[2], exact:true });
          await practice.focus();
          await page.keyboard.press('Enter');
          await lessonReady(page, lessons.en[0], words[2]);
          await checkDraft(page, lessons.en[0], lessons.en[1], words);
          await checkSelfcheckWriteFailure(page, lessons.en[0], words);
          for (const id of ['c.m1-project', 'c.read-input', 'c.guard-boundaries', 'c.functions', 'c.function-project', 'c.array-bounds', 'c.array-sort', 'c.null-terminated-strings', 'c.text-project', 'c.addresses-and-pointers', 'c.pointer-lifetime-errors', 'c.structures', 'c.structure-contracts', 'c.allocation']) {
            const index = lessons.en.findIndex(lesson => lesson.id === id);
            await course(page).locator('.c-lesson-header .back-link').click();
            await course(page).locator('.c-outline').getByRole('link', {name:lessons.en[index].title, exact:true}).click();
            await lessonReady(page, lessons.en[index], words[0]);
            await course(page).locator('.c-stages').getByRole('link', {name:words[2], exact:true}).click();
            await lessonReady(page, lessons.en[index], words[2]);
            await checkDraft(page, lessons.en[index], lessons.en[index + 1], words, {studied:1, complete:false});
          }
        }
        assert.ok(!requests.some(request => request.pathname.startsWith('/api/') && request.method !== 'GET'),
          'C practice and progress must cause no API mutation');
        const observed = [...new Set(requests.filter(request => request.pathname.startsWith(prefix)).map(request => request.pathname.slice(prefix.length)))];
        const lessonFiles = observed.filter(file => file.startsWith('courses/c/lessons/'));
        const expectedFiles = topicIds.map(id => 'courses/c/lessons/' + id + '.' + locale + '.json');
        if (width === 1366 && locale === 'en') {
          expectedFiles.push(...['c.what-is-c', 'c.m1-project', 'c.read-input', 'c.guard-boundaries', 'c.functions', 'c.function-project', 'c.array-bounds', 'c.array-sort', 'c.null-terminated-strings', 'c.text-project', 'c.addresses-and-pointers', 'c.pointer-lifetime-errors', 'c.structures', 'c.structure-contracts', 'c.allocation'].map(id => 'courses/c/lessons/' + id + '.ru.json'));
        }
        assert.deepEqual(lessonFiles.sort(), expectedFiles.sort());
        const result = { width, locale, lessons:lessonCount, stageViews:lessonCount * 3, durationMs:Math.round(performance.now() - started), status:'PASS' };
        results.push(result);
        console.log(JSON.stringify(result));
      } finally {
        if (results.at(-1)?.width === width && results.at(-1)?.locale === locale) await context.close();
      }
    }
  }
  assert.deepEqual(missingAssets.filter(file => file.startsWith(prefix + 'courses/c/')), []);
  assert.deepEqual(pageErrors, []);
} catch (error) {
  process.exitCode = 1;
  results.push({ status:'FAIL', error:error.stack });
  console.error(error.stack);
  if (currentPage) await screenshot(currentPage, 'FAILURE').catch(() => {});
} finally {
  await browser?.close();
  await writeFile(path.join(out, 'RESULT.json'), JSON.stringify({
    status:process.exitCode ? 'FAIL' : 'PASS', generation:build.assetGeneration,
    buildManifestSha256:createHash('sha256').update(buildBytes).digest('hex'),
    physicalDevices:false, syntheticAccount:true, results, pageErrors, missingAssets, screenshots,
  }, null, 2) + '\n');
}
