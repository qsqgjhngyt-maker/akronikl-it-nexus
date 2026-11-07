// B06: настоящий browser Qt; выполнение отделено от содержательной приёмки.
// Учебные Qt bundles собираются и запускаются в настоящем Nexus; используются только синтетические аккаунты.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
import{module6GoldPrograms}from'./helpers/module6-gold-programs.mjs';import{module6ApplicationFixture}from'./academy-gold-module6-fixture.mjs';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE);await mkdir(out,{recursive:true});const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration,f=await module6ApplicationFixture({chromiumArgs:['--enable-unsafe-swiftshader','--use-angle=swiftshader']}),p=f.page,records=[],unique=new Map();let fatal,before;
for(const b of(await module6GoldPrograms({includeAuthored:true})).filter(b=>b.target==='qt-wasm'&&(process.env.NEXUS_B6_QT_REFERENCE_ONLY!=='1'||b.aliases.some(a=>a.part==='authored-lab-reference')))){const files=Object.fromEntries(Object.entries(b.files).filter(([f])=>f!=='README.md')),key=createHash('sha256').update(JSON.stringify({source:b.source,files})).digest('hex');if(!unique.has(key))unique.set(key,b);}
const log=()=>p.locator('[data-app="log"]').textContent(),waitLog=text=>p.waitForFunction(text=>document.querySelector('[data-app="log"]')?.textContent.includes(text),text,{timeout:120000});
async function build(){await p.locator('#runCode').click();const iframe=p.locator('.nexus-application-panel iframe');await iframe.waitFor({timeout:180000});const frame=await(await iframe.elementHandle()).contentFrame();assert.ok(frame);await frame.getByRole('textbox',{name:'Task title',exact:true}).waitFor({timeout:120000});return frame;}
async function afterEvent(action,expected){
 const offset=(await log()).length;
 await action();
 await p.waitForFunction(({offset,expected})=>(document.querySelector('[data-app="log"]')?.textContent||'').slice(offset).includes(expected),{offset,expected},{timeout:120000});
}
async function openCount(frame,value){
 // Qt's pinned accessibility proxy keeps its initial name; its value reflects the live QLabel.
 const counter=frame.getByRole('textbox',{name:'Open tasks: 0',exact:true});
 await counter.waitFor();
 await counter.evaluate((node,expected)=>new Promise((resolve,reject)=>{
  const until=Date.now()+10000;
  const check=()=>node.value===expected?resolve():Date.now()>until?reject(Error('COUNTER_VALUE '+node.value)):setTimeout(check,25);
  check();
 }), 'Open tasks: '+value);
}
async function selectFirstTask(frame,row=0){
 // SDK сообщает геометрию именованного списка; реальные pointer events принимает контейнер Qt.
 const contents=frame.locator('.qt-window-contents').first(),list=await frame.getByText('Tasks',{exact:true}).boundingBox(),client=await contents.boundingBox();assert.ok(list&&client&&list.width>24&&list.height>24);
 await contents.click({position:{x:list.x-client.x+12,y:list.y-client.y+12+18*row}});
}
try{
 await p.goto(f.origin+'/#view=home');await p.locator('.visual-home').waitFor();await f.waitReady();
 await p.evaluate(async prefix=>{const{patchLesson,courseWorkToken,loadState}=await import(prefix+'/core/storage.js'),{createProject}=await import(prefix+'/project-studio/project-store.js');const c=await(await fetch(prefix+'/courses/cpp/curriculum.json')).json();const{withCourseStateWriter}=await import(prefix+'/core/storage.js');await withCourseStateWriter(()=>{for(const l of c.lessons.slice(0,55))patchLesson(l.id,{completed:true,code:'// SYNTHETIC PRESERVED '+l.id,quiz:1,stdin:'17'},{expectedWorkToken:courseWorkToken(loadState(),'lesson',l.id)});});const{withProjectWriter}=await import(prefix+'/project-studio/project-writer.js');await withProjectWriter(()=>{createProject({id:'synthetic-preserved-before-m6',title:'SYNTHETIC preserved',files:[{path:'main.cpp',content:'// original',languageId:'cpp'}]})})},prefix);
 before=await p.evaluate(async prefix=>(await import(prefix+'/core/storage.js')).loadState().courses,prefix);
 const compilerRequests=[];p.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.wasm'))compilerRequests.push(new URL(r.url()).pathname)});
 for(const id of ['cpp.qt-graphical-adapter','cpp.application-build-delivery']){await p.evaluate(id=>location.hash='#course=cpp&lesson='+id+'&stage=practice&locale=en',id);await p.locator('[data-r3-topic="'+id+'"] [data-r3-panel="practice"]:visible').waitFor();assert.equal(await p.locator('#editor').count(),0);const a=p.locator('a[href="./#view=project-studio"]');assert.equal(await a.getAttribute('href'),'./#view=project-studio');assert.equal(await a.getAttribute('target'),'_blank');}
 assert.equal(compilerRequests.length,0,'Чтение Qt урока не скачивает компилятор');
 const popupPromise=f.context.waitForEvent('page');await p.locator('a[href="./#view=project-studio"]').click();const popup=await popupPromise;await popup.locator('.ps-hero').waitFor();await popup.waitForTimeout(500);assert.equal(await popup.locator('[data-startup-intro],[data-startup-cover]').count(),0);await popup.close();
 const start=Number(process.env.NEXUS_M6_GUI_START_INDEX||0),end=Number(process.env.NEXUS_M6_GUI_END_INDEX||unique.size);assert.ok(Number.isInteger(start)&&start>=0&&start<end&&end<=unique.size);
 for(const[index,b]of [...unique.values()].entries()){
  if(index<start||index>=end)continue;
  const completedOnly=/new\s+QPushButton\s*\(\s*"Completed tasks only"/.test(b.source);
  const id='synthetic-m6-gold-gui-'+index,files={...b.files,'src/gui.cpp':b.source};
  await p.evaluate(async({prefix,id,files})=>{const{taskFlowApplicationTemplate}=await import(prefix+'/project-studio/application-template.js'),{createProject}=await import(prefix+'/project-studio/project-store.js');const{withProjectWriter}=await import(prefix+'/project-studio/project-writer.js');await withProjectWriter(()=>{createProject({...taskFlowApplicationTemplate(),id,title:'SYNTHETIC Gold GUI '+id,files:Object.entries(files).map(([path,content])=>({path,content,languageId:'cpp'}))})})},{prefix,id,files});
  await p.evaluate(id=>location.hash='#view=project-studio&project='+id,id);await p.locator('#editor').waitFor();await p.waitForFunction(()=>!document.querySelector('#runCode')?.disabled);let frame=await build();assert.ok(frame);assert.equal(await frame.evaluate(()=>{try{return parent.localStorage.length}catch{return'blocked'}}),'blocked');await waitLog('NEXUS_TASKS 0');
  const input=frame.getByRole('textbox',{name:'Task title',exact:true});await input.fill('   ');await frame.getByRole('button',{name:'Add task',exact:true}).press('Enter');await p.waitForTimeout(150);assert.equal(await input.inputValue(),'   ');assert.ok(!(await log()).includes('NEXUS_TASKS 1'));
  await input.fill('alpha');await frame.getByRole('button',{name:'Add task',exact:true}).press('Enter');await waitLog('NEXUS_TASKS 1');await input.fill('beta');await frame.getByRole('button',{name:'Add task',exact:true}).press('Enter');await waitLog('NEXUS_TASKS 2');
  if(b.source.includes('NEXUS_VIEW')){
   // Настоящая клавиатурная навигация в Qt, без вызова C++ модели из JS.
   await selectFirstTask(frame);await frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter');await waitLog('NEXUS_VIEW 2 OPEN 1 DONE 1');
   const completed=completedOnly;
   const filter=frame.getByLabel(completed?'Completed tasks only':'Open tasks only',{exact:true});await filter.press('Space');await waitLog('NEXUS_VIEW 1 OPEN 1 DONE 1');
   if(completed){
    await selectFirstTask(frame);await afterEvent(()=>frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter'),'NEXUS_VIEW 1 OPEN 1 DONE 1');
    await afterEvent(()=>filter.press('Space'),'NEXUS_VIEW 2 OPEN 1 DONE 1');await selectFirstTask(frame,1);
   }else await selectFirstTask(frame);
   await frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter');
   await waitLog(completed?'NEXUS_VIEW 2 OPEN 0 DONE 2':'NEXUS_VIEW 0 OPEN 0 DONE 2');
   if(completed)await afterEvent(()=>filter.press('Space'),'NEXUS_VIEW 2 OPEN 0 DONE 2');

   await p.setViewportSize({width:390,height:844});await p.locator('.nexus-application-panel iframe').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'module6-filter-390.png'),fullPage:true});
  }
  if(b.source.includes('Open tasks: %1')){
   await writeFile(path.join(out,'open-initial-aria.txt'),await frame.locator('body').ariaSnapshot());
   await writeFile(path.join(out,'open-proxies.json'),JSON.stringify(await frame.locator('input,[aria-label]').evaluateAll(xs=>xs.map(x=>({tag:x.tagName,role:x.getAttribute('role'),label:x.getAttribute('aria-label'),value:x.value,type:x.type,rect:JSON.stringify(x.getBoundingClientRect())}))),null,2));
   await openCount(frame,2);
   await selectFirstTask(frame);await afterEvent(()=>frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter'),'NEXUS_TASKS 2');
   await openCount(frame,1);
   await selectFirstTask(frame);await afterEvent(()=>frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter'),'NEXUS_TASKS 2');
   await openCount(frame,1);
   await selectFirstTask(frame,1);await afterEvent(()=>frame.getByRole('button',{name:'Complete selected',exact:true}).press('Enter'),'NEXUS_TASKS 2');
   await openCount(frame,0);
  }
  await frame.getByRole('button',{name:'Save application data',exact:true}).press('Enter');await p.waitForFunction(()=>document.querySelector('[data-app="status"]')?.textContent.includes('Данные приложения сохранены'));await p.locator('[data-app="data"]').click();await p.waitForTimeout(100);
  let saved=await p.evaluate(async({prefix,id})=>(await import(prefix+'/project-studio/project-store.js')).getProject(id),{prefix,id});const text=saved.workspace.files.find(x=>x.path==='taskflow.txt')?.content;assert.match(text||'',/alpha/);assert.match(text||'',/beta/);if(b.source.includes('Open tasks: %1')||completedOnly){assert.match(text,/1 1 "alpha"/);assert.match(text,/2 1 "beta"/);}assert.equal(saved.workspace.files.find(x=>x.path==='src/gui.cpp').content,b.source);
  await p.locator('[data-app="stop"]').click();await p.waitForFunction(()=>!document.querySelector('.nexus-application-panel iframe'));frame=await build();await waitLog('NEXUS_TASKS 2');
  const aria=await frame.locator('body').ariaSnapshot();await p.setViewportSize({width:1366,height:900});await p.screenshot({path:path.join(out,'gui-'+index+'-1366.png'),fullPage:true});
  await p.locator('[data-app="tests"]').click();await p.waitForFunction(()=>document.querySelector('[data-app="status"]')?.textContent.includes('Собственные тесты пройдены'),{},{timeout:180000});
  const download=p.waitForEvent('download');await p.locator('[data-app="zip"]').click();const archive=await readFile(await(await download).path());assert.ok(archive.includes(Buffer.from(b.source)));assert.ok(archive.includes(Buffer.from(text)));assert.equal(f.studio.jobs.size,0);
  await writeFile(path.join(out,'gui-'+index+'-accessibility.txt'),aria);
  records.push({id:b.id,aliases:b.aliases,sourceSha256:b.sourceSha256,status:'PASS',actualQtCompiler:true,actualCppEvents:true,validationPreservedInput:true,explicitSaveAndRestart:true,modelTests:true,openCounts:b.source.includes('Open tasks: %1')?[2,1,1,0]:undefined,completedFilter:completedOnly,filterAndCompletion:b.source.includes('NEXUS_VIEW'),parentStorageBlocked:true,sourceUnchanged:true});await writeFile(path.join(out,'GUI_CONTENT_CASES.json'),JSON.stringify(records,null,2)+'\n');console.log('PASS '+b.id);
 }
 const after=await p.evaluate(async prefix=>(await import(prefix+'/core/storage.js')).loadState().courses,prefix);
 for(const id of ['cpp.qt-graphical-adapter','cpp.application-build-delivery']){
  const {clarityDraft,...legacy}=after.cpp.lessons[id]||{};
  assert.deepEqual(legacy,before.cpp.lessons[id]||{},'Reading must not create attempts, completion or learner code');
  assert.ok(clarityDraft&&clarityDraft.workBinding===null&&Object.keys(clarityDraft.answers).length===0);
  if(before.cpp.lessons[id])after.cpp.lessons[id]=before.cpp.lessons[id];else delete after.cpp.lessons[id];
 }
 assert.deepEqual(after,before);assert.equal(await p.evaluate(async prefix=>(await import(prefix+'/project-studio/project-store.js')).getProject('synthetic-preserved-before-m6').workspace.files[0].content,prefix),'// original');
}catch(e){fatal={message:e.message,stack:String(e.stack).slice(0,3000)};console.error(e);try{await p.screenshot({path:path.join(out,'failure.png'),fullPage:true});await writeFile(path.join(out,'failure-ui.txt'),(await p.locator('body').innerText()).replace(/\/artifacts\/[a-f0-9-]+\/[a-f0-9]{64}/g,'/artifacts/[redacted]'));const iframe=await p.locator('.nexus-application-panel iframe').elementHandle();const frame=iframe?await iframe.contentFrame():null;if(frame)await writeFile(path.join(out,'failure-aria.txt'),await frame.locator('body').ariaSnapshot());}catch{}}
finally{const start=Number(process.env.NEXUS_M6_GUI_START_INDEX||0),end=Number(process.env.NEXUS_M6_GUI_END_INDEX||unique.size),safe=s=>String(s).replace(/(\/artifacts\/[a-f0-9-]+\/)[a-f0-9]{64}/g,'$1[redacted]'),result={status:!fatal&&records.length===end-start&&!f.errors.length?'PASS':'FAIL',bundles:unique.size,selectedBundles:end-start,completeMatrix:start===0&&end===unique.size&&process.env.NEXUS_B6_QT_REFERENCE_ONLY!=='1',selection:process.env.NEXUS_B6_QT_REFERENCE_ONLY==='1'?'authored-reference-only':start>0||end<unique.size?'selected-range':'complete',startIndex:start,endIndex:end,passed:records.length,serverStudentCompilation:false,portableSourceAndData:true,records,fatal:fatal?{message:safe(fatal.message),stack:safe(fatal.stack)}:undefined,browserErrors:f.errors.map(safe),oldProgressAndProjectsPreserved:!fatal,physicalDevices:false,realAccount:false,productionRequests:0,cloudWrites:0,officialRelease:false};await writeFile(path.join(out,'B06_QT_BROWSER.json'),JSON.stringify(result,null,2)+'\n');await f.close();console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;}
