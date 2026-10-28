// Только подготовка reviewable frontend/BFF-UI пакета. Никакой публикации.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {FIX_BASE,FIX_GENERATION,FIX_META,FIX_RECEIPT,FIX_ROOTS,FIX_PRODUCT,hash,verifyFixRecord,verifyLaunchFix} from './startup-intro-launch-fix-contract.mjs';
const root=path.resolve(import.meta.dirname,'..');
if(process.argv.includes('--rollback')){
 const proof=await verifyLaunchFix({root});assert.equal(proof.rollback,false);
 const r=JSON.parse(await readFile(path.join(root,FIX_RECEIPT)));
 for(const x of r.rollback){if(x.absent){assert.equal(x.file,'startup-intro.json');await unlink(path.join(root,x.file))}else await writeFile(path.join(root,x.file),execFileSync('git',['show','d76d1613a1fbf6726d453e40366c306ea502d4c7:'+x.file],{cwd:root,maxBuffer:128*1024*1024}))}
 const meta=JSON.parse(await readFile(path.join(root,FIX_META)));meta.kind='startup-launch-ui-fix-rollback';await writeFile(path.join(root,FIX_META),JSON.stringify(meta,null,2)+'\n');console.log(await verifyLaunchFix({root}));process.exit(0);
}
const i=process.argv.indexOf('--artifact');assert.ok(i>=0&&process.argv[i+1]);const artifact=path.resolve(process.argv[i+1]);
const m=JSON.parse(await readFile(path.join(artifact,'BUILD_MANIFEST.json')));assert.equal(m.assetGeneration,FIX_GENERATION);
for(const x of m.files)verifyFixRecord(x,await readFile(path.join(artifact,x.file)));
const publish=m.files.filter(x=>FIX_ROOTS.includes(x.file)||x.file.startsWith('releases/'+FIX_GENERATION+'/')||x.file.startsWith('entry-assets/'+FIX_GENERATION+'/'));
publish.push({file:'BUILD_MANIFEST.json'});
for(const x of publish){const target=path.join(root,x.file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(artifact,x.file),target)}
await copyFile(path.join(artifact,'entry-assets',FIX_GENERATION,'entry.js'),path.join(root,'server-access/image/public/entry.js'));
const files=[];for(const file of new Set([...publish.map(x=>x.file),...FIX_PRODUCT])){const b=await readFile(path.join(root,file));files.push({file,bytes:b.length,sha256:hash(b)})}
const rollback=FIX_ROOTS.map(file=>{if(file==='startup-intro.json')return{file,absent:true};const b=execFileSync('git',['show','d76d1613a1fbf6726d453e40366c306ea502d4c7:'+file],{cwd:root,maxBuffer:128*1024*1024});return{file,bytes:b.length,sha256:hash(b)}});
await writeFile(path.join(root,FIX_META),JSON.stringify({schema:1,kind:'startup-launch-ui-fix',baseCommit:FIX_BASE,generation:FIX_GENERATION,officialRelease:false,publicEntryDeploymentRequiresOwnerApproval:true},null,2)+'\n');
await writeFile(path.join(root,FIX_RECEIPT),JSON.stringify({schema:1,baseCommit:FIX_BASE,generation:FIX_GENERATION,files:files.sort((a,b)=>a.file.localeCompare(b.file)),rollback},null,2)+'\n');
console.log({records:files.length,receiptSha256:hash(await readFile(path.join(root,FIX_RECEIPT)))});
