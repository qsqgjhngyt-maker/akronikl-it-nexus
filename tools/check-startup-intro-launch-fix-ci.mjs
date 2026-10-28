// Пять приёмочных наборов исправления UI. Публикации и cloud writes отсутствуют.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {FIX_BASE,FIX_GENERATION,verifyLaunchFix,hash} from './startup-intro-launch-fix-contract.mjs';
const root=path.resolve(import.meta.dirname,'..'),lane=process.argv[process.argv.indexOf('--lane')+1];assert.ok(['preflight','content','browser','integration','publication'].includes(lane));
const out=path.resolve(process.env.NEXUS_INTRO_CI_EVIDENCE||path.join(root,'evidence-startup-intro',lane));await mkdir(out,{recursive:true});
const records=[],env={...process.env,NEXUS_GOLD_EVIDENCE:out,NEXUS_M2_EVIDENCE:out,NEXUS_M3_EVIDENCE:out,NEXUS_M4_EVIDENCE:out,NEXUS_M5_EVIDENCE:out};
async function run(name,args,{cwd=root,command=process.execPath,extra={}}={}){
 const t=performance.now();let log='';const code=await new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd,env:{...env,...extra},windowsHide:true});p.stdout.on('data',b=>{log+=b;process.stdout.write(b)});p.stderr.on('data',b=>{log+=b;process.stderr.write(b)});p.on('error',reject);p.on('close',resolve)});
 await writeFile(path.join(out,String(records.length+1).padStart(2,'0')+'-'+name+'.log'),log);records.push({name,status:code===0?'PASS':'FAIL',exitCode:code,ms:Math.round(performance.now()-t)});assert.equal(code,0,name);
}
const node=(name,file,extra={},cwd=root)=>run(name,[file],{extra,cwd});
async function npm(prefix){const args=['ci','--prefix',prefix,'--ignore-scripts','--no-audit','--no-fund'];if(process.platform==='win32')return run('зависимости-'+path.basename(prefix),[path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),...args]);return run('зависимости-'+path.basename(prefix),args,{command:'npm'})}
let fatal,build,baseline;
try{
 await verifyLaunchFix({root,writeEvidence:out});await npm('server-access');
 if(lane==='preflight'){
  await run('политика-и-отрицательные-контроли',['--test','tests/startup-intro-policy.test.mjs','tests/startup-intro-launch-fix.test.mjs','tests/startup-intro-build.test.mjs','tests/startup-intro-retention.test.mjs']);
  await node('реальный-обработчик-входа','tests/entry-document-navigation-check.mjs');
  await run('порядок-модулей-и-ленивая-загрузка',['--test','tests/platform-startup-load.test.mjs','tests/platform-startup-views.test.mjs','tests/platform-lazy-imports.test.mjs']);
 }
 if(lane==='content'){
  await node('неизменные-программные-контракты','tools/check-academy-gold-regression.mjs');
  const old=path.join(await mkdtemp(path.join(tmpdir(),'nx-launch-content-')),'source');await run('историческая-база-M5',['worktree','add','--quiet','--detach',old,'d76d1613a1fbf6726d453e40366c306ea502d4c7'],{command:'git'});await npm(path.join(old,'server-access'));
  await run('Gold-M1-M5-и-исторические-receipts',['--test',...['','-module2','-module3','-module4','-module5'].map(s=>'tests/academy-gold'+s+'-content.test.mjs')],{cwd:old});
 }
 if(['browser','integration','publication'].includes(lane)){
  await npm('tools/qa-browser-driver');const temp=await mkdtemp(path.join(tmpdir(),'nx-launch-'+lane+'-'));baseline=path.join(temp,'accepted-source');build=path.join(temp,'candidate');
  await run('точная-принятая-база',['worktree','add','--quiet','--detach',baseline,FIX_BASE],{command:'git'});
  await run('сборка-поправки',['tools/build-startup-intro-launch-fix.mjs','--out',build]);
  Object.assign(env,{NEXUS_FRONTEND_DIR:build,NEXUS_BASELINE_DIR:baseline,NEXUS_PLAYWRIGHT_MODULE:path.join(root,'tools/qa-browser-driver/node_modules/playwright/index.mjs'),NEXUS_CHROME_PATH:process.env.NEXUS_CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome')});
  if(lane==='browser'){
   await node('запуск-до-входа-и-полное-видео','tests/startup-intro-launch-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'launch')});
   await node('прежний-запуск-и-основные-разделы','tests/platform-startup-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'platform')});
  }
  if(lane==='integration'){
   for(const name of ['auth-bootstrap','account-storage-isolation','cloud-unified-client','code-studio-foundation','project-studio-foundation'])await node(name,'tests/'+name+'-check.mjs');
   env.NEXUS_PINNED_RUNTIME_DIR=process.env.NEXUS_PINNED_RUNTIME_DIR||path.join(temp,'runtime');await node('закреплённый-runtime','tools/prepare-academy-gold-runtime-fixture.mjs');
   await node('полный-Offline-First','tests/offline-first-browser-check.mjs',{NEXUS_OFFLINE_EVIDENCE:path.join(out,'offline')});
   await node('Account-Cloud-logout','tests/offline-cloud-browser-check.mjs',{NEXUS_CLOUD_BROWSER_EVIDENCE:path.join(out,'cloud'),NEXUS_RUNTIME_DIR:env.NEXUS_PINNED_RUNTIME_DIR,NEXUS_PYTHON_PATH:process.env.NEXUS_PYTHON_PATH||(process.platform==='win32'?'python':'python3')});
  }
  if(lane==='publication'){
   const second=path.join(temp,'second');await run('повторная-сборка',['tools/build-startup-intro-launch-fix.mjs','--out',second]);
   const m=JSON.parse(await readFile(path.join(build,'BUILD_MANIFEST.json'))),rollback=JSON.parse(await readFile(path.join(root,'startup-intro-launch-fix.json'))).kind==='startup-launch-ui-fix-rollback';assert.equal(m.assetGeneration,FIX_GENERATION);assert.deepEqual(m,JSON.parse(await readFile(path.join(second,'BUILD_MANIFEST.json'))));if(!rollback)assert.deepEqual(m,JSON.parse(await readFile(path.join(root,'BUILD_MANIFEST.json'))));
   for(const x of m.files){const b=await readFile(path.join(build,x.file));assert.equal(hash(b),x.sha256);assert.deepEqual(b,await readFile(path.join(second,x.file)));if(!rollback||x.file.startsWith('releases/')||x.file.startsWith('entry-assets/'))assert.deepEqual(b,await readFile(path.join(root,x.file)))}
   const accepted=JSON.parse(await readFile(path.join(baseline,'BUILD_MANIFEST.json')));for(const x of accepted.files.filter(x=>/^(?:releases|entry-assets)\//.test(x.file)))assert.deepEqual(await readFile(path.join(build,x.file)),await readFile(path.join(baseline,x.file)));
   await node('первая-установка-и-холодный-Offline','tests/pwa-public-install-browser-check.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'install')});
   await node('точный-upgrade-rollback','tests/pwa-rollback-browser-check.mjs',{NEXUS_ROLLBACK_DIR:baseline,NEXUS_BROWSER_RESULT:path.join(out,'PWA_ROLLBACK.json')});
   await node('размер-и-время-установки','tests/startup-intro-pwa-performance.mjs',{NEXUS_NATIVE_EVIDENCE:path.join(out,'performance')});
  }
 }
}catch(error){fatal={message:error.message,stack:error.stack};console.error(error)}
finally{await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',lane,records,fatal,build,baseline,production:false,physical:false},null,2)+'\n');if(fatal)process.exitCode=1}
