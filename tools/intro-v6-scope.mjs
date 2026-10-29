// Новый узкий допуск поверх принятого C++ 1.0. Исторические receipts неизменны.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const ROOT=path.resolve(import.meta.dirname,'..');
export const BASE='75e24e195919e7c3d39659ba804e977d51ef5591';
export const VALIDATED='048f9773914278b86236f4bbb034d61e24df4377';
export const GENERATION='ui1a-startup-video-v6-20261029';
const bridge=new Set(['tools/intro-v6-scope.mjs','tools/check-intro-v6-ci.mjs','tools/startup-intro-ci-route.mjs','tools/check-startup-intro-ci.mjs','tools/check-startup-intro-ci-legacy.mjs','tools/check-startup-intro-delivery.mjs','tools/check-startup-intro-delivery-legacy.mjs','tests/intro-v6-scope.test.mjs','tests/intro-v6-webm-check.mjs','docs/ru/07-ui/STARTUP_VIDEO_V6_SYNC_20261029.md']);
const source=new Set(['core/startup-intro.js','core/startup-intro-assets.js','core/startup-intro-buffer.js','core/startup-intro-mobile.js','tests/startup-intro-smooth.test.mjs','tests/startup-intro-launch-browser-check.mjs','tests/startup-video-benchmark.py','tools/startup-video-apply.py','tools/startup-video-optimize.py','tools/startup-video-stage.mjs','.github/workflows/startup-video-smooth.yml','index.html','nexus-shell.html','offline.html','version.json','service-worker.js','startup-intro.json','BUILD_MANIFEST.json','release-candidate.json','docs/ru/07-ui/STARTUP_VIDEO_V6_20261029.md']);
export const allowedIntroV6ProductPath=f=>source.has(f)||f.startsWith('intro-media/cinematic-v6/')||f.startsWith('releases/'+GENERATION+'/')||f.startsWith('entry-assets/'+GENERATION+'/')||f.startsWith('docs/ru/07-ui/startup-video-v6-evidence/');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,maxBuffer:128*1024*1024});
const tree=ref=>new Map(git('ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean).map(line=>{const i=line.indexOf('\t');return[line.slice(i+1),line.slice(0,i).split(' ')[2]]}));
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export async function introV6Scope(){
 const config=JSON.parse(await readFile(path.join(ROOT,'release-candidate.json')));
 if(config.assetGeneration!==GENERATION)return null;
 git('merge-base','--is-ancestor',BASE,'HEAD');git('merge-base','--is-ancestor',VALIDATED,'HEAD');
 const ref=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim();
 assert.ok(['main','fix/startup-video-smooth-20261029'].includes(ref),'Ветка вне допуска Intro V6');
 const accepted=tree(VALIDATED),changed=git('diff','--no-renames','--name-only',BASE).toString().trim().split('\n').filter(Boolean);
 for(const file of changed){
  if(bridge.has(file))continue;
  assert.ok(allowedIntroV6ProductPath(file),'Вне changeset заставки: '+file);
  assert.ok(accepted.has(file),'Новый неподтверждённый продуктовый файл: '+file);
  assert.equal(blob(await readFile(path.join(ROOT,file))),accepted.get(file),'Изменены bytes проверенной сборки: '+file);
 }
 const raw=git('diff','--no-renames','--name-only',BASE,VALIDATED).toString().trim().split('\n').filter(Boolean);
 for(const file of raw){assert.ok(allowedIntroV6ProductPath(file),'Неверная исходная область изменения: '+file);assert.ok(changed.includes(file),'Файл проверенной сборки пропущен: '+file)}
 assert.equal(blob(await readFile(path.join(ROOT,'tools/check-startup-intro-ci-legacy.mjs'))),accepted.get('tools/check-startup-intro-ci.mjs'),'Историческая приёмка должна сохраниться побайтно');
 assert.equal(blob(await readFile(path.join(ROOT,'tools/check-startup-intro-delivery-legacy.mjs'))),accepted.get('tools/check-startup-intro-delivery.mjs'),'Историческая доставка должна сохраниться побайтно');
 const comparison=JSON.parse(await readFile(path.join(ROOT,'docs/ru/07-ui/startup-video-v6-evidence/browser-comparison.json')));
 assert.equal(comparison.rows.filter(r=>r.version==='after').length,4);
 for(const r of comparison.rows.filter(r=>r.version==='after')){assert.equal(r.reason,'ended');assert.equal(r.rebufferCount,0);assert.equal(r.frameGapsOver200ms,0);assert.equal(r.maxVideoCount,1);assert.equal(r.storagePreserved,true);assert.deepEqual(r.errors,[])}
 return {base:BASE,validatedCommit:VALIDATED,generation:GENERATION,productFiles:raw.length,checkedFiles:changed.length,identityAndContentUnchanged:true};
}
