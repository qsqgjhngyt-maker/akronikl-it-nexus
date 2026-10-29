import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {FS_BASE,FS_GENERATION,FS_RECEIPT,FS_RECEIPT_SHA256,hash,verifyRecord} from '../tools/startup-fast-contract.mjs';
import {withStartupCover} from '../core/startup-intro-cover.js';
const root=new URL('../',import.meta.url),base=file=>execFileSync('git',['show',FS_BASE+':'+file],{cwd:root,maxBuffer:128*1024*1024});
test('Вход ПК, Account/Cloud, bootstrap, runtime и видео побайтно соответствуют принятому PR50',async()=>{
 for(const file of ['core/bootstrap.js','core/account-unified.js','core/startup-intro-launch.js','core/startup-intro-entry-return.js','server-access/public/entry.js','server-access/public/startup-intro-loader.js','server-access/image/public/entry.js','server-access/image/bff/server.mjs','server-access/bff/server.mjs','pwa/client.js','sync/server-cloud-client.js','courses/cpp/manifest.json',...['desktop','mobile'].flatMap(v=>['mp4','webm','jpg'].map(ext=>'intro-media/cinematic-v4/'+v+'.'+ext))])assert.deepEqual(await readFile(new URL(file,root)),base(file),file);
});
test('В шаблоне входа меняется только ранний мобильный стиль, без нового JS и сетевых изображений',async()=>{
 const expected=withStartupCover(base('server-access/public/entry.html').toString());assert.equal(await readFile(new URL('server-access/public/entry.html',root),'utf8'),expected);assert.equal(await readFile(new URL('server-access/image/public/entry.html',root),'utf8'),expected);assert.equal(withStartupCover(expected),expected);assert.ok(expected.includes('@media(max-width:1200px) and (orientation:portrait)'));assert.equal(/url\(/.test(expected.match(/<style data-startup-cover-style>[\s\S]*?<\/style>/)[0]),false);
});
test('Новый receipt закреплён, старые receipts не расширены, bundle входа совпадает с рабочим',async()=>{
 const b=await readFile(new URL(FS_RECEIPT,root));assert.equal(hash(b),FS_RECEIPT_SHA256);for(const file of ['docs/ru/07-ui/STARTUP_CINEMATIC_INTRO_SMOOTH_SCOPE.json','tools/startup-smooth-contract.mjs'])assert.deepEqual(await readFile(new URL(file,root)),base(file));
 assert.deepEqual(await readFile(new URL('entry-assets/'+FS_GENERATION+'/entry.js',root)),base('server-access/image/public/entry.js'));
 const fake=Buffer.from('synthetic');assert.throws(()=>verifyRecord({file:'../private',bytes:fake.length,sha256:hash(fake)},fake));assert.throws(()=>verifyRecord({file:'core/file.js',bytes:fake.length,sha256:hash(fake)},Buffer.from('tampered')));
});
