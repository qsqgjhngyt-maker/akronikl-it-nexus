import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {MR_BASE,MR_GENERATION,MR_RECEIPT,MR_RECEIPT_SHA256,hash,verifyRecord} from '../tools/startup-mobile-restore-contract.mjs';
import {withStartupCover} from '../core/startup-intro-cover.js';
const root=new URL('../',import.meta.url),base=file=>execFileSync('git',['show',MR_BASE+':'+file],{cwd:root,maxBuffer:128*1024*1024});
test('Вход ПК, Account/Cloud, bootstrap, runtime и видео побайтно соответствуют принятому PR51',async()=>{
 for(const file of ['core/bootstrap.js','core/account-unified.js','core/startup-intro-assets.js','core/startup-intro-buffer.js','core/startup-intro-sequence.js','core/startup-intro-cover.js','server-access/public/entry.html','server-access/image/public/entry.html','core/startup-intro-launch.js','core/startup-intro-entry-return.js','server-access/public/entry.js','server-access/public/startup-intro-loader.js','server-access/image/public/entry.js','server-access/image/bff/server.mjs','server-access/bff/server.mjs','pwa/client.js','sync/server-cloud-client.js','courses/cpp/manifest.json',...['desktop','mobile'].flatMap(v=>['mp4','webm','jpg'].map(ext=>'intro-media/cinematic-v4/'+v+'.'+ext))])assert.deepEqual(await readFile(new URL(file,root)),base(file),file);
});
test('Мобильный URL допускает только прежние части своего CDN либо явный same-origin тестовый адрес',async()=>{
 const {mobileIntroURL}=await import('../core/startup-intro-mobile.js');globalThis.location={origin:'http://localhost:1234'};
 for(const ext of ['mp4','webm']){
  assert.equal(mobileIntroURL(ext),'https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v3/mobile.'+ext);
  assert.equal(mobileIntroURL(ext,location.origin+'/intro-media/cinematic-v4/'),location.origin+'/intro-media/cinematic-v3/mobile.'+ext);
 }
 for(const ext of ['../private','mp4?x','exe',''])assert.throws(()=>mobileIntroURL(ext));assert.throws(()=>mobileIntroURL('mp4','https://outside.invalid/intro-media/cinematic-v4/'));delete globalThis.location;
});
test('Новый receipt закреплён, старые receipts не расширены, bundle входа совпадает с рабочим',async()=>{
 const b=await readFile(new URL(MR_RECEIPT,root));assert.equal(hash(b),MR_RECEIPT_SHA256);for(const file of ['docs/ru/07-ui/STARTUP_CINEMATIC_INTRO_FAST_SCOPE.json','tools/startup-fast-contract.mjs'])assert.deepEqual(await readFile(new URL(file,root)),base(file));
 assert.deepEqual(await readFile(new URL('entry-assets/'+MR_GENERATION+'/entry.js',root)),base('server-access/image/public/entry.js'));
 const fake=Buffer.from('synthetic');assert.throws(()=>verifyRecord({file:'../private',bytes:fake.length,sha256:hash(fake)},fake));assert.throws(()=>verifyRecord({file:'core/file.js',bytes:fake.length,sha256:hash(fake)},Buffer.from('tampered')));
});
