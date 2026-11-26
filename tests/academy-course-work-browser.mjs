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
const projectSeeds = [
  {id:'bsl-draft',title:'Учебная служба',languageId:'onec',origin:{courseId:'onec'}},
  {id:'enterprise-draft',title:'Учебная служба',languageId:'onec',origin:{courseId:'1c-enterprise',sourceCourseId:'onec'}},
  {id:'cpp-final',title:'TaskFlow',languageId:'cpp',origin:{kind:'course-final',assessmentId:'cpp.course-final.v1'}},
  {id:'exercise-lesson-cpp.data-types',title:'Типы данных',languageId:'cpp',learning:{kind:'lesson',id:'cpp.data-types'}},
  {id:'c-course-work',title:'Учебная работа',languageId:'c',origin:{courseId:'c'}},
  {id:'personal',title:'Личный проект',languageId:'c',origin:{kind:'user'}},
];
const phrase='SYNTHETIC course project groups';

try {
  page=await fixture.launch();
  await page.goto(url({view:'academy'}));
  await fixture.waitReady();
  const vaultId=await page.evaluate(async ({seeds,generation,phrase})=>{
    const {createVaultStore}=await import('/releases/'+generation+'/pwa/local-vault.js');
    const {makeLocalPayload}=await import('/releases/'+generation+'/pwa/offline-transfer.js');
    const store=createVaultStore();
    const projects=seeds.map(project=>({
      ...project,workspace:{entryFile:'main.txt',activeFile:'main.txt',files:[{path:'main.txt',content:'Synthetic project source'}]},
      progress:{milestones:[]},checkpoints:[],access:{workspaceKind:'personal'},
    }));
    const payload=makeLocalPayload({account:{accountId:'synthetic-projects',displayName:'Test projects',status:'active'},
      projects,state:{},isOwner:()=>true});
    // This older lesson copy was created inside the vault, not exported from Project Studio.
    for(const project of projects.filter(item=>item.learning))payload.projects[project.id].learning=project.learning;
    if(payload.projects['enterprise-draft'].origin.sourceCourseId)throw Error('Original source metadata left the account');
    const vault=await store.create(payload,phrase);
    const id=vault.id;
    await vault.lock();
    await store.close();
    return id;
  },{seeds:projectSeeds,generation:fixture.generation,phrase});
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
        const glossary=page.locator('.academy-reference-actions [data-reference-open]');
        const syntax=page.locator('.academy-reference-actions [data-reference-editor-help]');
        await glossary.waitFor();
        for(const [action,desktopWidth] of [[glossary,208],[syntax,132]]){
          const [w,h]=await action.evaluate(node=>[node.offsetWidth,node.offsetHeight]);
          assert.equal(h,44);
          assert.equal(w,width===320?44:desktopWidth);
        }
        if (kind==='labs') {
          if (course.id==='cpp') {
            const laboratory=page.locator('#academy-lab[open] [data-gold-laboratory]');
            await laboratory.waitFor();
            assert.match(await laboratory.innerText(), /70/);
            assert.match(await laboratory.locator('.gold-case-body').first().innerText(), /350/);
            assert.ok(await laboratory.locator('details').count()>=3);
          } else {
            await page.locator('#academy-lab').waitFor();
            const lesson = course.id==='c'?page.locator('[data-c-course]'):
              page.locator('[data-r3-ready="true"] [data-r3-panel="practice"]');
            const help = lesson.locator('[data-academy-practice-help]');
            const recall = help.locator('[data-academy-recall] > summary');
            const hints = help.locator('[data-academy-hint] > summary');
            const expected = lesson.locator('[data-academy-expected]').first();
            const reference = lesson.locator('[data-c-reference-solution], [data-lab-reference]').first();
            assert.equal(await reference.evaluate(element=>element.open),false);
            assert.equal(await expected.evaluate(element=>element.open),false);
            assert.equal(await hints.count(),3);
            assert.ok(await hints.nth(0).isVisible());
            assert.equal(await hints.nth(1).isVisible(),false);
            await recall.press('Enter');
            const link = help.locator('[data-academy-recall] a');
            assert.ok(await link.isVisible());
            await hints.nth(0).click();
            assert.ok(await hints.nth(1).isVisible());
            assert.equal(await hints.nth(2).isVisible(),false);
            await hints.nth(1).click();
            await hints.nth(2).click();
            await expected.locator('summary').click();
            assert.ok(await expected.evaluate(element=>element.open));
            assert.equal(await reference.evaluate(element=>element.open),false);
            await help.scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(fixture.out,course.id+'-'+locale+'-practice-help.png')});
            const target=new URLSearchParams((await link.getAttribute('href')).slice(1)).get('at');
            await link.click();
            const anchor=course.id==='c'?page.locator('[data-c-section="'+target+'"]'):
              page.locator('[data-r3-panel="explanation"] [id="'+target+'"]');
            await anchor.waitFor();
            assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('at'),target);
          }
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
    await page.goto(url({course:'onec',lesson:'onec.p7.topic-2',stage:'practice',locale}));
    const tableResult=page.locator('[data-r3-panel="practice"] [data-academy-expected]').first();
    await tableResult.waitFor();
    assert.equal(await tableResult.locator('table').isVisible(),false);
    await tableResult.locator('summary').click();
    assert.ok(await tableResult.locator('table').isVisible());
  }
  await page.setViewportSize({width:1366,height:900});
  await page.goto(url({copy:vaultId}));
  await page.locator('#localPhrase').fill(phrase);
  await page.locator('#unlockLocal button').click();
  const library=page.locator('[data-studio-library]');
  const groups=library.locator('[data-studio-project-group]');
  const group=id=>library.locator('[data-studio-project-group="'+id+'"]');
  await library.waitFor();
  assert.deepEqual(await groups.evaluateAll(nodes=>nodes.map(node=>node.dataset.studioProjectGroup)),
    ['cpp','c','onec','1c-enterprise','independent']);
  for(const project of projectSeeds){
    const id=project.origin?.courseId??(project.id==='personal'?'independent':'cpp');
    await group(id).locator('a[href$="project='+project.id+'"]').waitFor();
  }
  await page.screenshot({path:path.join(fixture.out,'my-projects-grouped-desktop.png')});
  const courseFilter=library.locator('[data-studio-course-filter="1c-enterprise"]');
  await courseFilter.press('Enter');
  assert.equal(await courseFilter.getAttribute('aria-pressed'),'true');
  assert.deepEqual(await library.locator('[data-studio-project-group]:visible')
    .evaluateAll(nodes=>nodes.map(node=>node.dataset.studioProjectGroup)),['1c-enterprise']);
  const search=library.locator('input[type="search"]');
  await search.fill('TaskFlow');
  await library.locator('[data-studio-search-empty]').waitFor();
  await library.locator('[data-studio-course-filter="all"]').click();
  assert.equal(await library.locator('[data-studio-project]:visible h4').innerText(),'TaskFlow');
  await library.locator('[data-studio-search-clear]').click();
  assert.equal(await library.locator('[data-studio-project]:visible').count(),projectSeeds.length);
  await page.setViewportSize({width:320,height:820});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await courseFilter.click();
  await page.screenshot({path:path.join(fixture.out,'my-projects-enterprise-mobile.png')});
  await group('1c-enterprise').locator('a').click();
  assert.match(new URL(page.url()).hash,/project=enterprise-draft/);
  assert.equal(await page.locator('#editor').inputValue(),'Synthetic project source');
  assert.deepEqual(fixture.errors,[]);
  assert.equal(fixture.requests.filter(request=>request.origin!==fixture.origin).length,0);
} catch (error) {
  failure=error.stack;
  if(page)await page.screenshot({path:path.join(fixture.out,'FAILURE.png')}).catch(()=>{});
} finally {
  await fixture.finish({status:failure?'FAIL':'PASS',rows,failure,networkDisabled:true});
}
if(failure)throw Error(failure);
console.log(JSON.stringify({status:'PASS',courseLocalePairs:rows.length,groupedProjects:projectSeeds.length}));
