// M4-0 — строгий аудит неизменённого продукта, а не регистрация Gold объектов.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';import path from 'node:path';
import {M4_PROBES,M4_CASE_COUNT} from '../tests/fixtures/cpp-module4-probes.mjs';
import {CPP_LEGACY_LESSON_IDS} from '../core/storage.js';
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const plan=await json('docs/ru/03-content/CPP_MODULE4_DEPENDENCIES.json'),curriculum=await json('courses/cpp/curriculum.json');
assert.equal(plan.baseCommit,'03c8a7ba1306c59f35b83ea5650ae73b71988272');
if(['cpp-gold-m4-v1','cpp-gold-m5-v1'].includes(curriculum.programVersion)){await import('./check-academy-gold-module4-authoring.mjs')}else{
assert.equal(curriculum.programVersion,plan.baseProgramVersion);assert.equal(curriculum.lessons.length,45);
assert.equal(plan.topics.length,8);assert.equal(plan.targetLocaleObjects,16);assert.equal(plan.newProgressIdsAssigned,0);
const old=plan.topics.filter(t=>t.stableId),additional=plan.topics.filter(t=>!t.stableId),section=curriculum.sections.find(s=>s.id===plan.moduleId);
assert.equal(old.length,3);assert.equal(additional.length,5);assert.deepEqual(old.map(t=>t.stableId),section.lessonIds);
const earlierSections=new Set(curriculum.sections.filter(s=>s.order<section.order).map(s=>s.id));
const visited=new Set(curriculum.lessons.filter(l=>earlierSections.has(l.sectionId)).map(l=>l.id));
for(const t of plan.topics){
 assert.ok(!visited.has(t.key),'Повтор '+t.key);
 for(const dep of t.prerequisites)assert.ok(visited.has(dep),'Будущая/неизвестная зависимость '+t.key+' <- '+dep);
 assert.ok(plan.introPolicy[t.key]?.length>=2);assert.ok(t.theoryAndOutcome&&t.laboratory&&t.capabilityGate);
 assert.ok(M4_PROBES.some(p=>p.topics.includes(t.key)),'Нет runtime проверки '+t.key);
 if(t.stableId){const lesson=curriculum.lessons.find(l=>l.id===t.stableId);assert.equal(lesson.legacyIndex,t.legacyIndex);assert.equal(lesson.order,t.legacyOrder);assert.equal(lesson.sectionId,plan.moduleId);}
 else{assert.equal(t.kind,'proposed-addition');assert.equal(t.legacyIndex,null);assert.equal(t.legacyOrder,null);assert.ok(!curriculum.lessons.some(l=>l.id===t.key));}
 visited.add(t.key);
}
assert.equal(new Set(M4_PROBES.map(p=>p.id)).size,M4_PROBES.length);
for(const p of M4_PROBES){assert.ok(p.source.includes('int main('));assert.ok(p.cases.length);for(const c of p.cases){assert.equal(typeof c.stdin,'string');if(p.expectation==='compile-error')assert.ok(c.diagnostic);else assert.equal(typeof c.stdout,'string');}}
// Изменять разрешено только M4 средства проверки/документы. Даже незаметный extra product file запрещён.
const product=['core','courses','pwa','sandbox','project-studio','sync','server-access','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','project.json','version.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
execFileSync('git',['diff','--exit-code',plan.baseCommit,'--',...product],{stdio:'pipe'});
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','--',...product],{encoding:'utf8'}).trim();assert.equal(untracked,'','Новый product файл запрещён в M4-0');
const snapshots=[];for(const file of ['core/storage.js','core/migrations/cpp-v7.js','core/account-storage.js','sync/cloud-sync.js','pwa/offline-entry.js','project-studio/project-store.js','sandbox/provider-contract.js','sandbox/runtime-router.js','sandbox/providers/wasm-runtime.js','sandbox/workers/wasm-runtime-worker.js','courses/cpp/curriculum.json','core/academy-gold-catalog.js','version.json','release-candidate.json']){
 const b=await readFile(file),old=execFileSync('git',['show',plan.baseCommit+':'+file]);assert.ok(b.equals(old),file);snapshots.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),unchanged:true});
}
for(const id of CPP_LEGACY_LESSON_IDS)assert.ok(curriculum.lessons.some(l=>l.id===id));
const seen=new Set();async function walk(file){if(seen.has(file))return;seen.add(file);const code=await readFile(file,'utf8');for(const h of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(h[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(file),h[1])));}
await walk('core/app.js');let bytes=0;for(const f of seen)bytes+=(await stat(f)).size;assert.ok(seen.size<=75&&bytes<=600000);
const probes=M4_PROBES.map(p=>({id:p.id,topics:p.topics,cases:p.cases.length,sourceSha256:createHash('sha256').update(p.source).digest('hex'),bundleSha256:createHash('sha256').update(JSON.stringify({source:p.source,files:p.files||{},metadata:p.metadata||{},cases:p.cases})).digest('hex')}));
const result={status:'PASS',stage:'M4-0',baseCommit:plan.baseCommit,dagNodes:8,stableIds:3,proposedUnassigned:5,currentIds:45,legacyIds:40,newGoldObjects:0,probes:M4_PROBES.length,cases:M4_CASE_COUNT,prerequisiteAliasResolved:plan.prerequisiteResolution,snapshots,probeContracts:probes,perf:{status:'PASS',staticModules:seen.size,staticBytes:bytes,capModules:75,capBytes:600000,scope:'Статический NEXUS-PERF-01; runtime Home проверяется отдельно'},productUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false};
const out=path.resolve(process.env.NEXUS_M4_EVIDENCE||'academy-gold-m4-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,snapshots:undefined,probeContracts:undefined}));

}
