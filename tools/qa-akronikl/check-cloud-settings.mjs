// Browser QA: explicit synthetic contracts OR live Qwen. Never substitutes a fixture in live mode.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {CLOUD_PROVIDERS} from '../../akronikl/connections/cloud-catalog.js';
import {createCloudAdapter} from './cloud-adapters.mjs';
import {createCloudVault} from './cloud-vault.mjs';
import {startCloudSettingsServer} from './cloud-settings-gateway.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.resolve(process.env.NEXUS_QA_OUT),privateDir=path.resolve(process.env.NEXUS_QA_PRIVATE_DIR);
if(!process.env.NEXUS_QA_OUT||!process.env.NEXUS_QA_PRIVATE_DIR||privateDir.startsWith(out))throw Error('QA_PATHS_REQUIRED');
await mkdir(out,{recursive:true});try{await access(path.join(out,'RESULT.json'));throw Error('Refuse overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const synthetic=process.env.NEXUS_CLOUD_TEST_TRANSPORT==='synthetic-ui-only';
if(process.env.NEXUS_CLOUD_TEST_TRANSPORT&&!synthetic)throw Error('Invalid transport');
let secret='',browser,context,page,server,blockNext=false;
const result={sourceSha:process.env.NEXUS_SOURCE_COMMIT,sourceShaProvenByRunner:false,startedAt:new Date().toISOString(),mode:synthetic?'SYNTHETIC_NO_REAL_AI':'LIVE_QWEN',realAI:!synthetic,qualityAcceptance:false,production:false,remoteComputeStoppedProven:false,checks:[],ui:[],serverOutcomes:[],errors:[],network:[]};
const save=()=>writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
const vaultFile=path.join(privateDir,synthetic?'synthetic.dpapi':'live.dpapi'),vault=()=>createCloudVault({file:vaultFile});
const json=b=>new Response(JSON.stringify(b),{headers:{'content-type':'application/json'}});
async function start(){return startCloudSettingsServer({root,vault:vault(),onOutcome:x=>result.serverOutcomes.push(x),...(synthetic?{createAdapter:options=>createCloudAdapter({...options,fetchUpstream:async(url,init)=>{
 if(blockNext&&!String(url).includes('/oauth')){blockNext=false;await new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('CLOUD_REQUEST_CANCELLED')),{once:true}));}
 if(String(url).includes('/oauth'))return json({access_token:'SYNTHETIC_ACCESS_TOKEN_123456789',expires_at:Date.now()+1800000});
 const id=options.selection.providerId,raw=JSON.stringify({answer:'SYNTHETIC_PROVIDER_'+id+' — not a real AI answer.',citations:['S1']});
 return json(id==='openai'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:raw}]}]}:id==='anthropic'?{stop_reason:'end_turn',content:[{type:'text',text:raw}]}:id==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:raw}]}}]}:{choices:[{finish_reason:'stop',message:{content:raw}}]});
 }})}:{})});}
async function openSettings(){await page.locator('[data-akronikl-settings]').click();await page.getByRole('button',{name:'Модель',exact:true}).click();}
async function openCloud(){await page.goto(server.origin);await page.waitForFunction(()=>!!window.qaSettings);await page.locator('#open').click();await openSettings();await page.locator('[data-akronikl-model-profile]').selectOption('external');}
async function connected(){await page.locator('[data-ak-cloud-connect]').click();await page.waitForFunction(()=>document.querySelector('[data-connection-phase="connected"]'),null,{timeout:60000});assert.equal(await page.locator('[data-ak-cloud-key]').inputValue(),'');}
async function ask(question){
 const before=await page.locator('[data-ak-message="assistant"]').count(),start=performance.now();await page.locator('[data-akronikl-message]').fill(question);await page.locator('[data-akronikl-send]').click();
 await page.waitForFunction(n=>document.querySelectorAll('[data-ak-message="assistant"]').length>n&&document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false',before,{timeout:65000});
 const row={question,text:await page.locator('[data-ak-message="assistant"]').last().innerText(),visibleMs:performance.now()-start,generated:await page.locator('[data-ak-message="assistant"]').last().getAttribute('data-tutor-generated')==='true',realAI:!synthetic,metrics:await page.evaluate(()=>qaSettings.metrics())};result.ui.push(row);await save();assert.equal(row.generated,true);return row;
}
try{
 result.executedDigests={};async function fingerprint(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='runtime')await fingerprint(f);}else if(/\.(js|mjs|json)$/u.test(e.name))result.executedDigests[path.relative(root,f).replaceAll(path.sep,'/')]=createHash('sha256').update(await readFile(f)).digest('hex');}}await fingerprint(path.join(root,'akronikl'));await fingerprint(path.join(root,'tools/qa-akronikl'));
 // Existing user-authorized secret is read ONLY by automation, then typed into the UI.
 // The application/server have no credential-file configuration or fallback.
 secret=synthetic?'SYNTHETIC_UI_API_KEY_123456789':(await readFile(process.env.NEXUS_QWEN_KEY_FILE,'utf8')).replace(/^\uFEFF/u,'').trim();
 server=await start();const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});result.browser=browser.version();result.node=process.version;
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:1366,height:900}});await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url()),allowed=u.origin===server.origin;result.network.push({method:r.method(),path:allowed?u.pathname:'BLOCKED_EXTERNAL',allowed});return allowed?route.continue():route.abort();});
 page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>result.errors.push(String(e.message).replaceAll(secret,'[REDACTED]').slice(0,1000)));
 await openCloud();assert.equal(server.status().connections,0);assert.equal(await page.locator('[data-ak-cloud-provider] option').count(),8);assert.equal(await page.locator('[data-ak-cloud-key]').getAttribute('type'),'password');assert.equal(await page.locator('[data-ak-cloud-connect]').isDisabled(),true);
 for(const p of synthetic?CLOUD_PROVIDERS:[CLOUD_PROVIDERS[0]]){
  await page.locator('[data-ak-cloud-provider]').selectOption(p.id);await page.locator('[data-ak-cloud-key]').fill(secret);const start=performance.now();await connected();result.checks.push({provider:p.id,model:await page.locator('[data-ak-cloud-model]').inputValue(),connectionProbeMs:performance.now()-start,connected:true,realAI:!synthetic,keyCleared:true});
  if(p.id==='qwen')await page.screenshot({path:path.join(out,'settings-connected.png')});await page.getByRole('button',{name:'Вернуться к разговору',exact:true}).click();await ask('Что происходит с локальной переменной при выходе из блока?');await openSettings();
 }
 // Restore Qwen before cancellation/restart; no key is filled again.
 await page.locator('[data-ak-cloud-provider]').selectOption('qwen');
 if(!await page.locator('[data-connection-phase="connected"]').count()){await page.waitForFunction(()=>document.querySelector('[data-ak-cloud-connect]')?.disabled===false);await connected();}
 const encrypted=await readFile(vaultFile);assert.equal(encrypted.includes(Buffer.from(secret)),false);result.encryptedStorage={protection:'Windows DPAPI CurrentUser',bytes:encrypted.length,plaintextKeyFound:false,manualSecretFileRequiredByApplication:false};
 await page.getByRole('button',{name:'Вернуться к разговору',exact:true}).click();
 await ask('Объясни проще и приведи короткий пример.');await page.screenshot({path:path.join(out,'chat-desktop.png')});
 const before=await page.locator('[data-ak-message="assistant"]').count();if(synthetic)blockNext=true;await page.locator('[data-akronikl-message]').fill('Объясни время жизни локального объекта в C++.');await page.locator('[data-akronikl-send]').click();await page.waitForFunction(()=>qaSettings.pending);await page.waitForTimeout(200);const cancelStart=performance.now();await page.locator('[data-akronikl-stop]').click();await page.waitForFunction(()=>!qaSettings.pending&&document.querySelector('[data-akronikl-send]')?.closest('form')?.getAttribute('aria-busy')==='false');
 for(let i=0;i<100&&server.status().pending;i++)await page.waitForTimeout(20);await page.waitForTimeout(100);result.cancellation={drainMs:performance.now()-cancelStart,lateAssistantMessages:await page.locator('[data-ak-message="assistant"]').count()-before,gateway:server.status(),remoteComputeStoppedProven:false};assert.equal(result.cancellation.gateway.pending,0);assert.equal(result.cancellation.lateAssistantMessages,0);await ask('Что означает время жизни объекта?');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'chat-mobile.png')});await openSettings();await page.screenshot({path:path.join(out,'settings-mobile.png')});
 result.mobile={width:390,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};assert.equal(result.mobile.overflow,false);
 // New process, same encrypted file and browser profile, no key re-entry.
 await page.evaluate(()=>qaSettings.close());await server.close();server=await start();await openCloud();await page.waitForFunction(()=>document.querySelector('[data-ak-cloud-key]')?.placeholder.includes('сохранён'));assert.equal(await page.locator('[data-ak-cloud-key]').inputValue(),'');await connected();result.restart={restored:true,keyEnteredAgain:false,realAI:!synthetic};
 const isolated=await browser.newContext({serviceWorkers:'block'}),other=await isolated.newPage();await other.goto(server.origin);const otherSaved=await other.evaluate(async()=>await(await fetch('/api/akronikl/cloud/saved')).json());assert.deepEqual(otherSaved.connections,[]);await isolated.close();result.browserIsolation={otherBrowserHasSavedConnections:false};
 await page.locator('[data-ak-cloud-forget]').click();await page.waitForFunction(()=>document.querySelector('[data-ak-cloud-forget]')?.hidden&&document.querySelector('[data-ak-cloud-connect]')?.disabled);assert.equal(server.status().sessions,0);result.deletion={savedKeyRemoved:true,activeConnectionRevoked:true};
 result.browserOutcomes=await page.evaluate(()=>qaSettings.outcomes());assert.equal(JSON.stringify(result).includes(secret),false);assert.equal(result.errors.length,0);result.status=synthetic?'SYNTHETIC_CONTRACT_UI_PASS_NO_REAL_AI':'LIVE_QWEN_SETTINGS_PASS_PENDING_CONTENT_REVIEW';
}catch(e){result.status='FAIL';result.failure=String(e.message).replaceAll(secret||'UNSET_SECRET_SENTINEL','[REDACTED]').slice(0,4000);process.exitCode=1;if(page){await page.locator('[data-ak-cloud-key]').fill('').catch(()=>{});await page.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}}
finally{result.gatewayFinal=server?.status();await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await server?.close().catch(()=>{});result.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:result.status,realAI:result.realAI,checks:result.checks.length,ui:result.ui.length,out}));}
