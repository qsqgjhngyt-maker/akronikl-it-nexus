// M5-07-P2-01: реальные bootstrap/SW, холодная локальная копия и геометрия текста.
import assert from 'node:assert/strict';
import {readFile,writeFile}from'node:fs/promises';
import path from'node:path';
import {nativeOfflineFixture}from'./helpers/native-offline-fixture.mjs';
import {onlineRuntimeFixture}from'./helpers/online-runtime-fixture.mjs';
const baseline=process.env.NEXUS_HEADER_BASELINE==='1';
if(baseline)process.env.NEXUS_FRONTEND_DIR=path.resolve(process.env.NEXUS_HEADER_PUBLISHED_DIR||'.');
const f=await nativeOfflineFixture('m5-header'),online=await onlineRuntimeFixture(),prefix='/releases/'+f.generation;
const widths=[320,360,390,430,600,760,768,960,1366],rows=[],checks=[];
const phrase='SYNTHETIC header local phrase',lesson='cpp.oop-principles';let page,id,original,fatal,expectedDefect=false;
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function geometry(p){return p.evaluate(()=>{
 const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 const title=document.querySelector('.top-title strong'),range=document.createRange();range.selectNodeContents(title);
 const visible=n=>n&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
 const names={'menu':'#menuBtn','language':'#uiLocale','settings':'#visualSettings > summary','identity':'#localIdentity, #accountMenuButton','lock':'#lockLocal'};
 const controls=Object.entries(names).flatMap(([name,selector])=>{const n=document.querySelector(selector);return visible(n)?[{name,...rect(n)}]:[]});
 const titleLines=visible(title)?[...range.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height})):[];
 const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.5;
 const collisions=[];for(const t of titleLines)for(const c of controls)if(overlap(t,c))collisions.push('title/'+c.name);
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)if(overlap(controls[i],controls[j]))collisions.push(controls[i].name+'/'+controls[j].name);
 const lang=controls.find(c=>c.name==='language'),titleGap=lang&&titleLines.length?Math.min(...titleLines.filter(t=>Math.min(t.bottom,lang.bottom)>Math.max(t.y,lang.y)).map(t=>lang.x-t.right)):null;
 const h=rect(document.querySelector('.topbar')),outside=controls.filter(c=>c.x<-.5||c.right>innerWidth+.5||c.y<h.y-.5||c.bottom>h.bottom+.5).map(c=>c.name);
 return{width:innerWidth,locale:document.documentElement.lang,header:h,title:rect(title),titleLines,controls,collisions,titleGap:Number.isFinite(titleGap)?titleGap:null,outside,smallTargets:controls.filter(c=>c.width<43.5||c.height<43.5).map(c=>c.name),pageOverflow:document.documentElement.scrollWidth>innerWidth+1};
 });}
async function capture(p,mode,locale,width){await p.setViewportSize({width,height:844});await frame(p);const g=await geometry(p);rows.push({mode,locale,...g});return g;}
async function unlock(){await page.locator('#localPhrase').fill(phrase);await page.locator('#unlockLocal button').click();await page.locator('#lockLocal:not([hidden])').waitFor();await frame(page);}
const snapshot=()=>page.evaluate(async({prefix,id,phrase})=>{const s=await(await import(prefix+'/pwa/local-vault.js')).createVaultStore().unlock(id,phrase),v=s.read();await s.lock();return v;},{prefix,id,phrase});
try{
 page=await f.launch();await page.goto(f.origin+'/offline.html');await f.waitReady();
 const seeded=await page.evaluate(async({prefix,phrase,lesson})=>{
  const {makeLocalPayload}=await import(prefix+'/pwa/offline-transfer.js'),{createVaultStore}=await import(prefix+'/pwa/local-vault.js');
  const curriculum=await(await fetch(prefix+'/courses/cpp/curriculum.json')).json();
  const lessons=Object.fromEntries(curriculum.lessons.map((l,i)=>[l.id,{completed:i<50,quiz:2,code:'// SYNTHETIC preserved '+l.id+'\nint main(){return 0;}',stdin:'17\n',workspace:{languageId:'cpp',entryFile:'main.cpp',activeFile:'main.cpp',revision:4,files:[{path:'main.cpp',content:'// SYNTHETIC preserved '+l.id+'\nint main(){return 0;}',languageId:'cpp'}]}}]));
  const payload=makeLocalPayload({account:{accountId:'synthetic-header',displayName:'SYNTHETIC Header',status:'active'},state:{courses:{cpp:{courseId:'cpp',lessons}},skills:{}},projects:[{id:'synthetic-header-project',title:'SYNTHETIC preserved project',languageId:'cpp',workspace:{entryFile:'main.cpp',activeFile:'main.cpp',files:[{path:'main.cpp',content:'// SYNTHETIC project',languageId:'cpp'}]},progress:{milestones:[1]},checkpoints:[{id:'before-header',workspace:{files:[{path:'main.cpp',content:'// SYNTHETIC checkpoint'}]}}],access:{workspaceKind:'personal'}}],isOwner:()=>true});
  const s=await createVaultStore().create(payload,phrase),result={id:s.id,payload:s.read()};await s.lock();return result;
 },{prefix,phrase,lesson});id=seeded.id;original=seeded.payload;
 await f.closeBrowser();f.networkDown();page=await f.launch();
 for(const locale of ['ru','en']){
  await page.goto(f.origin+'/offline.html#copy='+id);
  await page.evaluate(locale=>localStorage.setItem('akronikl:it-nexus:prefs:v1',JSON.stringify({uiLocale:locale,courseLocale:locale,mentorLocale:locale,focusReading:false,effectsQuality:'off'})),locale);await page.reload();
  await page.locator('#unlockLocal').waitFor();
  for(const width of widths)await capture(page,'offline-locked',locale,width);
  await unlock();await page.evaluate(lesson=>{location.hash='#course=cpp&lesson='+lesson},lesson);await page.locator('.academy-gold').waitFor();
  for(const width of widths){const g=await capture(page,'offline-unlocked',locale,width);if(locale==='ru'&&width===390){expectedDefect=g.collisions.includes('title/language')||(g.titleGap!==null&&g.titleGap<8);await page.screenshot({path:path.join(f.out,baseline?'before-390.png':'after-390.png')});}}
 }
 await online.page.goto(online.origin+'/#view=home');await online.page.locator('.visual-home').waitFor();await online.waitReady();
 for(const locale of ['ru','en']){await online.page.evaluate(locale=>{const k='akronikl:it-nexus:prefs:v1',v=JSON.parse(localStorage.getItem(k)||'{}');v.uiLocale=locale;localStorage.setItem(k,JSON.stringify(v))},locale);await online.page.reload();await online.page.locator('.visual-home').waitFor();for(const width of widths)await capture(online.page,'online',locale,width);}
 if(baseline){assert.ok(expectedDefect,'Нужен реально воспроизведённый дефект390, не предположение');checks.push({name:'Исходный Test.1 воспроизводит M5-07-P2-01',status:'EXPECTED_DEFECT_REPRODUCED'});}
 else{
  for(const r of rows){assert.deepEqual(r.collisions,[],JSON.stringify(r));assert.deepEqual(r.outside,[],JSON.stringify(r));assert.equal(r.pageOverflow,false,JSON.stringify(r));if(r.mode.startsWith('offline')){assert.deepEqual(r.smallTargets,[],JSON.stringify(r));if(r.titleGap!==null)assert.ok(r.titleGap>=8,JSON.stringify(r));}}
  checks.push({name:'Текст и5 действий без пересечений; touch44px;54 сочетания',status:'PASS',cases:rows.length});
  await page.setViewportSize({width:390,height:844});await page.locator('#menuBtn').focus();await page.keyboard.press('Enter');await page.locator('#sidebar.open').waitFor();assert.equal(await page.locator('#sidebar').getAttribute('aria-modal'),'true');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.id==='menuBtn');
  await page.locator('#visualSettings > summary').focus();await page.keyboard.press('Enter');assert.notEqual(await page.locator('#visualSettings').getAttribute('open'),null);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.matches('#visualSettings > summary'));
  await page.locator('#uiLocale').focus();await page.keyboard.press('ArrowDown');await page.locator('.language-cluster .nexus-select-option:focus').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#uiLocale').getAttribute('aria-expanded'),'false');
  checks.push({name:'Меню, язык, настройки и Escape возвращают focus',status:'PASS'});
  await page.screenshot({path:path.join(f.out,'after-controls-390.png')});
  await page.locator('#lockLocal').focus();await page.keyboard.press('Enter');await page.locator('#unlockLocal').waitFor();await unlock();
  assert.deepEqual(await snapshot(),original);assert.equal(await page.evaluate(async prefix=>(await import(prefix+'/core/account-storage.js')).verifiedAccount(),prefix),null);
  checks.push({name:'Закрытие/открытие той же копии сохраняет56 состояний, код, проект и checkpoint; не создаёт online identity',status:'PASS'});
 }
 assert.deepEqual(f.errors,[]);assert.deepEqual(online.errors,[]);assert.equal(online.requests.filter(r=>r.path.startsWith('/api/')&&r.method!=='GET').length,0);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);if(page&&!page.isClosed())await page.screenshot({path:path.join(f.out,'FAILURE.png')}).catch(()=>{});}
finally{await writeFile(path.join(f.out,'HEADER_GEOMETRY.json'),JSON.stringify(rows,null,2)+'\n');await online.close();await f.finish({status:fatal?'FAIL':baseline?'BASELINE_DEFECT_REPRODUCED':'PASS',checks,fatal,baseline,expectedDefect,physicalDevice:false,realLive:false,cppExecution:false});if(fatal)process.exitCode=1;}
