// Public routes, including a cold reload through the verified offline cache.
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';

const fixture = await nativeOfflineFixture('academy-work');
const courses = [
  {id:'cpp', topics:67, practicums:6, projects:7},
  {id:'c', topics:59, practicums:12, projects:5},
  {id:'onec', topics:52, practicums:12, projects:4},
  {id:'1c-enterprise', topics:32, practicums:8, projects:4},
];
const rows=[];
let page, failure;
const url = params=>fixture.origin+'/offline.html#'+new URLSearchParams(params);

try {
  page=await fixture.launch();
  await page.goto(url({view:'academy'}));
  await fixture.waitReady();
  await fixture.closeBrowser();
  fixture.networkDown();
  page=await fixture.launch();
  await fixture.context.setOffline(true);
  for (const [locale,width] of [['ru',1366],['en',320]]) {
    await page.setViewportSize({width,height:820});
    for (const course of courses) {
      const en=locale==='en', base={course:course.id,locale};
      const open=async (extra={})=>page.goto(url({...base,...extra}));
      await open();
      const hero=page.locator('[data-academy-course-hero]');
      await hero.waitFor();
      const tabs=page.locator('.academy-course-tabs a');
      assert.equal(await tabs.count(),4);
      const filter = async kind=>{
        if (course.id==='cpp') {
          await page.locator('[data-learning-filter="'+kind+'"]').click();
          return page.locator(kind==='tasks'?'#cppPathPanel-tasks .learning-task-card':'#cppPathPanel-labs .learning-lab-card');
        }
        await page.locator('.academy-work-filters a').nth(kind==='tasks'?1:2).click();
        const parameter = new URLSearchParams(new URL(page.url()).hash.slice(1));
        assert.equal(parameter.get('locale'),locale);
        return page.locator('[data-academy-work-item]');
      };
      for (const kind of ['tasks','labs']) {
        await open();
        const cards=await filter(kind);
        await cards.first().waitFor();
        assert.equal(await cards.count(),course.topics,course.id+' '+kind);
        await cards.first().locator('a.btn, a.learning-open-link').click();
        const practice=course.id==='c'?page.locator('[data-c-course] .c-stages [aria-current="step"]'):
          page.locator('[data-r3-ready="true"] [data-stage="practice"][aria-current="step"]');
        await practice.waitFor();
        assert.match(await practice.innerText(),en?/Practice/:/Практика/);
        if (kind==='labs') {
          if (course.id==='cpp') {
            const laboratory=page.locator('#academy-lab[open] [data-gold-laboratory]');
            await laboratory.waitFor();
            assert.match(await laboratory.innerText(), /70/);
            assert.match(await laboratory.locator('.gold-case-body').first().innerText(), /350/);
            assert.ok(await laboratory.locator('details').count()>=3);
          } else await page.locator('#academy-lab').waitFor();
        } else if (course.id!=='cpp') {
          await page.locator('#academy-assignments .academy-exercises, #academy-assignments.academy-exercises').first().waitFor();
        }
      }
      await open();
      await tabs.nth(1).click();
      const practicums=course.id==='cpp'?page.locator('.practicum[data-practicum-progress]'):page.locator('[data-academy-work-tab="practicums"] .academy-work-card');
      await practicums.first().waitFor();
      assert.equal(await practicums.count(),course.practicums,course.id+' practicums');
      await open();
      await tabs.nth(2).click();
      const projects=course.id==='cpp'?page.locator('.project-card-rich'):page.locator('[data-academy-work-tab="projects"] .academy-work-card');
      await projects.first().waitFor();
      assert.equal(await projects.count(),course.projects,course.id+' projects');
      if (course.id!=='cpp') {
        await projects.first().locator('a.btn').click();
        await page.locator(course.id==='c'?'.c-stages [aria-current="step"]':'[data-r3-ready="true"] [data-stage="practice"][aria-current="step"]').waitFor();
      }
      await open();
      await tabs.nth(3).click();
      const final=page.locator(course.id==='cpp'?'[data-cpp-final-preview]':
        course.id==='c'?'[data-academy-work-tab="final"]':'[data-final-preview]');
      await final.waitFor();
      assert.match(await final.innerText(),en?/Final assessment/:/Итоговая работа/);
      assert.equal(await final.locator('form').count(),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(fixture.out,course.id+'-'+locale+'-final.png')});
      rows.push({course:course.id,locale,width,topics:course.topics,practicums:course.practicums,projects:course.projects,final:true});
    }
    await page.goto(url({course:'c',lesson:'c.first-program',locale}));
    const menu=page.locator('[data-academy-menu-toggle]'), panel=page.locator('[data-academy-menu-panel]');
    await menu.press('Enter');
    await panel.waitFor();
    assert.equal(await panel.locator('[data-academy-menu-item]').count(),4);
    assert.ok(await panel.evaluate(element=>{
      const menu=element.getBoundingClientRect(), header=element.closest('header').getBoundingClientRect();
      return Math.abs(menu.width-header.width)<3 && menu.top>=header.bottom;
    }));
    await page.keyboard.press('Escape');
    await panel.waitFor({state:'hidden'});
    assert.ok(await menu.evaluate(button=>document.activeElement===button));
    await page.locator('[data-reference-editor-help]').press('Space');
    const drawer=page.locator('.reference-dialog[open]');
    await drawer.locator('[data-reference-details][open] pre').first().waitFor();
    assert.ok(await drawer.locator('[data-reference-card]').count()>35);
    await drawer.locator('[data-reference-search]').fill('malloc');
    const item=drawer.locator('[data-reference-card]:not([hidden])').first();
    await item.locator('summary').click();
    await item.locator('[data-reference-details] pre').first().waitFor();
    const related=item.locator('[data-reference-details] a[href*="course=c"]').first();
    await related.waitFor();
    await page.screenshot({path:path.join(fixture.out,'c-'+locale+'-reference.png')});
    await related.click();
    await drawer.waitFor({state:'hidden'});
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('course'),'c');
  }
  assert.deepEqual(fixture.errors,[]);
  assert.equal(fixture.requests.filter(request=>request.origin!==fixture.origin).length,0);
} catch (error) {
  failure=error.stack;
  if(page)await page.screenshot({path:path.join(fixture.out,'FAILURE.png')}).catch(()=>{});
} finally {
  await fixture.finish({status:failure?'FAIL':'PASS',rows,failure,networkDisabled:true});
}
if(failure)throw Error(failure);
console.log(JSON.stringify({status:'PASS',courseLocalePairs:rows.length}));
