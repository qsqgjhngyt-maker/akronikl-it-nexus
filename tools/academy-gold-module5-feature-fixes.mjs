// Два точных unpublished исправления; опубликованные bytes и C++/Identity source сохраняются.
import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import path from'node:path';
const root=path.resolve(import.meta.dirname,'..'),git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:128*1024*1024});
const hash=b=>createHash('sha256').update(b).digest('hex');
export const M5_FEATURE_FIXES=Object.freeze({base:'af00e5d36f6f529ec478e78b01146e9e98a9f5d1',main:'5e0e290c9bf74dde87f3169b9d7e122952fd0c57',receiptSha256:'45aadab9c437b409d1d006d59ba2b300faa307a8b6d3dda12ea60262678ac293'});
export function verifyM5FeatureBytes(r,b){assert.ok(!/^(?:[A-Za-z]:|[\\/])/.test(r.file)&&!r.file.split('/').includes('..'));assert.equal(b.length,r.bytes,r.file);assert.equal(hash(b),r.sha256,r.file);}
async function receipt(){
 const bytes=await readFile(path.join(root,'docs/ru/03-content/CPP_MODULE5_FEATURE_FIX_SCOPE.json'));assert.equal(hash(bytes),M5_FEATURE_FIXES.receiptSha256,'Scope не может сам расширить разрешённые изменения');const r=JSON.parse(bytes);
 assert.equal(r.base,M5_FEATURE_FIXES.base);assert.equal(r.publishedMain,M5_FEATURE_FIXES.main);assert.equal(r.publishable,false);assert.equal(r.officialRelease,false);
 return r;
}
export async function m5FeatureFixScope(){
 const r=await receipt();
 assert.deepEqual(r.sourceFiles.map(x=>x.file),['pwa/offline.css','pwa/client.js']);const actual=await Promise.all(r.sourceFiles.map(x=>readFile(path.join(root,x.file))));
 if(actual.every((b,i)=>hash(b)===r.sourceFiles[i].beforeSha256))return null;
 const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim();assert.equal(branch,r.branch,'Unpublished patch разрешён только в feature');
 for(const[x,i]of r.sourceFiles.map((x,i)=>[x,i])){verifyM5FeatureBytes(x,actual[i]);const old=git('show',r.base+':'+x.file);assert.equal(hash(old),x.beforeSha256);assert.equal(old.length,x.beforeBytes);}
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','runtime-packs','styles','effects','locales','assets','collaboration','feedback','akronikl','releases','entry-assets','manifest.webmanifest','index.html','nexus-shell.html','offline.html','version.json','release-candidate.json','project.json','BUILD_MANIFEST.json','service-worker.js','tools/build-ui1a-release.mjs'];
 git('diff','--exit-code',r.base,'--',...roots,...r.sourceFiles.map(x=>':(exclude)'+x.file));assert.equal(git('ls-files','--others','--exclude-standard','--',...roots).toString().trim(),'');
 const prior=JSON.parse(git('show',r.base+':docs/ru/03-content/CPP_MODULE5_PUBLICATION_EVIDENCE.json'));
 assert.equal(prior.main,r.publishedMain);assert.equal(prior.status,'PASS');assert.equal(prior.mainJobCount,21);assert.equal(prior.mainCi.runs.length,8);assert.ok(prior.mainCi.runs.every(x=>x.conclusion==='success'&&x.jobs.every(j=>j.conclusion==='success')));
 return{status:'PASS',unpublished:true,publishable:false,base:r.base,sourceFiles:r.sourceFiles,qaFiles:r.qaFiles,productPatchPaths:r.sourceFiles.map(x=>x.file),compilerAndCppContractsUnchanged:true,pwaTransportBehaviorChanged:true,identityCloudProjectStoreSourceUnchanged:true,publishedRootsAndGenerationsUnchanged:true,baselineCpp:{main:r.publishedMain,run:40362329173,status:'PASS_REUSED_BY_EXACT_SOURCE_AND_COMPILER_HASHES',new940CaseExecution:false},mainWrites:0,productionWrites:0,officialRelease:false};
}
export async function verifyM5FeatureQaBuild(dir,scope,{readOutput=f=>readFile(path.join(dir,f))}={}){
 assert.ok(scope?.unpublished);const trusted=await receipt();assert.deepEqual(scope.qaFiles,trusted.qaFiles,'QA manifest не предоставляет authority');const old=JSON.parse(await readFile(path.join(root,'BUILD_MANIFEST.json'))),nextBytes=await readOutput('BUILD_MANIFEST.json'),next=JSON.parse(nextBytes);
 const changes=new Map(scope.qaFiles.map(r=>[r.file,r]));assert.equal(changes.size,6);for(const r of changes.values())verifyM5FeatureBytes(r,await readOutput(r.file));
 const expected=structuredClone(old);for(const r of expected.files)if(changes.has(r.file)){const n=changes.get(r.file);r.bytes=n.bytes;r.sha256=n.sha256;}assert.deepEqual(next,expected,'Только две source правки и их точные derived bytes');
 for(const r of next.files)verifyM5FeatureBytes(r,await readOutput(r.file));
 const normalize=b=>b.toString().replace(/^  var define_NEXUS_PWA_CONFIG_default = .+;$/m,'  var define_NEXUS_PWA_CONFIG_default = VERIFIED_CONFIG;');
 assert.equal(normalize(await readOutput('service-worker.js')),normalize(await readFile(path.join(root,'service-worker.js'))),'Private/cache policy body SW не меняется');
 return{status:'PASS',qaOnly:true,publishable:false,files:next.files.length,changedPublicFiles:scope.qaFiles.map(x=>x.file),publishedFilesRewritten:0};
}
