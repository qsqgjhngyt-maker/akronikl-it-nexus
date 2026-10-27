// Native g++ output + настоящий Sandbox coordinator/парсер/контекст/UI.
// Provider transport, аккаунт и часть Studio API — синтетические. Не LIVE compiler.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFile as exec} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-context');await mkdir(out,{recursive:true});
const source='int main(){ return 0 }',dir=await mkdtemp(path.join(os.tmpdir(),'ak-compiler-'));
let stderr,compiler;
try{
 await writeFile(path.join(dir,'main.cpp'),source);
 compiler=(await promisify(exec)('g++',['--version'])).stdout.split('\n')[0];
 try{await promisify(exec)('g++',['-fsyntax-only','-fdiagnostics-color=never','main.cpp'],{cwd:dir,timeout:10000});throw Error('Unexpected compiler success');}catch(e){assert.ok(e.stderr);stderr=e.stderr;}
}finally{await rm(dir,{recursive:true,force:true});}
await writeFile(path.join(out,'NATIVE_COMPILER.txt'),compiler+'\n'+stderr);
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><main id="root"><button id="open">Akronikl</button><button id="run">Запустить</button><textarea id="editor"></textarea><pre id="output"></pre></main><script type="module">
import {openAssistantPanel} from '/akronikl/ui/panel.js';
import {createCodeWorkspace} from '/sandbox/code-workspace.js';
import {createSandboxController,runtimeRouter} from '/sandbox/sandbox.js';
const input=await(await fetch('/compiler-fixture.json')).json();
const root=document.querySelector('#root'),editor=document.querySelector('#editor'),output=document.querySelector('#output');
const workspace=createCodeWorkspace({files:[{path:'main.cpp',content:input.source},{path:'other.cpp',content:'PRIVATE_OTHER_SOURCE'}]});
const studio={workspace,runtimeRequest:()=>workspace.runtimeRequest(),getSnapshot:()=>workspace.snapshot(),getActiveFile:()=>workspace.activeFile,getEntrySource:()=>workspace.getFile(workspace.entryFile).content};editor.__nexusCodeStudio=studio;editor.value=input.source;editor.setSelectionRange(0,input.source.length);
const state={identity:{id:'synthetic-context'},route:{view:'code-studio',project:'synthetic'},lastRun:null,delay:false,release:null};
runtimeRouter.route=async()=>({provider:{id:'native-gpp-fixture',label:'Native g++ test',async run(){if(state.delay)await new Promise(r=>state.release=r);throw Object.assign(Error('Compile failed'),{anxCompilerOutput:input.stderr});}},assessment:{bestEffort:[]}});
const sandbox=createSandboxController({editor,output,codeStudio:studio,locale:'ru'});
document.querySelector('#run').onclick=()=>{state.lastRun=sandbox.run().catch(()=>{});};
let panel;document.querySelector('#open').onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,trigger:document.querySelector('#open'),readIdentity:()=>state.identity,readRoute:()=>state.route,readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>editor});};
window.fixture={state,workspace,editor,sandbox};
</script></body></html>`;
const requests=[],errors=[],checks=[];let fatal=null;
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});
 if(req.method!=='GET'){res.writeHead(403);res.end();return;}
 if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
 if(u.pathname==='/compiler-fixture.json'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({source,stderr}));return;}
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const file=path.resolve(repo,decodeURIComponent(u.pathname.slice(1)));if(!file.startsWith(repo))throw Error('PATH');
 const data=await readFile(file);res.writeHead(200,{'content-type':({'.js':'text/javascript','.json':'application/json','.css':'text/css'}[path.extname(file)]||'application/octet-stream')});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900}});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
const panel=()=>p.locator('[data-akronikl-panel]');
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name);};
const open=async()=>{await p.locator('#open').click();await panel().waitFor();};
async function privacy(){await panel().locator('[data-akronikl-settings]').click();await panel().getByRole('button',{name:'Приватность',exact:true}).click();}
async function back(){await panel().getByRole('button',{name:'Вернуться к разговору',exact:true}).click();}
async function ask(text){const n=await panel().locator('[data-ak-message="assistant"]').count();await panel().locator('[data-akronikl-message]').fill(text);await panel().locator('[data-akronikl-send]').click();await p.waitForFunction(count=>document.querySelectorAll('[data-ak-message="assistant"]').length>count,n);await p.waitForFunction(()=>document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false');}
try{
 await p.goto(origin);await p.waitForFunction(()=>!!window.fixture);
 await check('Без запуска нет диагностики и скрытого чтения кода',async()=>{await open();await ask('Почему мой код выдаёт ошибку?');assert.match(await panel().textContent(),/разрешите выбранный код/i);assert.equal(await panel().locator('pre').filter({hasText:'expected'}).count(),0);});
 await check('Согласие на код не даёт автоматического согласия на журнал',async()=>{await privacy();assert.equal(await panel().locator('[data-ak-diagnostic-consent]').isDisabled(),true);await panel().locator('[data-ak-code-consent]').check();assert.equal(await panel().locator('[data-ak-diagnostic-consent]').isChecked(),false);await back();await ask('Почему мой код выдаёт ошибку?');assert.match(await panel().textContent(),/разрешите выбранный код/i);});
 await check('Согласие без запуска не превращается в выдуманную ошибку',async()=>{await privacy();await panel().locator('[data-ak-diagnostic-consent]').check();await back();await ask('Почему мой код выдаёт ошибку?');assert.match(await panel().textContent(),/нет подтверждённого сообщения/i);await p.keyboard.press('Escape');});
 await p.locator('#run').click();await p.evaluate(()=>fixture.state.lastRun);
 const before=await p.evaluate(()=>JSON.stringify(fixture.workspace.snapshot()));
 await check('Штатный run связывает настоящее сообщение g++ с текущим файлом',async()=>{await open();await privacy();await panel().locator('[data-ak-code-consent]').check();await panel().locator('[data-ak-diagnostic-consent]').check();await back();await ask('Почему мой код выдаёт ошибку?');const text=await panel().textContent();assert.match(text,/expected.*;/);assert.match(text,/Компилятор сообщил/);assert.doesNotMatch(text,/PRIVATE_OTHER_SOURCE|int main\(\)\{ return 0 \}/);assert.equal(await p.evaluate(()=>JSON.stringify(fixture.workspace.snapshot())),before);});
 await check('Показ диагностики на ширинах 320/390/1366 без переполнения',async()=>{for(const width of [320,390,1366]){await p.setViewportSize({width,height:900});assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.screenshot({path:path.join(out,'compiler-context-'+width+'.png')});}});
 await check('Отзыв compiler-согласия очищает факт и историю',async()=>{await privacy();await panel().locator('[data-ak-diagnostic-consent]').uncheck();await back();assert.equal(await panel().locator('[data-ak-message]').count(),0);await ask('Почему мой код выдаёт ошибку?');assert.doesNotMatch(await panel().textContent(),/expected/);await p.keyboard.press('Escape');});
 await check('Редактирование делает старое сообщение недоступным',async()=>{await p.evaluate(()=>{fixture.workspace.updateFile('main.cpp','int main(){return 0;}');fixture.editor.value='int main(){return 0;}';fixture.editor.setSelectionRange(0,21);});await open();await privacy();await panel().locator('[data-ak-code-consent]').check();await panel().locator('[data-ak-diagnostic-consent]').check();await back();await ask('Почему мой код выдаёт ошибку?');assert.match(await panel().textContent(),/нет подтверждённого сообщения/i);await p.keyboard.press('Escape');});
 await check('Название урока подтверждено индексом, задача и прогресс не выдуманы',async()=>{await p.evaluate(()=>fixture.state.route={course:'cpp',lesson:'cpp.lifetime-ownership'});await open();await ask('Что мы сейчас изучаем?');assert.match(await panel().textContent(),/Сейчас открыт урок/);assert.match(await panel().textContent(),/прогресса пока не подключены/);await privacy();await panel().locator('[data-ak-lesson-consent]').uncheck();await back();await ask('Что мы сейчас изучаем?');assert.match(await panel().textContent(),/Разрешите контекст урока/);});
 await check('Блокировка отзываeт окно и не сохраняет старый контекст',async()=>{await p.evaluate(()=>{fixture.state.identity=null;dispatchEvent(new Event('nexus:context-invalidated'));});await panel().waitFor({state:'detached'});assert.equal(await p.locator('[data-ak-message]').count(),0);});
 assert.deepEqual(errors,[]);assert.equal(requests.filter(x=>x.method!=='GET').length,0);
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await p.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{const browserVersion=browser.version();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',source:process.env.NEXUS_SOURCE_COMMIT||null,checks,errors,fatal,requests,compiler,browserVersion,realModel:false,nativeCompiler:true,browserCompilerExecution:false,physicalDevice:false,productionLive:false},null,2)+'\n');if(fatal)process.exitCode=1;}
