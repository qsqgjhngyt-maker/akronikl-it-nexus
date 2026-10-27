// M6-0 — только аудит. Разрешения M5 не расширяются.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir,stat}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';import path from'node:path';
import{CPP_LEGACY_LESSON_IDS}from'../core/storage.js';import{M6_PROBES,M6_CASE_COUNT}from'../tests/fixtures/cpp-module6-probes.mjs';
export const M6_BASE='d76d1613a1fbf6726d453e40366c306ea502d4c7',M5_HANDOFF='92c14f04515f012d2554c617350921c363c330bb';
export function validateM6Plan(p,c){
 assert.equal(p.baseCommit,M6_BASE);assert.equal(p.branch,'feature/academy-gold-standard-cpp-module-6');assert.equal(p.newProgressIdsAssigned,0);assert.equal(p.newContentObjectsRegistered,0);assert.equal(p.targetLocaleObjects,24);assert.equal(p.topics.length,12);
 assert.equal(c.programVersion,p.baseProgramVersion);assert.equal(c.lessons.length,56);assert.equal(p.topics.filter(t=>!t.requiresGui).length,10);assert.equal(p.topics.filter(t=>t.requiresGui).length,2);
 const section=c.sections.find(s=>s.id===p.moduleId);assert.deepEqual(section.lessonIds,['cpp.visual-event-model']);assert.equal(section.order,6);
 const prior=new Set(c.sections.filter(s=>s.order<6).map(s=>s.id)),seen=new Set(c.lessons.filter(l=>prior.has(l.sectionId)).map(l=>l.id)),keys=new Set();
 for(const t of p.topics){assert.equal(t.status,'PLANNED');assert.ok(!keys.has(t.key),'Повтор темы');keys.add(t.key);for(const d of t.prerequisites)assert.ok(seen.has(d),'Будущая/неизвестная зависимость '+t.key+' <- '+d);
  for(const k of ['introduceBeforeUse','scaffoldPolicy','doNotRequire','theoryAndOutcome','laboratory'])assert.ok(t[k],'Нет '+k+' у '+t.key);
  if(t.stableId){assert.equal(t.stableId,p.stableExistingId);const old=c.lessons.find(l=>l.id===t.stableId);assert.deepEqual([old.legacyIndex,old.order,old.sectionId],[39,40,p.moduleId]);}
  else{assert.equal(t.progressIdAssigned,false);assert.ok(!c.lessons.some(l=>l.id===t.key),'Редакционный ключ зарегистрирован');}
  const matching=M6_PROBES.filter(x=>x.topics.includes(t.key));assert.ok(matching.length,'Нет capability probe '+t.key);for(const id of t.probes)assert.ok(matching.some(x=>x.id===id),'Неверный probe '+id);seen.add(t.key);
 }
 assert.equal(p.topics.filter(t=>t.stableId).length,1);for(const probe of M6_PROBES)for(const k of probe.topics)assert.ok(keys.has(k));
 for(const id of CPP_LEGACY_LESSON_IDS)assert.ok(c.lessons.some(l=>l.id===id));return true;
}
export async function checkM6Dependencies(){
 const git=(...args)=>execFileSync('git',args,{maxBuffer:128*1024*1024}),hash=b=>createHash('sha256').update(b).digest('hex');
 const p=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE6_DEPENDENCIES.json')),c=JSON.parse(await readFile('courses/cpp/curriculum.json'));validateM6Plan(p,c);
 assert.equal(git('branch','--show-current').toString().trim(),p.branch);git('merge-base','--is-ancestor',M6_BASE,'HEAD');git('merge-base','--is-ancestor',M5_HANDOFF,'HEAD');
 const imported=['CPP_GOLD_MODULE5_HEADER_PUBLICATION_RU.md','CPP_GOLD_MODULE5_MASTER_HANDOFF_RU.md','CPP_MODULE5_HEADER_DEVICE_CHECKLIST_RU.txt','CPP_MODULE5_HEADER_PUBLICATION_EVIDENCE.json','CPP_MODULE5_HEADER_PUBLICATION_ROUTING_RU.md'].map(f=>'docs/ru/03-content/'+f);
 const allowed=f=>imported.includes(f)||/^docs\/ru\/03-content\/CPP_(?:GOLD_)?MODULE6[^/]*\.(?:json|md|txt)$/.test(f)||/^tools\/check-academy-gold-module6-[^/]+\.mjs$/.test(f)||/^tests\/academy-gold-module6-[^/]+\.mjs$/.test(f)||f==='tests/fixtures/cpp-module6-probes.mjs'||f==='.github/workflows/academy-gold-cpp-module-6-preflight.yml';
 const changed=git('diff','--name-only',M6_BASE).toString().trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean);for(const f of [...changed,...untracked])assert.ok(allowed(f),'За пределами M6-0 QA/docs: '+f);
 for(const f of imported)assert.deepEqual(await readFile(f),git('show',M5_HANDOFF+':'+f),'Замороженный M5 handoff '+f);
 const base=JSON.parse(git('show',M6_BASE+':courses/cpp/curriculum.json'));assert.deepEqual(c,base);assert.equal(CPP_LEGACY_LESSON_IDS.length,40);
 const snapshots=[];for(const f of ['core/storage.js','core/migrations/cpp-v7.js','core/account-storage.js','sync/cloud-sync.js','project-studio/project-store.js','pwa/offline-entry.js','sandbox/provider-contract.js','sandbox/runtime-router.js','sandbox/providers/wasm-runtime.js','sandbox/workers/wasm-runtime-worker.js','core/academy-gold-catalog.js','courses/cpp/curriculum.json','version.json','release-candidate.json']){const b=await readFile(f);assert.deepEqual(b,git('show',M6_BASE+':'+f));snapshots.push({file:f,bytes:b.length,sha256:hash(b)});}
 const visited=new Set();async function walk(f){if(visited.has(f))return;visited.add(f);const code=await readFile(f,'utf8');for(const x of code.matchAll(/(?:^|;|\n)\s*(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/gm))if(x[1].startsWith('.'))await walk(path.posix.normalize(path.posix.join(path.posix.dirname(f),x[1])));}
 await walk('core/app.js');let bytes=0;for(const f of visited)bytes+=(await stat(f)).size;const outlineBytes=(await stat('courses/cpp/manifest.json')).size+(await stat('courses/cpp/curriculum.json')).size,labsBytes=Buffer.byteLength(JSON.stringify(JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json'))));
 assert.ok(visited.size<=75&&bytes<=600000);assert.ok(outlineBytes<=30000&&labsBytes<=46000);
 const ledger=JSON.parse(await readFile(imported[3]));assert.equal(ledger.main,M6_BASE);assert.equal(ledger.ci.status,'PASS');assert.ok(ledger.ci.runs.every(r=>r.conclusion==='success'&&r.jobs.every(j=>j.conclusion==='success')));
 const out=path.resolve(process.env.NEXUS_M6_EVIDENCE||'academy-gold-m6-evidence');await mkdir(out,{recursive:true});
 const result={status:'PASS',stage:'M6-0-dependencies',baseCommit:M6_BASE,checkoutHead:git('rev-parse','HEAD').toString().trim(),productUnchanged:true,dagNodes:12,coreTopics:10,externalGuiTopics:2,currentIds:56,legacyIds:40,currentGoldLessons:55,newGoldObjects:0,newProgressIdsAssigned:0,programs:M6_PROBES.length,cases:M6_CASE_COUNT,probeContracts:M6_PROBES.map(p=>({id:p.id,sha256:hash(p.source),contractSha256:hash(JSON.stringify(p))})),snapshots,changedAuditFiles:[...new Set([...changed,...untracked])],priorM1M5Regression:{method:'exact product identity to frozen M5 publication; no new 940-case claim',ledgerSha256:hash(await readFile(imported[3])),runs:ledger.ci.runs.length,jobs:ledger.ci.runs.flatMap(r=>r.jobs).length},perf:{status:'PASS',staticModules:visited.size,staticBytes:bytes,capModules:75,capBytes:600000,outlineBytes,capOutlineBytes:30000,labsBytes,capLabsBytes:46000,fieldTimingMeasured:false},mainWrites:0,productionWrites:0,officialRelease:false};
 await writeFile(path.join(out,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,snapshots:undefined,probeContracts:undefined,changedAuditFiles:undefined}));return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await checkM6Dependencies();
