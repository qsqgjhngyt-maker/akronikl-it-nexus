import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,mkdtemp,mkdir,cp,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
test('Порядок retained generations не меняет bytes manifest, SW и payload',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'nexus-build-order-')),source=path.join(temp,'source'),a=path.join(temp,'a'),b=path.join(temp,'b');await mkdir(source);
 const dirs=['core','effects','styles','locales','courses','assets','sandbox','project-studio','course-final','sync','collaboration','akronikl','feedback','pwa','releases','entry-assets','server-access/public'];
 for(const f of dirs){await mkdir(path.dirname(path.join(source,f)),{recursive:true});await cp(path.join(root,f),path.join(source,f),{recursive:true});}
 try{await cp(path.join(root,'intro-media'),path.join(source,'intro-media'),{recursive:true})}catch(error){if(error.code!=='ENOENT')throw error}
 for(const f of ['index.html','nexus-shell.html','offline.html','version.json','manifest.webmanifest','release-candidate.json'])await cp(path.join(root,f),path.join(source,f));
 try{await cp(path.join(root,'startup-intro.json'),path.join(source,'startup-intro.json'))}catch(e){if(e.code!=='ENOENT')throw e}
 const config=JSON.parse(await readFile(path.join(source,'release-candidate.json')));assert.ok(config.retainedPublicGenerations.length>1);
 const build=out=>execFileSync(process.execPath,[path.join(root,'tools/build-ui1a-release.mjs'),'--source',source,'--out',out],{cwd:root,stdio:'pipe'});build(a);config.retainedPublicGenerations.reverse();await writeFile(path.join(source,'release-candidate.json'),JSON.stringify(config));build(b);
 const m=JSON.parse(await readFile(path.join(a,'BUILD_MANIFEST.json')));assert.ok((await readFile(path.join(a,'BUILD_MANIFEST.json'))).equals(await readFile(path.join(b,'BUILD_MANIFEST.json'))));
 for(const r of m.files)assert.ok((await readFile(path.join(a,r.file))).equals(await readFile(path.join(b,r.file))),r.file);
 // Читается только сгенерированный literal public config: другие runtime URL
 // в коде SW не являются разрешёнными публичными assets.
 const sw=await readFile(path.join(a,'service-worker.js'),'utf8'),configs=[...sw.matchAll(/^  var define_NEXUS_PWA_CONFIG_default = (.+);$/gm)];assert.equal(configs.length,1);
 const configBytes=JSON.parse(runInNewContext('JSON.stringify('+configs[0][1]+')',Object.create(null),{timeout:1000}));
 const optional=new Set((m.optionalAssets||[]).map(r=>r.url));
 const urls=configBytes.assets.map(r=>r.url),expected=m.files.filter(r=>!optional.has(r.file)&&!['index.html','nexus-shell.html','version.json','service-worker.js','startup-intro.json'].includes(r.file));
 for(const url of optional)assert.equal(urls.includes(url),false,'Необязательное видео не становится обязательным public asset');
 assert.equal(configBytes.generation,m.assetGeneration);assert.equal(configBytes.version,m.version);assert.equal(urls.length,m.publicAssets);assert.equal(new Set(urls).size,urls.length);assert.deepEqual(urls,[...urls].sort());
 assert.deepEqual(configBytes.assets.map(({url,sha256,bytes,version})=>({file:url,sha256,bytes,...(version?{version}:{})})),expected.map(({file,sha256,bytes,version})=>({file,sha256,bytes,...(version?{version}:{})})));
 console.log(JSON.stringify({files:m.files.length+1,retainedOrderPermutation:'PASS',publicAssetOrder:'PASS'}));
});
