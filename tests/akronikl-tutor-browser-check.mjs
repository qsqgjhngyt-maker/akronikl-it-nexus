// Native ESM UI/Core/knowledge. Только синтетический host; не Account E2E.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-tutor');await mkdir(out,{recursive:true});
const modelPath=process.env.NEXUS_TUTOR_MODEL_FILE;
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><main id="root"><button id="open">Akronikl</button><textarea id="editor"></textarea></main><script type="module">
import {openAssistantPanel} from '/akronikl/ui/panel.js';
import {createCodeWorkspace} from '/sandbox/code-workspace.js';
const root=document.querySelector('#root'),editor=document.querySelector('#editor');
const source='PRIVATE_BEFORE\\nint selected = 1;\\nPRIVATE_AFTER';const workspace=createCodeWorkspace({files:[{path:'main.cpp',content:source,languageId:'cpp'}]});
editor.value=source;editor.__nexusCodeStudio={workspace};editor.setSelectionRange(15,32);
const identity={id:'synthetic-tutor'};let panel=null;
window.fixture={root,editor,workspace};
document.querySelector('#open').onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,readIdentity:()=>identity,readRoute:()=>({view:'code-studio',project:'synthetic-tutor',hash:location.hash}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>editor,trigger:document.querySelector('#open')});};
</script></body></html>`;
const requests=[],errors=[],checks=[],answers=[],modelProgress=[];let fatal=null;
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});try{
 if(req.method!=='GET')throw Error('METHOD');if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const file=path.resolve(root,decodeURIComponent(u.pathname.slice(1)));if(!file.startsWith(root))throw Error('PATH');
 const b=await readFile(file);res.writeHead(200,{'content-type':({'.js':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'}[path.extname(file)]||'application/octet-stream')});res.end(b);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
const context=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const panel=()=>page.locator('[data-akronikl-panel]'),tutor=()=>page.locator('[data-akronikl-tutor]');
const check=async(name,fn)=>{const start=performance.now();try{await fn();checks.push({name,status:'PASS',ms:Math.round(performance.now()-start)});console.log('PASS '+name);}catch(e){checks.push({name,status:'FAIL',ms:Math.round(performance.now()-start)});throw e;}};
const open=async()=>{await page.locator('#open').click();await tutor().locator('summary').first().click();};
const ask=async(query='Объясни RAII')=>{await tutor().locator('[data-akronikl-tutor-question]').fill(query);await tutor().getByRole('button',{name:'Спросить по материалам',exact:true}).click();await tutor().locator('[data-tutor-turn]').last().waitFor({timeout:modelPath?180000:15000});};
try{
 await page.goto(origin);await page.waitForFunction(()=>!!window.fixture);
 await check('История и настоящие источники доступны без модели',async()=>{await open();await ask();assert.equal(await tutor().locator('[data-tutor-turn]').count(),1);assert.equal(await tutor().locator('[data-tutor-turn]').last().getAttribute('data-tutor-generated'),'false');assert.match(await tutor().textContent(),/courses\/cpp\//);});
 await check('Продолжение и очистка диалога',async()=>{await tutor().getByRole('button',{name:'Объясни проще',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-tutor-turn]').length===2);await tutor().getByRole('button',{name:'Очистить диалог',exact:true}).click();assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);});
 await check('Выбор кода явный, соседние строки не попадают в ответ',async()=>{await panel().locator('input[type=checkbox]').check();await tutor().locator('[data-akronikl-tutor-question]').fill('Разбери код');await tutor().getByRole('button',{name:'Разобрать выбранный код',exact:true}).click();await tutor().locator('[data-tutor-turn]').waitFor();const content=await tutor().textContent();assert.match(content,/int selected = 1;/);assert.doesNotMatch(content,/PRIVATE_BEFORE|PRIVATE_AFTER/);});
 await check('Отзыв выбора немедленно стирает историю',async()=>{await panel().locator('input[type=checkbox]').uncheck();assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);});
 await check('Нет HTML-интерпретации источников, фокус остаётся в окне',async()=>{await ask();assert.equal(await tutor().locator('script,iframe').count(),0);for(let i=0;i<28;i++){await page.keyboard.press('Tab');assert.ok(await panel().evaluate(n=>n.contains(document.activeElement)));}await page.setViewportSize({width:390,height:844});assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:path.join(out,'dialogue-sources-390.png')});});
 await check('Закрытие стирает историю и возвращает фокус',async()=>{await page.keyboard.press('Escape');await panel().waitFor({state:'detached'});assert.ok(await page.locator('#open').evaluate(n=>document.activeElement===n));await open();assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);});
 if(modelPath){
  await check('Реальный Qwen3: файл проверен, локальный WASM без внешнего API',async()=>{
   await tutor().getByText('Локальная модель — отдельная подготовка',{exact:true}).click();
   await tutor().locator('input[type=file]').setInputFiles(modelPath);
   await tutor().getByRole('button',{name:'Загрузить выбранную модель на этом устройстве',exact:true}).click();
   await tutor().getByRole('status').filter({hasText:'Экспериментальная локальная модель готова.'}).waitFor({timeout:180000});
  });
  await check('Генерация по реальному фрагменту курса с проверенными метками источников',async()=>{
   const poll=setInterval(async()=>{try{const data=await tutor().locator('[data-tutor-progress]').getAttribute('data-tutor-progress');if(data)modelProgress.push(JSON.parse(data));}catch{}},1000);
   try{await ask('Объясни RAII');}finally{clearInterval(poll);}
   const item=tutor().locator('[data-tutor-turn]').last();
   assert.equal(await item.getAttribute('data-tutor-generated'),'true',await item.textContent());
   const answer=await item.locator('[data-tutor-answer]').textContent();answers.push({question:'Объясни RAII',answer});assert.ok(answer.length>20);assert.match(answer,/ресурс|времен|объект/i);
   await page.screenshot({path:path.join(out,'dialogue-local-model.png')});
  });
  await check('Продолжение локального диалога при отключённой сети',async()=>{
   const before=requests.length;await context.setOffline(true);await tutor().getByRole('button',{name:'Объясни проще',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('[data-tutor-turn]').length===2,{},{timeout:180000});
   assert.equal(await tutor().locator('[data-tutor-turn]').last().getAttribute('data-tutor-generated'),'true',await tutor().locator('[data-tutor-turn]').last().textContent());
   const answer=await tutor().locator('[data-tutor-turn]').last().locator('[data-tutor-answer]').textContent();answers.push({question:'Объясни проще',answer});assert.equal(requests.length,before);
   await context.setOffline(false);
  });
 }
 await check('Изменение workspace закрывает окно и стирает диалог',async()=>{await page.evaluate(()=>fixture.workspace.updateFile('main.cpp','changed'));await panel().waitFor({state:'detached'});assert.equal(await page.locator('[data-tutor-turn]').count(),0);});
 assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.method!=='GET').length,0);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await page.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{const version=browser.version();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',source:process.env.NEXUS_SOURCE_COMMIT||null,checks,answers,modelProgress,fatal,errors,requests,browser:version,node:process.version,realModel:!!modelPath,qualityAcceptance:false,physicalDevices:false,productionLive:false},null,2)+'\n');if(fatal)process.exitCode=1;}
