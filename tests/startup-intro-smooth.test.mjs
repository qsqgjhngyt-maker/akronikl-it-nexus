import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {introBufferReady,waitForIntroBuffer} from '../core/startup-intro-buffer.js';
import {INTRO_VIDEO_BASE,INTRO_ASSETS,introVideoURL} from '../core/startup-intro-assets.js';
import {mobileIntroURL} from '../core/startup-intro-mobile.js';
const sample={duration:10,currentTime:0,end:2,elapsed:1000,idleFor:0,readyState:3,networkState:2};
test('Есть начальный запас и загрузка успевает за воспроизведением',()=>{
 assert.equal(introBufferReady(sample),true);
 assert.equal(introBufferReady({...sample,end:.1}),false);
 assert.equal(introBufferReady({...sample,end:2,elapsed:5000}),false);
 assert.equal(introBufferReady({...sample,end:10,readyState:2}),true);
 assert.equal(introBufferReady({...sample,readyState:1}),false);
});
test('Остановка сети не выдаётся за ограничение preload браузером',()=>{
 assert.equal(introBufferReady({...sample,end:.2,elapsed:5000,idleFor:3000}),false);
 assert.equal(introBufferReady({...sample,end:.6,elapsed:5000,idleFor:3000}),false);
 assert.equal(introBufferReady({...sample,end:.6,elapsed:5000,idleFor:3000,networkState:1}),true);
 assert.equal(introBufferReady({...sample,end:.05,elapsed:5000,idleFor:3000,networkState:1}),false);
});
test('Буфер после seek считается относительно текущей позиции',()=>{
 assert.equal(introBufferReady({...sample,currentTime:6,end:6.2,elapsed:1000}),false);
 assert.equal(introBufferReady({...sample,currentTime:6,end:8,elapsed:1000}),true);
 assert.equal(introBufferReady({...sample,duration:NaN,end:.1}),false);
});
test('Ожидание завершается по abort и не оставляет обработчиков',async()=>{
 const previous=globalThis.document;
 const doc=new EventTarget();doc.hidden=false;globalThis.document=doc;
 try{
  const video=new EventTarget();Object.assign(video,{src:'test.mp4',currentTime:0,duration:10,readyState:0,networkState:2,buffered:{length:0},error:null});
  let added=0,removed=0;const add=video.addEventListener.bind(video),remove=video.removeEventListener.bind(video);
  video.addEventListener=(...args)=>{added++;add(...args)};video.removeEventListener=(...args)=>{removed++;remove(...args)};
  const control=new AbortController(),pending=waitForIntroBuffer(video,control.signal);control.abort();assert.equal(await pending,false);assert.equal(added,removed);
  assert.equal(await waitForIntroBuffer(video,control.signal),false);
  video.error={code:2};assert.equal(await waitForIntroBuffer(video),false);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
});
test('Разные сюжеты Desktop/Mobile; единый поток и прежняя граница origin',()=>{
 assert.notEqual(introVideoURL('desktop','mp4'),introVideoURL('mobile','mp4'));
 assert.equal(mobileIntroURL('mp4'),introVideoURL('mobile','mp4'));
 assert.equal(INTRO_ASSETS.desktop.seconds,10);assert.equal(INTRO_ASSETS.mobile.seconds,8);
 assert.match(INTRO_VIDEO_BASE,/cinematic-v6\/$/);
 assert.throws(()=>introVideoURL('../desktop','mp4'));
 assert.throws(()=>introVideoURL('desktop','exe'));
 for(const base of ['https://other.invalid/intro-media/cinematic-v6/','https://user:pass@qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v6/','https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v6/?x=1'])assert.throws(()=>introVideoURL('desktop','mp4',base));
});
test('Runtime использует один decoder, ждёт буфер и не меняет DOM на каждом кадре ПК',async()=>{
 const s=await readFile(new URL('../core/startup-intro.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/IntroSequence|variant==='mobile'\)\{video\.play/);
 assert.match(s,/waitForIntroBuffer\(target,playerEvents.signal\)/);
 assert.match(s,/if\(root.dataset.logoVisible!==visible\)/);
 assert.match(s,/variant==='mobile'&&video.requestVideoFrameCallback/);
 assert.match(s,/v.crossOrigin='anonymous'/);assert.match(s,/v.muted=true/);assert.match(s,/v.playsInline=true/);
});
