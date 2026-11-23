// Реальный Chrome, публичное чтение; без входа, рабочих данных и обхода авторизации.
import fs from'node:fs/promises';import path from'node:path';import http from'node:http';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
const repo=path.resolve(process.argv[2]),frontend=path.resolve(process.argv[3]),out=path.resolve(process.argv[4]);await fs.mkdir(out,{recursive:true});
const{chromium}=await import(pathToFileURL(path.join(repo,'tools/qa-browser-driver/node_modules/playwright/index.mjs')));
const{staticMime}=await import(pathToFileURL(path.join(repo,'pwa/static-mime.js')));
const{CLARITY_COURSES:registry}=await import(pathToFileURL(path.join(repo,'core/clarity-course-registry.mjs')));
const scope=JSON.parse(await fs.readFile(path.join(frontend,'CLARITY_BUILD_SCOPE.json')));
const build=JSON.parse(await fs.readFile(path.join(frontend,'BUILD_MANIFEST.json'))),prefix='/releases/'+build.assetGeneration;
assert.ok(!build.files.some(f=>f.file.includes('/courses/reference/authoring/')),'Редакторские копии не увеличивают обязательный offline-пакет');
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/qa'){res.setHeader('Content-Type','text/html');return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${prefix}/styles/app.css"><main id="app"></main>`);}const relative=decodeURIComponent(url.pathname);if(relative.includes('..')||relative.includes('\\'))throw Error('PATH');const file=path.resolve(frontend,'.'+relative);if(!file.startsWith(frontend+path.sep))throw Error('PATH');res.setHeader('Content-Type',staticMime(relative));res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH}),context=await browser.newContext({serviceWorkers:'block'});
await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const page=await context.newPage(),errors=[],rows=[],screens=[];page.on('pageerror',e=>errors.push(e.message));
const catalog=JSON.parse(await fs.readFile(path.join(frontend,prefix.slice(1),'courses/clarity/courses.json'))),screenIds=new Set(catalog.map(c=>c.topics[0].id));for(const id of ['cpp.functions-contracts','cpp.pointers-references-addresses','cpp.qt-graphical-adapter'])screenIds.add(id);
let failure;
try{
 await page.goto(origin+'/qa');
 for(const[id,meta]of Object.entries(registry))for(const locale of ['ru','en']){
  await page.evaluate(async({id,course,locale,prefix})=>{globalThis.lessonController?.dispose();document.querySelector('#app').replaceChildren();history.replaceState(null,'','#'+new URLSearchParams({course,lesson:id,locale,stage:'explanation'}));const{mountClarityLesson}=await import(prefix+'/core/cpp-clarity-r3-renderer.mjs');globalThis.lessonController=await mountClarityLesson(document.querySelector('#app'),{topicId:id,locale});},{id,course:meta.courseId,locale,prefix});
  const root=page.locator('[data-r3-topic="'+id+'"][data-r3-ready="true"]');await root.waitFor();assert.equal(await root.locator('[data-reference-badge]').count(),0,id+' снят временный маркер');
  const widths=[];
  for(const width of [1366,390,320]){await page.setViewportSize({width,height:900});for(const stage of ['explanation','selfcheck','practice']){await root.locator('[data-stage="'+stage+'"]').click();await root.locator('[data-r3-panel="'+stage+'"]:visible').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' '+locale+' '+width+' '+stage+' overflow');const next=root.locator('[data-reference-continuation="'+stage+'"] [data-reference-continue]');assert.equal(await next.isVisible(),true,id+' продолжение '+stage);const bounds=await next.boundingBox();assert.ok(bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=width+1,id+' доступная кнопка');}
   widths.push(width);
   if(screenIds.has(id)&&[1366,320].includes(width)){await root.locator('[data-stage="explanation"]').click();await page.evaluate(()=>scrollTo(0,0));const name=[id,locale,width].join('-')+'.png';await page.screenshot({path:path.join(out,name)});screens.push(name);}
  }
  await root.locator('[data-stage="practice"]').click();assert.equal(await root.locator('[data-practice-passport]').count(),1,id+' паспорт');
  const reference=root.locator('[data-lab-reference]');await reference.locator('summary').first().click();await reference.locator('[data-lab-reference-content]').waitFor();
  const lesson=JSON.parse(await fs.readFile(path.join(frontend,prefix.slice(1),`courses/${meta.pilot?'cpp-clarity-r3':'clarity'}/lessons/${id}.${locale}.json`)));
  if(lesson.practice.referenceSolution.source){await reference.locator('[data-reference-source]').waitFor();assert.equal(await reference.locator('[data-reference-source] code').textContent(),lesson.practice.referenceSolution.source,id+' точный текст решения');}
  else{await page.waitForFunction(({id,text})=>document.querySelector('[data-r3-topic="'+id+'"] [data-lab-reference-content]')?.textContent.includes(text),{id,text:lesson.practice.referenceSolution.paragraphs[0]});}
  rows.push({id,locale,widths,stages:3,referenceVisible:true,passportVisible:true,authenticated:false});
 }
 assert.equal(rows.length,302);assert.deepEqual(errors,[]);
}catch(e){failure=e.stack;}
finally{await context.close();await browser.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'AUTOMATED BROWSER PASS',sourceCommit:scope.sourceCommit,generation:build.assetGeneration,rows,screens,errors,failure,scope:'Публичное чтение в настоящем Chrome; сохранение и runtime проверяются отдельно',physicalDevices:false,realAccounts:false},null,2)+'\n');}
console.log(JSON.stringify({status:failure?'FAIL':'PASS',editions:rows.length,screens:screens.length,failure}));if(failure)process.exitCode=1;
