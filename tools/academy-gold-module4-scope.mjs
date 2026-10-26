// M4-1: точный allowlist поверх принятого M3, без разрешения менять runtime/storage.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const M4_BASE='03c8a7ba1306c59f35b83ea5650ae73b71988272';
const git=(...a)=>execFileSync('git',a,{maxBuffer:64*1024*1024}),sha=b=>createHash('sha256').update(b).digest('hex');
export async function m4AuthoringScope(){
 const candidateMeta=JSON.parse(await readFile('release-candidate.json'));if(candidateMeta.publication?.module==='cpp-module-4')return(await import('./academy-gold-module4-publication.mjs')).verifyM4Publication();
 const s=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE4_AUTHORING_SCOPE.json')),spec=JSON.parse(await readFile('docs/ru/03-content/CPP_MODULE4_AUTHORING.json'));
 assert.equal(s.baseCommit,M4_BASE);assert.equal(s.stage,'M4-1');assert.equal(spec.programVersion,'cpp-gold-m4-v1');assert.equal(spec.lessons.length,8);assert.equal(spec.lessons.filter(l=>l.added).length,5);
 assert.equal(process.env.GITHUB_REF_NAME||git('branch','--show-current').toString().trim(),'feature/academy-gold-standard-cpp-module-4');
 const allowed=['core/academy-gold-catalog.js','core/academy-gold-presentation.js','courses/cpp/manifest.json','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data/lessons.ru.json','courses/cpp/data/lessons.en.json','courses/cpp/data/gold-laboratories.json'];
 for(const t of spec.lessons)for(const l of ['ru','en'])allowed.push('courses/cpp/gold/classic/'+t.id.slice(4)+'.'+l+'.json');
 assert.deepEqual(s.productPaths.map(p=>p.file).sort(),allowed.sort());
 for(const p of s.productPaths){assert.equal(sha(await readFile(p.file)),p.sha256,p.file);if(p.beforeSha256)assert.equal(sha(git('show',M4_BASE+':'+p.file)),p.beforeSha256,p.file)}
 const roots=['core','courses','pwa','sandbox','project-studio','sync','server-access','cloudflare','releases','entry-assets','styles','effects','locales','assets','collaboration','feedback','akronikl','release-candidate.json','version.json','project.json','index.html','nexus-shell.html','offline.html','manifest.webmanifest','service-worker.js','BUILD_MANIFEST.json'];
 git('diff','--exit-code',M4_BASE,'--',...roots,...allowed.map(p=>':(exclude)'+p));
 for(const p of git('ls-files','--others','--exclude-standard','--',...roots).toString().trim().split('\n').filter(Boolean))assert.ok(allowed.includes(p),'Unapproved product file: '+p);
 const before=JSON.parse(git('show',M4_BASE+':courses/cpp/curriculum.json')),after=JSON.parse(await readFile('courses/cpp/curriculum.json'));
 assert.equal(after.lessons.length,50);assert.equal(after.programVersion,'cpp-gold-m4-v1');assert.deepEqual(after.lessons.slice(0,45),before.lessons,'All old curriculum rows must remain identical');
 assert.deepEqual(after.lessons.slice(45).map(l=>l.id),spec.lessons.filter(l=>l.added).map(l=>l.id));
 for(const l of ['ru','en']){const f='courses/cpp/data/lessons.'+l+'.json',old=JSON.parse(git('show',M4_BASE+':'+f)),now=JSON.parse(await readFile(f));assert.deepEqual(now.lessons.slice(0,old.lessons.length),old.lessons);assert.equal(now.lessons.length,old.lessons.length+5)}
 const candidate=JSON.parse(await readFile('release-candidate.json'));const generations=[candidate.assetGeneration,...candidate.retainedPublicGenerations].flatMap(g=>['releases/'+g,'entry-assets/'+g]);
 const prior=git('diff','--name-only','98b884f70c53bac3502b209112d0d3f19e401699',M4_BASE,'--',...roots).toString().trim().split('\n').filter(Boolean);
 return{status:'PASS',stage:'M4-1',baseCommit:'98b884f70c53bac3502b209112d0d3f19e401699',m4Base:M4_BASE,m4Authoring:true,authoring:true,navigationFix:true,publication:false,productPatchPaths:[...new Set([...prior,...allowed,...generations])],sourceHashesVerified:true,currentLessonCount:50,identityCloudProjectStoreUnchanged:true,legacyImporterBodyUnchanged:true,legacyRowsAndQuizUnchanged:true,publishedRootsAndGenerationsUnchanged:true,mainWrites:0,productionWrites:0,officialRelease:false};
}
