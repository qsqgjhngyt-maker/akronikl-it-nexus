// Узкое разрешение владельца на два P1. Исторические release bytes не обновляются.
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
export const M3_PRODUCT_PATHS=Object.freeze(['core/app.js','core/learning-views.js','core/migrations/cpp-v7.js','core/storage.js','pwa/local-editor.js','pwa/offline-entry.js','sandbox/code-studio.js','sandbox/code-workspace.js','sandbox/provider-contract.js','sandbox/providers/wasm-runtime.js','sandbox/runtime-assets.js','sandbox/runtime-files.js','sandbox/sandbox.js','sandbox/workers/wasm-runtime-worker.js','styles/app.css']);
export async function m3FixScope(){
 let scope;try{scope=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE3_FIX_SCOPE.json','utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}
 assert.equal(scope.baseCommit,'98b884f70c53bac3502b209112d0d3f19e401699');assert.equal(scope.auditCommit,'6f6122f807f7ad5917526b9fbf94b89ec0aa443b');
 assert.deepEqual(scope.productPaths.map(p=>p.file).sort(),[...M3_PRODUCT_PATHS].sort());
 const branch=process.env.GITHUB_REF_NAME||execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();assert.equal(branch,'feature/academy-gold-standard-cpp-module-3');
 const sha=b=>createHash('sha256').update(b).digest('hex');
 for(const item of scope.productPaths){assert.equal(sha(await readFile(item.file)),item.sha256,item.file);if(item.beforeSha256)assert.equal(sha(execFileSync('git',['show',scope.baseCommit+':'+item.file])),item.beforeSha256,item.file)}
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 execFileSync('git',['diff','--exit-code',scope.baseCommit,'--',...roots,...M3_PRODUCT_PATHS.map(f=>':(exclude)'+f)],{stdio:'pipe'});
 const extra=execFileSync('git',['ls-files','--others','--exclude-standard','--',...roots],{encoding:'utf8'}).trim().split('\n').filter(Boolean);for(const f of extra)assert.ok(M3_PRODUCT_PATHS.includes(f),'Unapproved new product file: '+f);
 const before=execFileSync('git',['show',scope.baseCommit+':core/migrations/cpp-v7.js'],{encoding:'utf8'}),after=await readFile('core/migrations/cpp-v7.js','utf8');
 const migration=s=>s.slice(s.indexOf('export function importLegacyCppV7()'),s.indexOf('export function getCppProgress()')<0?s.indexOf('export function getCppProgress('):s.indexOf('export function getCppProgress()')).trim();assert.equal(migration(after),migration(before),'Legacy import body changed');
 const result={status:'PASS',baseCommit:scope.baseCommit,auditCommit:scope.auditCommit,productPatchPaths:M3_PRODUCT_PATHS,sourceHashesVerified:true,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,curriculumAndLegacyQuizUnchanged:true,publishedRootsAndGenerationsUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false};
 const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'M3_SCOPE.json'),JSON.stringify(result,null,2)+'\n');return result;
}
