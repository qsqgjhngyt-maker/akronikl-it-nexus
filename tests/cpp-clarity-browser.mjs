import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {clarityLocalFixture} from './helpers/cpp-clarity-local-fixture.mjs';
import {clarityLessons,clarityPrograms} from './helpers/cpp-clarity-programs.mjs';
import {goldLessonRoute} from './helpers/gold-lesson-route.mjs';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(process.env.NEXUS_FRONTEND_DIR,'BUILD_MANIFEST.json'))),prefix='/releases/'+manifest.assetGeneration;
const f=await clarityLocalFixture(path.join(out,'native-first')),page=f.page,checks=[],runtime=[],screens=[];let failure;
const mark=(name)=>{checks.push({name,status:'PASS'});console.log('PASS: '+name)};
const lesson='cpp.programming-process',lessons=await clarityLessons(),content=lessons.find(x=>x.lessonId===lesson&&x.locale==='ru');
const saved=()=>page.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent.startsWith('Сохранено на устройстве'));
const state=async()=>(await f.read()).state.courses.cpp.lessons[lesson];
const choose=async(mode,action)=>{await page.locator('[data-clarity-open="'+mode+'"]').click();await page.locator('[data-choice="'+action+'"]').click()};
try{
 await page.evaluate(()=>{location.hash='#view=home'});await page.locator('.visual-home').waitFor();
 const home=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname));assert.ok(!home.some(x=>/llvm|clang|gold\/.*json/.test(x)));mark('Главная не загрузила тела Gold или компилятор');
 await page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},lesson);await page.locator('[data-clarity-lesson]').waitFor();await page.locator('#editor').waitFor();
 assert.equal(await page.locator('#editor').inputValue(),content.clarity.laboratory.starterCode);assert.equal(await page.locator('#cppTask').count(),0);assert.equal(await page.locator('#cppLab').count(),1);assert.ok(!await page.locator('[data-gold-depth]').getAttribute('open'));mark('Новая работа начинается с самостоятельной заготовки; углубление отдельно');
 const source='#include <iostream>\nint main() { std::cout << "MY WORK\\n"; }\n';
 await page.locator('#editor').fill(source);await page.locator('#stdin').fill('saved input\n');
 await saved();
 await choose('example','cancel');assert.equal(await page.locator('#editor').inputValue(),source);assert.equal((await state()).code,source);mark('Открытие и отмена не заменяют сохранённый код');
 // The DOM buffer can be newer than the persisted workspace (e.g. a failed autosave).
 const unsaved=source+'// unsaved buffer\n';await page.locator('#editor').evaluate((ed,v)=>{ed.value=v},unsaved);
 await choose('example','copy');await page.locator('[data-choice-status] a').waitFor();assert.equal(await page.locator('#editor').inputValue(),unsaved);
 const newId=new URL(await page.locator('[data-choice-status] a').getAttribute('href'),f.origin).hash.split('project=')[1];
 const newProject=(await f.read()).projects[decodeURIComponent(newId)];
 assert.equal(newProject.workspace.files.find(x=>x.path==='main.cpp').content,content.clarity.example.code);assert.equal(newProject.manifest.entryFile,'main.cpp');await page.locator('[data-choice="cancel"]').click();mark('Отдельная копия имеет правильный entryFile и сохраняет несохранённый буфер урока');
 await choose('training','replace');await page.locator('[data-clarity-choose]').waitFor({state:'detached'});assert.equal(await page.locator('#editor').inputValue(),content.clarity.training.starterCode);
 const backups=Object.values((await f.read()).projects).filter(x=>x.title.startsWith('Моя работа до замены'));
 assert.ok(backups.some(x=>x.workspace.files.some(f=>f.content===unsaved)));assert.ok(backups.some(x=>x.workspace.files.some(f=>f.path.endsWith('NEXUS_LESSON_INPUT.txt')&&f.content.endsWith('saved input\n'))));
 const preserved=await state();assert.equal(preserved.completed,true);assert.equal(preserved.quiz,1);assert.deepEqual(preserved.attempts,[{synthetic:true,answer:1,revision:'earlier'}]);mark('Замена сначала сохранила текущий буфер и stdin; attempts/quiz/completion сохранены');
 await page.locator('#editor').fill(source);await saved();await page.reload();await f.reopen(lesson);assert.equal(await page.locator('#editor').inputValue(),source);assert.equal((await state()).completed,true);mark('F5/reopen сохраняет собственный код и прежнее завершение');
 await page.locator('#resetCode').click();await page.locator('[data-choice="cancel"]').click();assert.equal(await page.locator('#editor').inputValue(),source);mark('Прежняя кнопка сброса проходит тот же защитный выбор');
 await page.locator('[data-clarity-open="laboratory"]').click();
 await page.evaluate(()=>{globalThis.__restorePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic quota','QuotaExceededError')}});
 await page.locator('[data-choice="replace"]').click();await page.waitForFunction(()=>document.querySelector('[data-choice-status]')?.textContent.includes('Замена остановлена'));
 assert.equal(await page.locator('#editor').inputValue(),source);await page.evaluate(()=>{IDBObjectStore.prototype.put=globalThis.__restorePut;delete globalThis.__restorePut});await page.locator('[data-choice="cancel"]').click();mark('Ошибка quota оставляет текущую работу в редакторе');
 await page.locator('#editor').fill(source+'\n');await page.locator('#editor').fill(source);await saved();
 for(const locale of ['en','ru']){
  await goldLessonRoute(page,lesson,locale);await page.locator('#editor').waitFor();assert.equal(await page.locator('#editor').inputValue(),source);assert.equal((await state()).quiz,1);
 }mark('Смена языка сохраняет код и ответ по стабильному ID');
 for(const [id,locale,width]of [['cpp.programming-process','ru',1366],['cpp.first-cpp-program','en',390],['cpp.pointers-references-addresses','ru',320],['cpp.functions-contracts','en',1366],['cpp.qt-graphical-adapter','ru',390]]){
  await page.setViewportSize({width,height:900});await goldLessonRoute(page,id,locale);await page.locator('[data-gold-lesson]').waitFor();
  if(id!=='cpp.qt-graphical-adapter')assert.ok(await page.locator(id==='cpp.functions-contracts'?'.gold-example pre':'[data-clarity-example] pre').first().isVisible());
  const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].map(x=>({tag:x.tagName,cls:x.className,right:x.getBoundingClientRect().right,width:x.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1&&x.width>0).slice(0,12)}));assert.ok(overflow.scrollWidth<=overflow.width+1,id+' horizontal page overflow '+JSON.stringify(overflow));
  await page.locator(id==='cpp.qt-graphical-adapter'?'[data-gold-qt-workspace]':id==='cpp.functions-contracts'?'.gold-example':'[data-clarity-example]').first().scrollIntoViewIfNeeded();
  const file=id.slice(4)+'-'+locale+'-'+width+'.png';await page.screenshot({path:path.join(out,file),fullPage:false});screens.push(file);
 }mark('1366/390/320: код виден, страница не растягивается; функции и Qt представлены');
 if(!process.argv.includes('--ui-only')){
  await page.evaluate(()=>{location.hash='#view=compiler'});await page.locator('#prepareCompiler').click();await page.waitForFunction(()=>/полностью проверен и готов/.test(document.querySelector('#runtimeStatus')?.textContent||''),{},{timeout:300000});
  const seen=new Map();for(const p of await clarityPrograms())for(const c of p.cases){const key=p.sourceSha256+'\0'+c.stdin;if(seen.has(key)){runtime.push({...seen.get(key),id:p.id,locale:p.locale,name:p.name,alias:true});continue}
   const r=await page.evaluate(async({prefix,source,stdin})=>{const{pickProvider}=await import(prefix+'/sandbox/sandbox.js'),request={languageId:'cpp',source,stdin},route=await pickProvider(request);const r=await route.provider.run(request);return{provider:route.provider.id,stdout:r.stdout,stderr:r.stderr,exitCode:r.exitCode,sourceUnchanged:request.source===source,compileMs:r.compileMs,runMs:r.runMs}},{prefix,source:p.source,stdin:c.stdin});
   const row={id:p.id,locale:p.locale,name:p.name,sourceSha256:p.sourceSha256,stdin:c.stdin,expected:c.stdout,...r};runtime.push(row);seen.set(key,row);await writeFile(path.join(out,'WASI.json'),JSON.stringify({method:'Actual Nexus pickProvider/run and pinned Clang/WASI; compiler/stdout are not mocked',runtime},null,2)+'\n');assert.equal(r.provider,'wasm-cpp');assert.equal(r.stdout,c.stdout,p.id+' '+p.name);assert.equal(r.exitCode,0);assert.equal(r.stderr,'');assert.ok(r.sourceUnchanged);if(seen.size%10===0)console.log('WASI unique observations: '+seen.size);
  }mark('Настоящий Nexus Clang/WASI исполнил основные примеры, варианты, эталоны и отрицательные контроли функций');
  await f.closeBrowser();f.networkDown();const cold=await f.launch();await cold.goto(f.origin+'/offline.html#copy='+f.id);await cold.locator('#localPhrase').fill(f.phrase);await cold.locator('#unlockLocal button').click();await cold.locator('#psNewProject').waitFor();await cold.evaluate(id=>{location.hash='#course=cpp&lesson='+id},lesson);await cold.locator('#editor').waitFor();assert.equal(await cold.locator('#editor').inputValue(),source);await cold.locator('#runCode').click();await cold.waitForFunction(()=>/Код завершения: 0/.test(document.querySelector('#output')?.textContent||''),{},{timeout:300000});assert.match(await cold.locator('#output').textContent(),/MY WORK/);mark('Холодный offline после закрытия браузера: сохранённый код исполняется без сети');
 }
 // Account separation is verified using an independent synthetic browser context.
 const second=await clarityLocalFixture(path.join(out,'native-second'));try{await second.page.evaluate(id=>{location.hash='#course=cpp&lesson='+id},lesson);await second.page.locator('#editor').waitFor();assert.equal(await second.page.locator('#editor').inputValue(),content.clarity.laboratory.starterCode);}finally{await second.close()}mark('Отдельный synthetic профиль не получает работу первого профиля');
 assert.deepEqual(f.errors,[]);
}catch(error){failure={message:error.message,stack:String(error.stack).slice(0,2200)};if(!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(error)}finally{
 await writeFile(path.join(out,'BROWSER.json'),JSON.stringify({status:failure?'FAIL':'PASS',failure,checks,screens,runtime:runtime.length?'EXECUTED':'NOT RUN',runtimeObservations:runtime.length,physicalDevices:'NOT RUN',learnerFeedback:'NOT RUN',syntheticAccount:true,externalWrites:0,errors:f.errors},null,2)+'\n');await f.close();if(failure)process.exitCode=1;
}
