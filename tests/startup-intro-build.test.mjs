import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('Медиа текущего и удержанного intro-поколения не входит в обязательный public graph',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'nexus-intro-build-')),source=path.join(temp,'source'),out=path.join(temp,'build');
 const put=async(f,b)=>{await mkdir(path.dirname(path.join(source,f)),{recursive:true});await writeFile(path.join(source,f),b)};
 for(const f of ['core','effects','styles','locales','courses','assets','sandbox','project-studio','course-final','sync','collaboration','akronikl','feedback','pwa','entry-assets/ui1a-old'])await mkdir(path.join(source,f),{recursive:true});
 await put('release-candidate.json',JSON.stringify({version:'1.0.0',assetGeneration:'ui1a-now',retainedPublicGenerations:['ui1a-old']}));
 await put('version.json',JSON.stringify({version:'1.0.0',releaseCandidate:{assetGeneration:'ui1a-now'}}));await put('manifest.webmanifest','{}');await put('index.html','<html></html>');await put('offline.html','<html></html>');
 for(const icon of ['icon-192.png','icon-512.png','apple-touch-icon.png'])await put('assets/icons/'+icon,'synthetic icon');
 await put('pwa/service-worker.js','self.config=__NEXUS_PWA_CONFIG__;');
 await put('releases/ui1a-old/version.json','{"version":"0.9.0"}');
 await put('releases/ui1a-old/core/public.js','// public');
 for(const [f,type]of [['desktop.mp4','video/mp4'],['mobile.webm','video/webm'],['desktop.jpg','image/jpeg']]){
  await put('intro-media/cinematic-v1/'+f,'synthetic '+type);await put('releases/ui1a-old/intro-media/cinematic-v1/'+f,'retained '+type);
 }
 const tool=fileURLToPath(new URL('../tools/build-ui1a-release.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[tool,'--source',source,'--out',out,'--generation','ui1a-candidate','--version','1.0.0'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const manifest=JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json'))),sw=await readFile(path.join(out,'service-worker.js'),'utf8');
 assert.equal(manifest.optionalAssets.length,6);assert.equal(sw.includes('/intro-media/'),false);assert.ok(sw.includes('core/public.js'));
 assert.deepEqual(new Set(manifest.optionalAssets.map(r=>r.mime)),new Set(['video/mp4','video/webm','image/jpeg']));
 assert.equal(JSON.parse(await readFile(path.join(out,'version.json'))).releaseCandidate.assetGeneration,'ui1a-candidate');
 assert.equal(manifest.files.some(r=>r.file==='releases/ui1a-old/core/public.js'),true);
});
