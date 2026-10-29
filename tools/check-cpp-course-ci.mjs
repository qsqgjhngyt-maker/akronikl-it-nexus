// Актуальные проверки вместо исторических receipts Intro/M5 на изменённом курсе.
// Старые receipts остаются неизменны; новый changeset проверяется целиком.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir,mkdtemp,access,cp}from'node:fs/promises';import{spawn}from'node:child_process';import path from'node:path';import os from'node:os';import{courseCompletionScope}from'./cpp-course-completion-scope.mjs';
const root=path.resolve(import.meta.dirname,'..'),lane=process.argv[process.argv.indexOf('--lane')+1];assert.ok(['preflight','content','browser','integration','publication'].includes(lane));const out=path.resolve(process.env.NEXUS_INTRO_CI_EVIDENCE||path.join(os.tmpdir(),'nexus-course-ci',lane));assert.ok(!out.startsWith(root+path.sep),'Evidence must be outside checked source');await mkdir(out,{recursive:true});
const env={...process.env,NEXUS_COURSE_FINAL_EVIDENCE:out,NEXUS_GOLD_EVIDENCE:out,NEXUS_M6_EVIDENCE:out},records=[];
async function run(name,args,{command=process.execPath,extra={}}={}){let log='';const start=performance.now(),code=await new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd:root,env:{...env,...extra},windowsHide:true});p.stdout.on('data',b=>{log+=b;process.stdout.write(b)});p.stderr.on('data',b=>{log+=b;process.stderr.write(b)});p.once('error',reject);p.once('close',resolve)});await writeFile(path.join(out,String(records.length+1).padStart(2,'0')+'-'+name+'.log'),log);records.push({name,status:code===0?'PASS':'FAIL',ms:Math.round(performance.now()-start),exitCode:code});assert.equal(code,0,name)}
async function npm(prefix){const args=['ci','--prefix',prefix,'--ignore-scripts','--no-audit','--no-fund'];if(process.platform!=='win32')return run('зависимости-'+path.basename(prefix),args,{command:'npm'});for(const base of[path.dirname(process.execPath),path.resolve(path.dirname(process.execPath),'..')]){const cli=path.join(base,'node_modules/npm/bin/npm-cli.js');try{await access(cli);return run('зависимости-'+path.basename(prefix),[cli,...args])}catch(e){if(e.code!=='ENOENT')throw e}}throw Error('NPM_CLI_REQUIRED')}
let fatal;try{
 assert.ok(await courseCompletionScope());await npm('server-access');await run('точный-курс-и-GPL-source',['tools/check-cpp-course-completion.mjs']);
 if(lane==='preflight'){
  await run('контракты-итоговой-работы',['--test',...['automatic','bff','service','contract','purge','client'].map(n=>'tests/course-final-'+n+'.test.mjs'),'tests/qt-browser-contract.test.mjs']);
  await run('прежний-порядок-запуска',['--test','tests/platform-startup-load.test.mjs','tests/platform-startup-views.test.mjs','tests/platform-lazy-imports.test.mjs','tests/blog-media-perf-guard.test.mjs']);
  await run('NEXUS-PERF-01',['tools/check-cpp-course-perf.mjs']);
 }
 if(lane==='content'){
  await run('полная-регрессия-контрактов',['tools/check-academy-gold-regression.mjs']);
  await run('67-тем-и-итоговые-задания',['--test','tests/academy-gold-module6-content.test.mjs','tests/course-final-contract.test.mjs','tests/course-final-client.test.mjs']);
 }
 if(lane==='publication'){
  const temp=await mkdtemp(path.join(os.tmpdir(),'nexus-course-build-')),a=path.join(temp,'a'),b=path.join(temp,'b');
  for(const target of[a,b])await run('детерминированная-сборка-'+path.basename(target),['tools/build-ui1a-release.mjs','--out',target]);assert.deepEqual(await readFile(path.join(a,'BUILD_MANIFEST.json')),await readFile(path.join(b,'BUILD_MANIFEST.json')));
  await run('неизменные-акты-M6-и-новый-changeset',['tools/check-academy-gold-module6-authoring.mjs']);await run('публичные-manifest-инварианты',['--test','tests/ui1a-deterministic-public-manifest.test.mjs']);
 }
 if(['browser','integration'].includes(lane)){
  const temp=await mkdtemp(path.join(os.tmpdir(),'nexus-course-'+lane+'-')),build=path.join(temp,'build');await run('сборка',['tools/build-ui1a-release.mjs','--out',build]);await npm('tools/qa-browser-driver');
  env.NEXUS_FRONTEND_DIR=build;env.NEXUS_PLAYWRIGHT_MODULE=path.join(root,'tools/qa-browser-driver/node_modules/playwright/index.mjs');env.NEXUS_CHROME_PATH=process.env.NEXUS_CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome');env.NEXUS_PINNED_RUNTIME_DIR=process.env.NEXUS_PINNED_RUNTIME_DIR||path.join(temp,'runtime');
  await run('закреплённые-runtime-bytes',['tools/prepare-academy-gold-runtime-fixture.mjs']);env.NEXUS_JSCPP_FIXTURE=path.join(env.NEXUS_PINNED_RUNTIME_DIR,'jscpp.js');
  if(lane==='browser'){await run('05-07-144-размера-384-действия',['tests/academy-gold-module6-acceptance-browser.mjs']);await run('прежняя-навигация-и-запуск',['tests/platform-startup-browser-check.mjs'],{extra:{NEXUS_NATIVE_EVIDENCE:path.join(out,'startup')}})}
  if(lane==='integration'){
   await run('вход-Cloud-Offline-представления',['tools/check-academy-gold-module6-integration.mjs']);
   await run('реальный-Offline-First',['tests/offline-first-browser-check.mjs'],{extra:{NEXUS_OFFLINE_EVIDENCE:path.join(out,'offline')}});
   await run('Account-Cloud-Offline-logout',['tests/offline-cloud-browser-check.mjs'],{extra:{NEXUS_CLOUD_BROWSER_EVIDENCE:path.join(out,'cloud'),NEXUS_RUNTIME_DIR:env.NEXUS_PINNED_RUNTIME_DIR,NEXUS_PYTHON_PATH:process.env.NEXUS_PYTHON_PATH||(process.platform==='win32'?'python':'python3')}});
  }
 }
}catch(e){fatal={name:e.name,message:e.message};console.error(JSON.stringify(fatal))}
await writeFile(path.join(out,'CPP_COURSE_CI.json'),JSON.stringify({status:fatal?'FAIL':'PASS',stage:'CPP-COURSE-COMPLETION',lane,records,fatal,productionWrites:0,physicalDevices:false},null,2)+'\n');
// Совместимый каталог артефактов legacy workflow заполняется после всех source gates.
if(process.env.GITHUB_ACTIONS==='true')await cp(out,path.join(root,'evidence-startup-intro',lane),{recursive:true});if(fatal)process.exitCode=1;
