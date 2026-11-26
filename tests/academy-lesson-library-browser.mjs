import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GATEWAY_ORIGIN as origin} from '../server-access/bff/account-read.mjs';
import {staticMime} from '../pwa/static-mime.js';
import {decodeFixturePathname, resolveFixtureFile} from './helpers/public-fixture-path.mjs';

const frontend = path.resolve(process.env.NEXUS_FRONTEND_DIR);
const prefix = '/' + JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'),'utf8')).prefix;
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
  ['cpp','cpp.programming-process'],
  ['c','c.first-program'],
  ['onec','onec.p2.topic-1'],
  ['1c-enterprise','1c-enterprise.a2.topic-1'],
].flatMap(([course,lesson]) => ['ru','en'].flatMap(locale =>
  [1440,390,320].map(width => [course,lesson,locale,width])));
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
      const menu = root.locator('[data-academy-menu-toggle]');
      await menu.waitFor();
      const geometry = await root.locator('.academy-lesson-stages a').evaluateAll(nodes =>
        nodes.map(node=>[node.offsetWidth,node.offsetHeight,node.scrollWidth<=node.clientWidth+1,node.textContent]));
      assert.equal(geometry.length,3);
      for(const [w,h,contained,label] of geometry){
        if(width>400)assert.ok(Math.abs(w-geometry[0][0])<=1,'Stages divide the lesson bar into equal columns');
        assert.equal(h,44,'Shared lesson tab height');
        assert.ok(contained,`${course}/${locale}/${width}: ${label} fits inside its button`);
      }
      const glossary = root.locator('.academy-reference-actions [data-reference-open]');
      const syntax = root.locator('.academy-reference-actions [data-reference-editor-help]');
      await glossary.waitFor();
      for (const [action,desktopWidth] of [[glossary,208],[syntax,132]]) {
        const [w,h] = await action.evaluate(node=>[node.offsetWidth,node.offsetHeight]);
        assert.equal(h,44);
        assert.equal(w,width<=760?44:desktopWidth);
      }
      const toolbar = root.locator('.academy-reference-actions');
      const bottom = await toolbar.evaluate(node=>Math.round(innerHeight-node.getBoundingClientRect().bottom));
      assert.equal(bottom,width<=760?16:24);
      if(width>760)for(const action of [glossary,syntax]){
        assert.ok(await action.evaluate(node=>{
          const label=node.querySelector('.academy-reference-label'),range=document.createRange();
          range.selectNodeContents(label);
          const box=node.getBoundingClientRect(),text=range.getBoundingClientRect(),lines=[...range.getClientRects()];
          const sameLine=lines.length>0&&Math.max(...lines.map(part=>part.top))<Math.min(...lines.map(part=>part.bottom));
          return sameLine&&text.left>=box.left-1&&text.right<=box.right+1;
        }),`${course}/${locale}/${width}: complete help label fits on a single line`);
      }
      const neighbours = root.locator('.academy-lesson-neighbours');
      const next = neighbours.locator('a').last();
      await next.waitFor();
      assert.ok(await next.evaluate((link,mobile)=>{
        const bounds=link.getBoundingClientRect(), width=link.parentElement.getBoundingClientRect().width;
        return bounds.height>=44 && (mobile?Math.abs(bounds.width-width)<=1:bounds.width<width);
      },width<=760),'Next lesson matches the common desktop or mobile layout');
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
        if (kind==='reading') {
          const access = await dialog.locator('.academy-library-source .academy-library-meta').first().innerText();
          assert.ok(access.endsWith(locale==='en'?' · Free':' · Бесплатно'),course+' should offer free reading first');
        }
        assert.ok((await links.evaluateAll(nodes => nodes.every(node => node.protocol==='https:' && node.target==='_blank'))));
        assert.equal(await dialog.locator('iframe,video,audio').count(),0);
        assert.equal(await dialog.evaluate(node => node.getBoundingClientRect().right <= innerWidth + 1),true);
        if (kind==='video' && width===390) await page.screenshot({path:path.join(out,course+'-'+locale+'-'+width+'-video.png')});
        await page.keyboard.press('Escape');
        await root.locator('dialog.academy-library-dialog').waitFor({state:'detached'});
        assert.equal(await menu.evaluate(node => node === node.getRootNode().activeElement),true);
      }
      assert.equal(catalogRequests.length,1);
      assert.equal(libraryModules.length,1);
      assert.ok(catalogRequests[0].endsWith('/'+course+'.json'));
      assert.equal(externalRequests,initialExternalRequests,'Showing catalog entries must not load external resources');
      const back = root.locator('[data-academy-back="course"]');
      const references = root.locator('.academy-reference-actions');
      await back.waitFor();
      for (const tool of ['data-reference-open','data-reference-editor-help']) {
        const trigger = references.locator('['+tool+']');
        await trigger.press(tool==='data-reference-open'?'Enter':'Space');
        const drawer = root.locator('.reference-dialog[open]');
        await drawer.locator('[data-reference-card]').first().waitFor();
        if (tool==='data-reference-editor-help') {
          await drawer.locator('[data-reference-details][open] pre').first().waitFor();
          if (width!==320) await page.screenshot({path:path.join(out,course+'-'+locale+'-'+width+'-syntax.png')});
        }
        await page.keyboard.press('Escape');
        await drawer.waitFor({state:'hidden'});
      }
      await menu.click();
      await root.locator('[data-academy-menu-item="program"]').click();
      await page.locator('[data-academy-course-navigation="modules"] [data-academy-module]').first().waitFor();
      const programme = new URLSearchParams(new URL(page.url()).hash.slice(1));
      assert.equal(programme.get('course'),course);
      assert.equal(programme.get('locale'),locale);
      assert.equal(programme.has('lesson'),false);
      const hero = page.locator('[data-academy-course-hero]');
      assert.equal(await hero.getAttribute('data-course-id'),course);
      await hero.locator('progress').waitFor();
      await page.locator('.academy-course-tabs [aria-current="page"]').waitFor();
      const tiles = page.locator('[data-academy-course-navigation="modules"] .academy-nav-grid');
      assert.equal(await tiles.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length),width>760?2:1);
      const direct = tiles.locator('[data-academy-module-topic] a').first();
      await direct.waitFor();
      if (width!==320) {
        await page.screenshot({path:path.join(out,course+'-'+locale+'-'+width+'-course.png')});
        await direct.scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(out,course+'-'+locale+'-'+width+'-modules.png')});
      }
      const moduleLink = tiles.locator('[data-academy-open-module]').first();
      await moduleLink.click();
      const topics = page.locator('[data-academy-course-navigation="topics"]');
      await topics.locator('[data-academy-topic] a').first().waitFor();
      await topics.locator('[data-academy-back="course"]').click();
      await tiles.waitFor();
      const directId = new URLSearchParams((await direct.getAttribute('href')).slice(1)).get('lesson');
      await direct.click();
      const lessonRoot = course==='c'?page.locator('[data-c-course][data-c-lesson]'):
        page.locator('[data-r3-topic="'+directId+'"][data-r3-ready="true"]');
      await lessonRoot.locator('[data-academy-back="course"]').click();
      await hero.waitFor();
      if (course==='cpp'&&locale==='ru'&&width===1440) {
        await page.locator('[data-learning-filter="labs"]').click();
        await page.locator('#cppPathPanel-labs .learning-lab-card a').first().click();
        const lab=page.locator('#academy-lab[open] [data-gold-laboratory]');
        await lab.waitFor();
        const editor=page.locator('#editor');
        const original=await editor.inputValue();
        const work=original+'\n// synthetic laboratory draft';
        await editor.fill(work);
        await lab.locator('[data-action="canonical-lab-window"]').click();
        const dialog=page.locator('dialog.gold-work-dialog[open]');
        await dialog.locator('.gold-case-body').first().waitFor();
        assert.match(await dialog.locator('[data-gold-work-panel="task"]').innerText(),/350/);
        assert.equal(await dialog.locator('#editor').inputValue(),work);
        await dialog.locator('[data-gold-work-close]').click();
        await dialog.waitFor({state:'detached'});
        assert.equal(await editor.inputValue(),work);
        await page.locator('[data-r3-ready="true"] [data-academy-back="course"]').click();
        await hero.waitFor();
      }
      await page.locator('[data-academy-back="academy"]').click();
      await page.waitForURL(url=>new URLSearchParams(url.hash.slice(1)).get('view')==='academy');
      if (course==='cpp'&&locale==='ru'&&width===1440) {
        await page.evaluate(async release=>{
          const [{createProject},{withProjectWriter}]=await Promise.all([
            import(release+'project-studio/project-store.js'),import(release+'project-studio/project-writer.js'),
          ]);
          await withProjectWriter(()=>{
            for(const id of ['onec','1c-enterprise'])createProject({
              id:'synthetic-'+id,title:'Учебная служба',languageId:'onec',
              entryFile:'module.bsl',files:[{path:'module.bsl',content:'// Synthetic source',languageId:'onec'}],
              origin:{kind:'lesson-work',courseId:id},
            });
          });
        },prefix);
        await page.goto(origin+'/#view=project-studio');
        const library=page.locator('[data-studio-library]');
        const courseFilter=library.locator('[data-studio-course-filter="1c-enterprise"]');
        await courseFilter.click();
        assert.equal(await library.locator('[data-studio-project]:visible').count(),1);
        const project=library.locator('[data-studio-project]:visible a');
        assert.match(await project.getAttribute('href'),/project=synthetic-1c-enterprise$/);
        await page.screenshot({path:path.join(out,'my-projects-online.png')});
      }
      assert.deepEqual(errors,[]);
      checks.push({course,lesson,locale,width,catalogRequests:catalogRequests.length,externalRequests,noEmbed:true,programmeTiles:true,backRoutes:true,sharedHelp:true});
    } catch (error) {
      const page = context.pages()[0];
      if (page) await page.screenshot({path:path.join(out,course+'-'+locale+'-'+width+'-failure.png')}).catch(()=>{});
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:'PASS',syntheticAccount:true,checks},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',courses:checks.length}));
