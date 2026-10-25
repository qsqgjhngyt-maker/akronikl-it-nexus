// Проверка редакционного графа M2-0, stable IDs и неизменности контрактов.
import assert from 'node:assert/strict';
import {m3FixScope} from './academy-gold-module3-scope.mjs';
const m3Scope=await m3FixScope(),m3Paths=m3Scope?.productPatchPaths||[];
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {M2_PROBES} from '../tests/fixtures/cpp-module2-probes.mjs';
import {goldLessonPath,GOLD_ALGORITHM_LESSONS,GOLD_BASICS_LESSONS} from '../core/academy-gold-catalog.js';
const root=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const plan=await json('docs/ru/03-content/CPP_MODULE2_DEPENDENCIES.json'),curriculum=await json('courses/cpp/curriculum.json');
const publication=(await json('release-candidate.json')).publication?.sourceCommit==='e743bd537c09e8ae5bbf09d72cd5fc4980bc92dd';
const labelPatch=(await json('release-candidate.json')).publication?.uiPatch==='remove-reference-topic-labels';
if(publication)execFileSync(process.execPath,['tools/check-academy-gold-module2-publication.mjs'],{stdio:'pipe'});
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
 for(const locale of ['ru','en']){const file=goldLessonPath(l.id,locale);assert.equal(file,'courses/cpp/gold/basics/'+l.id.slice(4)+'.'+locale+'.json');const g=await json(file);assert.equal(g.lessonId,l.id);assert.equal(g.moduleId,plan.moduleId);assert.equal(g.locale,locale);}
}
for(const p of M2_PROBES)assert.ok(plan.lessons.some(l=>l.id===p.lesson));
const ru=(await json('courses/cpp/data/lessons.ru.json')).lessons,en=(await json('courses/cpp/data/lessons.en.json')).lessons;
assert.equal(plan.lessons.filter(l=>ru.some(x=>x.id===l.id)).length,12);
assert.equal(plan.lessons.filter(l=>en.some(x=>x.id===l.id)).length,2);
assert.equal(GOLD_ALGORITHM_LESSONS.length,8);
const untouched=['core','courses','pwa','sandbox','project-studio','sync','server-access','releases','entry-assets','styles','effects','locales','release-candidate.json','version.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js'];
const authorizedRuntimePaths=['sandbox/providers/browser-runtime.js','sandbox/runtime-router.js'];
const authorizedContentPaths=['core/academy-gold-catalog.js','core/academy-gold-presentation.js','core/course-registry.js','core/offline-assets.js',...GOLD_BASICS_LESSONS.flatMap(id=>['ru','en'].map(locale=>goldLessonPath(id,locale)))];
const publicationPaths=publication?['core/app.js','core/shell-presentation.js','release-candidate.json','version.json','index.html','nexus-shell.html','offline.html','service-worker.js','releases/ui1a-cpp-gold-module2-test1-20261025','entry-assets/ui1a-cpp-gold-module2-test1-20261025',...(labelPatch?['core/learning-views.js','styles/app.css','releases/ui1a-cpp-gold-module2-test2-labels-20261025','entry-assets/ui1a-cpp-gold-module2-test2-labels-20261025']:[])]:[];
execFileSync('git',['diff','--exit-code',plan.baseCommit,'--',...untouched,...[...authorizedRuntimePaths,...authorizedContentPaths,...publicationPaths,...m3Paths].map(p=>':(exclude)'+p)],{stdio:'pipe'});
// M2 authoring не меняет уже доказанное исправление runtime.
execFileSync('git',['diff','--exit-code','1be795e391871561253afe4b201fbf1048aaaeb9','--','sandbox',...m3Paths.filter(f=>f.startsWith('sandbox/')).map(f=>':(exclude)'+f)],{stdio:'pipe'});
const snapshots=[];
for(const file of ['courses/cpp/curriculum.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','core/course-registry.js','core/app.js','pwa/offline-entry.js','core/academy-gold-catalog.js','sandbox/providers/browser-runtime.js','sandbox/providers/wasm-runtime.js','sandbox/runtime-router.js','core/storage.js','core/account-storage.js','sync/cloud-sync.js','release-candidate.json','version.json']){
 const bytes=await readFile(new URL(file,root));
 const baseline=execFileSync('git',['show',plan.baseCommit+':'+file]),unchanged=bytes.equals(baseline);
 if(![...authorizedRuntimePaths,...authorizedContentPaths,...publicationPaths,...m3Paths].includes(file))assert.ok(unchanged,file);
 snapshots.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),unchanged,authorizedM3Patch:m3Paths.includes(file),authorizedRuntimePatch:authorizedRuntimePaths.includes(file),authorizedContentIntegration:authorizedContentPaths.includes(file)});
}
const seen=new Set();
async function walk(file){if(seen.has(file))return;seen.add(file);const code=await readFile(new URL(file,root),'utf8');for(const hit of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm)){if(hit[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),hit[1])));}}
await walk('core/app.js');let bytes=0;for(const file of seen)bytes+=(await stat(new URL(file,root))).size;
assert.ok(seen.size<=75&&bytes<=600000);
const result={status:'PASS',scope:m3Scope?'M2 content and IDs unchanged; authorized M3 progress/runtime patch verified by SHA256; not LIVE':'Editorial DAG and protected source invariants; 24 Gold bodies and four integration paths authorized; runtime unchanged since 1be795e; not learner mastery or LIVE',baseCommit:plan.baseCommit,lessonIds:plan.lessons.map(l=>({id:l.id,order:l.order,legacyIndex:l.legacyIndex,prerequisites:l.prerequisites})),sessions:19,legacyRu:12,legacyEn:2,activeGoldM2:12,probes:M2_PROBES.length,cases:M2_PROBES.reduce((s,p)=>s+p.cases.length,0),snapshots,perf:{staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,homeCourseJsonBytes:(await stat(new URL('courses/cpp/curriculum.json',root))).size+(await stat(new URL('courses/cpp/manifest.json',root))).size},authorizedRuntimePaths,authorizedContentPaths,protectedApplicationPathsUnchanged:true,productionWrites:0,mainWrites:0,releaseCreated:false};
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,lessons:12,sessions:19,probes:result.probes,cases:result.cases,perf:result.perf,scope:result.scope}));
