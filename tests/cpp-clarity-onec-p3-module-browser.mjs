// Модуль P3 целиком. Синтетический Account; настоящий запуск 1С проверен отдельно.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {staticMime} from '../pwa/static-mime.js';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
import {flowchartGeometry,stableOnecPracticeGeometry} from './helpers/cpp-clarity-flowchart-geometry.mjs';
const ids=['onec.p3.topic-1','onec.p3.topic-2','onec.p3.topic-3','onec.p3.topic-4','onec.p3.module-tests'];
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'p3-module'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const checks=[],errors=[],external=[],geometryRecords=[],practiceRecords=[];
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/__p3_module__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><body style="margin:0;background:#091622"><main id="app"></main></body></html>');}
 if(u.pathname.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"code":"SYNTHETIC_NO_SERVER_SESSION"}}');}
 const file=path.resolve(frontend,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(frontend+path.sep))throw Error('PATH');res.setHeader('content-type',staticMime(file));res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)),browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),context=await browser.newContext();
await context.route('**/*',r=>{if(!r.request().url().startsWith(origin)){external.push(r.request().url().split('?')[0]);return r.abort();}return r.continue();});
let failure,f;
const stage=async(root,s)=>{await root.locator('[data-stage="'+s+'"]').click();await root.locator('[data-r3-panel="'+s+'"]:visible').waitFor();};
const saved=root=>root.locator('[data-r3-save][data-state="saved"]').waitFor();
async function inspectImages(root){return root.evaluate(async node=>{const imgs=[...node.querySelectorAll('[data-onec-figure] img')];await Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();}));return imgs.map(img=>({src:img.getAttribute('src').split('/').at(-1),loaded:img.naturalWidth>0,alt:img.alt}));});}
const sourceFor=async(id,locale)=>JSON.parse(await readFile('courses/clarity/lessons/'+id+'.'+locale+'.json'));
const storedProgress=p=>p.evaluate(async prefix=>{const m=await import(prefix+'/courses/onec-education/account-progress.mjs');return JSON.parse(m.createOnecAccountStorage().getItem('akronikl:it-nexus:onec-candidate:v1:onec'));},prefix);
try{
 for(const id of ids)for(const locale of ['ru','en']){
  const authored=true,source=await sourceFor(id,locale),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/__p3_module__#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}));
  await p.evaluate(async({prefix,locale})=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-p3-module',status:'active',displayName:'Synthetic P3 Module'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');globalThis.controller=m.mountOnecIntegration(document.querySelector('#app'),{locale});await controller.ready;},{prefix,locale});
  let root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();
  if(authored)assert.equal(await root.getAttribute('data-authored'),'true');
  const images=await inspectImages(root);if(authored)assert.ok(images.length>=2&&images.every(i=>i.loaded&&i.alt.length>20));
  for(const width of [1366,390,320]){
   await p.setViewportSize({width,height:900});
   for(const s of ['explanation','selfcheck','practice']){
    await stage(root,s);assert.equal(await root.locator('.stage-body:visible').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(11, 25, 41)','Common matte stage surface');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+locale+' '+width+' '+s);
    await p.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-'+s+'.png')});
   }
   await stage(root,'explanation');
   for(const [i,svg]of(await root.locator('.lesson-flowchart svg,.learning-flow svg').all()).entries()){
    const labels=await svg.evaluate(flowchartGeometry);
    for(const label of labels){assert.notEqual(label.insideWith4pxPadding,false,id+' '+locale+' '+width+' node boundary: '+label.text);assert.equal(label.arrowCollisions,0,id+' '+locale+' '+width+' arrow: '+label.text);assert.ok(label.fontPx>=12,id+' '+width+' font: '+label.text);}
    const linearLabels=await svg.evaluate(svg=>[...svg.querySelectorAll('g')].filter(g=>g.querySelector('rect')&&!g.hasAttribute('data-flowchart-node')).flatMap(g=>{const box=g.querySelector('rect');return [...g.querySelectorAll('text')].map(t=>{const b=t.getBBox(),s=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width,pad=4/s;return {text:t.textContent,inside:[{x:b.x-pad,y:b.y-pad},{x:b.x+b.width+pad,y:b.y-pad},{x:b.x-pad,y:b.y+b.height+pad},{x:b.x+b.width+pad,y:b.y+b.height+pad}].every(p=>box.isPointInFill(new DOMPoint(p.x,p.y)))};});}));
    for(const label of linearLabels)assert.equal(label.inside,true,id+' '+locale+' '+width+' linear node: '+label.text);
    geometryRecords.push({id,locale,width,diagram:i,labels,linearLabels});await svg.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-diagram'+i+'.png')});
   }
   if(authored){const main=root.locator('#example-1');assert.equal((await main.locator('[data-expected-output]').textContent()).trim(),source.sections.find(s=>s.id==='example-1').code.output);if(id===ids[0])assert.match(await root.locator('#concept-0 pre code').textContent(),/Функция Стоимость.*Экспорт/);await main.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-main-example.png')});}
  }
  await stage(root,'selfcheck');const freeQuestion=source.selfcheck.find(q=>q.kind==='free'),free=root.locator('[data-answer="'+freeQuestion.id+'"]');await free.fill('My independent explanation '+id);await saved(root);
  if(freeQuestion.recall){await free.evaluate(n=>{n.focus();n.setSelectionRange(3,9);});await root.locator('[data-question="'+freeQuestion.id+'"] [data-recall]').click();const recall=root.locator('.r3-dialog[open]');await recall.waitFor();await recall.locator('[data-close]').click();await p.waitForFunction(id=>{const el=document.querySelector('#app').shadowRoot.querySelector('[data-answer="'+id+'"]');return el.getRootNode().activeElement===el&&el.selectionStart===3&&el.selectionEnd===9;},freeQuestion.id);}
  await stage(root,'practice');const marker='// own module '+id+' '+locale+'\nСообщить(123);',reportValue='Independent observation '+id+' '+locale;
  if(authored){
   const ref=root.locator('[data-lab-reference]').first();assert.equal(await ref.getAttribute('open'),null);await ref.locator('summary').first().click();await ref.locator('[data-reference-source] code').waitFor();
   if(await root.locator('[data-r3-create]').isVisible()){assert.equal(await root.locator('#editor').count(),0);assert.ok(await root.locator('[data-action="lab-window"]').isDisabled());await root.locator('[data-r3-create]').click();}
   else assert.match(await root.locator('#editor').inputValue(),new RegExp('own module '+id.replaceAll('.','\\.')+' ru'),'EN must restore own RU work');
   const editor=root.locator('#editor');await editor.waitFor();if(id===ids[0]&&locale==='ru'){assert.match(await editor.inputValue(),/Функция Остаток/);assert.equal(await root.locator('.code-file-tab[data-open-file]').count(),2,'Two separate BSL sources');}await editor.fill(marker);await saved(root);const identity=await editor.elementHandle();
   await editor.fill(marker+'\n// unsaved edit');await ref.locator('summary').first().click();assert.equal(await editor.inputValue(),marker+'\n// unsaved edit');await saved(root);
   await root.locator('[data-action="lab-window"]').click();const window=root.locator('.gold-work-dialog[open]');await window.waitFor();await window.locator('[data-gold-work-tab="task"]').click();const winref=window.locator('[data-lab-reference]');await winref.locator('summary').first().click();await winref.locator('[data-reference-source] code').waitFor();await p.screenshot({path:path.join(out,id+'-'+locale+'-work-window-320.png')});await window.locator('[data-gold-work-close]').click();
   assert.ok(await editor.evaluate((n,old)=>n===old,identity));assert.equal(await editor.inputValue(),marker+'\n// unsaved edit');await stage(root,'explanation');await stage(root,'practice');assert.equal(await editor.inputValue(),marker+'\n// unsaved edit');
   await root.locator('[data-r3-report]').fill(reportValue);await saved(root);
   for(const width of [320,390,1366]){await p.setViewportSize({width,height:900});await root.locator('[data-r3-report]').scrollIntoViewIfNeeded();const geometry=await root.evaluate(stableOnecPracticeGeometry);assert.equal(geometry.overlap,0,id+' '+locale+' '+width+' stable editor/report overlap');assert.ok(geometry.studio.bottom<=geometry.report.y);assert.equal(geometry.highlightPosition,'absolute');assert.equal(geometry.editorPosition,'absolute');assert.equal(geometry.stylesheetImported,true);assert.equal(geometry.sourceValue,marker+'\n// unsaved edit');assert.equal(geometry.reportValue,reportValue);practiceRecords.push({id,locale,width,...geometry});await p.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-practice-stable.png')});}
  }else{await root.locator('[data-r3-report]').fill(reportValue);await saved(root);}
  await p.reload();await p.evaluate(async({prefix,locale})=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-p3-module',status:'active',displayName:'Synthetic P3 Module'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');globalThis.controller=m.mountOnecIntegration(document.querySelector('#app'),{locale});await controller.ready;},{prefix,locale});root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();await stage(root,'practice');assert.equal(await root.locator('[data-r3-report]').inputValue(),reportValue);if(authored)assert.equal(await root.locator('#editor').inputValue(),marker+'\n// unsaved edit');
  await stage(root,'selfcheck');assert.equal(await root.locator('[data-answer="'+freeQuestion.id+'"]').inputValue(),'My independent explanation '+id);const choices=source.selfcheck.filter(q=>q.kind!=='free');for(const q of choices)await root.locator('[data-answer="'+q.id+'"][value="'+q.correct+'"]').check();
  if(authored){
  await root.getByRole('button',{name:locale==='ru'?'Сохранить попытку самопроверки':'Save self-check attempt',exact:true}).click();await saved(root);const stored=await storedProgress(p);assert.equal(stored.lessons[id].attempts.at(-1).grade.correct,choices.length);assert.equal(stored.lessons[id].completed,locale==='ru'?undefined:true);
  await stage(root,'practice');await root.locator('[data-course-progress] input[type="checkbox"]').check();await root.getByRole('button',{name:locale==='ru'?'Отметить выполненным по самоотчёту':'Mark complete by self-report',exact:true}).click();await root.locator('[data-course-progress]').getByText(locale==='ru'?/Сохранённая отметка прохождения есть/:/A saved completion mark exists/).waitFor();
  }else{
   // Принятый R3-пилот не имеет нового assessment: сохраняем прежний контракт, не создаём завершение.
   for(const q of choices){const form=root.locator('[data-question="'+q.id+'"]');await form.locator('fieldset button.btn:not([data-reference-term])').click();await saved(root);assert.ok((await root.locator('[data-feedback="'+q.id+'"]').textContent()).trim());}
   const stored=await storedProgress(p);assert.equal(stored.lessons[id]?.completed,undefined);
  }
  await p.evaluate(async({prefix,locale})=>{controller.dispose();location.hash='#course=onec&locale='+locale;const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);const m=await import(prefix+'/courses/onec-education/integration.mjs');controller=m.mountOnecIntegration(host,{locale});await controller.ready;},{prefix,locale});assert.equal(Number((await p.locator('[data-progress]').textContent()).split('/')[0]),ids.indexOf(id)+1);
  checks.push({id,locale,stages:3,widths:[1366,390,320],images,ownWorkPreserved:'PASS',reload:'PASS',correctChoices:choices.length,automaticCompletion:false});await p.close();
 }
 const other=await context.newPage();await other.goto(origin+'/__p3_module__#course=onec&locale=ru');await other.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-p3-module-other',status:'active',displayName:'Synthetic other'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');const c=m.mountOnecIntegration(document.querySelector('#app'),{locale:'ru'});await c.ready;},prefix);assert.equal((await other.locator('[data-progress]').textContent()).trim(),'0/52');await other.close();checks.push({name:'Account progress isolation',firstAccountCompleted:5,otherAccountCompleted:0,status:'PASS'});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 process.env.NEXUS_NATIVE_EVIDENCE=path.join(out,'cold-offline');f=await nativeOfflineFixture('onec-p3-module');let p=await f.launch();await p.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 for(const id of ids)for(const locale of ['ru','en']){await p.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}),{id,locale});const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();await inspectImages(root);}
 await f.closeBrowser();f.networkDown();p=await f.launch();await p.context().setOffline(true);await p.goto(f.origin+'/offline.html#course=onec&lesson=onec.p2.topic-1&locale=ru&stage=explanation');
 for(const id of ids)for(const locale of ['ru','en']){await p.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}),{id,locale});const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();const imgs=await inspectImages(root);assert.ok(imgs.every(i=>i.loaded));assert.ok(imgs.length>=2);assert.equal(await p.evaluate(async prefix=>{const r=await fetch(prefix+'/styles/clarity-onec-code-studio.css');return r.ok&&(await r.text()).includes('.onec-integrated');},prefix),true);assert.equal(await p.evaluate(async prefix=>{const r=await fetch(prefix+'/styles/clarity-onec-p2-types.css');return r.ok&&(await r.text()).includes('font-size:16px');},prefix),true,'Types scoped CSS survives cold offline');for(const width of [1366,320]){await p.setViewportSize({width,height:900});for(const s of ['explanation','selfcheck','practice']){await stage(root,s);assert.equal(await root.locator('.stage-body:visible').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(11, 25, 41)');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+locale+' public shell '+width+' '+s+' overflow');}}assert.equal(await root.locator('[data-r3-create]:enabled,[data-r3-report]:enabled,[data-r3-record]:enabled').count(),0);}
 checks.push({name:'Cold offline reading',editions:10,stages:3,actualServiceWorker:true,newBrowserProcess:true,privateWriter:'not used',status:'PASS'});
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2200)};console.error(e);for(const [i,p]of context.pages().entries())await p.screenshot({path:path.join(out,'FAIL-'+i+'.png')}).catch(()=>{});}
finally{await writeFile(path.join(out,'ONEC_P3_MODULE_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,geometryRecords,practiceRecords,errors,externalRequests:external,failure,syntheticAccountOnly:true,serverAuthentication:'NOT TESTED',native1CExecution:'SEPARATE',learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));if(f)await f.finish({status:failure?'FAIL':'PASS'});if(failure)process.exitCode=1;}
