// P4-Q real-model runner. Не скачивает веса, не публикует сайт, не пишет в проекты.
// Запускать только в отдельной QA-копии с подготовленным закреплённым runtime.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {readFile,mkdir,writeFile,realpath,stat,readdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LOCAL_MODEL} from '../../akronikl/tutor/local-model.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.resolve(process.env.NEXUS_QA_OUT||path.join(os.tmpdir(),'akronikl-p4q-'+Date.now()));await mkdir(out,{recursive:true});
const result={schemaVersion:1,startedAt:new Date().toISOString(),sourceSha:process.env.NEXUS_SOURCE_COMMIT||null,
 status:'NOT_RUN',sourceShaProvenByRunner:false,qualityAcceptance:false,independentReview:false,physicalDevice:false,productionLive:false,externalAi:false,cases:[],ui:[],errors:[]};
let browser,server,page,context;const network=[];
const save=async()=>writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
const shaFile=async f=>{const h=createHash('sha256');for await(const b of createReadStream(f))h.update(b);return h.digest('hex');};
try{
 // SHA окружения — метаданные запуска, не самостоятельное доказательство Git.
 // В отчёте дополнительно закрепляются реально выполненные файлы.
 result.executedSourceDigests={};
 async function fingerprint(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='runtime')await fingerprint(f);}else if(entry.isFile()&&/\.(?:js|mjs|json)$/u.test(f))result.executedSourceDigests[path.relative(root,f).replaceAll(path.sep,'/')]=await shaFile(f);}}
 await fingerprint(path.join(root,'akronikl'));await fingerprint(path.join(root,'tools/qa-akronikl'));
 const model=process.env.NEXUS_TUTOR_MODEL_FILE,driver=process.env.NEXUS_PLAYWRIGHT_MODULE;
 if(!model||!driver)throw Error('Укажите NEXUS_TUTOR_MODEL_FILE и NEXUS_PLAYWRIGHT_MODULE; автоматической загрузки нет.');
 const modelFile=await realpath(model),metadata=await stat(modelFile);assert.ok(metadata.isFile()&&metadata.size>=1024&&metadata.size<=LOCAL_MODEL.maxBytes);
 assert.equal(await shaFile(modelFile),LOCAL_MODEL.sha256,'Неверный GGUF: запуск запрещён');
 result.model={id:LOCAL_MODEL.id,sha256:LOCAL_MODEL.sha256,bytes:metadata.size,runtime:LOCAL_MODEL.runtime,runtimeVersion:LOCAL_MODEL.runtimeVersion};
 const manifest=JSON.parse(await readFile(path.join(root,'akronikl/tutor/runtime/RUNTIME_MANIFEST.json'),'utf8'));
 assert.equal(manifest.package,LOCAL_MODEL.runtime);assert.equal(manifest.version,LOCAL_MODEL.runtimeVersion);
 for(const f of manifest.files){const base=path.resolve(root,'akronikl/tutor/runtime');const target=path.resolve(base,f.file);assert.ok(target.startsWith(base+path.sep));assert.equal((await stat(target)).size,f.bytes);assert.equal(await shaFile(target),f.sha256);}
 result.runtimeManifestSha256=await shaFile(path.join(root,'akronikl/tutor/runtime/RUNTIME_MANIFEST.json'));
 const corpus=JSON.parse(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json'),'utf8'));
 assert.equal(corpus.cases.length,32);
 for(const c of corpus.cases)if(c.source)assert.equal(await shaFile(path.join(root,c.source.path)),c.source.sha256,c.id+' изменился источник');
 result.corpusSha256=await shaFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json'));
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akronikl P4-Q — изолированная проверка</title><body><main id="root"><button id="open">Akronikl</button></main><script type="module" src="/tools/qa-akronikl/browser-entry.mjs"></script></body></html>';
 server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);return;}
  if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const requested=decodeURIComponent(u.pathname);
  if(!['/akronikl/','/sandbox/','/core/','/tools/qa-akronikl/','/tests/fixtures/'].some(p=>requested.startsWith(p)))throw Error('PATH_DENIED');
  const target=await realpath(path.resolve(root,requested.slice(1)));if(!target.startsWith(root))throw Error('PATH_DENIED');
  const relative='/'+path.relative(root,target).replaceAll(path.sep,'/');
  if(!['/akronikl/','/sandbox/','/core/','/tools/qa-akronikl/','/tests/fixtures/'].some(p=>relative.startsWith(p)))throw Error('PATH_DENIED');
  const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'}[path.extname(target)];if(!mime)throw Error('TYPE_DENIED');
  const data=await readFile(target);res.writeHead(200,{'content-type':mime,'cache-control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(pathToFileURL(driver));browser=await chromium.launch({headless:true,...(process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{}),args:['--disable-background-networking']});
 result.browser=browser.version();result.node=process.version;result.platform=process.platform;
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900}});
 await context.route('**/*',route=>{const q=route.request(),u=new URL(q.url());const allowed=u.origin===origin&&q.method()==='GET';network.push({path:allowed?u.pathname:'BLOCKED_EXTERNAL',method:q.method(),allowed});return allowed?route.continue():route.abort();});
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>result.errors.push(error.message.slice(0,1000)));
 await page.goto(origin);await page.waitForFunction(()=>!!window.qa);
 await page.locator('#open').click();await page.locator('[data-akronikl-settings]').click();await page.getByRole('button',{name:'Модель',exact:true}).click();
 await page.locator('[data-akronikl-model-profile]').selectOption('local-cpu');await page.locator('[data-akronikl-model-file]').setInputFiles(modelFile);
 await page.getByRole('button',{name:'Подключить выбранную модель',exact:true}).click();await page.waitForFunction(()=>window.qa?.loaded,{},{timeout:180000});
 await page.waitForFunction(()=>document.querySelector('[data-connection-phase="connected"]'),{},{timeout:15000});
 result.environment=await page.evaluate(()=>qa.environment());result.scope={real:'UI/Core/Tutor/Wllama/weights/index',fixture:'identity/route/consent synthetic QA host; g++ diagnostics from pinned corpus',notTested:'production Account, Cloud Sync, cold model persistence, physical devices, hardware GPU'};await save();
 await page.getByRole('button',{name:'Вернуться к разговору',exact:true}).click();
 async function askUi(text){
  const n=await page.locator('[data-ak-message="assistant"]').count();
  await page.locator('[data-akronikl-message]').fill(text);
  const started=performance.now();await page.locator('[data-akronikl-send]').click();
  await page.waitForFunction(count=>document.querySelectorAll('[data-ak-message="assistant"]').length>count&&document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false',n,{timeout:145000});
  const elapsedMs=performance.now()-started;
  const drained=await page.evaluate(()=>qa.settle());
  const row={question:text,visibleResponseMs:elapsedMs,includesPlaywright:true,text:await page.locator('[data-ak-message="assistant"]').last().innerText(),metrics:await page.evaluate(()=>qa.measurements()),metricsCapturedAfterSettle:true,drained};
  result.ui.push(row);await save();if(!row.drained)throw Error('Не подтверждено завершение inference после UI-запроса');
 }
 await askUi(corpus.cases[0].prompt);
 await page.screenshot({path:path.join(out,'real-model-desktop.png')});
 await context.setOffline(true);await askUi('Объясни проще');await context.setOffline(false);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'real-model-390.png')});
 for(const item of corpus.cases){
  const row=await page.evaluate(c=>qa.runCase(c),item);result.cases.push(row);await save();
  console.log(JSON.stringify({id:row.id,status:row.response.status,generated:row.response.generated,ms:Math.round(row.callerElapsedMs)}));
  if(!row.drained)throw Error('Модель не освободила предыдущий запрос; следующие случаи NOT_RUN');
 }
 const assistantCount=await page.locator('[data-ak-message="assistant"]').count();
 await page.locator('[data-akronikl-message]').fill(corpus.cases[0].prompt);await page.locator('[data-akronikl-send]').click();
 await page.waitForFunction(()=>qa.pending,{},{timeout:10000});
 const cancelStart=performance.now();await page.locator('[data-akronikl-stop]').click();
 await page.waitForFunction(()=>document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false');
 const uiCancelMs=performance.now()-cancelStart,drained=await page.evaluate(()=>qa.settle());
 await page.waitForTimeout(100);
 result.cancellation={uiCancelMs,includesPlaywright:true,drained,lateAssistantMessages:(await page.locator('[data-ak-message="assistant"]').count())-assistantCount};
 assert.equal(result.cancellation.lateAssistantMessages,0);assert.equal(drained,true);
 result.release=await page.evaluate(()=>qa.close());result.status='COMPLETED_PENDING_HUMAN_REVIEW';
}catch(error){result.status='BLOCKED_OR_FAILED';result.failure={message:error.message,stack:error.stack};console.error(error.message);if(page)await page.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});process.exitCode=1;}
finally{
 result.network=network;result.finishedAt=new Date().toISOString();result.executedCases=result.cases.length;
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
 await save();console.log('EVIDENCE '+out);
}
