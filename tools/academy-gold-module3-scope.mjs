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
 let navigation=null;try{navigation=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE3_NAVIGATION_SCOPE.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const navMap=new Map((navigation?.productPaths||[]).map(p=>[p.file,p]));
 if(navigation){
  assert.equal(navigation.baseCommit,'593fc844880b11a47e9960264cc83da7bf7d2ffc');assert.equal(navigation.stage,'M3-07');
  const allowed=['core/course-registry.js','core/offline-assets.js','core/nexus-learning-discovery.js','core/learning-views.js','core/academy-gold-presentation.js','pwa/offline-entry.js','courses/cpp/data/gold-laboratories.json'];
  assert.deepEqual([...navMap.keys()].sort(),allowed.sort());
  for(const item of navMap.values()){
   assert.equal(sha(await readFile(item.file)),item.sha256,item.file);
   if(item.beforeSha256)assert.equal(sha(execFileSync('git',['show',navigation.baseCommit+':'+item.file])),item.beforeSha256,item.file);
   else assert.equal(item.file,'courses/cpp/data/gold-laboratories.json');
  }
 }
 let authoring=null;try{authoring=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE3_AUTHORING_SCOPE.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const authored=authoring?.productPaths||[],authorMap=new Map(authored.map(p=>[p.file,p]));
 if(authoring){
  assert.equal(authoring.baseCommit,'cf5c0d8a93c14cc98b56aad3207f2793280a7a83');assert.equal(authoring.stage,'M3-1');
  const allowed=['core/academy-gold-catalog.js','core/academy-gold-presentation.js','core/learning-views.js','core/nexus-learning-discovery.js','courses/cpp/manifest.json','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json'];
  const spec=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE3_AUTHORING.json','utf8'));
  for(const l of spec.lessons)for(const locale of ['ru','en'])allowed.push('courses/cpp/gold/structured/'+l.id.slice(4)+'.'+locale+'.json');
  assert.equal(spec.lessons.length,18);assert.equal(spec.lessons.filter(l=>l.added).length,5);assert.equal(spec.programVersion,'cpp-gold-m3-v1');
  assert.deepEqual(authored.map(p=>p.file).sort(),allowed.sort());
  for(const item of authored){const bytes=navMap.has(item.file)?execFileSync('git',['show',navigation.baseCommit+':'+item.file],{maxBuffer:8388608}):await readFile(item.file);assert.equal(sha(bytes),item.sha256,item.file);if(item.beforeSha256)assert.equal(sha(execFileSync('git',['show',authoring.baseCommit+':'+item.file],{maxBuffer:8388608})),item.beforeSha256,item.file)}
  // Дополнение пяти строк не разрешает менять ни один прежний код, quiz или ID.
  for(const locale of ['ru','en']){const file='courses/cpp/data/lessons.'+locale+'.json',before=JSON.parse(execFileSync('git',['show',authoring.baseCommit+':'+file],{encoding:'utf8',maxBuffer:8388608})),after=JSON.parse(await readFile(file,'utf8'));assert.deepEqual(after.lessons.slice(0,before.lessons.length),before.lessons,file);assert.equal(after.lessons.length,before.lessons.length+5)}
  const before=JSON.parse(execFileSync('git',['show',authoring.baseCommit+':courses/cpp/curriculum.json'],{encoding:'utf8'})),after=JSON.parse(await readFile('courses/cpp/curriculum.json','utf8'));
  for(const [i,old]of before.lessons.entries()){const now=after.lessons[i];for(const key of ['id','legacyIndex','order','sectionId','title','status'])assert.deepEqual(now[key],old[key],old.id+' '+key)}
  assert.equal(after.lessons.length,45);assert.equal(after.programVersion,'cpp-gold-m3-v1');
 }
 for(const item of scope.productPaths){assert.equal(sha(await readFile(item.file)),navMap.get(item.file)?.sha256||authorMap.get(item.file)?.sha256||item.sha256,item.file);if(item.beforeSha256)assert.equal(sha(execFileSync('git',['show',scope.baseCommit+':'+item.file])),item.beforeSha256,item.file)}
 const permitted=[...new Set([...M3_PRODUCT_PATHS,...authored.map(p=>p.file),...navMap.keys()])];
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 execFileSync('git',['diff','--exit-code',scope.baseCommit,'--',...roots,...permitted.map(f=>':(exclude)'+f)],{stdio:'pipe'});
 const extra=execFileSync('git',['ls-files','--others','--exclude-standard','--',...roots],{encoding:'utf8'}).trim().split('\n').filter(Boolean);for(const f of extra)assert.ok(permitted.includes(f),'Unapproved new product file: '+f);
 const before=execFileSync('git',['show',scope.baseCommit+':core/migrations/cpp-v7.js'],{encoding:'utf8'}),after=await readFile('core/migrations/cpp-v7.js','utf8');
 const migration=s=>s.slice(s.indexOf('export function importLegacyCppV7()'),s.indexOf('export function getCppProgress()')<0?s.indexOf('export function getCppProgress('):s.indexOf('export function getCppProgress()')).trim();assert.equal(migration(after),migration(before),'Legacy import body changed');
 const result={status:'PASS',baseCommit:scope.baseCommit,auditCommit:scope.auditCommit,productPatchPaths:permitted,authoring:!!authoring,navigationFix:!!navigation,sourceHashesVerified:true,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,legacyRowsAndQuizUnchanged:true,curriculumExpanded:!!authoring,publishedRootsAndGenerationsUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false};
 const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'M3_SCOPE.json'),JSON.stringify(result,null,2)+'\n');return result;
}
