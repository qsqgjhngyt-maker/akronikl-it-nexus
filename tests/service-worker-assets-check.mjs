import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),tmp=await mkdtemp(path.join(tmpdir(),'nx-assets-')),out=path.join(tmp,'public');
const run=spawnSync(process.execPath,[path.join(root,'tools/build-ui1a-release.mjs'),'--out',out],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
const sw=await readFile(path.join(out,'service-worker.js'),'utf8'),checked=await readFile(path.join(root,'service-worker.js'),'utf8');assert.equal(checked,sw,'Delivered root worker must equal the current build');
const manifest=JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json')));
for(const row of manifest.files.filter(r=>!['index.html','nexus-shell.html','service-worker.js','version.json'].includes(r.file))){assert.ok(sw.includes('url: "'+row.file+'"'),row.file);assert.ok(sw.includes(row.sha256),row.file)}
assert.equal(manifest.publicAssets,manifest.files.length-4);
assert.ok(sw.includes('nexus-verified-public-v1'));assert.ok(!sw.includes('caches.match('));assert.ok(!sw.includes('caches.delete('));assert.ok(!sw.includes('deleteDatabase('));
assert.ok(!sw.includes('url: "nexus-shell.html"'));assert.ok(!sw.includes('url: "index.html"'));assert.ok(!sw.includes('url: "version.json"'));
console.log('SERVICE_WORKER_ASSETS_PASS',manifest.publicAssets,'exact pinned public files; no legacy private fallback or storage deletion');
