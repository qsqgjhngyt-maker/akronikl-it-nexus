// Gate отдельной тестовой публикации; разрешение владельца хранится в чате.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const main='02369149b465a98c0f3ff780b8c59add36e52e1b';
const accepted=main;
const version='0.1.7-alpha.2.4.6-ui1a.10.5-test.2';
const generation='ui1a-cpp-gold-module1-test2-runtime-20261024';
const runtimePath='sandbox/providers/browser-runtime.js';
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const read=file=>readFile(path.join(root,file));
const json=async file=>JSON.parse(await read(file));
const candidate=await json('release-candidate.json'),metadata=await json('version.json'),manifest=await json('BUILD_MANIFEST.json');
assert.equal(candidate.publication?.sourceCommit,accepted);
assert.equal(candidate.publication?.rollbackCommit,main);
assert.equal(candidate.publication?.officialRelease,false);
assert.deepEqual(candidate.publication?.runtimePatchPaths,[runtimePath]);
assert.equal(candidate.ownerPublicationAuthorized,false,'метаданные не выдают разрешение на публикацию');
assert.equal(metadata.releaseCandidate.releaseReady,false);
for(const item of [candidate,metadata,manifest,await json('project.json')])assert.equal(item.version,version);
assert.equal(manifest.assetGeneration,generation);
assert.equal(metadata.releaseCandidate.assetGeneration,generation);
assert.deepEqual(await json('manifest.webmanifest'),JSON.parse(git('show',main+':manifest.webmanifest')));
for(const file of ['core/app.js','core/shell-presentation.js']){
 assert.equal((await read(file)).toString().replaceAll(version,'0.1.7-alpha.2.4.6-ui1a.10.5-test.1'),git('show',accepted+':'+file).toString(),file+': разрешена только смена номера сборки');
}
const protectedPaths=['core/storage.js','core/account-storage.js','core/identity.js','core/migrations','sync','sandbox','project-studio','server-access','cloudflare','pwa/local-vault.js','pwa/offline-learning.js','pwa/runtime-manifest.js','pwa/service-worker.js','courses/cpp/curriculum.json','courses/cpp/content-package.json','courses/cpp/data','courses/cpp/manifest.json'];
git('diff','--exit-code',main,'--',...protectedPaths,':(exclude)'+runtimePath);
git('diff','--exit-code',accepted,'--','courses/cpp/gold','core/academy-gold-catalog.js','core/academy-gold-model.js','core/academy-gold-presentation.js','core/nexus-learning-ui.js','core/learning-views.js','core/course-registry.js','core/offline-assets.js','pwa/offline-entry.js','styles/academy-gold.css','styles/app.css','effects');
const historical=git('ls-tree','-rz',main,'--','releases','entry-assets').toString().split('\0').filter(Boolean);
for(const entry of historical){const [,sha,file]=/^\d+ blob ([a-f0-9]+)\t(.+)$/.exec(entry)||[];assert.ok(file);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+(await read(file)).length+'\0'),await read(file)])).digest('hex'),sha,file+': historical bytes');}
for(const record of manifest.files){const bytes=await read(record.file);assert.equal(bytes.length,record.bytes,record.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,record.file);}
const shell=(await read('nexus-shell.html')).toString();
assert.ok(shell.includes('./releases/'+generation+'/core/bootstrap.js?v='+version));
assert.ok(shell.includes('Platform Shell v'+version));
assert.ok(!shell.includes('/core/app.js'));
const sourceFiles=git('ls-tree','-rz',accepted,'--','core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa').toString().split('\0').filter(Boolean).map(entry=>entry.split('\t')[1]);
for(const file of [...sourceFiles,'version.json'])assert.deepEqual(await read('releases/'+generation+'/'+file),await read(file),'immutable generation differs from source: '+file);
assert.ok(candidate.retainedPublicGenerations.includes('ui1a-alpha10-public-install-20261023'));
assert.ok(candidate.retainedPublicGenerations.includes('ui1a-alpha10-4-2-admin-nav-20261023'));
assert.ok(candidate.retainedPublicGenerations.includes('ui1a-cpp-gold-module1-test1-20261024'));
const out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');await mkdir(out,{recursive:true});
const result={status:'PASS',main,accepted,version,generation,historicalFilesPreserved:historical.length,manifestFiles:manifest.files.length,sourceFilesMatched:sourceFiles.length+1,stableIdsAndDataContracts:'UNCHANGED',officialRelease:false,live:false};
await writeFile(path.join(out,'PUBLICATION_GATE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
