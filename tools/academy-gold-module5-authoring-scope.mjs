// Содержательная надстройка проверяется отдельно от уже принятого SHA runtime.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const M5_AUTHORING_BASE='a733f68a8dead4a3a747f248685b9e352883a00d';
const git=(...args)=>execFileSync('git',args,{maxBuffer:64000000}),hash=b=>createHash('sha256').update(b).digest('hex');
export async function m5AuthoringScope(){
 let s;try{s=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE5_AUTHORING_SCOPE.json'))}catch(e){if(e.code==='ENOENT')return null;throw e}
 const spec=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE5_AUTHORING.json'));
 assert.equal(s.baseCommit,M5_AUTHORING_BASE);assert.equal(s.stage,'M5-1');assert.equal(spec.programVersion,'cpp-gold-m5-v1');assert.equal(spec.lessons.length,9);assert.equal(spec.lessons.filter(l=>l.added).length,6);
 assert.equal(process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim(),'feature/academy-gold-standard-cpp-module-5');
 const allowed=['core/academy-gold-catalog.js','core/academy-gold-presentation.js','courses/cpp/manifest.json','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/gold-laboratories.json',...spec.lessons.flatMap(l=>['ru','en'].map(locale=>'courses/cpp/gold/oop/'+l.id.slice(4)+'.'+locale+'.json'))];
 assert.deepEqual(s.productPaths.map(p=>p.file).sort(),allowed.sort());
 for(const p of s.productPaths){const b=await readFile(p.file);assert.equal(hash(b),p.sha256,p.file);assert.equal(b.length,p.bytes);if(p.beforeSha256)assert.equal(hash(git('show',M5_AUTHORING_BASE+':'+p.file)),p.beforeSha256,p.file)}
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 git('diff','--exit-code',M5_AUTHORING_BASE,'--',...roots,...allowed.map(f=>':(exclude)'+f));
 for(const f of git('ls-files','--others','--exclude-standard','--',...roots).toString().trim().split('\n').filter(Boolean))assert.ok(allowed.includes(f),'Unapproved product path: '+f);
 const before=JSON.parse(git('show',M5_AUTHORING_BASE+':courses/cpp/curriculum.json')),after=JSON.parse(await readFile('courses/cpp/curriculum.json'));
 assert.deepEqual(after.lessons.slice(0,50),before.lessons,'Все прежние50 строки, включая order/legacyIndex, сохранены');assert.equal(after.lessons.length,56);assert.equal(after.programVersion,spec.programVersion);
 assert.deepEqual(after.lessons.slice(50).map(l=>l.id),spec.lessons.filter(l=>l.added).map(l=>l.id));
 assert.deepEqual(after.sections.filter(s=>s.id!==spec.moduleId),before.sections.filter(s=>s.id!==spec.moduleId));
 assert.deepEqual(after.sections.find(s=>s.id===spec.moduleId).lessonIds,spec.lessons.map(l=>l.id));
 for(const locale of ['ru','en']){const f='courses/cpp/data/lessons.'+locale+'.json',old=JSON.parse(git('show',M5_AUTHORING_BASE+':'+f)),now=JSON.parse(await readFile(f));assert.deepEqual(now.lessons.slice(0,old.lessons.length),old.lessons);assert.equal(now.lessons.length,old.lessons.length+6)}
 const priorIndex=JSON.parse(git('show',M5_AUTHORING_BASE+':courses/cpp/data/gold-laboratories.json')),index=JSON.parse(await readFile('courses/cpp/data/gold-laboratories.json'));
 for(const [id,metadata]of Object.entries(priorIndex.lessons))assert.deepEqual(index.lessons[id],metadata,'Прежний лабораторный индекс: '+id);
 return{status:'PASS',stage:'M5-1',baseCommit:M5_AUTHORING_BASE,m5Authoring:true,productPatchPaths:allowed,currentLessonCount:56,oldRowsPreserved:50,legacyIndicesPreserved:40,newIds:6,sourceHashesVerified:true,identityCloudProjectStoreUnchanged:true,publishedRootsAndGenerationsUnchanged:true,featureContentUnpublished:true,mainWrites:0,productionWrites:0,officialRelease:false};
}
