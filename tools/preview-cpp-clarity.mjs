// Локальный просмотр публичных уроков. Не создаёт аккаунт или учебную копию.
import http from 'node:http';
import {pilotPreviewHtml} from './cpp-clarity-r3-pilot-preview.mjs';
import path from 'node:path';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';

const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]};
const frontend=path.resolve(value('--frontend',process.env.NEXUS_FRONTEND_DIR||'cpp-clarity-frontend'));
const port=Number(value('--port','63368')),receipt=value('--receipt',null);
const manifest=JSON.parse(await readFile(path.join(frontend,'BUILD_MANIFEST.json'),'utf8'));
const scope=JSON.parse(await readFile(path.join(frontend,'CLARITY_BUILD_SCOPE.json'),'utf8'));
if(!scope.localCandidateOnly||scope.production||!/^[a-f0-9]{40}$/.test(scope.sourceCommit))throw Error('Не подтверждена локальная сборка кандидата.');
const generation=manifest.assetGeneration,prefix='/releases/'+generation;
const {staticMime}=await import(pathToFileURL(path.join(frontend,prefix.slice(1),'pwa/static-mime.js')));
const {clarityIds}=await import(pathToFileURL(path.join(frontend,prefix.slice(1),'core/academy-gold-catalog.js'))).then(m=>({clarityIds:[...m.GOLD_ALGORITHM_LESSONS,...m.GOLD_BASICS_LESSONS]}));
const files=[...clarityIds.flatMap(id=>['ru','en'].map(locale=>({id,locale}))),{file:'core/cpp-clarity-presentation.js'}];
const pilot=args.includes('--pilot'),pilotHtml=pilot?pilotPreviewHtml(prefix,scope.sourceCommit):null;
if(pilot)files.push(...['core/cpp-clarity-r3-renderer.mjs','core/cpp-clarity-r3-session.mjs','core/cpp-clarity-r3-state.mjs','sandbox/code-studio.js','courses/cpp-clarity-r3/courses.json',...['cpp.programming-process','onec.p2.topic-1','onec.p7.topic-2'].flatMap(id=>['ru','en'].map(l=>'courses/cpp-clarity-r3/lessons/'+id+'.'+l+'.json'))].map(file=>({file})));
const bindings=pilot?[{file:'pilot-preview',sha256:createHash('sha256').update(pilotHtml).digest('hex')}]:[];
const {goldLessonPath}=await import(pathToFileURL(path.join(frontend,prefix.slice(1),'core/academy-gold-catalog.js')));
for(const x of files){const file=x.file||goldLessonPath(x.id,x.locale),bytes=await readFile(path.join(frontend,prefix.slice(1),file));bindings.push({file,sha256:createHash('sha256').update(bytes).digest('hex')})}
const fingerprint=createHash('sha256').update(JSON.stringify(bindings)).digest('hex');
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'cache-control':'no-store'});return res.end()}
  const u=new URL(req.url,'http://127.0.0.1');
  if(pilot&&u.pathname==='/pilot'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(req.method==='HEAD'?undefined:pilotHtml)}
  if(u.pathname==='/__cpp_clarity_preview'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify({kind:'cpp-clarity-public-readonly',sourceCommit:scope.sourceCommit,generation,fingerprint,bindings,localOnly:true,backend:'unavailable',userDataUsed:false}))}
  if(/^\/(api|account)(\/|$)/.test(u.pathname)){res.writeHead(401,{'content-type':'application/json','cache-control':'no-store',vary:'*'});return res.end('{"error":{"code":"LOCAL_PREVIEW_NO_SESSION"}}')}
  const pathname=decodeURIComponent(u.pathname);
  if(/[\\\u0000-\u001f\u007f]/.test(pathname)||pathname.split('/').some(p=>p==='.'||p==='..'))throw Error('PATH');
  const rel=pathname==='/'?'offline.html':pathname.slice(1),file=path.resolve(frontend,rel);
  if(!file.startsWith(frontend+path.sep)||(await stat(file)).isDirectory())throw Error('PATH');
  let body=await readFile(file);
  if(rel==='version.json'){const v=JSON.parse(body);v.releaseCandidate={assetGeneration:generation};body=Buffer.from(JSON.stringify(v))}
  // MIME определяется URL-путём: Windows-путь содержит точки в каталогах,
  // которые нельзя принимать за расширение файла LICENSE или Dockerfile.
  res.writeHead(200,{'content-type':staticMime(rel),'cache-control':rel==='service-worker.js'?'no-store':'public, max-age=0'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch(error){console.error(JSON.stringify({path:String(req.url).split('?')[0],error:error.code||error.message}));res.writeHead(404,{'cache-control':'no-store'});res.end('Not found')}
});
let reused=false;
await new Promise((resolve,reject)=>{server.once('error',async error=>{
 if(error.code!=='EADDRINUSE'||port===0)return reject(error);
 try{const r=await fetch('http://127.0.0.1:'+port+'/__cpp_clarity_preview'),v=await r.json();
  if(v.sourceCommit!==scope.sourceCommit||v.fingerprint!==fingerprint)throw Error('Порт занят другой версией. Закройте её окно запуска или выберите --port.');reused=true;resolve();
 }catch(e){reject(e)}
});server.listen(port,'127.0.0.1',resolve)});
const origin='http://127.0.0.1:'+(reused?port:server.address().port),url=origin+(pilot?'/pilot#course=cpp&lesson=cpp.programming-process&stage=explanation&locale=ru':'/offline.html#course=cpp&lesson=cpp.programming-process');
const result={origin,url,sourceCommit:scope.sourceCommit,generation,fingerprint,pid:process.pid,reused,localOnly:true,backend:'unavailable',userDataUsed:false};
if(receipt){await mkdir(path.dirname(path.resolve(receipt)),{recursive:true});await writeFile(receipt,JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify(result));
if(args.includes('--open')){
 const browser=value('--browser',process.env.NEXUS_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe');
 const profile=path.resolve(value('--profile',path.join(tmpdir(),'akronikl-cpp-public-preview')));await mkdir(profile,{recursive:true});
 const child=spawn(browser,['--user-data-dir='+profile,'--no-first-run','--disable-sync','--disable-background-networking','--new-window',url],{detached:true,stdio:'ignore'});child.on('error',error=>console.error('Не удалось открыть браузер: '+error.message));child.unref();
 console.log('Локальный просмотр открыт в отдельном профиле Chrome. Публичный сайт и ваши рабочие данные не используются.');
}
if(reused)server.close();
