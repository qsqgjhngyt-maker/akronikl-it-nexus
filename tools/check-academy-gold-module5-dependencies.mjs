// M5-0: никакой незаметной регистрации уроков или правки работающего продукта.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {M5_PROBES,M5_CASE_COUNT} from '../tests/fixtures/cpp-module5-probes.mjs';
import {CPP_LEGACY_LESSON_IDS} from '../core/storage.js';
const plan=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE5_DEPENDENCIES.json')),c=JSON.parse(await readFile('courses/cpp/curriculum.json'));
const git=(...a)=>execFileSync('git',a,{maxBuffer:64000000}),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(plan.baseCommit,'065606a788198045cadf250fea663246ddbb2d56');assert.equal(c.programVersion,plan.baseProgramVersion);assert.equal(c.lessons.length,50);
assert.equal(plan.topics.length,9);assert.equal(plan.targetLocaleObjects,18);assert.equal(plan.newProgressIdsAssigned,0);
assert.deepEqual(plan.topics.filter(t=>t.stableId).map(t=>t.stableId),c.sections.find(s=>s.id===plan.moduleId).lessonIds);
assert.equal(plan.topics.filter(t=>!t.stableId).length,6);
const earlier=new Set(c.sections.filter(s=>s.order<5).map(s=>s.id)),seen=new Set(c.lessons.filter(l=>earlier.has(l.sectionId)).map(l=>l.id));
for(const t of plan.topics){
 assert.ok(!seen.has(t.key));for(const d of t.prerequisites)assert.ok(seen.has(d),'Будущая/неизвестная зависимость '+t.key+' <- '+d);
 assert.ok(t.introduceBeforeUse&&t.scaffoldPolicy&&t.doNotRequire&&t.theoryAndOutcome&&t.laboratory);
 assert.ok(M5_PROBES.some(p=>p.topics.includes(t.key)),'Нет runtime проверки '+t.key);
 if(t.stableId){const old=c.lessons.find(l=>l.id===t.stableId);assert.equal(old.legacyIndex,t.legacyIndex);assert.equal(old.order,t.legacyOrder);assert.equal(old.sectionId,plan.moduleId);}
 else assert.ok(!c.lessons.some(l=>l.id===t.key),'Редакционный ключ выдан как progress ID');seen.add(t.key);
}
assert.ok(!plan.topics.find(t=>t.key==='M5-A5').prerequisites.includes('M5-A4'));
for(const id of CPP_LEGACY_LESSON_IDS)assert.ok(c.lessons.some(l=>l.id===id));
assert.equal(new Set(M5_PROBES.map(p=>p.id)).size,M5_PROBES.length);
for(const p of M5_PROBES){assert.ok(p.cases.length&&p.source.includes('int main('));for(const x of p.cases){assert.equal(typeof x.stdin,'string');assert.equal(typeof (p.expectation==='compile-error'?x.diagnostic:x.stdout),'string');}}
const allowed=f=>f==='docs/CPP_GOLD_PRACTICE_UX_2026-10-26_RU.md'||f==='docs/ru/03-content/CPP_GOLD_MODULE4_MASTER_HANDOFF_RU.md'||/^docs\/ru\/03-content\/CPP_(?:GOLD_)?MODULE5[^/]*\.(?:json|md|txt)$/.test(f)||/^tools\/check-academy-gold-module5-[^/]+\.mjs$/.test(f)||/^tests\/academy-gold-module5-[^/]+\.mjs$/.test(f)||f==='tests/fixtures/cpp-module5-probes.mjs'||f==='.github/workflows/academy-gold-cpp-module-5-preflight.yml';
const changes=git('diff','--name-only',plan.baseCommit).toString().trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean);
for(const f of [...changes,...untracked])assert.ok(allowed(f),'Вне M5-0 scope: '+f);
const protectedPaths=['core','courses','sandbox','project-studio','sync','server-access','pwa','styles','effects','locales','assets','collaboration','feedback','akronikl','releases','entry-assets','version.json','project.json','release-candidate.json','index.html','nexus-shell.html','offline.html','service-worker.js','manifest.webmanifest','BUILD_MANIFEST.json'];
git('diff','--exit-code',plan.baseCommit,'--',...protectedPaths);
assert.equal(git('ls-files','--others','--exclude-standard','--',...protectedPaths).toString().trim(),'');
const snapshots=[];for(const f of ['core/storage.js','core/migrations/cpp-v7.js','core/account-storage.js','sync/cloud-sync.js','project-studio/project-store.js','pwa/offline-entry.js','sandbox/provider-contract.js','sandbox/runtime-router.js','sandbox/providers/wasm-runtime.js','sandbox/workers/wasm-runtime-worker.js','core/academy-gold-catalog.js','courses/cpp/curriculum.json','version.json','release-candidate.json']){const b=await readFile(f);assert.ok(b.equals(git('show',plan.baseCommit+':'+f)));snapshots.push({file:f,bytes:b.length,sha256:hash(b),unchanged:true});}
const visited=new Set();async function walk(f){if(visited.has(f))return;visited.add(f);const code=await readFile(f,'utf8');for(const x of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(x[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(f),x[1])));}
await walk('core/app.js');let bytes=0;for(const f of visited)bytes+=(await stat(f)).size;assert.ok(visited.size<=75&&bytes<=600000);
let outlineBytes=0;for(const f of ['courses/cpp/manifest.json','courses/cpp/curriculum.json'])outlineBytes+=(await stat(f)).size;assert.ok(outlineBytes<=30000);
const out=path.resolve(process.env.NEXUS_M5_EVIDENCE||'academy-gold-m5-evidence');await mkdir(out,{recursive:true});
const result={status:'PASS',stage:'M5-0-dependencies',baseCommit:plan.baseCommit,checkoutHead:git('rev-parse','HEAD').toString().trim(),dagNodes:9,existingIds:3,plannedUnassigned:6,currentIds:50,legacyIds:40,registeredGoldObjects:0,prerequisiteAliasResolution:plan.prerequisiteResolution,templatesDoNotRequireEH:true,programs:M5_PROBES.length,cases:M5_CASE_COUNT,probeContracts:M5_PROBES.map(p=>({id:p.id,sha256:hash(p.source),contractSha256:hash(JSON.stringify(p))})),snapshots,changedAuditFiles:[...new Set([...changes,...untracked])],productUnchanged:true,perf:{status:'PASS',staticModules:visited.size,staticBytes:bytes,capModules:75,capBytes:600000,outlineFiles:2,outlineBytes,capOutlineBytes:30000,fieldTimingMeasured:false},mainWrites:0,productionWrites:0,officialRelease:false};
await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,snapshots:undefined,probeContracts:undefined,changedAuditFiles:undefined}));
