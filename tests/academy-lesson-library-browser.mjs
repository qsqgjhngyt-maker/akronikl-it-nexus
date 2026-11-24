import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN as origin} from '../server-access/bff/account-read.mjs';
import {staticMime} from '../pwa/static-mime.js';
import {decodeFixturePathname, resolveFixtureFile} from './helpers/public-fixture-path.mjs';

const frontend = path.resolve(process.env.NEXUS_FRONTEND_DIR);
const out = path.resolve(process.env.NEXUS_ACADEMY_LIBRARY_EVIDENCE);
const {chromium} = await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const account = {accountId:'synthetic-academy-library', displayName:'Учебная проверка', status:'active'};
const dto = new Map([
  ['/api/v2/account', {account, loginMethods:[{id:'synthetic-library-key', kind:'passkey', status:'active',
    createdAt:'2026-11-24T00:00:00Z', disabledAt:null}], enrollmentAvailable:false}],
  ['/api/v2/account/profile', {...account, username:null, avatar:null, avatarVersion:0}],
  ['/api/v2/account/control/capabilities', {canManage:false, canModerate:false, canPurge:false, freshPasskey:false}],
  ['/api/v2/content/feed', {posts:[], home:{}}],
  ['/api/v2/feedback/reviews', {reviews:[], ratings:0, average:0, total:0}],
  ['/api/akronikl/cloud/preferences', {revision:0, value:null}],
]);
const cases = [
  ['cpp','cpp.programming-process','ru',1440],
  ['c','c.first-program','en',320],
  ['onec','onec.p2.topic-1','ru',390],
  ['1c-enterprise','1c-enterprise.a2.topic-1','en',768],
];
await mkdir(out,{recursive:true});
const checks = [];
const browser = await chromium.launch({executablePath:process.env.NEXUS_CHROME_PATH,headless:true});
try {
  for (const [course,lesson,locale,width] of cases) {
    const context = await browser.newContext({viewport:{width,height:870},reducedMotion:'reduce',serviceWorkers:'block'});
    const catalogRequests = [], libraryModules = [], errors = [];
    let externalRequests = 0;
    try {
      await context.addInitScript(({origin, accountId, locale}) => {
        if (location.origin !== origin || window !== window.top) return;
        const key = 'akronikl:it-nexus:account-store:v1:' + encodeURIComponent(accountId) + ':akronikl:it-nexus:prefs:v1';
        localStorage.setItem(key, JSON.stringify({uiLocale:locale,courseLocale:locale,
          nexusAppearance:{theme:'night',motion:false,particles:0},effectsQuality:'off'}));
        localStorage.setItem('akronikl:it-nexus:startup-intro:v1',
          JSON.stringify({schema:1,enabled:false,simplified:true,seen:''}));
      }, {origin,accountId:account.accountId,locale});
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {externalRequests++; return route.abort();}
        const pathname = decodeFixturePathname(url.pathname);
        if (pathname.startsWith('/api/')) {
          const json = dto.get(pathname);
          return route.fulfill({status:json ? 200 : 403,contentType:'application/json',
            headers:{'cache-control':'no-store',vary:'*'},
            body:JSON.stringify(json ?? {error:{code:'SYNTHETIC_DENIED'}})});
        }
        if (pathname.includes('/courses/academy-library/')) catalogRequests.push(pathname);
        if (pathname.endsWith('/core/academy-lesson-library.mjs')) libraryModules.push(pathname);
        const filename = pathname === '/' || pathname === '/index.html' ? 'nexus-shell.html' : pathname.slice(1);
        try {
          return await route.fulfill({contentType:staticMime(filename),body:await readFile(resolveFixtureFile(frontend,filename))});
        } catch { return route.fulfill({status:404,body:'Fixture resource missing'}); }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(origin+'/#'+new URLSearchParams({course,lesson,locale,stage:'explanation'}));
      const root = course === 'c' ? page.locator('[data-c-course]') : page.locator('[data-r3-topic="'+lesson+'"][data-r3-ready="true"]');
      const menu = course === 'c' ? root.locator('.c-lesson-menu summary') : root.locator('[data-action="tools"]');
      await menu.waitFor();
      assert.equal(catalogRequests.length,0,'Ordinary opening must not request the library catalog');
      assert.equal(libraryModules.length,0,'Ordinary opening must not load the library dialog');
      const initialExternalRequests = externalRequests;
      for (const kind of ['reading','video']) {
        await menu.press('Enter');
        const items = root.locator('.academy-lesson-menu-items');
        await items.waitFor();
        assert.equal(await items.locator('a, button').count(),4);
        assert.equal(await items.locator('[data-academy-menu-item="assistant"]').isEnabled(),true);
        await items.locator('[data-academy-menu-item="'+kind+'"]').click();
        const dialog = root.locator('dialog.academy-library-dialog[open]');
        await dialog.locator('[data-library-results]:not([aria-busy])').waitFor();
        const links = dialog.locator('.academy-library-source a');
        assert.ok(await links.count(),course+' '+kind+' requires verified resources');
        assert.ok((await links.evaluateAll(nodes => nodes.every(node => node.protocol==='https:' && node.target==='_blank'))));
        assert.equal(await dialog.locator('iframe,video,audio').count(),0);
        assert.equal(await dialog.evaluate(node => node.getBoundingClientRect().right <= innerWidth + 1),true);
        if (kind==='video') await page.screenshot({path:path.join(out,course+'-'+width+'-video.png')});
        await page.keyboard.press('Escape');
        await root.locator('dialog.academy-library-dialog').waitFor({state:'detached'});
        assert.equal(await menu.evaluate(node => node === node.getRootNode().activeElement),true);
      }
      assert.equal(catalogRequests.length,1);
      assert.equal(libraryModules.length,1);
      assert.ok(catalogRequests[0].endsWith('/'+course+'.json'));
      assert.equal(externalRequests,initialExternalRequests,'Showing catalog entries must not load external resources');
      await menu.click();
      await root.locator('[data-academy-menu-item="program"]').click();
      await page.locator('[data-academy-course-navigation="modules"] [data-academy-module]').first().waitFor();
      const programme = new URLSearchParams(new URL(page.url()).hash.slice(1));
      assert.equal(programme.get('course'),course);
      assert.equal(programme.get('locale'),locale);
      assert.equal(programme.has('lesson'),false);
      assert.deepEqual(errors,[]);
      checks.push({course,lesson,locale,width,catalogRequests:catalogRequests.length,externalRequests,noEmbed:true,programmeTiles:true});
    } catch (error) {
      const page = context.pages()[0];
      if (page) await page.screenshot({path:path.join(out,course+'-failure.png')}).catch(()=>{});
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:'PASS',syntheticAccount:true,checks},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',courses:checks.length}));
