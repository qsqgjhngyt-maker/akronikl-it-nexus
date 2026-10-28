import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {onlineRuntimeFixture} from './helpers/online-runtime-fixture.mjs';
import {GOLD_EVENT_LESSONS} from '../core/academy-gold-catalog.js';
const out=process.env.NEXUS_M6_EVIDENCE;await mkdir(out,{recursive:true});
const m=JSON.parse(await readFile(process.env.NEXUS_FRONTEND_DIR+'/BUILD_MANIFEST.json')),prefix='/releases/'+m.assetGeneration,f=await onlineRuntimeFixture(),p=f.page,checks=[],findings=[],requests=[];
p.on('request',r=>requests.push({path:new URL(r.url()).pathname,resource:r.resourceType(),ms:Date.now()}));
const t0=Date.now();let home,firstLesson,questionActions=0,fatal;
try{

 await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();
 home={visibleMs:Date.now()-t0,documentRequests:requests.map(({ms,...r})=>r)};
 assert.equal(home.documentRequests.filter(r=>/gold\/.*\.json$|\.wasm$/.test(r.path)).length,0);
 await f.waitReady();
 for(const locale of ['ru','en']){
  await p.evaluate(async({prefix,locale})=>{const{loadPrefs,savePrefs}=await import(prefix+'/core/storage.js');savePrefs({...loadPrefs(),courseLocale:locale,uiLocale:locale})},{prefix,locale});await p.evaluate(()=>location.hash='#view=home');await p.reload();await p.locator('.visual-home').waitFor();
  for(const id of GOLD_EVENT_LESSONS){
   const start=Date.now(),from=requests.length;
   await p.evaluate(id=>location.hash='#course=cpp&lesson='+id,id);const lesson=p.locator('[data-gold-lesson="'+id+'"]').first();await lesson.waitFor();
   if(!firstLesson)firstLesson={id,locale,visibleMs:Date.now()-start,documentRequests:requests.slice(from).map(({ms,...r})=>r)};
   const before=await p.locator('#editor').count()?await p.locator('#editor').inputValue():null;
   await lesson.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));
   for(const width of [320,360,390,768,1366,1440]){
    await p.setViewportSize({width,height:900});await p.waitForTimeout(15);
    const box=await p.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));
    if(box.documentWidth>width+1)findings.push({id,locale,width,type:'document-overflow',...box});
    checks.push({id,locale,width,status:box.documentWidth<=width+1?'PASS':'FAIL'});
   }
   const cards=lesson.locator('[data-gold-question]');
   for(let i=0;i<await cards.count();i++){
    const c=cards.nth(i),correct=Number(await c.getAttribute('data-gold-answer')),inputs=c.locator('input[type=radio]');
    for(const [answer,result] of [[(correct+1)%await inputs.count(),'incorrect'],[correct,'correct']]){
     await inputs.nth(answer).check();await c.locator('[data-gold-check]').click();assert.equal(await c.locator('[data-gold-feedback]').getAttribute('data-result'),result);questionActions++;
    }
   }
   if(before!==null){
    const button=lesson.locator('[data-gold-open-editor]').first();
    for(const width of [390,1366]){
     await p.setViewportSize({width,height:900});await button.scrollIntoViewIfNeeded();const pos=await p.evaluate(()=>scrollY);
     await button.press('Enter');await p.locator('.gold-work-dialog[open]').waitFor();
     if(width===390){await p.locator('#goldWorkEditorTab').focus();await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#goldWorkTaskTab').getAttribute('aria-selected'),'true');await p.keyboard.press('End');assert.equal(await p.locator('#goldWorkEditorTab').getAttribute('aria-selected'),'true');}
     await p.keyboard.press('Escape');await p.locator('.gold-work-dialog').waitFor({state:'detached'});
     assert.equal(await button.evaluate(n=>n===document.activeElement),true);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-pos)<3);assert.equal(await p.locator('#editor').inputValue(),before);
    }
   }else{const a=lesson.locator('[data-gold-qt-workspace] a').first();assert.equal(await a.getAttribute('target'),'_blank');assert.equal(await a.getAttribute('href'),'./#view=project-studio');}
   if(id==='cpp.application-build-delivery'){await p.setViewportSize({width:390,height:900});await lesson.locator('[data-gold-delivery]').screenshot({path:out+'/delivery-'+locale+'-390.png'});}
  }
  await p.locator('#openTermsHead').click();await p.locator('#termDrawer[open]').waitFor();await p.locator('#termSearch').fill(locale==='ru'?'снимок':'snapshot');assert.ok((await p.locator('#termList').innerText()).trim());await p.keyboard.press('Escape');await p.locator('#termDrawer[open]').waitFor({state:'detached'});assert.equal(await p.locator('#openTermsHead').evaluate(n=>n===document.activeElement),true);
 }
 assert.equal(checks.length,144);assert.equal(questionActions,384);
 assert.equal(firstLesson.documentRequests.filter(r=>/gold\/.*\.json$/.test(r.path)).length,1);
 assert.equal(requests.filter(r=>/\.wasm$/.test(r.path)).length,0);assert.deepEqual(f.errors,[]);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e)}finally{
 const result={status:!fatal&&!findings.length?'PASS':'FAIL',source:execFileSync('git',['rev-parse','HEAD']).toString().trim(),checks,questionActions,findings,fatal,home,firstLesson,documentCompilerRequests:requests.filter(r=>/\.wasm$/.test(r.path)).length,allServerCompilerRequests:f.requests.filter(r=>/\.wasm$/.test(r.path)).length,browserErrors:f.errors,scope:'fresh synthetic profile / loopback / Chrome headless; no physical device or production',elapsedMs:Date.now()-t0};
 await writeFile(out+'/ACCEPTANCE_UI_PERF.json',JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify({...result,checks:checks.length,home:home&&{visibleMs:home.visibleMs,requests:home.documentRequests.length},firstLesson:firstLesson&&{visibleMs:firstLesson.visibleMs,requests:firstLesson.documentRequests.length}}));if(result.status!=='PASS')process.exitCode=1;
}
