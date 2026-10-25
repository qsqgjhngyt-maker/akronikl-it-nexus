import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';import path from 'node:path';
import {M3_PROBES,M3_CASE_COUNT} from '../tests/fixtures/cpp-module3-probes.mjs';
import {GOLD_ALGORITHM_LESSONS,GOLD_BASICS_LESSONS} from '../core/academy-gold-catalog.js';
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const plan=await json('docs/ru/03-content/CPP_MODULE3_DEPENDENCIES.json'),curriculum=await json('courses/cpp/curriculum.json');
const legacy=plan.topics.filter(t=>t.stableId),additional=plan.topics.filter(t=>!t.stableId),section=curriculum.sections.find(s=>s.id===plan.moduleId);
assert.equal(plan.topics.length,18);assert.equal(legacy.length,13);assert.equal(additional.length,5);assert.equal(plan.newProgressIdsAssigned,0);
assert.deepEqual(legacy.map(t=>t.stableId),section.lessonIds);assert.equal(curriculum.lessons.length,40);
assert.equal(new Set(M3_PROBES.map(p=>p.id)).size,M3_PROBES.length);
const visited=new Set(curriculum.lessons.filter(l=>l.legacyIndex<20).map(l=>l.id));
for(const t of plan.topics){
 assert.ok(!visited.has(t.key),'Повтор темы '+t.key);
 for(const dep of t.prerequisites)assert.ok(visited.has(dep),'Циклическая/будущая зависимость '+t.key+' <- '+dep);
 assert.ok(t.introduceBeforeUse.length&&t.scaffoldOnly.length&&t.doNotRequire.length);
 assert.ok(t.runtimeProbes.length,'Нет runtime контракта '+t.key);
 for(const id of t.runtimeProbes)assert.ok(M3_PROBES.some(p=>p.id===id&&p.topics.includes(t.key)));
 if(t.stableId){const old=curriculum.lessons.find(l=>l.id===t.stableId);assert.equal(old.legacyIndex,t.legacyIndex);assert.equal(old.order,t.legacyOrder);assert.equal(old.sectionId,plan.moduleId)}
 else{assert.equal(t.kind,'proposed-addition');assert.equal(t.legacyIndex,null);assert.equal(t.legacyOrder,null);assert.ok(!curriculum.lessons.some(l=>l.id===t.key))}
 visited.add(t.key);
}
assert.equal(GOLD_ALGORITHM_LESSONS.length+GOLD_BASICS_LESSONS.length,20);
// M3-0 меняет только документацию и средства проверки, никаких product contracts.
const protectedPaths=['core','courses','pwa','sandbox','project-studio','sync','server-access','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js'];
execFileSync('git',['diff','--exit-code',plan.baseCommit,'--',...protectedPaths],{stdio:'pipe'});
const snapshots=[];for(const file of ['courses/cpp/curriculum.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','core/academy-gold-catalog.js','core/app.js','core/storage.js','core/migrations/cpp-v7.js','core/account-storage.js','sync/cloud-sync.js','pwa/offline-entry.js','sandbox/runtime-router.js','sandbox/workers/wasm-runtime-worker.js','version.json','release-candidate.json']){
 const bytes=await readFile(file),baseline=execFileSync('git',['show',plan.baseCommit+':'+file]);assert.ok(bytes.equals(baseline),file);snapshots.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),unchanged:true});
}
const seen=new Set();async function walk(file){if(seen.has(file))return;seen.add(file);const code=await readFile(file,'utf8');for(const hit of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(hit[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),hit[1])))}
await walk('core/app.js');let bytes=0;for(const file of seen)bytes+=(await stat(file)).size;
assert.ok(seen.size<=75&&bytes<=600000);
const result={status:'PASS',stage:'M3-0',baseCommit:plan.baseCommit,legacyIds:13,proposedUnassigned:5,dagNodes:18,newGoldObjects:0,probePrograms:M3_PROBES.length,probeCases:M3_CASE_COUNT,snapshots,protectedProductDiff:false,perf:{status:'PASS',staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,scope:'NEXUS-PERF-01 static gate; runtime Home resource guard separately'},mainWrites:0,productionWrites:0,officialRelease:false};
const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,snapshots:undefined}));
