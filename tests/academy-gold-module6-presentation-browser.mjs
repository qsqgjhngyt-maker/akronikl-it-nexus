// Полные RU/EN уроки в реальной оболочке, без загрузки компилятора или чтения данных владельца.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import path from'node:path';import{onlineRuntimeFixture}from'./helpers/online-runtime-fixture.mjs';import{GOLD_EVENT_LESSONS}from'../core/academy-gold-catalog.js';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE);await mkdir(out,{recursive:true});const m=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+m.assetGeneration,f=await onlineRuntimeFixture(),p=f.page,checks=[];let fatal;
try{
 await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();await f.waitReady();
 for(const locale of ['ru','en']){
  await p.evaluate(async({prefix,locale})=>{const{loadPrefs,savePrefs}=await import(prefix+'/core/storage.js');savePrefs({...loadPrefs(),courseLocale:locale,uiLocale:locale})},{prefix,locale});await p.evaluate(()=>location.hash='#view=home');await p.reload();await p.locator('.visual-home').waitFor();
  for(const id of GOLD_EVENT_LESSONS){
   await p.evaluate(id=>location.hash='#course=cpp&lesson='+id,id);const lesson=p.locator('[data-gold-lesson="'+id+'"][lang="'+locale+'"]');await lesson.waitFor();
   if(locale==='en'){const text=await p.locator('.lesson').innerText(),matches=text.match(/[^\n]*[А-Яа-яЁё][^\n]*/g);assert.equal(matches,null,id+' untranslated: '+JSON.stringify(matches));}
   const gui=['cpp.qt-graphical-adapter','cpp.application-build-delivery'].includes(id);assert.equal(await p.locator('#editor').count(),gui?0:1);assert.ok(await lesson.locator('.gold-overview a[href^="#course=cpp"]').count());
   for(const width of [390,1366]){await p.setViewportSize({width,height:900});assert.ok(await lesson.isVisible());checks.push({id,locale,width,status:'PASS',correctRuntimeRoute:true,prerequisiteLinks:true});}
  }
  await p.locator('#openTermsHead').click();await p.locator('#termDrawer[open]').waitFor();await p.locator('#termSearch').fill(locale==='en'?'snapshot':'снимок');assert.ok((await p.locator('#termList').innerText()).trim());await p.locator('#closeTerms').click();
 }
 assert.equal(f.requests.filter(r=>/\.wasm$/.test(r.path)).length,0,'Чтение уроков не загружает compiler');
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e)}finally{const result={status:!fatal&&checks.length===48&&!f.errors.length?'PASS':'FAIL',checks,fatal,browserErrors:f.errors,realAccount:false,physicalDevices:false,productionRequests:0};await writeFile(path.join(out,'PRESENTATION.json'),JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify({...result,checks:checks.length}));if(result.status!=='PASS')process.exitCode=1;}
