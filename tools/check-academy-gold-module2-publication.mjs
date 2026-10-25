// Разрешение даёт владелец в чате; этот gate проверяет только точность пакета.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
const candidateMeta=JSON.parse(await readFile(new URL('../release-candidate.json',import.meta.url),'utf8'));
if(candidateMeta.publication?.uiPatch==='remove-reference-topic-labels'){execFileSync(process.execPath,['tools/check-academy-gold-module2-label-publication.mjs'],{stdio:'inherit'});process.exit(0)}
const root=path.resolve(import.meta.dirname,'..'),accepted='e743bd537c09e8ae5bbf09d72cd5fc4980bc92dd',main='d9249b2e977483718cd67a151f62552296dd51e4',version='0.1.7-alpha.2.4.6-ui1a.10.6-test.1',old='0.1.7-alpha.2.4.6-ui1a.10.5-test.2',generation='ui1a-cpp-gold-module2-test1-20261025';
const git=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),read=f=>readFile(path.join(root,f)),json=async f=>JSON.parse(await read(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const c=await json('release-candidate.json'),v=await json('version.json'),m=await json('BUILD_MANIFEST.json');
assert.equal(c.publication?.sourceCommit,accepted);assert.equal(c.publication?.rollbackCommit,main);assert.equal(c.publication?.officialRelease,false);assert.equal(c.ownerPublicationAuthorized,false);assert.equal(v.releaseCandidate.releaseReady,false);assert.equal(v.releaseCandidate.ownerPublicationAuthorized,false);
for(const data of [c,v,m,await json('project.json')])assert.equal(data.version,version);assert.equal(c.assetGeneration,generation);assert.equal(v.releaseCandidate.assetGeneration,generation);assert.equal(m.assetGeneration,generation);assert.deepEqual(await read('manifest.webmanifest'),git('show',main+':manifest.webmanifest'));
const folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa','server-access','cloudflare'];
const source=git('ls-tree','-rz',accepted,'--',...folders).toString().split('\0').filter(Boolean).map(r=>r.split('\t')[1]);
for(const f of source){const b=await read(f),expected=git('show',accepted+':'+f);if(['core/app.js','core/shell-presentation.js'].includes(f))assert.equal(b.toString().replaceAll(version,old),expected.toString(),f);else assert.ok(b.equals(expected),'Принятый source изменён: '+f);}
// Не допускаются новые продуктовые файлы вне принятого source.
const extra=git('ls-files','--others','--exclude-standard','--',...folders).toString().trim();assert.equal(extra,'');
git('diff','--exit-code',accepted,'--',...folders,':(exclude)core/app.js',':(exclude)core/shell-presentation.js');
git('diff','--exit-code',main,'--','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data','courses/cpp/manifest.json','core/storage.js','core/account-storage.js','core/identity.js','core/migrations','sync','project-studio','server-access','cloudflare','pwa');
const historical=git('ls-tree','-rz',main,'--','releases','entry-assets').toString().split('\0').filter(Boolean);
for(const r of historical){const [header,f]=r.split('\t'),sha=header.split(' ')[2],b=await read(f);assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),sha,f);}
const previous=JSON.parse(git('show',main+':release-candidate.json'));for(const id of [...previous.retainedPublicGenerations,previous.assetGeneration])assert.ok(c.retainedPublicGenerations.includes(id),id);
for(const r of m.files){const b=await read(r.file);assert.equal(b.length,r.bytes,r.file);assert.equal(hash(b),r.sha256,r.file);}
const payload=source.filter(f=>!f.startsWith('server-access/')&&!f.startsWith('cloudflare/'));
for(const f of [...payload,'version.json'])assert.ok((await read('releases/'+generation+'/'+f)).equals(await read(f)),f);
const temp=await mkdtemp(path.join(tmpdir(),'nexus-m2-publication-')),build=path.join(temp,'build');execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',build],{cwd:root,stdio:'pipe'});
const rebuilt=JSON.parse(await readFile(path.join(build,'BUILD_MANIFEST.json')));assert.deepEqual(rebuilt,m,'Manifest отличается от штатного producer');for(const f of ['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json'])assert.ok((await read(f)).equals(await readFile(path.join(build,f))),'Root не совпал со сборкой: '+f);
const out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');await mkdir(out,{recursive:true});const result={status:'PASS',main,accepted,version,generation,sourceFilesChecked:source.length,historicalFilesPreserved:historical.length,manifestFiles:m.files.length,newProgressIds:0,productDeltaSinceAccepted:'Версия в app/shell, metadata и новое immutable поколение; принятые content/runtime bytes сохранены',officialRelease:false,live:false};await writeFile(path.join(out,'MODULE2_PUBLICATION_GATE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
