// Exploratory real Qwen probe. Success means collected results, NOT accepted personality.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const repo=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.resolve(process.env.NEXUS_AKRONIKL_EVIDENCE||'evidence-personality-model');await mkdir(out,{recursive:true});
const model=process.env.NEXUS_TUTOR_MODEL_FILE,locale=process.env.AK_PERSONALITY_LOCALE||'ru';assert.ok(model);assert.ok(['ru','en'].includes(locale));
const corpusBytes=await readFile(path.join(repo,'tests/fixtures/akronikl-personality-quality-v1.json')),cases=JSON.parse(corpusBytes).cases.filter(c=>c.locale===locale);
const records=[],requests=[],errors=[],blocked=[];let fatal=null;
const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/app.css"><body style="background:#07111f"><main id="root"><button id="open">Akronikl</button><textarea id="editor"></textarea></main><script type="module" src="/tests/helpers/akronikl-final-quality-page.mjs"></script></body></html>';
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');requests.push({path:u.pathname,method:req.method});if(req.method!=='GET')throw Error('WRITE');if(u.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const target=path.resolve(repo,decodeURIComponent(u.pathname.slice(1)));if(!target.startsWith(repo+path.sep))throw Error('PATH');const b=await readFile(target);res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.css':'text/css'}[path.extname(target)]||'application/octet-stream')});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH,args:['--disable-background-networking']});
const ctx=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();blocked.push(new URL(r.request().url()).origin);return r.abort();});
async function flush(){await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'INFRASTRUCTURE_FAILURE':'MEASURED_NOT_QUALITY_ACCEPTED',source:process.env.NEXUS_SOURCE_COMMIT,locale,corpusSha256:createHash('sha256').update(corpusBytes).digest('hex'),records,fatal,requests,errors,blocked,browser:browser.version(),node:process.version,realModel:true,syntheticHost:true,physicalDevice:false,qualityAcceptance:false,independentReview:false},null,2)+'\n');}
async function send(p,message){await p.evaluate(()=>qualityFixture.begin());await p.locator('[data-akronikl-message]').fill(message);await p.locator('[data-akronikl-send]').click();await p.locator('.ak-composer[aria-busy=false]').waitFor({timeout:135000});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return p.evaluate(()=>qualityFixture.capture());}
try{
 for(const c of cases){const rec={caseId:c.id,prompt:c.prompt,humor:c.humor,status:'NOT_RUN'};records.push(rec);let p;
  try{
   p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push({id:c.id,message:e.message}));await p.goto(origin);await p.waitForFunction(()=>typeof prepareQualityCase==='function');await p.evaluate(c=>prepareQualityCase(c),c);
   await p.locator('[data-akronikl-settings]').click();await p.locator('[aria-controls="ak-settings-personality"]').click();const range=p.locator('[data-ak-personality=humor]');await range.focus();await range.press(c.humor===0?'Home':'End');
   await p.locator('[aria-controls="ak-settings-model"]').click();await p.locator('[data-akronikl-model-profile]').selectOption('local-cpu');await p.locator('[data-akronikl-model-file]').setInputFiles(model);
   await p.getByRole('button',{name:locale==='ru'?'Подключить выбранную модель':'Connect selected model',exact:true}).click();await p.locator('[data-connection-phase=connected]').waitFor({timeout:180000});await p.locator('.ak-back').click();
   rec.reply=await send(p,c.prompt);rec.status='MEASURED';
   if(c.id==='chat-'+locale+'-100'){
    await ctx.setOffline(true);const before=requests.length;rec.offlineFollowup=await send(p,locale==='ru'?'А что ещё?':'What else?');rec.offlineFollowup.networkDelta=requests.length-before;await ctx.setOffline(false);
    await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(out,'conversation-'+locale+'-390.png')});await p.setViewportSize({width:1366,height:900});
    await p.evaluate(()=>qualityFixture.begin());await p.locator('[data-akronikl-message]').fill(c.prompt);await p.locator('[data-akronikl-send]').click();await p.waitForTimeout(600);
    await p.locator('[data-akronikl-settings]').click();await p.locator('[aria-controls="ak-settings-personality"]').click();const start=performance.now();await p.locator('[data-ak-personality-profile]').selectOption('engineer');await p.locator('.ak-composer[aria-busy=false]').waitFor();const cancelMs=performance.now()-start;
    let settled=false;try{await p.waitForFunction(()=>qualityFixture.pending===0,null,{timeout:15000});settled=true;}catch{}
    const count=await p.locator('[data-tutor-generated=true]').count();await p.waitForTimeout(1000);rec.styleChangeCancellation={uiCancelMs:cancelMs,runtimeSettledWithin15s:settled,generatedCountAtStop:count,generatedCountAfter1s:await p.locator('[data-tutor-generated=true]').count(),capture:await p.evaluate(()=>qualityFixture.capture())};
   }
  }catch(e){rec.status='ERROR';rec.error=String(e.message).slice(0,1200);if(p)await p.screenshot({path:path.join(out,'FAILURE-'+c.id+'.png')}).catch(()=>{});}
  finally{if(p)await p.close();await ctx.setOffline(false);await flush();console.log(rec.caseId,rec.status,rec.reply?.generated);}
 }
}catch(e){fatal=String(e.message);}
finally{await flush();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));if(fatal)process.exitCode=1;}
