import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launchOnecBrowser} from './onec-browser-engine.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const out=path.resolve(process.env.ONEC_EVIDENCE||'onec-browser-evidence');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://fixture'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep))throw Error('PATH');
 const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/plain; charset=utf-8'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const pw=await import(process.env.NEXUS_PLAYWRIGHT_MODULE?pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE).href:'playwright');
const browser=await launchOnecBrowser(pw),checks=[],errors=[];
try{
 for(const width of [1366,390,375,320])for(const locale of ['ru','en']){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/courses/onec-education/index.html#course=onec&lesson=onec.p12.topic-4&locale='+locale+'&guide=laboratory');
  const help=page.locator('[data-onec-lab-help][open]');await help.waitFor();await help.scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(await help.locator('.onec-lab-step').count(),8);
  const prepared=help.locator('[data-onec-prepared-configuration]');assert.equal(await prepared.count(),1);assert.match(await prepared.getAttribute('href'),/native\/downloads\/NexusTrainingServiceDeskReportsV2[.]cf$/);assert.equal(await prepared.getAttribute('download'),'NexusTrainingServiceDeskReportsV2.cf');
  if(width===1366&&locale==='ru'){const waiting=page.waitForEvent('download');await prepared.click();const download=await waiting,target=path.join(out,'NexusTrainingServiceDeskReportsV2.cf');await download.saveAs(target);const m=JSON.parse(await fs.readFile(path.join(root,'courses/onec-education/native/downloads/REPORT_CONFIGURATION_MANIFEST.json')));assert.equal(createHash('sha256').update(await fs.readFile(target)).digest('hex'),m.sha256);}
  assert.equal(await help.locator(':scope > p a[href="https://online.1c.ru/catalog/free/28765768/"]').count(),1);
  assert.equal(await help.locator('.onec-lab-advanced[open]').count(),0);await help.locator('.onec-lab-advanced > summary').click();assert.equal(await help.locator('.onec-lab-advanced[open]').count(),1);assert.equal(await help.locator('a[href*="learn.microsoft.com"]').count(),1);
  await help.locator('.onec-lab-isolation > summary').click();assert.equal(await help.locator('.onec-lab-isolation[open]').count(),1);
  assert.equal(await help.locator('.onec-lab-isolation li').count(),5);
  await help.locator('.onec-lab-assessment > summary').click();assert.equal(await help.locator('.onec-lab-assessment[open] li').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,locale+' '+width+' expanded help overflow');
  await help.locator('.onec-lab-isolation').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`S12_EXPANDED_HELP_${locale}_${width}.png`)});
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  checks.push({locale,width,status:'PASS',expandedGuide:true,expandedSandboxHelp:true,storageUnchanged:true});await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'LAB_HELP_BROWSER_RESULT.json'),JSON.stringify({status:'AUTOMATED PASS',checks,errors,physicalDevices:false,official1CExecuted:false},null,2)+'\n');console.log('PASS Понятная инструкция: RU/EN, 4 ширины, раскрытые шаги и Sandbox, ссылки и сохранность storage');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
