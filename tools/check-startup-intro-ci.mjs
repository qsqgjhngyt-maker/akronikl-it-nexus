// Каждый заменённый legacy job выполняет свою приёмку; ни одного пустого PASS.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {ROOT,BASE,GENERATION,verifyStartupIntroContract} from './startup-intro-contract.mjs';
const i=process.argv.indexOf('--lane'),lane=process.argv[i+1];
assert.ok(['preflight','content','browser','integration','publication'].includes(lane),'Неизвестный набор проверок');
const out=path.resolve(process.env.NEXUS_INTRO_CI_EVIDENCE||path.join(ROOT,'evidence-startup-intro',lane));await mkdir(out,{recursive:true});
const env={...process.env,NEXUS_GOLD_EVIDENCE:out,NEXUS_M2_EVIDENCE:out,NEXUS_M3_EVIDENCE:out,NEXUS_M4_EVIDENCE:out,NEXUS_M5_EVIDENCE:out,NEXUS_M4_PUBLICATION_EVIDENCE:out},records=[];
async function run(name,args,{cwd=ROOT,extra={},command=process.execPath}={}){
 const started=performance.now();let stdout='';
 const code=await new Promise((resolve,reject)=>{
  const p=spawn(command,args,{cwd,env:{...env,...extra},windowsHide:true,shell:command==='npm'&&process.platform==='win32'});
  p.stdout.on('data',b=>{stdout+=b;process.stdout.write(b)});p.stderr.on('data',b=>{stdout+=b;process.stderr.write(b)});p.on('error',reject);p.on('close',resolve);
 });
 const log=String(records.length+1).padStart(2,'0')+'-'+name+'.log';await writeFile(path.join(out,log),stdout.replaceAll('\r\n','\n'));
 records.push({name,status:code===0?'PASS':'FAIL',exitCode:code,durationMs:Math.round(performance.now()-started),log});assert.equal(code,0,'Не пройдена проверка: '+name);
}
const node=(name,file,extra={},cwd=ROOT)=>run(name,[file],{extra,cwd});
const npm=(prefix)=>run('зависимости-'+path.basename(prefix),['ci','--prefix',prefix,'--ignore-scripts','--no-audit','--no-fund'],{command:'npm'});
let failure,build,baselineBuild;
try{
 await verifyStartupIntroContract({writeEvidence:out});
 if(lane==='preflight'){
  await npm('server-access');
  await run('контракт-и-отрицательные-контроли',['--test','tests/startup-intro-contract.test.mjs','tests/startup-intro-policy.test.mjs','tests/startup-intro-build.test.mjs','tests/startup-intro-retention.test.mjs']);
  await run('детерминированный-public-набор',['--test','tests/ui1a-deterministic-public-manifest.test.mjs']);
  await run('прежний-порядок-запуска',['--test','tests/platform-startup-load.test.mjs','tests/platform-startup-views.test.mjs','tests/platform-lazy-imports.test.mjs','tests/blog-media-perf-guard.test.mjs']);
 }
 if(lane==='content'){
  await npm('server-access');
  await node('полная-регрессия-контрактов','tools/check-academy-gold-regression.mjs');
  await run('Gold-M1-M5',['--test',...['','-module2','-module3','-module4','-module5'].map(s=>'tests/academy-gold'+s+'-content.test.mjs')]);
  for(const [id,file]of [['M1','tools/check-academy-gold-cpp.mjs'],...['2','3','4','5'].map(n=>['M'+n,'tools/check-academy-gold-module'+n+'-examples.mjs'])])await node('C++20-UBSan-'+id,file);
 }
 if(['browser','integration','publication'].includes(lane)){
  await npm('server-access');await npm('tools/qa-browser-driver');
  const temp=await mkdtemp(path.join(tmpdir(),'nexus-intro-'+lane+'-'));build=path.join(temp,'candidate');baselineBuild=path.join(temp,'baseline-build');const baseline=path.join(temp,'baseline-source');
  await run('точный-source-M5',['worktree','add','--quiet','--detach',baseline,BASE],{command:'git'});
  if(lane==='publication'){
   await npm(path.join(baseline,'server-access'));
   await node('прежний-валидатор-M5-без-изменений','tools/check-academy-gold-module3-publication.mjs',{},baseline);
  }
  await run('снимок-принятой-публикации',['tools/snapshot-published-build.mjs','--source',baseline,'--out',baselineBuild,'--expected-commit',BASE]);
  await run('сборка-кандидата',['tools/build-startup-intro-candidate.mjs','--out',build]);
  Object.assign(env,{NEXUS_FRONTEND_DIR:build,NEXUS_BASELINE_DIR:baselineBuild,NEXUS_PLAYWRIGHT_MODULE:path.join(ROOT,'tools/qa-browser-driver/node_modules/playwright/index.mjs'),NEXUS_CHROME_PATH:process.env.NEXUS_CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome')});
  if(lane==='browser'){
   await node('реальные-видео-настройки-и-42-замера','tests/startup-intro-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'intro')});
   await node('прежний-полный-запуск','tests/platform-startup-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'platform')});
  }
  if(lane==='integration'){
   for(const name of ['auth-bootstrap','account-storage-isolation','cloud-unified-client','code-studio-foundation','project-studio-foundation'])await node(name,'tests/'+name+'-check.mjs');
   const runtime=process.env.NEXUS_PINNED_RUNTIME_DIR||path.join(temp,'runtime');env.NEXUS_PINNED_RUNTIME_DIR=runtime;
   await node('закреплённый-runtime','tools/prepare-academy-gold-runtime-fixture.mjs');
   await node('полный-Offline-First','tests/offline-first-browser-check.mjs',{NEXUS_OFFLINE_EVIDENCE:path.join(out,'offline')});
   await node('Account-Cloud-Offline-logout','tests/offline-cloud-browser-check.mjs',{NEXUS_CLOUD_BROWSER_EVIDENCE:path.join(out,'cloud'),NEXUS_RUNTIME_DIR:runtime,NEXUS_PYTHON_PATH:process.env.NEXUS_PYTHON_PATH||(process.platform==='win32'?'python':'python3')});
  }
  if(lane==='publication'){
   const second=path.join(temp,'second-build');await run('повторная-сборка',['tools/build-startup-intro-candidate.mjs','--out',second]);
   const manifest=JSON.parse(await readFile(path.join(build,'BUILD_MANIFEST.json'))),again=JSON.parse(await readFile(path.join(second,'BUILD_MANIFEST.json')));
   assert.deepEqual(manifest,again);assert.equal(manifest.assetGeneration,GENERATION);assert.equal(manifest.optionalAssets.length,6);
   const accepted=JSON.parse(await readFile(path.join(baselineBuild,'BUILD_MANIFEST.json'))),map=new Map(manifest.files.map(r=>[r.file,r]));
   for(const r of accepted.files.filter(r=>r.file.startsWith('releases/')||r.file.startsWith('entry-assets/'))){assert.deepEqual(await readFile(path.join(build,r.file)),await readFile(path.join(baselineBuild,r.file)),r.file);assert.ok(map.has(r.file))}
   const hash=b=>createHash('sha256').update(b).digest('hex'),sw=await readFile(path.join(build,'service-worker.js'),'utf8');
   for(const r of manifest.files){const b=await readFile(path.join(build,r.file));assert.equal(hash(b),r.sha256);assert.deepEqual(b,await readFile(path.join(second,r.file)))}
   for(const r of manifest.optionalAssets)assert.equal(sw.includes('url: "'+r.url+'"'),false);
   await writeFile(path.join(out,'BUILD_PROOF.json'),JSON.stringify({status:'PASS',files:manifest.files.length,acceptedImmutableAssetsPreserved:true,exactRebuild:true,mediaInstallAuthority:false,production:false},null,2));
   await node('установка-обновление-и-холодный-offline','tests/pwa-public-install-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'pwa')});
   await node('PWA-upgrade-rollback','tests/pwa-rollback-browser-check.mjs',{NEXUS_ROLLBACK_DIR:baselineBuild,NEXUS_BROWSER_RESULT:path.join(out,'PWA_ROLLBACK.json')});
   await node('размер-и-время-установки-ДО-ПОСЛЕ','tests/startup-intro-pwa-performance.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'performance')});
  }
 }
}catch(error){failure={message:error.message,stack:error.stack};console.error(error)}
finally{
 await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:failure?'FAIL':'PASS',lane,records,failure,build,baselineBuild,production:false,physical:false},null,2)+'\n');
 if(failure)process.exitCode=1;
}
