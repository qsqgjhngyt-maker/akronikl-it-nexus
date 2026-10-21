// Нативный Chrome: metadata установки на странице входа. Отдельный профиль; не физический Android/WebAPK.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
const {chromium}=await import(pathToFileURL(process.env.NEXUS_PLAYWRIGHT_MODULE));
const source=fileURLToPath(new URL('../',import.meta.url)),frontend=process.env.NEXUS_FRONTEND_DIR;
const html=await readFile(process.env.NEXUS_ENTRY_HTML||path.join(source,'server-access/public/entry.html'));
const manifest=await readFile(path.join(frontend,'manifest.webmanifest')),icons=[],requests=[];
const mime=n=>n.endsWith('.js')?'text/javascript':n.endsWith('.css')?'text/css':n.endsWith('.json')?'application/json':n.endsWith('.webmanifest')?'application/manifest+json':n.endsWith('.png')?'image/png':n.endsWith('.svg')?'image/svg+xml':n.endsWith('.md')?'text/markdown':'text/html';
const server=http.createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://local.invalid').pathname;requests.push(name);
 if(name==='/'||name==='/account/entry/'){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store',vary:'*'});return res.end(html)}
 if(name.startsWith('/api/')){res.writeHead(401,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"error":{"code":"SYNTHETIC_NO_SESSION"}}')}
 if(name.startsWith('/account/entry/')){const file=path.basename(name);if(!['entry.js','entry.css','galaxy.js','oauth-client.js'].includes(file))throw Error();res.writeHead(200,{'content-type':mime(file),'cache-control':'no-store',vary:'*'});return res.end(await readFile(path.join(source,'server-access/image/public',file)))}
 const target=path.resolve(frontend,name.slice(1));if(!target.startsWith(path.resolve(frontend)+path.sep))throw Error();const data=await readFile(target);res.writeHead(200,{'content-type':mime(name),'cache-control':name==='/service-worker.js'?'no-store':'public,max-age=0'});res.end(data);
 }catch{res.writeHead(404);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let browser,failure,metadata,installability;
try{
 browser=await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(),'nx-install-')),{executablePath:process.env.NEXUS_CHROME_PATH,headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});const context=browser,page=await context.newPage(),cdp=await context.newCDPSession(page);
 await page.goto(origin+'/');metadata=await cdp.send('Page.getAppManifest');installability=await cdp.send('Page.getInstallabilityErrors');
 assert.equal(metadata.errors.length,0);assert.equal(metadata.url,origin+'/manifest.webmanifest');assert.deepEqual(JSON.parse(metadata.data),JSON.parse(manifest));
 const parsed=JSON.parse(metadata.data);assert.equal(parsed.display,'standalone');assert.equal(new URL(parsed.start_url,metadata.url).href,origin+'/');assert.equal(new URL(parsed.scope,metadata.url).href,origin+'/');assert.equal(parsed.id,'./?anx=0.1.1');assert.ok(parsed.icons.some(r=>r.sizes==='192x192'));assert.ok(parsed.icons.some(r=>r.sizes==='512x512'));
 for(const item of parsed.icons){const url=new URL(item.src,metadata.url);assert.equal(url.origin,origin);const r=await context.request.get(url.href);assert.equal(r.status(),200);const raw=await r.body();assert.equal(raw.subarray(1,4).toString(),'PNG');const size=raw.readUInt32BE(16)+'x'+raw.readUInt32BE(20);assert.equal(size,item.sizes);icons.push({path:url.pathname,size,sha256:createHash('sha256').update(raw).digest('hex')})}
 // И на прямом адресе входа ссылка разрешается в тот же корневой manifest.
 await page.goto(origin+'/account/entry/');const direct=await cdp.send('Page.getAppManifest');assert.equal(direct.url,metadata.url);assert.equal(direct.data,metadata.data);
 assert.ok(!installability.installabilityErrors.some(r=>/manifest|icon|display|start-url/.test(r.errorId)));
}catch(e){failure={name:e.name,message:e.message.slice(0,500)}}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));const report={status:failure?'FAIL':'PASS',failure,manifestURL:metadata?.url,manifestErrors:metadata?.errors,installability,icons,entrySHA256:createHash('sha256').update(html).digest('hex'),requests,physicalAndroid:false,webAPKMinting:'NOT RUN',userDataModified:false};await writeFile(process.env.NEXUS_BROWSER_RESULT,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,failure,installability}));if(failure)process.exitCode=1}
