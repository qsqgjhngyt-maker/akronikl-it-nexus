// Синтетический Account; запуск установленной 1С оценивается отдельно.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {staticMime} from '../pwa/static-mime.js';
import {nativeOfflineFixture} from './helpers/native-offline-fixture.mjs';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE,'p2-conditions'),frontend=path.resolve(process.env.NEXUS_FRONTEND_DIR);
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const ids=['onec.p2.topic-3'],checks=[],errors=[],external=[];
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/__p2_conditions__'){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="'+prefix+'/styles/app.css"><body style="margin:0;background:#091622"><main id="app"></main></body></html>');}
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
try{
 for(const id of ids)for(const locale of ['ru','en']){
  const p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/__p2_conditions__#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}));
  await p.evaluate(async({prefix,locale})=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-p2-conditions',status:'active',displayName:'Synthetic P2 Conditions'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');globalThis.controller=m.mountOnecIntegration(document.querySelector('#app'),{locale});await controller.ready;},{prefix,locale});
  const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();
  assert.equal(await root.getAttribute('data-authored'),'true');
  assert.notEqual(await root.locator('.authored-intro p').first().evaluate(n=>getComputedStyle(n).color),'rgb(0, 0, 0)','The actual shell theme must be loaded');
  const images=await inspectImages(root);assert.ok(images.length>=2&&images.every(i=>i.loaded&&i.alt.length>20));
  for(const width of [1366,390,320]){
   await p.setViewportSize({width,height:900});
   for(const s of ['explanation','selfcheck','practice']){
    await stage(root,s);assert.equal(await root.locator('.stage-body:visible').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(11, 25, 41)','Common matte stage surface');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+locale+' '+width+' '+s);await p.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-'+s+'.png')});
   }
   await stage(root,'explanation');
   const visuals=await root.locator('.lesson-flowchart svg').evaluateAll(svgs=>svgs.map(svg=>{const vb=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/vb.width;return {minFont:Math.min(...[...svg.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)*scale)),outside:[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>vb.width;}).map(t=>t.textContent)};}));
   assert.equal(visuals.length,2);
   for(const visual of visuals){assert.deepEqual(visual.outside,[],id+' '+locale+' clipped SVG labels');assert.ok(visual.minFont>=12,id+' '+width+' diagram text too small');}
   for(const [index,diagram]of(await root.locator('.lesson-flowchart').all()).entries()){await diagram.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-diagram'+index+'.png')});}
   const main=root.locator('#example-1');assert.equal((await main.locator('[data-expected-output]').textContent()).trim(),'Без затрат');await main.screenshot({path:path.join(out,id+'-'+locale+'-'+width+'-main-example.png')});
  }
  await stage(root,'selfcheck');const free=root.locator('[data-answer="explain"]');await free.fill('My independent Conditions explanation');await free.evaluate(n=>{n.focus();n.setSelectionRange(3,9);});
  await root.locator('[data-question="explain"] [data-recall]').click();const recall=root.locator('.r3-dialog[open]');await recall.waitFor();await recall.locator('[data-close]').click();
  await p.waitForFunction(()=>{const el=document.querySelector('#app').shadowRoot.querySelector('[data-answer="explain"]');return el.getRootNode().activeElement===el&&el.selectionStart===3&&el.selectionEnd===9;});
  await stage(root,'practice');const ref=root.locator('[data-lab-reference]').first();assert.equal(await ref.getAttribute('open'),null);await ref.locator('summary').first().click();await ref.locator('[data-lab-reference-content] p').first().waitFor();
  if(id==='onec.p2.topic-3'){
   if(await root.locator('[data-r3-create]').isVisible()){
    assert.equal(await root.locator('#editor').count(),0);assert.ok(await root.locator('[data-action="lab-window"]').isDisabled());await root.locator('[data-r3-create]').click();
   }else{assert.match(await root.locator('#editor').inputValue(),/own Conditions ru/,'EN restores the same learner work');}
   const editor=root.locator('#editor');await editor.waitFor();const marker='// own Conditions '+locale+'\nСообщить(123);';await editor.fill(marker);await saved(root);
   const identity=await editor.elementHandle();await root.locator('[data-action="lab-window"]').click();const window=root.locator('.gold-work-dialog[open]');await window.waitFor();
   await window.locator('[data-gold-work-tab="task"]').click();const winref=window.locator('[data-lab-reference]');await winref.locator('summary').first().click();await winref.locator('[data-reference-source] code').waitFor();
   await p.screenshot({path:path.join(out,id+'-'+locale+'-work-window-320.png')});
   await window.locator('[data-gold-work-close]').click();assert.equal(await editor.inputValue(),marker);assert.ok(await editor.evaluate((n,old)=>n===old,identity));
   // Viewing the example, reference and recalling theory never replace the editor.
   await stage(root,'explanation');await stage(root,'practice');assert.equal(await editor.inputValue(),marker);
   await editor.fill(marker+'\n// unsaved new edit');await root.locator('[data-lab-reference] summary').first().click();assert.equal(await editor.inputValue(),marker+'\n// unsaved new edit');await saved(root);
  }
  const source=JSON.parse(await readFile(`courses/clarity/lessons/${id}.${locale}.json`));await stage(root,'selfcheck');
  for(const q of source.selfcheck.filter(q=>q.kind==='choice'))await root.locator('[data-answer="'+q.id+'"][value="'+q.correct+'"]').check();
  await root.getByRole('button',{name:locale==='ru'?'Сохранить попытку самопроверки':'Save self-check attempt',exact:true}).click();await saved(root);
  const stored=await p.evaluate(async prefix=>{const m=await import(prefix+'/courses/onec-education/account-progress.mjs');return JSON.parse(m.createOnecAccountStorage().getItem('akronikl:it-nexus:onec-candidate:v1:onec'));},prefix);
  assert.equal(stored.lessons[id].attempts.at(-1).grade.correct,5);assert.equal(stored.lessons[id].completed,locale==='ru'?undefined:true);
  await stage(root,'practice');await root.locator('[data-course-progress] input[type="checkbox"]').check();
  await root.getByRole('button',{name:locale==='ru'?'Отметить выполненным по самоотчёту':'Mark complete by self-report',exact:true}).click();
  await root.locator('[data-course-progress]').getByText(locale==='ru'?/Сохранённая отметка прохождения есть/:/A saved completion mark exists/).waitFor();
  await p.evaluate(async({prefix,locale})=>{controller.dispose();location.hash='#course=onec&locale='+locale;const host=document.createElement('main');host.id='app';document.querySelector('#app').replaceWith(host);const m=await import(prefix+'/courses/onec-education/integration.mjs');controller=m.mountOnecIntegration(host,{locale});await controller.ready;},{prefix,locale});
  const count=Number((await p.locator('[data-progress]').textContent()).split('/')[0]);assert.equal(count,ids.indexOf(id)+1,'Overview counts explicit completion without losing previous topics');
  checks.push({id,locale,stages:3,widths:[1366,390,320],images,recallCaret:'PASS',ownWorkPreserved:'PASS',assessment:'5/5 explicit; no automatic completion; two semantic branch SVGs'});await p.close();
 }
 const other=await context.newPage();await other.goto(origin+'/__p2_conditions__#course=onec&locale=ru');
 await other.evaluate(async prefix=>{const a=await import(prefix+'/core/account-storage.js');a.initializeAccountStorage({account:{accountId:'synthetic-p2-conditions-other',status:'active',displayName:'Synthetic other'}});const m=await import(prefix+'/courses/onec-education/integration.mjs');const c=m.mountOnecIntegration(document.querySelector('#app'),{locale:'ru'});await c.ready;},prefix);
 assert.equal((await other.locator('[data-progress]').textContent()).trim(),'0/52','Another account cannot inherit the completed P2 topic');await other.close();
 checks.push({name:'Account progress isolation',firstAccountCompleted:1,otherAccountCompleted:0,status:'PASS'});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 // Real offline service worker, a fresh browser process and no private writer.
 process.env.NEXUS_NATIVE_EVIDENCE=path.join(out,'cold-offline');f=await nativeOfflineFixture('onec-p2-conditions');let p=await f.launch();await p.goto(f.origin+'/offline.html#view=home');await f.waitReady();
 for(const id of ids)for(const locale of ['ru','en']){await p.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}),{id,locale});const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();await inspectImages(root);}
 await f.closeBrowser();f.networkDown();p=await f.launch();await p.context().setOffline(true);
 await p.goto(f.origin+'/offline.html#course=onec&lesson=onec.p2.topic-3&locale=ru&stage=explanation');
 for(const id of ids)for(const locale of ['ru','en']){await p.evaluate(({id,locale})=>location.hash='#'+new URLSearchParams({course:'onec',lesson:id,locale,stage:'explanation'}),{id,locale});const root=p.locator('[data-r3-topic="'+id+'"][lang="'+locale+'"]');await root.waitFor();const imgs=await inspectImages(root);assert.ok(imgs.every(i=>i.loaded));assert.equal(await root.locator('.lesson-flowchart svg').count(),2);await stage(root,'practice');assert.equal(await root.locator('[data-r3-create]:enabled,[data-r3-report]:enabled,[data-r3-record]:enabled').count(),0);}
 checks.push({name:'Cold offline reading',editions:2,actualServiceWorker:true,newBrowserProcess:true,privateWriter:'not used',status:'PASS'});
}catch(e){failure={message:e.message,stack:String(e.stack).slice(0,2200)};console.error(e);for(const [i,p]of context.pages().entries())await p.screenshot({path:path.join(out,'FAIL-'+i+'.png')}).catch(()=>{});}
finally{await writeFile(path.join(out,'ONEC_P2_CONDITIONS_BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',checks,errors,externalRequests:external,failure,syntheticAccountOnly:true,serverAuthentication:'NOT TESTED',native1CExecution:'SEPARATE',learnerUnderstanding:'NOT MEASURED'},null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));if(f)await f.finish({status:failure?'FAIL':'PASS'});if(failure)process.exitCode=1;}
