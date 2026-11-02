import {routePublicationWorkflow,WORKFLOW,hashRouting,SCOPE_FILE} from '../tools/content-publication-route.mjs';
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
  const actual=await readFile(new URL('../'+file,import.meta.url),'utf8'),pin=/NEXUS_CONTENT_ROUTE_BOOTSTRAP_SHA: '([a-f0-9]{40})'/.exec(actual)?.[1];
  let reviewedActual=actual.replaceAll('\r\n','\n');
  const contentLayer={'.github/workflows/academy-gold-cpp-module-1.yml':['gold-gate'],'.github/workflows/academy-gold-cpp-module-2-preflight.yml':['preflight','module2-gold','module1-regression']}[file];
  if(contentLayer){
   // Дополнительный exact-approved content слой не меняет Intro/legacy steps.
   // Его полный hash проверяется здесь, его trusted/tamper поведение — отдельным
   // onec-historical-routing suite; runtime CI сверяет scope из trusted commit.
   const scope=JSON.parse(await readFile(new URL('../'+SCOPE_FILE,import.meta.url),'utf8'));
   assert.equal(hashRouting(file,Buffer.from(actual)),scope.files.find(p=>p.path===file)?.sha256,'Unapproved content layer');
   reviewedActual=reviewedActual.slice(0,reviewedActual.indexOf('jobs:\n')+6)+reviewedActual.slice(reviewedActual.indexOf('  '+contentLayer[0]+':\n'));
   for(const name of contentLayer){const guard='  '+name+":\n    needs: content_scope\n    if: needs.content_scope.outputs.kind == 'historical-release'\n";assert.ok(reviewedActual.includes(guard));reviewedActual=reviewedActual.replace(guard,'  '+name+':\n');}
  }
  assert.equal((file===WORKFLOW?routePublicationWorkflow(after,pin):after).replaceAll('\r\n','\n'),reviewedActual);
  for(const line of before.replaceAll('\r\n','\n').split('\n').filter(l=>/^          (?:node |git |npm )/.test(l)))assert.ok(after.includes(line),'Потеряна команда '+line);
  assert.equal((after.match(/id: startup_intro/g)||[]).length,Object.keys(lanes).length);
  assert.ok(after.includes('node tools/startup-intro-ci-route.mjs'));
  assert.throws(()=>assertExpectedBytes(file,after.replace("enabled != 'true'","enabled == 'false'"),after));
 }
});
