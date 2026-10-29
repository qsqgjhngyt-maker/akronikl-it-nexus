import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {INTRO_VIDEO_BASE,introVideoURL} from '../core/startup-intro-assets.js';
import {waitForIntroBuffer} from '../core/startup-intro-buffer.js';
import {SM_BASE} from '../tools/startup-smooth-contract.mjs';
import {installIntroEntryReturn,consumeIntroEntryReturn} from '../core/startup-intro-entry-return.js';
import {INTRO_HANDOFF_KEY,readIntroHandoff,saveIntroHandoff} from '../core/startup-intro-policy.js';
const root=new URL('../',import.meta.url);
test('Выход создаёт одноразовый UX marker; повторное открытие и обычный auth handoff сохранены',()=>{
 const values=new Map([['personal','preserved']]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},doc=new EventTarget(),win=new EventTarget();win.sessionStorage=storage;
 let t=100000;const button={disabled:false,isConnected:true,hidden:false},click=()=>{const event=new Event('click');Object.defineProperty(event,'target',{value:{closest:()=>button}});doc.dispatchEvent(event)};
 installIntroEntryReturn({surface:'shell',documentRef:doc,windowRef:win,now:()=>t});click();button.isConnected=false;win.dispatchEvent(new Event('pagehide'));
 assert.equal(readIntroHandoff(storage,t),true);assert.equal(consumeIntroEntryReturn(storage,t),true);assert.equal(consumeIntroEntryReturn(storage,t),false);assert.equal(storage.getItem('personal'),'preserved');
 saveIntroHandoff(storage,t);assert.equal(consumeIntroEntryReturn(storage,t),false);assert.equal(readIntroHandoff(storage,t),true);
 storage.setItem(INTRO_HANDOFF_KEY,JSON.stringify({schema:1,kind:'auth-navigation',entryReturn:'logout',at:t}));assert.equal(consumeIntroEntryReturn(storage,t+900000),false);
});
test('Неудавшийся выход и посторонний переход не подавляют следующий запуск',()=>{
 const data=new Map(),doc=new EventTarget(),win=new EventTarget();win.sessionStorage={setItem:(k,v)=>data.set(k,v)};
 const button={disabled:false,isConnected:true,hidden:false};installIntroEntryReturn({surface:'shell',documentRef:doc,windowRef:win});const event=new Event('click');Object.defineProperty(event,'target',{value:{closest:()=>button}});doc.dispatchEvent(event);win.dispatchEvent(new Event('pagehide'));assert.equal(data.size,0);
});
test('Публичный media URL ограничен собственным каталогом; credentials и произвольный origin запрещены',()=>{
 globalThis.location={origin:'http://127.0.0.1:1234'};
 assert.equal(introVideoURL('mobile','mp4'),INTRO_VIDEO_BASE+'mobile.mp4');
 assert.equal(introVideoURL('desktop','webm',location.origin+'/intro-media/cinematic-v4/'),location.origin+'/intro-media/cinematic-v4/desktop.webm');
 for(const base of ['https://outside.invalid/intro-media/cinematic-v4/','https://u:p@qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/cinematic-v4/',INTRO_VIDEO_BASE+'?x=1',INTRO_VIDEO_BASE+'#x','data:video/mp4;base64,AA','https://qsqgjhngyt-maker.github.io/other/intro-media/cinematic-v4/'])assert.throws(()=>introVideoURL('desktop','mp4',base));
 for(const variant of ['../mobile','wide',''])assert.throws(()=>introVideoURL(variant,'mp4'));
 assert.throws(()=>introVideoURL('mobile','exe'));delete globalThis.location;
});
test('CSP допускает только новый media-src; остальной BFF и серверные контракты прежние',async()=>{
 const addition=" media-src 'self' https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/intro-media/;";
 for(const file of ['server-access/bff/server.mjs','server-access/image/bff/server.mjs']){
  const s=await readFile(new URL(file,root),'utf8');assert.equal(s.split(addition).length,2);assert.equal(s.replace(addition,''),execFileSync('git',['show',SM_BASE+':'+file],{cwd:root}).toString());
 }
});
test('Начальный буфер ждёт достаточный запас и освобождает слушателей при отмене',async()=>{
 const doc=new EventTarget();doc.hidden=false;globalThis.document=doc;
 class Video extends EventTarget{src='same.mp4';error=null;readyState=2;duration=10;currentTime=0;end=0;buffered={length:1,start:()=>0,end:()=>this.end}}
 const v=new Video(),a=new AbortController();let resolved=false;const p=waitForIntroBuffer(v,a.signal).then(x=>(resolved=true,x));
 v.end=.2;v.dispatchEvent(new Event('progress'));await new Promise(r=>setTimeout(r,20));assert.equal(resolved,false);
 v.end=10;v.dispatchEvent(new Event('progress'));assert.equal(await p,true);
 const b=new AbortController(),q=waitForIntroBuffer(new Video(),b.signal);b.abort();assert.equal(await q,false);
 const changed=new Video(),c=new AbortController(),r=waitForIntroBuffer(changed,c.signal);changed.src='new.mp4';changed.dispatchEvent(new Event('emptied'));assert.equal(await r,false);delete globalThis.document;
});
