// Проверяет точные публичные Qt bytes и готовит отдельную копию для изолированного QA.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {QT_BROWSER_PROFILE} from '../sandbox/qt/profile.js';

const base=new URL('.',QT_BROWSER_PROFILE.previewUrl);
const pack=base.pathname.split('/').at(-2);
assert.match(pack,/^qt-[a-z0-9.\-]+$/);
const source=new URL('../runtime-packs/'+pack+'/',import.meta.url);
const {files:records}=JSON.parse(await readFile(new URL('PACK_MANIFEST.json',source),'utf8'));
const {QT_BROWSER_PROFILE:packProfile}=await import(new URL('profile.js',source));
assert.deepEqual(packProfile,QT_BROWSER_PROFILE);
const expected=['index.html','preview.js','a11y.js','profile.js','verified-pack.js','qtloader.js','program.js','program.wasm.bin','headers.bin'];
assert.deepEqual(records.map(r=>r.name).sort(),expected.sort());
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const live=process.argv.includes('--public');
const out=path.resolve(process.env.NEXUS_QT_BROWSER_PACK);
await mkdir(out,{recursive:true});
for(const r of records){
 const bytes=await readFile(new URL(r.name,source));
 assert.equal(bytes.length,r.bytes,r.name);
 assert.equal(sha(bytes),r.sha256,r.name);
 if(live){
  const response=await fetch(new URL(r.name,base),{signal:AbortSignal.timeout(120000),redirect:'error'});
  assert.equal(response.status,200,r.name);
  assert.equal(sha(Buffer.from(await response.arrayBuffer())),r.sha256,r.name);
 }
 await writeFile(path.join(out,r.name),bytes);
}
const evidence=path.resolve(process.env.NEXUS_M6_EVIDENCE);
await mkdir(evidence,{recursive:true});
await writeFile(path.join(evidence,'QT_BYTES.json'),JSON.stringify({status:'PASS',pack,records,publicBytesChecked:live,productionWrites:0},null,2)+'\n');
console.log('PASS: '+records.length+' закреплённых ресурсов '+pack);
