// Реальные проверки текущего продукта; не пустая подмена старых jobs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,cp} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {ROOT,introV6Scope,GENERATION} from './intro-v6-scope.mjs';
const lane=process.argv[process.argv.indexOf('--lane')+1];assert.ok(['preflight','content','browser','integration','publication'].includes(lane));
const out=await mkdtemp(path.join(tmpdir(),'nexus-v6-'+lane+'-')),env={...process.env,NEXUS_GOLD_EVIDENCE:path.join(out,'regression')},records=[];
async function run(name,args,command=process.execPath,extra={}){
 let log='';const started=performance.now();const code=await new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd:ROOT,env:{...env,...extra},windowsHide:true});p.stdout.on('data',b=>{log+=b;process.stdout.write(b)});p.stderr.on('data',b=>{log+=b;process.stderr.write(b)});p.on('error',reject);p.on('close',resolve)});
 await writeFile(path.join(out,String(records.length+1).padStart(2,'0')+'-'+name+'.log'),log);records.push({name,exitCode:code,status:code===0?'PASS':'FAIL',durationMs:Math.round(performance.now()-started)});assert.equal(code,0,name);
}
let fatal,scope;
try{
 scope=await introV6Scope();assert.ok(scope);
 await run('зависимости',['ci','--prefix','server-access','--ignore-scripts','--no-audit','--no-fund'],'npm');
 if(lane==='preflight'){
  await run('ESM',['--input-type=module','-e',"await import('./core/startup-intro.js'); console.log('ESM PASS')"]);
  await run('контракты',['--test','tests/intro-v6-scope.test.mjs','tests/startup-intro-smooth.test.mjs','tests/startup-intro-policy.test.mjs','tests/startup-intro-build.test.mjs','tests/startup-intro-retention.test.mjs']);
  await run('порядок-запуска',['--test','tests/platform-startup-load.test.mjs','tests/platform-startup-views.test.mjs','tests/platform-lazy-imports.test.mjs','tests/blog-media-perf-guard.test.mjs']);
 }
 if(lane==='content')await run('регрессия-неизменного-контента-и-платформы',['tools/check-academy-gold-regression.mjs']);
 if(lane==='integration'){
  for(const name of ['auth-bootstrap','account-storage-isolation','cloud-unified-client','code-studio-foundation','project-studio-foundation','pwa-policy','pwa-controller'])await run(name,['tests/'+name+'-check.mjs']);
 }
 if(lane==='browser'){
  await run('браузер',['ci','--prefix','tools/qa-browser-driver','--ignore-scripts','--no-audit','--no-fund'],'npm');
  Object.assign(env,{NEXUS_FRONTEND_DIR:ROOT,NEXUS_BASELINE_DIR:ROOT,NEXUS_PLAYWRIGHT_MODULE:path.join(ROOT,'tools/qa-browser-driver/node_modules/playwright/index.mjs'),NEXUS_CHROME_PATH:process.env.NEXUS_CHROME_PATH||'/usr/bin/google-chrome',NEXUS_NATIVE_EVIDENCE:path.join(out,'refresh')});
  await run('16-обновлений-и-сохранность',['tests/startup-intro-launch-browser-check.mjs','--refresh-only']);
  await run('WebM-оба-сюжета',['tests/intro-v6-webm-check.mjs'],process.execPath,{NEXUS_NATIVE_EVIDENCE:path.join(out,'webm')});
 }
 if(lane==='publication'){
  const target=path.join(out,'build');await run('сборка',['tools/build-ui1a-release.mjs','--out',target]);
  const expected=JSON.parse(await readFile(path.join(ROOT,'BUILD_MANIFEST.json'))),actual=JSON.parse(await readFile(path.join(target,'BUILD_MANIFEST.json')));
  assert.equal(actual.assetGeneration,GENERATION);assert.deepEqual(actual,expected);
  for(const r of actual.files){const b=await readFile(path.join(ROOT,r.file));assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256,r.file);assert.equal(b.length,r.bytes,r.file)}
  await run('детерминизм-и-изоляция-медиа',['--test','tests/ui1a-deterministic-public-manifest.test.mjs']);
 }
}catch(e){fatal={message:e.message,stack:e.stack};console.error(e)}
await writeFile(path.join(out,'RESULT.json'),JSON.stringify({status:fatal?'FAIL':'PASS',lane,scope,records,fatal,production:false,physicalDevices:false},null,2)+'\n');
const evidence=path.join(ROOT,'evidence-startup-intro',lane);await mkdir(evidence,{recursive:true});
// Сборка не нужна в артефакте: сохраняются результаты и logs, без публичных копий всего repo.
for(const entry of ['RESULT.json',...records.map((r,i)=>String(i+1).padStart(2,'0')+'-'+r.name+'.log')])await cp(path.join(out,entry),path.join(evidence,entry));
if(lane==='browser')for(const dir of ['refresh','webm'])try{await cp(path.join(out,dir),path.join(evidence,dir),{recursive:true})}catch(e){if(e.code!=='ENOENT')throw e}
if(fatal)process.exitCode=1;
