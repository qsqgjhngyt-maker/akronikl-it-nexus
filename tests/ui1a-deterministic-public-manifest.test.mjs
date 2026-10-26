import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,mkdtemp,mkdir,cp,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('Порядок retained generations не меняет bytes manifest, SW и payload',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'nexus-build-order-')),source=path.join(temp,'source'),a=path.join(temp,'a'),b=path.join(temp,'b');await mkdir(source);
 const dirs=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa','releases','entry-assets','server-access/public'];
 for(const f of dirs){await mkdir(path.dirname(path.join(source,f)),{recursive:true});await cp(path.join(root,f),path.join(source,f),{recursive:true});}
 for(const f of ['index.html','nexus-shell.html','offline.html','version.json','manifest.webmanifest','release-candidate.json'])await cp(path.join(root,f),path.join(source,f));
 const config=JSON.parse(await readFile(path.join(source,'release-candidate.json')));assert.ok(config.retainedPublicGenerations.length>1);
 const build=out=>execFileSync(process.execPath,[path.join(root,'tools/build-ui1a-release.mjs'),'--source',source,'--out',out],{cwd:root,stdio:'pipe'});build(a);config.retainedPublicGenerations.reverse();await writeFile(path.join(source,'release-candidate.json'),JSON.stringify(config));build(b);
 const m=JSON.parse(await readFile(path.join(a,'BUILD_MANIFEST.json')));assert.ok((await readFile(path.join(a,'BUILD_MANIFEST.json'))).equals(await readFile(path.join(b,'BUILD_MANIFEST.json'))));
 for(const r of m.files)assert.ok((await readFile(path.join(a,r.file))).equals(await readFile(path.join(b,r.file))),r.file);
 const sw=await readFile(path.join(a,'service-worker.js'),'utf8'),urls=[...sw.matchAll(/\burl: "([^"\n]+)"/g)].map(m=>m[1]);assert.equal(urls.length,m.publicAssets);assert.deepEqual(urls,[...urls].sort());
 console.log(JSON.stringify({files:m.files.length+1,retainedOrderPermutation:'PASS',publicAssetOrder:'PASS'}));
});
