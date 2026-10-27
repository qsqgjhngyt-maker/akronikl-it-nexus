// Реальные UI/Core/knowledge/controller; модель, готовность и аккаунт синтетические.
// Проверка интерфейса и races, не оценка генерации или аппаратного ускорения.
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-connections');await mkdir(out,{recursive:true});
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><main id="root"><button id="open">Akronikl</button><textarea id="editor"></textarea></main><script type="module">
import {openAssistantPanel} from '/akronikl/ui/panel.js';
import {createCodeWorkspace} from '/sandbox/code-workspace.js';
const root=document.querySelector('#root'),editor=document.querySelector('#editor'),workspace=createCodeWorkspace({files:[{path:'main.cpp',content:'int n = 1;',languageId:'cpp'}]});
editor.value='int n = 1;';editor.__nexusCodeStudio={workspace};
const identity={},state={loads:0,disposals:0,checks:0,holdLoad:false,holdGenerate:false,locale:'ru',lastProfile:null};let panel=null;
const ready={code:'READY_TO_LOAD',readyToLoad:true,runtimeManifest:true,webgpu:'not-checked'};
async function inspect(profile){state.checks++;return profile==='local-webgpu'?{...ready,code:'WEBGPU_UNAVAILABLE',readyToLoad:false,webgpu:'software'}:ready;}
async function load(file,{signal,profile}){state.loads++;state.lastProfile=profile;
 const model={kind:'local',transport:'in-process',modelId:'qwen3-0.6b-q8_0',async generate(request){state.lastSignal=request.signal;if(state.holdGenerate)return new Promise(r=>state.releaseAnswer=()=>r({answer:'LATE_PRIVATE_SENTINEL',citations:['S1']}));return{answer:'Синтетический ответ для проверки интерфейса.',citations:[request.allowedCitations[0]]};},async dispose(){state.disposals++;}};
 if(state.holdLoad)await new Promise(r=>state.releaseLoad=r);return model;
}
window.fixture={state,workspace};document.querySelector('#open').onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,readIdentity:()=>identity,readRoute:()=>({view:'akronikl'}),readLocale:()=>state.locale,readCourseLocale:()=>state.locale,readEditor:()=>editor,trigger:document.querySelector('#open'),loadTutorModel:load,inspectTutorModel:inspect});};
</script></body></html>`;
const requests=[],errors=[],checks=[];let fatal=null;
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});
 try{if(req.method!=='GET')throw Error('METHOD');if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const target=path.resolve(repo,decodeURIComponent(u.pathname.slice(1)));if(!target.startsWith(repo))throw Error('PATH');
 const body=await readFile(target);res.writeHead(200,{'content-type':({'.js':'text/javascript','.json':'application/json','.css':'text/css'}[path.extname(target)]||'application/octet-stream')});res.end(body);
 }catch{res.writeHead(404);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
const context=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
const panel=()=>page.locator('[data-akronikl-panel]'),tutor=()=>page.locator('[data-akronikl-tutor]'),connections=()=>page.locator('[data-akronikl-connections]');
const select=()=>page.locator('[data-akronikl-model-profile]'),status=()=>page.locator('[data-akronikl-connection-status]');
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name);};
const open=async()=>{await page.locator('#open').click();await tutor().locator('summary').first().click();await connections().locator('summary').click();};
const close=async()=>{await panel().getByRole('button',{name:/^(Закрыть|Close)$/,exact:true}).click();await panel().waitFor({state:'detached'});};
const chooseFile=async()=>connections().locator('input[type=file]').setInputFiles({name:'synthetic.gguf',mimeType:'application/octet-stream',buffer:Buffer.from('x'.repeat(1024))});
const connect=async()=>{await chooseFile();await connections().getByRole('button',{name:'Подключить выбранную модель',exact:true}).click();await status().filter({hasText:'Локальная модель загружена'}).waitFor();};
const ask=async()=>{await tutor().locator('[data-akronikl-tutor-question]').fill('Объясни RAII');await tutor().getByRole('button',{name:'Спросить по материалам',exact:true}).click();};
try{
 await page.goto(origin);await page.waitForFunction(()=>!!window.fixture);await open();
 await check('Начальный режим без модели: никаких автоматических подключений',async()=>{assert.equal(await select().inputValue(),'sources');assert.equal(await page.evaluate(()=>fixture.state.loads),0);assert.equal(await page.evaluate(()=>fixture.state.checks),0);assert.equal(await connections().locator('input[type=file]').isDisabled(),true);});
 await check('Внешний AI закрыт, полей ключей и URL нет',async()=>{assert.equal(await select().locator('option[value=external]').isDisabled(),true);assert.equal(await connections().locator('input[type=password],input[type=url]').count(),0);});
 await check('Проверка готовности не выдаётся за загрузку модели',async()=>{await select().selectOption('local-cpu');await connections().getByRole('button',{name:'Проверить готовность',exact:true}).click();await status().filter({hasText:'Модель ещё не загружена'}).waitFor();assert.equal(await page.evaluate(()=>fixture.state.loads),0);});
 await check('Явное подключение модели, ответ, затем очистка при отключении',async()=>{await connect();assert.equal(await page.evaluate(()=>fixture.state.lastProfile),'local-cpu');await ask();await tutor().locator('[data-tutor-generated=true]').waitFor();await connections().getByRole('button',{name:'Отключить модель',exact:true}).click();assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);await page.waitForFunction(()=>fixture.state.disposals===1);assert.equal(await select().inputValue(),'sources');});
 await check('WebGPU без подтверждённого адаптера не запускает CPU автоматически',async()=>{const before=await page.evaluate(()=>fixture.state.loads);await select().selectOption('local-webgpu');await connections().getByRole('button',{name:'Проверить готовность',exact:true}).click();await status().filter({hasText:'WebGPU-адаптер не подтверждён'}).waitFor();assert.equal(await select().inputValue(),'local-webgpu');assert.equal(await page.evaluate(()=>fixture.state.loads),before);});
 await check('Запоздалый результат после отключения не появляется',async()=>{await select().selectOption('local-cpu');await connect();await page.evaluate(()=>fixture.state.holdGenerate=true);await ask();await page.waitForFunction(()=>!!fixture.state.releaseAnswer);await connections().getByRole('button',{name:'Отключить модель',exact:true}).click();assert.equal(await page.evaluate(()=>fixture.state.lastSignal.aborted),true);await page.evaluate(()=>{fixture.state.releaseAnswer();fixture.state.holdGenerate=false;});await page.waitForTimeout(100);assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);assert.doesNotMatch(await panel().textContent(),/LATE_PRIVATE_SENTINEL/);});
 await check('Отмена загрузки оставляет справку; поздний runtime освобождается',async()=>{await page.evaluate(()=>fixture.state.holdLoad=true);await select().selectOption('local-cpu');await chooseFile();await connections().getByRole('button',{name:'Подключить выбранную модель',exact:true}).click();await page.waitForFunction(()=>!!fixture.state.releaseLoad);const count=await page.evaluate(()=>fixture.state.disposals);await connections().getByRole('button',{name:'Отключить модель',exact:true}).click();assert.equal(await select().inputValue(),'sources');await page.evaluate(()=>{fixture.state.releaseLoad();fixture.state.holdLoad=false;});await page.waitForFunction(n=>fixture.state.disposals>n,count);assert.equal(await status().getAttribute('data-connection-code'),'SOURCES_READY');});
 await check('Клавиатура и ширины 390/1366 не теряют фокус и не создают переполнение',async()=>{for(const width of [390,1366]){await page.setViewportSize({width,height:900});assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:path.join(out,`connections-${width}.png`)});}await select().focus();for(let i=0;i<30;i++){await page.keyboard.press('Tab');assert.ok(await panel().evaluate(n=>n.contains(document.activeElement)));}});
 await check('Закрытие окна выгружает модель, повторное открытие без неё',async()=>{await select().selectOption('local-cpu');await connect();const count=await page.evaluate(()=>fixture.state.disposals);await close();await page.waitForFunction(n=>fixture.state.disposals>n,count);await open();assert.equal(await select().inputValue(),'sources');assert.equal(await tutor().locator('[data-tutor-turn]').count(),0);});
 await check('Настоящий browser preflight отклоняет отсутствующий runtime',async()=>{const r=await page.evaluate(async()=>{const {inspectLocalProfile}=await import('/akronikl/connections/probe.js');return inspectLocalProfile('local-cpu');});assert.equal(r.code,'RUNTIME_UNAVAILABLE');assert.equal(r.readyToLoad,false);});
 await check('EN подписи и отказ внешнего подключения',async()=>{await close();await page.evaluate(()=>fixture.state.locale='en');await open();assert.ok(await connections().getByRole('button',{name:'Check readiness',exact:true}).isVisible());assert.equal(await select().locator('option[value=external]').isDisabled(),true);});
 await check('Нет запросов записи и JS-ошибок',async()=>{assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.method!=='GET').length,0);});
}catch(error){fatal={message:error.message,stack:error.stack};console.error(error);await page.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{const version=browser.version();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',source:process.env.NEXUS_SOURCE_COMMIT||null,checks,fatal,errors,requests,browser:version,node:process.version,realUI:true,syntheticProvider:true,hardwareAccelerationTested:false,modelQualityAccepted:false,physicalDevices:false,productionLive:false},null,2)+'\n');if(fatal)process.exitCode=1;}
