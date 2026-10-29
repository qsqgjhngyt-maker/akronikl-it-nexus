import assert from 'node:assert/strict';import {readFile,writeFile,mkdir,copyFile,unlink} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import path from 'node:path';
import {FS_BASE,FS_GENERATION,FS_META,FS_RECEIPT,FS_ROOTS,FS_PRODUCT,hash,verifyRecord,verifyFast} from './startup-fast-contract.mjs';
const root=path.resolve(import.meta.dirname,'..');
if(process.argv.includes('--rollback')){await verifyFast({root});const r=JSON.parse(await readFile(path.join(root,FS_RECEIPT)));for(const x of r.rollback)await writeFile(path.join(root,x.file),execFileSync('git',['show',FS_BASE+':'+x.file],{cwd:root,maxBuffer:128*1024*1024}));const m=JSON.parse(await readFile(path.join(root,FS_META)));m.kind='startup-fast-rollback';await writeFile(path.join(root,FS_META),JSON.stringify(m,null,2)+'\n');console.log(await verifyFast({root}));process.exit(0)}
const i=process.argv.indexOf('--artifact');assert.ok(i>=0&&process.argv[i+1]);const artifact=path.resolve(process.argv[i+1]),m=JSON.parse(await readFile(path.join(artifact,'BUILD_MANIFEST.json')));assert.equal(m.assetGeneration,FS_GENERATION);
for(const r of m.files)verifyRecord(r,await readFile(path.join(artifact,r.file)));
const publish=m.files.filter(r=>FS_ROOTS.includes(r.file)||r.file.startsWith('releases/'+FS_GENERATION+'/')||r.file.startsWith('entry-assets/'+FS_GENERATION+'/'));publish.push({file:'BUILD_MANIFEST.json'});
for(const r of publish){const dst=path.join(root,r.file);await mkdir(path.dirname(dst),{recursive:true});await copyFile(path.join(artifact,r.file),dst)}
await copyFile(path.join(root,'server-access/public/entry.html'),path.join(root,'server-access/image/public/entry.html'));
const files=[];for(const f of new Set([...publish.map(r=>r.file),...FS_PRODUCT])){const b=await readFile(path.join(root,f));files.push({file:f,bytes:b.length,sha256:hash(b)})}
const rollback=FS_ROOTS.map(file=>{const b=execFileSync('git',['show',FS_BASE+':'+file],{cwd:root,maxBuffer:128*1024*1024});return{file,bytes:b.length,sha256:hash(b)}});
await writeFile(path.join(root,FS_META),JSON.stringify({schema:1,kind:'startup-fast',baseCommit:FS_BASE,generation:FS_GENERATION,officialRelease:false,uiEntryDeploymentRequiresOwnerApproval:true},null,2)+'\n');
await writeFile(path.join(root,FS_RECEIPT),JSON.stringify({schema:1,baseCommit:FS_BASE,generation:FS_GENERATION,files:files.sort((a,b)=>a.file.localeCompare(b.file)),rollback},null,2)+'\n');console.log({records:files.length,receiptSha256:hash(await readFile(path.join(root,FS_RECEIPT)))});
