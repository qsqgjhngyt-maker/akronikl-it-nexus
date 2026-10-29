import test from 'node:test';
import {isStudioEntry} from '../core/startup-intro-policy.js';
import assert from 'node:assert/strict';
import {INTRO_KEY,INTRO_VERSION,INTRO_HANDOFF_KEY,readIntroPreference,saveIntroPreference,introVariant,staticIntro,readIntroHandoff,saveIntroHandoff,consumeIntroHandoff} from '../core/startup-intro-policy.js';

test('Прямой вход в рабочую Студию пропускает заставку; Главная и обычные уроки сохраняют её',()=>{
 for(const hash of ['#view=project-studio','#view=project-studio&project=synthetic','#view=code-studio&language=cpp'])assert.equal(isStudioEntry(hash),true);
 for(const hash of ['','#view=home','#view=academy','#course=cpp&lesson=cpp.qt-graphical-adapter','#view=projects','#view=project-studio-unknown'])assert.equal(isStudioEntry(hash),false);
});
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
test('Явное упрощение, reduced motion, offline и экономия трафика соблюдаются; ядра и 3G не подавляют видео',()=>{
 for(const p of [{simplified:true},{reducedMotion:true},{online:false},{connection:{saveData:true}}])assert.equal(staticIntro(p),true);
 for(const p of [{connection:{effectiveType:'3g'}},{deviceMemory:2},{hardwareConcurrency:2}])assert.equal(Boolean(staticIntro(p)),false);
 assert.equal(Boolean(staticIntro({online:true,connection:{effectiveType:'4g'},deviceMemory:8,hardwareConcurrency:8})),false);
});
test('Переход авторизации ограничен вкладкой и сроком; однократно потребляется без изменения других данных',()=>{
 const map=new Map([['synthetic-project','НЕ МЕНЯТЬ']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 assert.equal(readIntroHandoff(storage,1000),false);assert.equal(saveIntroHandoff(storage,1000),true);
 assert.equal(readIntroHandoff(storage,999),false);assert.equal(readIntroHandoff(storage,1001),true);assert.equal(readIntroHandoff(storage,901000),false);
 assert.equal(consumeIntroHandoff(storage,1001),true);assert.equal(consumeIntroHandoff(storage,1002),false);assert.equal(map.get('synthetic-project'),'НЕ МЕНЯТЬ');
 for(const raw of ['{','x'.repeat(257),JSON.stringify({schema:99,kind:'auth-navigation',at:1000})]){map.set(INTRO_HANDOFF_KEY,raw);assert.equal(readIntroHandoff(storage,1002),false)}
});
