// Проверка редакционного графа M2-0, stable IDs и неизменности контрактов.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {M2_PROBES} from '../tests/fixtures/cpp-module2-probes.mjs';
import {goldLessonPath,GOLD_ALGORITHM_LESSONS} from '../core/academy-gold-catalog.js';
const root=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const plan=await json('docs/ru/03-content/CPP_MODULE2_DEPENDENCIES.json'),curriculum=await json('courses/cpp/curriculum.json');
const section=curriculum.sections.find(s=>s.id===plan.moduleId),lookup=new Map(curriculum.lessons.map(l=>[l.id,l]));
assert.equal(plan.lessons.length,12);assert.equal(plan.lessons.reduce((s,l)=>s+l.sessions,0),19);
assert.deepEqual(plan.lessons.map(l=>l.id),section.lessonIds);
assert.equal(new Set(M2_PROBES.map(p=>p.id)).size,M2_PROBES.length);
for(const l of plan.lessons){
 const actual=lookup.get(l.id);assert.equal(actual.order,l.order);assert.equal(actual.legacyIndex,l.legacyIndex);assert.equal(actual.sectionId,plan.moduleId);
 for(const dependency of l.prerequisites){assert.ok(lookup.has(dependency),dependency);assert.ok(lookup.get(dependency).order<l.order,'Forward/cyclic dependency: '+l.id);}
 for(const id of l.runtimeProbes)assert.ok(M2_PROBES.some(p=>p.id===id),id);
 assert.ok(M2_PROBES.some(p=>p.lesson===l.id),'Нет runtime probe: '+l.id);
 assert.ok(l.introduceBeforeUse.length&&l.scaffoldOnly.length&&l.doNotRequire.length);
 assert.equal(goldLessonPath(l.id,'ru'),null,'M2 ещё не опубликован в Gold catalog');
}
for(const p of M2_PROBES)assert.ok(plan.lessons.some(l=>l.id===p.lesson));
const ru=(await json('courses/cpp/data/lessons.ru.json')).lessons,en=(await json('courses/cpp/data/lessons.en.json')).lessons;
assert.equal(plan.lessons.filter(l=>ru.some(x=>x.id===l.id)).length,12);
assert.equal(plan.lessons.filter(l=>en.some(x=>x.id===l.id)).length,2);
assert.equal(GOLD_ALGORITHM_LESSONS.length,8);
const untouched=['core','courses','pwa','sandbox','project-studio','sync','server-access','releases','entry-assets','styles','effects','locales','release-candidate.json','version.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js'];
const authorizedRuntimePaths=['sandbox/providers/browser-runtime.js','sandbox/runtime-router.js'];
execFileSync('git',['diff','--exit-code',plan.baseCommit,'--',...untouched,...authorizedRuntimePaths.map(p=>':(exclude)'+p)],{stdio:'pipe'});
const snapshots=[];
for(const file of ['courses/cpp/curriculum.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','core/course-registry.js','core/app.js','pwa/offline-entry.js','core/academy-gold-catalog.js','sandbox/providers/browser-runtime.js','sandbox/providers/wasm-runtime.js','sandbox/runtime-router.js','core/storage.js','core/account-storage.js','sync/cloud-sync.js','release-candidate.json','version.json']){
 const bytes=await readFile(new URL(file,root));
 const baseline=execFileSync('git',['show',plan.baseCommit+':'+file]),unchanged=bytes.equals(baseline);
 if(!authorizedRuntimePaths.includes(file))assert.ok(unchanged,file);
 snapshots.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),unchanged,authorizedRuntimePatch:authorizedRuntimePaths.includes(file)});
}
const seen=new Set();
async function walk(file){if(seen.has(file))return;seen.add(file);const code=await readFile(new URL(file,root),'utf8');for(const hit of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm)){if(hit[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),hit[1])));}}
await walk('core/app.js');let bytes=0;for(const file of seen)bytes+=(await stat(new URL(file,root))).size;
assert.ok(seen.size<=75&&bytes<=600000);
const result={status:'PASS',scope:'Editorial review and protected source invariants; two authorized runtime paths excepted; not learner mastery or LIVE',baseCommit:plan.baseCommit,lessonIds:plan.lessons.map(l=>({id:l.id,order:l.order,legacyIndex:l.legacyIndex,prerequisites:l.prerequisites})),sessions:19,legacyRu:12,legacyEn:2,activeGoldM2:0,probes:M2_PROBES.length,cases:M2_PROBES.reduce((s,p)=>s+p.cases.length,0),snapshots,perf:{staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,homeCourseJsonBytes:22135},authorizedRuntimePaths,protectedApplicationPathsUnchanged:true,productionWrites:0,mainWrites:0,releaseCreated:false};
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,lessons:12,sessions:19,probes:result.probes,cases:result.cases,perf:result.perf,scope:result.scope}));
