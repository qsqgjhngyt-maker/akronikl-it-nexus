// Допуск точных файлов доставки. Сам receipt не является разрешением владельца.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const DELIVERY='startup-intro-publication.json';
export const RECEIPT='docs/ru/07-ui/STARTUP_CINEMATIC_INTRO_PUBLICATION_SCOPE.json';
export const DELIVERY_BASE='d76d1613a1fbf6726d453e40366c306ea502d4c7';
export const ACCEPTED_SOURCE='a38ecb755d69d7b44c7adefc7df69d31bf6d3a0f';
export const DELIVERY_GENERATION='ui1a-startup-cinematic-candidate-20261028';
export const ROOT_FILES=Object.freeze(['index.html','nexus-shell.html','offline.html','version.json','service-worker.js','BUILD_MANIFEST.json']);
export const RECEIPT_SHA256='303f775ac22ef0c40bf09e9acc08a38c511065d217ee2eb26d7245e0393837bc';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function recordMatches(r,b){
 assert.ok(typeof r.file==='string'&&!/[:\\?#\u0000]/.test(r.file)&&!r.file.startsWith('/')&&!r.file.split('/').some(x=>!x||x==='.'||x==='..'),'Небезопасный путь');
 assert.equal(b.length,r.bytes,r.file);assert.equal(sha256(b),r.sha256,'Изменены bytes: '+r.file);
}
export function validateDelivery(c){
 assert.deepEqual(Object.keys(c).sort(),['schema','kind','baseCommit','acceptedSource','generation','officialRelease'].sort());
 assert.ok(['production-test','production-test-rollback'].includes(c.kind));
 assert.deepEqual({...c,kind:'production-test'},{schema:1,kind:'production-test',baseCommit:DELIVERY_BASE,acceptedSource:ACCEPTED_SOURCE,generation:DELIVERY_GENERATION,officialRelease:false});
}
export async function verifyIntroDelivery(root){
 try{await access(path.join(root,DELIVERY))}catch(e){if(e.code==='ENOENT')return null;throw e}
 const c=JSON.parse(await readFile(path.join(root,DELIVERY)));validateDelivery(c);
 const bytes=await readFile(path.join(root,RECEIPT));assert.equal(sha256(bytes),RECEIPT_SHA256,'Receipt не может расширять допуск');const r=JSON.parse(bytes);
 assert.equal(r.baseCommit,DELIVERY_BASE);assert.equal(r.acceptedSource,ACCEPTED_SOURCE);assert.equal(r.generation,DELIVERY_GENERATION);
 const roots=new Set(ROOT_FILES),allowed=new Set();
 assert.deepEqual(r.rollback.map(x=>x.file).sort(),[...ROOT_FILES].sort());
 for(const item of r.files){
  assert.ok(!allowed.has(item.file));allowed.add(item.file);
  assert.ok(roots.has(item.file)||item.file.startsWith('releases/'+DELIVERY_GENERATION+'/')||item.file.startsWith('entry-assets/'+DELIVERY_GENERATION+'/'),'Чужая область публикации');
  const expected=c.kind==='production-test-rollback'&&roots.has(item.file)?r.rollback.find(x=>x.file===item.file):item;
  recordMatches(expected,await readFile(path.join(root,item.file)));
 }
 for(const item of r.rollback)recordMatches(item,execFileSync('git',['show',DELIVERY_BASE+':'+item.file],{cwd:root,maxBuffer:128*1024*1024}));
 for(const f of ROOT_FILES)assert.ok(allowed.has(f));
 const m=JSON.parse(await readFile(path.join(root,'BUILD_MANIFEST.json'))),v=JSON.parse(await readFile(path.join(root,'version.json')));
 assert.equal(m.assetGeneration,c.kind==='production-test'?DELIVERY_GENERATION:r.previousGeneration);assert.equal(v.releaseCandidate.assetGeneration,m.assetGeneration);
 for(const item of m.files)recordMatches(item,await readFile(path.join(root,item.file)));
 const sw=await readFile(path.join(root,'service-worker.js'),'utf8');
 for(const item of m.optionalAssets||[])assert.ok(!sw.includes('url: "'+item.url+'"'),'Медиа не получает обязательный Offline допуск');
 return {status:'PASS',kind:c.kind,generation:m.assetGeneration,allowed,files:r.files.length,officialRelease:false};
}
export async function prepareIntroRollback(root){
 const proof=await verifyIntroDelivery(root);assert.equal(proof?.kind,'production-test');
 for(const f of ROOT_FILES){const b=execFileSync('git',['show',DELIVERY_BASE+':'+f],{cwd:root,maxBuffer:128*1024*1024});await writeFile(path.join(root,f),b)}
 const c=JSON.parse(await readFile(path.join(root,DELIVERY)));c.kind='production-test-rollback';await writeFile(path.join(root,DELIVERY),JSON.stringify(c,null,2)+'\n');
 return verifyIntroDelivery(root);
}
