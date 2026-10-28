import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startQwenQaServer,readQwenKey} from './qwen-gateway.mjs';
import {QWEN_UPSTREAM} from './qwen-upstream.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.resolve(process.env.NEXUS_QA_OUT||path.join(root,'cloud-qa-evidence'));
await mkdir(out,{recursive:true});try{await access(path.join(out,'RESULT.json'));throw Error('Refuse to overwrite RESULT');}catch(e){if(e.code!=='ENOENT')throw e;}
const synthetic=process.env.NEXUS_CLOUD_TEST_TRANSPORT==='synthetic-ui-only';
if(process.env.NEXUS_CLOUD_TEST_TRANSPORT&&!synthetic)throw Error('Invalid test mode');
const result={schemaVersion:1,sourceSha:process.env.NEXUS_SOURCE_COMMIT??null,sourceShaProvenByRunner:false,startedAt:new Date().toISOString(),status:'NOT_RUN',mode:synthetic?'synthetic-ui-only':'live-qwen-cloud',realModel:!synthetic,externalAi:!synthetic,qualityAcceptance:false,independentReview:false,productionLive:false,physicalDevice:false,model:QWEN_UPSTREAM,ui:[],cases:[],errors:[],network:[],serverOutcomes:[]};
const save=()=>writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
let server,browser,context,page;
try{
 result.executedSourceDigests={};async function fingerprint(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='runtime')await fingerprint(f);}else if(/\.(?:js|mjs|json)$/u.test(e.name))result.executedSourceDigests[path.relative(root,f).replaceAll(path.sep,'/')]=createHash('sha256').update(await readFile(f)).digest('hex');}}await fingerprint(path.join(root,'akronikl'));await fingerprint(path.join(root,'tools/qa-akronikl'));
 let count=0;const fake=synthetic?async(data,{signal})=>{count++;if(count===2)await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('CLOUD_REQUEST_CANCELLED')),{once:true}));const response={answer:'SYNTHETIC_BROKER_SENTINEL — not a real model answer.',citations:['S1']};return {response,rawFinal:JSON.stringify(response),measurements:{totalMs:0}};}:null;
 // Secret file is read only inside this server process, never logged or copied.
 const apiKey=synthetic?null:await readQwenKey(process.env.NEXUS_QWEN_KEY_FILE);
 server=await startQwenQaServer({root,apiKey,upstream:fake,onOutcome:x=>result.serverOutcomes.push(x)});
 const driver=process.env.NEXUS_PLAYWRIGHT_MODULE;if(!driver)throw Error('PLAYWRIGHT_PATH_REQUIRED');
 const {chromium}=await import(pathToFileURL(driver));browser=await chromium.launch({headless:true,...(process.env.NEXUS_CHROME_PATH?{executablePath:process.env.NEXUS_CHROME_PATH}:{}),args:['--disable-background-networking']});
 result.browser=browser.version();result.node=process.version;context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900}});
 await context.route('**/*',route=>{const q=route.request(),u=new URL(q.url()),allowed=u.origin===server.origin&&(q.method()==='GET'||q.method()==='POST'&&u.pathname==='/api/akronikl/qwen');result.network.push({path:allowed?u.pathname:'BLOCKED_EXTERNAL',method:q.method(),allowed});return allowed?route.continue():route.abort();});
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>result.errors.push(e.message.slice(0,1000)));
 await page.goto(server.origin);await page.waitForFunction(()=>!!window.qa);assert.equal(server.status().requests,0);
 await page.locator('#open').click();await page.locator('[data-akronikl-settings]').click();await page.getByRole('button',{name:'Модель',exact:true}).click();
 assert.equal(await page.locator('[data-akronikl-model-profile] option[value="external"]').isEnabled(),true);
 await page.locator('[data-akronikl-model-profile]').selectOption('external');assert.equal(server.status().requests,0);
 await page.getByRole('button',{name:'Подключить выбранную модель',exact:true}).click();await page.waitForFunction(()=>qa.loaded&&document.querySelector('[data-connection-phase="connected"]'));
 assert.equal(server.status().requests,0);await page.screenshot({path:path.join(out,'cloud-connection.png')});
 await page.getByRole('button',{name:'Вернуться к разговору',exact:true}).click();
 const corpus=await page.evaluate(()=>qa.corpus);result.corpusSha256=createHash('sha256').update(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json'))).digest('hex');
 async function askUi(question){
  const before=await page.locator('[data-ak-message="assistant"]').count(),started=performance.now(),beforeCalls=await page.evaluate(()=>qa.calls);
  await page.locator('[data-akronikl-message]').fill(question);await page.locator('[data-akronikl-send]').click();await page.waitForFunction(n=>document.querySelectorAll('[data-ak-message="assistant"]').length>n&&document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false',before,{timeout:130000});
  const row={question,text:await page.locator('[data-ak-message="assistant"]').last().innerText(),visibleResponseMs:performance.now()-started,includesPlaywright:true,generated:await page.locator('[data-ak-message="assistant"]').last().getAttribute('data-tutor-generated')==='true',realModel:!synthetic,drained:await page.evaluate(()=>qa.settle()),providerOutcomes:await page.evaluate(n=>qa.outcomes().slice(n),beforeCalls),metrics:await page.evaluate(()=>qa.measurements())};result.ui.push(row);await save();assert.equal(row.drained,true);
 }
 async function cancelUi(){
  const before=await page.locator('[data-ak-message="assistant"]').count();await page.locator('[data-akronikl-message]').fill(corpus.cases[0].prompt);await page.locator('[data-akronikl-send]').click();await page.waitForFunction(()=>qa.pending);await page.waitForTimeout(250);
  const start=performance.now();await page.locator('[data-akronikl-stop]').click();await page.waitForFunction(()=>document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false');const uiMs=performance.now()-start,drained=await page.evaluate(()=>qa.settle());
  for(let i=0;i<100&&server.status().active;i++)await new Promise(r=>setTimeout(r,20));await page.waitForTimeout(100);
  result.cancellation={uiMs,transportDrainMs:performance.now()-start,drained,localGateway:server.status(),lateAssistantMessages:await page.locator('[data-ak-message="assistant"]').count()-before,remoteComputeStoppedProven:false,scope:'client/broker HTTP abort only; provider compute cancellation is not proven'};await save();assert.equal(drained,true);assert.equal(result.cancellation.localGateway.active,0);assert.equal(result.cancellation.lateAssistantMessages,0);
 }
 await askUi(corpus.cases[0].prompt);await page.screenshot({path:path.join(out,'cloud-desktop.png')});
 if(synthetic){assert.ok(result.ui[0].text.includes('SYNTHETIC_BROKER_SENTINEL'));await cancelUi();result.notRun=corpus.cases.map(c=>c.id);}
 else{
  await askUi('Объясни проще');await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'cloud-390.png')});
  for(const item of corpus.cases){const row=await page.evaluate(c=>qa.runCase(c),item);result.cases.push(row);await save();console.log(JSON.stringify({id:row.id,status:row.response.status,generated:row.response.generated,ms:Math.round(row.callerElapsedMs)}));assert.equal(row.drained,true);}
  await cancelUi();result.cancellation.recovery=await page.evaluate(c=>qa.runCase(c),corpus.cases[0]);await save();assert.equal(result.cancellation.recovery.response.generated,true);
 }
 result.providerOutcomes=await page.evaluate(()=>qa.outcomes());result.rawModelOutcomes=await page.evaluate(()=>qa.rawOutcomes());result.release=await page.evaluate(()=>qa.close());result.status=synthetic?'SYNTHETIC_INTEGRATION_PASS_NO_REAL_AI':'COMPLETED_PENDING_REVIEW';
}catch(e){result.status='BLOCKED_OR_FAILED';result.failure={code:/^(?:CLOUD_[A-Z_0-9]+|PLAYWRIGHT_PATH_REQUIRED)$/u.test(e.message)?e.message:'QA_CHECK_FAILED',detail:String(e.message).replace(/sk-[A-Za-z0-9_-]{8,}/gu,'[REDACTED]').slice(0,4000)};process.exitCode=1;if(page)await page.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{result.gatewayFinal=server?.status();await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await server?.close().catch(()=>{});result.finishedAt=new Date().toISOString();result.executedCases=result.cases.length;result.notRun??=result.status==='COMPLETED_PENDING_REVIEW'?[]:JSON.parse(await readFile(path.join(root,'tests/fixtures/akronikl-tutor-quality-v1.json'),'utf8')).cases.filter(c=>!result.cases.some(x=>x.id===c.id)).map(c=>c.id);await save();console.log(JSON.stringify({status:result.status,out,source:result.sourceSha,realModel:result.realModel}));}
