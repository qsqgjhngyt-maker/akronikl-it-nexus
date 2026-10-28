// Копирует только утверждённый артефакт; не выполняет push или deployment.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {ROOT} from './startup-intro-contract.mjs';
import {DELIVERY,RECEIPT,DELIVERY_BASE,ACCEPTED_SOURCE,DELIVERY_GENERATION,ROOT_FILES,sha256,recordMatches,prepareIntroRollback} from './startup-intro-publication.mjs';
if(process.argv.includes('--rollback')){console.log({...await prepareIntroRollback(ROOT),allowed:undefined});process.exit(0)}
const i=process.argv.indexOf('--artifact');assert.ok(i>=0&&process.argv[i+1],'Нужен --artifact');const dir=path.resolve(process.argv[i+1]);
const m=JSON.parse(await readFile(path.join(dir,'BUILD_MANIFEST.json')));assert.equal(m.assetGeneration,DELIVERY_GENERATION);assert.equal(m.files.length,3774);
const rootSet=new Set(ROOT_FILES),delta=[];
for(const item of [...m.files,{file:'BUILD_MANIFEST.json',bytes:(await readFile(path.join(dir,'BUILD_MANIFEST.json'))).length,sha256:sha256(await readFile(path.join(dir,'BUILD_MANIFEST.json')))}]){
 const b=await readFile(path.join(dir,item.file));recordMatches(item,b);
 let before;try{before=await readFile(path.join(ROOT,item.file))}catch(e){if(e.code!=='ENOENT')throw e}
 if(before?.equals(b))continue;
 assert.ok(rootSet.has(item.file)||!before&&(item.file.startsWith('releases/'+DELIVERY_GENERATION+'/')||item.file.startsWith('entry-assets/'+DELIVERY_GENERATION+'/')),'Нельзя переписать прежний файл: '+item.file);
 delta.push({file:item.file,bytes:b.length,sha256:sha256(b)});
}
const rollback=ROOT_FILES.map(file=>{const b=execFileSync('git',['show',DELIVERY_BASE+':'+file],{cwd:ROOT,maxBuffer:128*1024*1024});return{file,bytes:b.length,sha256:sha256(b)}});
const receipt={schema:1,baseCommit:DELIVERY_BASE,acceptedSource:ACCEPTED_SOURCE,generation:DELIVERY_GENERATION,previousGeneration:'ui1a-cpp-gold-module5-test2-header-20261027',officialRelease:false,files:delta.sort((a,b)=>a.file.localeCompare(b.file)),rollback};
for(const item of delta){const f=path.join(ROOT,item.file);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,await readFile(path.join(dir,item.file)))}
await writeFile(path.join(ROOT,RECEIPT),JSON.stringify(receipt,null,2)+'\n');
await writeFile(path.join(ROOT,DELIVERY),JSON.stringify({schema:1,kind:'production-test',baseCommit:DELIVERY_BASE,acceptedSource:ACCEPTED_SOURCE,generation:DELIVERY_GENERATION,officialRelease:false},null,2)+'\n');
console.log({files:delta.length,receiptSha256:sha256(await readFile(path.join(ROOT,RECEIPT)))});
