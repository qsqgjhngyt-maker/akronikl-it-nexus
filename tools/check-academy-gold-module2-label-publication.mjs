// Узкий gate исправления подписей; изменения данных/runtime не разрешены.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),base='8eca940ae0a94c31eeff36f92140d5a90e7ebdbe',version='0.1.7-alpha.2.4.6-ui1a.10.6-test.2',old='0.1.7-alpha.2.4.6-ui1a.10.6-test.1',generation='ui1a-cpp-gold-module2-test2-labels-20261025';
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),read=f=>readFile(path.join(root,f)),json=async f=>JSON.parse(await read(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const c=await json('release-candidate.json'),v=await json('version.json'),m=await json('BUILD_MANIFEST.json');
assert.equal(c.publication?.uiPatch,'remove-reference-topic-labels');assert.equal(c.publication.sourceCommit,'e743bd537c09e8ae5bbf09d72cd5fc4980bc92dd');assert.equal(c.baseCommit,base);assert.equal(c.publication.rollbackCommit,base);assert.equal(c.publication.officialRelease,false);assert.equal(c.ownerPublicationAuthorized,false);assert.equal(v.releaseCandidate.releaseReady,false);assert.equal(v.releaseCandidate.ownerPublicationAuthorized,false);
for(const data of [c,v,m,await json('project.json')])assert.equal(data.version,version);for(const data of [c,v.releaseCandidate,m])assert.equal(data.assetGeneration,generation);assert.ok((await read('manifest.webmanifest')).equals(git('show',base+':manifest.webmanifest')));
const badge='<em>${cpp.manifest.benchmarkLessons.includes(id)?e(t(\'learningPath.referenceTopic\')):\'\'}</em>';
const uiPaths=['core/learning-views.js','styles/app.css'],versionPaths=['core/app.js','core/shell-presentation.js'],folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa','server-access','cloudflare'];
const source=git('ls-tree','-rz',base,'--',...folders).toString().split('\0').filter(Boolean).map(r=>r.split('\t')[1]);
for(const f of source){
 const actual=await read(f),before=git('show',base+':'+f);
 if(![...versionPaths,...uiPaths].includes(f)){assert.ok(actual.equals(before),'Неизменённый source: '+f);continue}
 let expected=before.toString();
 if(versionPaths.includes(f))expected=expected.replaceAll(old,version);
 else if(f==='core/learning-views.js'){assert.equal(expected.split(badge).length,2);expected=expected.replace(badge,'')}
 else if(f==='styles/app.css'){for(const rule of ['42px minmax(0,1fr) auto auto','32px minmax(0,1fr) auto auto']){assert.equal(expected.split(rule).length,2);expected=expected.replace(rule,rule.slice(0,-5))}}
 assert.ok(actual.equals(Buffer.from(expected)),'Вне согласованного UI patch: '+f);
}
assert.equal(git('ls-files','--others','--exclude-standard','--',...folders).toString().trim(),'');git('diff','--exit-code',base,'--',...folders,...[...uiPaths,...versionPaths].map(f=>':(exclude)'+f));
const historical=git('ls-tree','-rz',base,'--','releases','entry-assets').toString().split('\0').filter(Boolean);for(const r of historical){const [header,f]=r.split('\t'),b=await read(f);assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),header.split(' ')[2],f)}
const previous=JSON.parse(git('show',base+':release-candidate.json'));for(const id of [...previous.retainedPublicGenerations,previous.assetGeneration])assert.ok(c.retainedPublicGenerations.includes(id),id);
for(const r of m.files){const b=await read(r.file);assert.equal(b.length,r.bytes,r.file);assert.equal(hash(b),r.sha256,r.file)}
for(const f of [...source.filter(f=>!f.startsWith('server-access/')&&!f.startsWith('cloudflare/')),'version.json'])assert.ok((await read('releases/'+generation+'/'+f)).equals(await read(f)),f);
const temp=await mkdtemp(path.join(tmpdir(),'nexus-m2-labels-')),build=path.join(temp,'build');execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',build],{cwd:root,stdio:'pipe'});assert.deepEqual(JSON.parse(await readFile(path.join(build,'BUILD_MANIFEST.json'))),m);for(const f of ['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json'])assert.ok((await read(f)).equals(await readFile(path.join(build,f))),f);
const result={status:'PASS',base,version,generation,sourceFilesChecked:source.length,historicalFilesPreserved:historical.length,manifestFiles:m.files.length,uiPatchPaths:uiPaths,versionPaths,newProgressIds:0,contentRuntimeIdentityCloudUnchanged:true,productDelta:'Удалён только badge в списке тем; две сетки с четырёх колонок на три; номер версии в app/shell.',officialRelease:false,live:false};const out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'MODULE2_LABEL_PUBLICATION_GATE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
