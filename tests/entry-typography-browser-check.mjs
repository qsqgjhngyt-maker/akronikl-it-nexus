// Реальная раскладка Chrome; синтетический локальный сервер, без входа и внешней сети.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const source=fileURLToPath(new URL('../',import.meta.url));
const root=process.env.NEXUS_ENTRY_PUBLIC_DIR||path.join(source,'server-access/public');
const out=process.env.NEXUS_TYPOGRAPHY_EVIDENCE;
await mkdir(out,{recursive:false});
const expected=['От первого «почему» до уверенного «могу».','Идеи заслуживают собственного кода.','Больше измерений. Больше возможностей.'];
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const name=pathname==='/'?'entry.html':pathname==='/account/entry/entry.css'?'entry.css':null;
 if(!name){res.writeHead(404,{'cache-control':'no-store'});return res.end()}
 res.writeHead(200,{'content-type':name.endsWith('.css')?'text/css':'text/html; charset=utf-8','cache-control':'no-store'});res.end(await readFile(path.join(root,name)));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,checks=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.NEXUS_CHROME_PATH});
try {
 for(const width of [360,390,430,760,761,1280]){
  const context=await browser.newContext({viewport:{width,height:1000},javaScriptEnabled:false});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
  const actual=await page.locator('.possibility h2').allInnerTexts();
  const normalized=actual.map(t=>t.replace(/\s+/g,' ').trim());
  const hiddenBreaks=await page.locator('br').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display==='none').map(n=>({before:n.previousSibling?.textContent||'',after:n.nextSibling?.textContent||''})).filter(n=>/\S$/.test(n.before)&&/^\S/.test(n.after)));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await page.screenshot({path:path.join(out,'entry-'+width+'.png'),fullPage:true});
  checks.push({width,status:JSON.stringify(normalized)===JSON.stringify(expected)&&!hiddenBreaks.length&&!overflow?'PASS':'FAIL',text:normalized,hiddenBreaks,overflow});
  await context.close();
 }
 const report={status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',engine:'native Chrome; not physical device',checks};
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));assert.equal(report.status,'PASS');
} finally {await browser.close();await new Promise(r=>server.close(r))}
