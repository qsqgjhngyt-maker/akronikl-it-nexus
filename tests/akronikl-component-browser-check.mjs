// Компонентная приёмка на loopback: реальный UI/Core/индекс/CodeWorkspace.
// Нет auth bootstrap, server proof, Cloud, backend, внешних запросов и production.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-ak02-component');
await mkdir(out,{recursive:true});
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akronikl: компонентный стенд</title><body><h1>Локальный стенд Akronikl</h1><div id="root"><button data-akronikl-open>Открыть Akronikl</button><section id="editorParent"><textarea id="editor"></textarea></section></div><script type="module">
import {createLazyAssistantBridge} from '/akronikl/context.js';
import {createCodeWorkspace} from '/sandbox/code-workspace.js';
const root=document.querySelector('#root'),editor=document.querySelector('#editor');
const content='before\\nSELECTED_COMPONENT\\nafter';
const make=()=>createCodeWorkspace({files:[{path:'main.cpp',content,languageId:'cpp'}]});
const state={identity:{id:'synthetic-local-component'},locale:'ru',courseLocale:'ru'};
editor.value=content;editor.setSelectionRange(7,25);editor.__nexusCodeStudio={workspace:make()};
const bridge=createLazyAssistantBridge({root,readIdentity:()=>state.identity,readRoute:()=>({view:'code-studio',project:'synthetic-local-component',hash:location.hash}),readLocale:()=>state.locale,readCourseLocale:()=>state.courseLocale,readEditor:()=>document.querySelector('#editor')});
window.fixture={root,editor,make,state,bridge};
</script></body></html>`;
let corrupt=false,hold=false,release=null,requests=[],errors=[],checks=[],fatal;
const mime=f=>({'.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(f)]||'text/html');
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});
 if(req.method!=='GET'){res.writeHead(403);res.end();return;}
 if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
 if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 try{
  const target=path.resolve(repo,decodeURIComponent(u.pathname.slice(1)));if(!target.startsWith(repo))throw Error('PATH');
  let body=await readFile(target);
  if(corrupt&&u.pathname.endsWith('/knowledge/manifest.json')){body=Buffer.from(body);body[200]^=1;}
  if(hold&&u.pathname.includes('/knowledge/core-index.'))await new Promise(r=>release=r);
  res.writeHead(200,{'content-type':mime(target),'cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const{chromium}=await(process.env.NEXUS_PLAYWRIGHT_MODULE?import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE)):import('playwright'));
const browser=await chromium.launch({headless:true,...(process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{}),args:['--disable-background-networking']});
const context=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
const panel=()=>p.locator('[data-akronikl-panel]');
const open=async()=>{await p.locator('[data-akronikl-open]').click();await panel().waitFor()};
const fresh=async()=>{await p.goto(origin);await p.waitForFunction(()=>!!window.fixture)};
const preview=async()=>{await open();await panel().locator('input[type=checkbox]').check();await panel().getByRole('button',{name:'Показать контекст',exact:true}).click();await panel().locator('pre').waitFor();assert.equal(await panel().locator('pre').textContent(),'SELECTED_COMPONENT')};
const search=async(q='указатели')=>{await panel().locator('input[type=search]').fill(q);await panel().locator('button[type=submit]').click();await panel().locator('article').first().waitFor()};
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name)};
try{
 await fresh();
 await check('До открытия отсутствуют запросы UI/Core/индекса',async()=>assert.equal(requests.filter(r=>/\/akronikl\/(ui|core|knowledge)\//.test(r.path)).length,0));
 await check('Реальное выделение: без соседних строк',preview);
 await check('Вложенное удаление редактора очищает показанный контекст',async()=>{await p.evaluate(()=>fixture.editor.parentElement.remove());await panel().waitFor({state:'detached'})});
 await fresh();
 await check('Повторный bind того же textarea закрывает старую панель',async()=>{await preview();await p.evaluate(()=>{fixture.editor.__nexusCodeStudio={workspace:fixture.make()};fixture.editor.parentElement.append(document.createElement('span'))});await panel().waitFor({state:'detached'})});
 await fresh();
 await check('Реальный RU индекс, происхождение и ширины 320/390/1366',async()=>{
  await open();await search();const card=panel().locator('article').first();await card.locator('summary').click();assert.match(await card.locator('details').textContent(),/courses\/cpp\//);
  for(const width of [320,390,1366]){await p.setViewportSize({width,height:900});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await panel().evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.screenshot({path:path.join(out,'search-'+width+'.png')})}
 });
 await check('Escape возвращает фокус; содержимое удалено',async()=>{await p.keyboard.press('Escape');await panel().waitFor({state:'detached'});assert.ok(await p.locator('[data-akronikl-open]').evaluate(n=>document.activeElement===n))});
 await check('Навигация очищает показанный фрагмент',async()=>{await preview();await p.evaluate(()=>location.hash='#synthetic-next');await panel().waitFor({state:'detached'})});
 await check('Событие завершения контекста закрывает панель',async()=>{await preview();await p.evaluate(()=>dispatchEvent(new Event('nexus:context-invalidated')));await panel().waitFor({state:'detached'})});
 await check('Изменение реального workspace закрывает панель',async()=>{await preview();await p.evaluate(()=>fixture.editor.__nexusCodeStudio.workspace.updateFile('main.cpp','changed'));await panel().waitFor({state:'detached'})});
 await fresh();
 await check('EN интерфейс и индекс без подмены языка',async()=>{await p.evaluate(()=>{fixture.state.locale='en';fixture.state.courseLocale='en'});await open();await search('pointers');assert.ok(await panel().getByRole('button',{name:'Show context',exact:true}).isVisible());assert.match(await panel().locator('article').first().textContent(),/pointer/i)});
 await fresh();
 await check('Повреждённый manifest не принимается; повторная загрузка работает',async()=>{corrupt=true;await open();await panel().locator('input[type=search]').fill('указатели');await panel().locator('button[type=submit]').click();await panel().getByRole('status').filter({hasText:'Действие не выполнено'}).waitFor();assert.equal(await panel().locator('article').count(),0);corrupt=false;await search()});
 await fresh();
 await check('Отмена не допускает поздние результаты',async()=>{hold=true;await open();await panel().locator('input[type=search]').fill('указатели');await panel().locator('button[type=submit]').click();const until=Date.now()+5000;while(!release&&Date.now()<until)await p.waitForTimeout(10);assert.ok(release);await panel().getByRole('button',{name:'Отменить',exact:true}).click();hold=false;release();release=null;await p.waitForTimeout(100);assert.equal(await panel().locator('article').count(),0);assert.match(await panel().getByRole('status').textContent(),/отменён/);await search()});
 await check('Нет сетевых записей и ошибок страницы',async()=>{assert.equal(requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(errors,[])});
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e);await p.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{})}
finally{release?.();const version=browser.version();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',checks,fatal,errors,browser:version,node:process.version,requests,scope:'isolated-component-with-real-core-and-workspace',productionLive:false,fullAppE2E:false,coldPwa:false,physicalDevice:false},null,2)+'\n');if(fatal)process.exitCode=1}
