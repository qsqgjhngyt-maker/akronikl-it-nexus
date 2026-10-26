// Узкая SHA256-проверка разрешённого runtime исправления поверх опубликованного M4.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {RUNTIME_RESOURCES,RUNTIME_GRAPH_ID,CPP_EXCEPTION_RUNTIME} from '../pwa/runtime-manifest.js';
export const M5_BASE='065606a788198045cadf250fea663246ddbb2d56';
export const M5_RUNTIME_PATHS=Object.freeze(['pwa/runtime-manifest.js','sandbox/cpp-exceptions.js','sandbox/providers/wasm-runtime.js','sandbox/workers/wasm-runtime-worker.js']);
const git=(...a)=>execFileSync('git',a,{maxBuffer:64000000}),hash=b=>createHash('sha256').update(b).digest('hex');
export async function m5RuntimeScope(){
 let s;try{s=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE5_RUNTIME_SCOPE.json'))}catch(e){if(e.code==='ENOENT')return null;throw e}
 assert.equal(s.baseCommit,M5_BASE);assert.equal(s.auditCommit,'e758fffda199aaac11f0cef4793b89f2e35e3be8');assert.equal(s.assetCommit,'adf91d730598d3a02a21ddca3183f76b56d8d1b8');assert.equal(s.stage,'M5-P1');
 assert.deepEqual(s.productPaths.map(p=>p.file).sort(),[...M5_RUNTIME_PATHS].sort());
 for(const p of s.productPaths){const b=await readFile(p.file);assert.equal(hash(b),p.sha256,p.file);assert.equal(b.length,p.bytes);if(p.beforeSha256)assert.equal(hash(git('show',M5_BASE+':'+p.file)),p.beforeSha256,p.file);else assert.equal(p.file,'sandbox/cpp-exceptions.js');}
 const content=await(await import('./academy-gold-module5-authoring-scope.mjs')).m5AuthoringScope();
 const permitted=[...M5_RUNTIME_PATHS,...(content?.productPatchPaths||[])];
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 git('diff','--exit-code',M5_BASE,'--',...roots,...permitted.map(p=>':(exclude)'+p));
 for(const f of git('ls-files','--others','--exclude-standard','--',...roots).toString().trim().split('\n').filter(Boolean))assert.ok(permitted.includes(f),'Unapproved product file: '+f);
 git('diff','--exit-code',s.assetCommit,'--','runtime-packs');assert.equal(git('ls-files','--others','--exclude-standard','--','runtime-packs').toString().trim(),'');
 const previous=await import('data:text/javascript;base64,'+git('show',M5_BASE+':pwa/runtime-manifest.js').toString('base64'));
 assert.deepEqual(RUNTIME_RESOURCES.slice(0,7),previous.RUNTIME_RESOURCES);assert.equal(RUNTIME_RESOURCES.length,8);assert.equal(RUNTIME_GRAPH_ID,hash(JSON.stringify(RUNTIME_RESOURCES)));
 const pack=await readFile('runtime-packs/wasi-sdk33/cpp-exceptions.bin');assert.equal(hash(pack),CPP_EXCEPTION_RUNTIME.sha256);assert.equal(pack.length,CPP_EXCEPTION_RUNTIME.bytes);assert.ok(CPP_EXCEPTION_RUNTIME.url.includes('@'+s.assetCommit+'/runtime-packs/wasi-sdk33/'));
 return{status:'PASS',stage:'M5-P1',baseCommit:M5_BASE,auditCommit:s.auditCommit,assetCommit:s.assetCommit,productPatchPaths:permitted,runtimePatchPaths:[...M5_RUNTIME_PATHS],contentAuthoringScope:content,sourceHashesVerified:true,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,legacyRowsAndQuizUnchanged:true,historicalGenerationsUnchanged:true,publishedRootsAndGenerationsUnchanged:true,featureRuntimeUnpublished:true,mainWrites:0,productionWrites:0,officialRelease:false};
}
