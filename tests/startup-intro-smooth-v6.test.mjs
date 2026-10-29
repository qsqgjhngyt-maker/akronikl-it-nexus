import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {introBufferedAhead,waitForIntroBuffer} from '../core/startup-intro-buffer.js';
import {introMediaQuality,introVideoURL,INTRO_VIDEO_BASE} from '../core/startup-intro-assets.js';
import {skipAutomaticIntro} from '../core/startup-intro-policy.js';
class TrackedTarget extends EventTarget{
 constructor(){super();this.listeners=new Map()}
 addEventListener(t,f,o){super.addEventListener(t,f,o);const a=this.listeners.get(t)||new Set();a.add(f);this.listeners.set(t,a)}
 removeEventListener(t,f,o){super.removeEventListener(t,f,o);this.listeners.get(t)?.delete(f)}
 get count(){return [...this.listeners.values()].reduce((n,s)=>n+s.size,0)}
}
function video({ranges=[[0,3]],currentTime=0,duration=10,readyState=3,networkState=2}={}){
 const v=new TrackedTarget();Object.assign(v,{src:'test.mp4',currentTime,duration,readyState,networkState,error:null,ranges});
 Object.defineProperty(v,'buffered',{get:()=>({length:v.ranges.length,start:i=>v.ranges[i][0],end:i=>v.ranges[i][1]})});return v;
}
async function env(fn){
 const keys=['document','performance','setTimeout','clearTimeout'];const old=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let now=0,id=0;const tasks=new Map(),doc=new TrackedTarget();doc.hidden=false;
 const set=(k,value)=>Object.defineProperty(globalThis,k,{value,writable:true,configurable:true});
 set('document',doc);set('performance',{now:()=>now});set('setTimeout',(f,ms)=>{tasks.set(++id,{at:now+ms,f});return id});set('clearTimeout',id=>tasks.delete(id));
 const tick=ms=>{const end=now+ms;for(let i=0;i<100000;i++){const due=[...tasks].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].f()}now=end};
 try{await fn({doc,tick,tasks})}finally{for(const k of keys){if(old[k])Object.defineProperty(globalThis,k,old[k]);else delete globalThis[k]}}
}
test('Буфер считается только от текущего кадра, дальний диапазон не маскирует пробел',()=>{
 assert.equal(introBufferedAhead(video({ranges:[[0,1],[5,10]],currentTime:2})),0);
 assert.equal(introBufferedAhead(video({ranges:[[0,1],[5,10]],currentTime:.25})),.75);
});
test('50 мс + остановка preload больше не разрешают запуск',()=>env(async({tick,tasks,doc})=>{
 const v=video({ranges:[[0,.06]],readyState:2,networkState:1}),a=new AbortController();let state='pending';const p=waitForIntroBuffer(v,a.signal).then(x=>state=x);tick(2000);await Promise.resolve();assert.equal(state,'pending');a.abort();await p;assert.equal(state,false);assert.equal(tasks.size,0);assert.equal(doc.count+v.count,0);
}));
test('Пауза сети NETWORK_LOADING не считается лимитом preload',()=>env(async({tick})=>{
 const v=video({ranges:[],readyState:3,networkState:2}),a=new AbortController();let state='pending';const p=waitForIntroBuffer(v,a.signal).then(x=>state=x);tick(3000);v.ranges=[[0,.8]];v.dispatchEvent(new Event('progress'));tick(1500);await Promise.resolve();assert.equal(state,'pending');a.abort();await p;
}));
test('Реальный лимит preload с будущими кадрами допускает нативный плеер',()=>env(async({tick})=>{
 const v=video({ranges:[],readyState:3,networkState:1});const p=waitForIntroBuffer(v);tick(2000);v.ranges=[[0,.8]];v.dispatchEvent(new Event('progress'));tick(1200);assert.equal(await p,true);
}));
test('Полностью загруженный остаток короче резерва стартует',()=>env(async()=>{
 assert.equal(await waitForIntroBuffer(video({ranges:[[0,10]],currentTime:9.5,readyState:2})),true);
}));
test('Достаточный быстрый буфер стартует без ожидания полного файла',()=>env(async()=>{
 assert.equal(await waitForIntroBuffer(video()),true);
}));
test('Пустой буфер имеет ограниченный таймаут и очищает обработчики',()=>env(async({tick,tasks,doc})=>{
 const v=video({ranges:[],readyState:0});const p=waitForIntroBuffer(v);tick(6100);assert.equal(await p,false);assert.equal(tasks.size,0);assert.equal(v.count+doc.count,0);
}));
test('Смена источника завершает старое ожидание без play',()=>env(async({tick,tasks})=>{
 const v=video({ranges:[],readyState:0});const p=waitForIntroBuffer(v);v.src='other.mp4';tick(100);assert.equal(await p,false);assert.equal(tasks.size,0);
}));
test('Фоновая вкладка не расходует бюджет ожидания',()=>env(async({tick,doc})=>{
 const v=video({ranges:[],readyState:0});let state='pending';const p=waitForIntroBuffer(v).then(x=>state=x);tick(1000);doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));tick(10000);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(state,'pending');v.ranges=[[0,10]];v.readyState=4;v.dispatchEvent(new Event('progress'));await p;assert.equal(state,true);
}));
test('Ошибки декодера и заранее отменённый signal завершаются',()=>env(async()=>{
 const v=video();v.error={code:3};assert.equal(await waitForIntroBuffer(v),false);assert.equal(await waitForIntroBuffer(video(),AbortSignal.abort()),false);
}));
test('Desktop Full HD по умолчанию, лёгкий поток при ограничениях',()=>{
 for(const e of [{},{deviceMemory:8,hardwareConcurrency:8},{deviceMemory:0,hardwareConcurrency:0},{connection:{downlink:0}},{connection:{downlink:NaN}}])assert.equal(introMediaQuality(e),'full');
 for(const e of [{deviceMemory:4},{hardwareConcurrency:4},{connection:{downlink:1.5}}])assert.equal(introMediaQuality(e),'lite');
});
test('Телефон использует 720p даже без browser hints; поворот выбирает качество нового варианта',()=>{
 for(const env of [{},{deviceMemory:8,hardwareConcurrency:16},{connection:{downlink:100}}])assert.equal(introMediaQuality(env,'mobile'),'lite');
 assert.equal(introMediaQuality({hardwareConcurrency:16},'desktop'),'full');
});
test('Выбор URL ограничен утверждённым каталогом и вариантом',()=>{
 assert.match(introVideoURL('mobile','mp4',INTRO_VIDEO_BASE,'lite'),/cinematic-v6\/mobile-lite.mp4$/);
 assert.throws(()=>introVideoURL('../secret','mp4'));assert.throws(()=>introVideoURL('mobile','exe'));assert.throws(()=>introVideoURL('desktop','mp4',INTRO_VIDEO_BASE,'unknown'));
 assert.throws(()=>introVideoURL('mobile','mp4',INTRO_VIDEO_BASE+'?x=1'));
 assert.throws(()=>introVideoURL('mobile','mp4','https://example.invalid/intro-media/cinematic-v6/'));
});
test('Reload/редактор не включают заставку; новое открытие сохраняет её',()=>{
 assert.equal(skipAutomaticIntro({navigationType:'reload'}),true);assert.equal(skipAutomaticIntro({hash:'#view=project-studio'}),true);assert.equal(skipAutomaticIntro({navigationType:'navigate',hash:'#view=home'}),false);
});
test('Все форматы/варианты в таблице существуют, decoder один',async()=>{
 for(const v of ['desktop','mobile'])for(const q of ['full','lite'])for(const ext of ['mp4','webm'])assert.ok((await stat(new URL('../intro-media/cinematic-v6/'+v+(q==='lite'?'-lite':'')+'.'+ext,import.meta.url))).size>1000);
 const s=await readFile(new URL('../core/startup-intro.js',import.meta.url),'utf8');assert.equal(s.includes('new IntroSequence'),false);assert.equal(s.includes('requestVideoFrameCallback'),false);assert.equal((s.match(/createElement\('video'\)/g)||[]).length,1);
});
test('Реальный ESM import нового модуля не требует DOM при импорте',async()=>{
 const m=await import('../core/startup-intro.js');assert.equal(typeof m.installStartupIntro,'function');
});
test('Дозагрузка не создаёт pause/play цикл при HAVE_CURRENT_DATA даже с полным буфером',()=>env(async({tick})=>{
 const v=video({ranges:[[0,10]],readyState:2});let state='pending';const p=waitForIntroBuffer(v,undefined,{minReadyState:3,minWaitMs:200}).then(x=>state=x);tick(500);await Promise.resolve();assert.equal(state,'pending');v.readyState=3;v.dispatchEvent(new Event('canplay'));await p;assert.equal(state,true);
}));
