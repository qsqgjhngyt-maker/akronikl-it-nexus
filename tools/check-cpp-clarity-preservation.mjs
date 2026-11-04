import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const base='ee2787c0cd92da2ad1d5e79df5e2bfadab2c3dd6',git=(...args)=>execFileSync('git',['-c','core.longpaths=true',...args],{maxBuffer:64e6}),sha=b=>createHash('sha256').update(b).digest('hex');
const fixed=['courses/cpp/curriculum.json','courses/cpp/manifest.json','courses/cpp/content-package.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/gold-laboratories-m6.json','core/storage.js','core/account-storage.js','pwa/local-vault.js','pwa/offline-learning.js','pwa/local-editor.js','pwa/runtime-manifest.js','tools/check-cpp-course-perf.mjs','release-candidate.json','version.json','index.html','service-worker.js'];
const preserved=[];for(const file of fixed){const a=git('show',base+':'+file),b=await readFile(file);assert.deepEqual(b,a,file);preserved.push({file,sha256:sha(b),bytes:b.length});}
const names=git('diff','--name-only',base,'--').toString().trim().split('\n').filter(Boolean);
const sourceAllow=new Set(['core/academy-gold-presentation.js','core/cpp-clarity-presentation.js','core/learning-views.js','core/app.js','core/nexus-learning-discovery.js','styles/academy-gold.css','pwa/offline-entry.js','courses/cpp/data/gold-laboratories.json','tools/build-academy-gold-laboratories.mjs','.github/workflows/cpp-clarity-01.yml']);
for(const name of names)assert.ok(sourceAllow.has(name)||/^courses\/cpp\/gold\/(algorithms|basics)\//.test(name)||/^courses\/cpp\/gold\/structured\/functions-contracts\.(ru|en)\.json$/.test(name)||/^(tests\/(helpers\/)?cpp-clarity-|tools\/(check|build)-cpp-clarity|docs\/ru\/03-content\/cpp-clarity-01\/)/.test(name),'Out of scope: '+name);
const protectedAreas=['courses/1c-enterprise','courses/onec','courses/onec-education','server-access','cloudflare','sync','sandbox','project-studio','core/migrations','releases','entry-assets','runtime-packs'];
for(const area of protectedAreas)assert.equal(git('diff','--name-only',base,'--',area).toString(),'','Protected area: '+area);
const current=JSON.parse(await readFile('courses/cpp/curriculum.json')),old=JSON.parse(git('show',base+':courses/cpp/curriculum.json'));
assert.deepEqual(current,old);assert.equal(current.lessons.length,67);assert.equal(current.lessons.filter(x=>Number.isInteger(x.legacyIndex)).length,40);
const result={status:'PASS',baseline:base,head:git('rev-parse','HEAD').toString().trim(),topicIds:67,legacyIndices:40,protectedAreas,preserved,changedTrackedPaths:names,personalDataAccess:false,productionWrites:false};
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'PRESERVATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,preserved:preserved.length,changedTrackedPaths:names.length}));
