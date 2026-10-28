import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,BASE,IMPLEMENTATION,GENERATION,WORKFLOWS,CI_PATHS,validateMetadata,assertPathAllowed,assertExpectedBytes,routeWorkflow} from '../tools/startup-intro-contract.mjs';
const correct={schema:1,kind:'startup-intro-implementation-candidate',baseCommit:BASE,implementationCommit:IMPLEMENTATION,generation:GENERATION,productionPublication:false,officialRelease:false};
test('Произвольная база, иной source, новая схема и разрешение production не расширяют контракт',()=>{
 validateMetadata(correct);
 for(const p of [{baseCommit:'main'},{implementationCommit:'HEAD'},{schema:2},{generation:'ui1a-any'},{productionPublication:true},{officialRelease:true},{extraPaths:['core/account-storage.js']}])assert.throws(()=>validateMetadata({...correct,...p}));
});
test('Новый Content/Identity/Cloud файл и обход пути отклоняются',()=>{
 const scope={baseFiles:new Set(['core/account-storage.js']),implementationFiles:new Set(['core/startup-intro.js'])};
 for(const p of ['courses/cpp/new.json','core/new-auth.js','../core/app.js','pwa/new-policy.js','.github/workflows/hidden-bypass.yml'])assert.throws(()=>assertPathAllowed(p,scope));
 for(const p of ['core/startup-intro.js','core/account-storage.js',...CI_PATHS])assertPathAllowed(p,scope);
 assert.throws(()=>assertExpectedBytes('core/account-storage.js','changed','accepted'));
 assert.throws(()=>assertExpectedBytes('intro-media/cinematic-v1/mobile.mp4','wrong-video','owner-video'));
});
test('Маршрутизация оставляет оригинальные команды и fail-closed проверку перед выбором набора',async()=>{
 for(const [file,lanes]of Object.entries(WORKFLOWS)){
  const before=execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8'}),after=routeWorkflow(before,lanes);
  assert.equal(after,(await readFile(new URL('../'+file,import.meta.url),'utf8')));
  for(const line of before.replaceAll('\r\n','\n').split('\n').filter(l=>/^          (?:node |git |npm )/.test(l)))assert.ok(after.includes(line),'Потеряна команда '+line);
  assert.equal((after.match(/id: startup_intro/g)||[]).length,Object.keys(lanes).length);
  assert.ok(after.includes('node tools/startup-intro-ci-route.mjs'));
  assert.throws(()=>assertExpectedBytes(file,after.replace("enabled != 'true'","enabled == 'false'"),after));
 }
});
