import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),json=async f=>JSON.parse(await readFile(path.join(root,f),'utf8'));
const candidate=await json('release-candidate.json'),version=await json('version.json'),project=await json('project.json');
const expected='0.1.7-alpha.2.4.6-ui1a.10.3.1',generation='ui1a-alpha10-public-install-20261023';
assert.equal(candidate.version,expected);assert.equal(version.version,expected);assert.equal(project.version,expected);
assert.equal(candidate.assetGeneration,generation);assert.equal(version.releaseCandidate.assetGeneration,generation);
assert.equal(candidate.baseCommit,'a60371c0ac0f7cab27e4ee9611b2cae7a93c054f');
assert.ok(candidate.retainedPublicGenerations.includes('ui1a-alpha10-studio-20261023'));
assert.equal(candidate.ownerPublicationAuthorized,false);assert.equal(version.releaseCandidate.releaseReady,false);
for(const f of ['core/shell-presentation.js','nexus-shell.html'])assert.ok((await readFile(path.join(root,f),'utf8')).includes(expected),f);
for(const f of ['index.html','nexus-shell.html','offline.html'])assert.ok((await readFile(path.join(root,f),'utf8')).includes(generation),f);
const worker=await readFile(path.join(root,'service-worker.js'),'utf8');
assert.ok(worker.includes(generation));assert.ok(worker.includes('PUBLIC_INSTALL_CONCURRENCY = 8'));
assert.ok(worker.includes('stagePublicGeneration'));assert.ok(worker.includes('nexus-verified-public-v1'));
// BFF можно сохранить: встроенный landing с прежним immutable path получает
// те же entry bytes и устанавливает новый SW по стабильному корневому адресу.
for(const file of ['entry.js','entry.css','galaxy.js','oauth-client.js']){
 assert.deepEqual(await readFile(path.join(root,'entry-assets',generation,file)),await readFile(path.join(root,'entry-assets/ui1a-alpha10-studio-20261023',file)),file);
}
console.log(JSON.stringify({status:'PASS',version:expected,generation,checks:22,entryAssetsByteExact:4,backendRebuildRequired:false}));
