import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FIX_BASE,FIX_GENERATION,FIX_RECEIPT,FIX_RECEIPT_SHA256,validateFixMetadata,verifyFixRecord,hash} from '../tools/startup-intro-launch-fix-contract.mjs';
const root=new URL('../',import.meta.url);
async function comparable(f){const b=await readFile(new URL(f,root));return /server-access\/(?:image\/)?bff\/server\.mjs$/.test(f)?Buffer.from(b.toString().replace(" media-src 'self' https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/;",'')):b}

test('Допуск поправки не меняет базу, схему, поколение, Release и границу разрешения BFF',()=>{
 const c={schema:1,kind:'startup-launch-ui-fix',baseCommit:FIX_BASE,generation:FIX_GENERATION,officialRelease:false,publicEntryDeploymentRequiresOwnerApproval:true};validateFixMetadata(c);
 for(const patch of [{baseCommit:'main'},{generation:'any'},{schema:2},{officialRelease:true},{publicEntryDeploymentRequiresOwnerApproval:false},{extraPaths:['core/bootstrap.js']}])assert.throws(()=>validateFixMetadata({...c,...patch}));
});
test('Подмена файла, traversal и расширение receipt отвергаются',async()=>{
 const b=Buffer.from('synthetic'),r={file:'core/startup-intro.js',bytes:b.length,sha256:hash(b)};verifyFixRecord(r,b);assert.throws(()=>verifyFixRecord(r,Buffer.from('changed')));
 for(const file of ['../core/app.js','/core/app.js','C:/app.js','a//b','a/../b','a\\b'])assert.throws(()=>verifyFixRecord({...r,file},b));
 const receipt=await readFile(new URL(FIX_RECEIPT,root));assert.equal(hash(receipt),FIX_RECEIPT_SHA256);assert.notEqual(hash(Buffer.concat([receipt,Buffer.from(' ')])),FIX_RECEIPT_SHA256);
});
test('Серверный BFF, bootstrap, OAuth, runtime и Content побайтно прежние',async()=>{
 for(const f of ['core/bootstrap.js','server-access/bff/server.mjs','server-access/image/bff/server.mjs','server-access/public/oauth-client.js','pwa/runtime-manifest.js','courses/cpp/manifest.json'])assert.deepEqual(await comparable(f),execFileSync('git',['show',FIX_BASE+':'+f],{cwd:root,maxBuffer:128*1024*1024}));
});
test('Вертикальные MP4/WebM/постер побайтно прежние; новый Desktop существует отдельной версией',async()=>{
 for(const ext of ['mp4','webm','jpg']){const file='intro-media/cinematic-v1/mobile.'+ext;assert.deepEqual(await readFile(new URL(file,root)),execFileSync('git',['show',FIX_BASE+':'+file],{cwd:root,maxBuffer:128*1024*1024}));assert.ok((await readFile(new URL('intro-media/cinematic-v2/desktop.'+ext,root))).length>0)}
});
