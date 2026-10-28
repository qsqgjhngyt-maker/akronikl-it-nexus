import test from 'node:test';
import assert from 'node:assert/strict';
import {INTRO_KEY,INTRO_VERSION,readIntroPreference,saveIntroPreference,introVariant,staticIntro} from '../core/startup-intro-policy.js';
test('Desktop, телефоны и планшеты выбирают кадр по ориентации и ширине',()=>{
 for(const [w,h,want]of [[1920,1080,'desktop'],[844,390,'desktop'],[390,844,'mobile'],[768,1024,'mobile'],[1024,1366,'mobile'],[1366,1024,'desktop'],[1440,2560,'desktop']])assert.equal(introVariant(w,h),want);
});
test('Сбой, неизвестная схема и запрет storage отключают автопоказ без перезаписи',()=>{
 for(const raw of ['{','[]','null','{"schema":2}','x'.repeat(1025)]){
  let writes=0;const storage={getItem:()=>raw,setItem(){writes++}};
  const state=readIntroPreference(storage);assert.equal(state.writable,false);assert.equal(state.value.enabled,false);assert.equal(writes,0);
 }
 assert.equal(readIntroPreference({getItem(){throw Error()}}).writable,false);
 assert.equal(saveIntroPreference({setItem(){throw Error()}},{}),false);
});
test('Только выделенный ключ, явные настройки и отдельная версия intro',()=>{
 const map=new Map([['synthetic-project','НЕ МЕНЯТЬ']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const a=readIntroPreference(storage);assert.equal(a.value.enabled,true);assert.equal(a.value.seen,'');
 assert.equal(saveIntroPreference(storage,{...a.value,seen:INTRO_VERSION,enabled:false,simplified:true}),true);
 assert.deepEqual(readIntroPreference(storage).value,{schema:1,enabled:false,simplified:true,seen:INTRO_VERSION});
 assert.deepEqual([...map.keys()].sort(),[INTRO_KEY,'synthetic-project'].sort());assert.equal(map.get('synthetic-project'),'НЕ МЕНЯТЬ');
});
test('Reduced motion, offline, save-data, медленная сеть и слабое устройство не запускают видео',()=>{
 for(const p of [{simplified:true},{reducedMotion:true},{online:false},{connection:{saveData:true}},{connection:{effectiveType:'slow-2g'}},{connection:{effectiveType:'3g'}},{deviceMemory:2},{hardwareConcurrency:2}])assert.equal(staticIntro(p),true);
 assert.equal(Boolean(staticIntro({online:true,connection:{effectiveType:'4g'},deviceMemory:8,hardwareConcurrency:8})),false);
});
