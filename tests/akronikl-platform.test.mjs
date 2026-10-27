import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPlatformGuide} from '../akronikl/platform/service.js';
import {DESTINATIONS,HELP_TOPICS,allowedHash} from '../akronikl/platform/catalog.js';
function fixture({mode='online',connected=true,locale='ru',view='home'}={}){
 let current=true,state={mode,connected,route:{view}};const calls=[];
 const guide=createPlatformGuide({isCurrent:()=>current,readState:()=>state,onNavigate:hash=>{calls.push(hash);return true},locale});
 return {guide,calls,invalidate(){current=false},setState(next){state=next},state};
}
const text=(f,value)=>f.guide.request({kind:'text',text:value});
test('каждое направление имеет существующий источник; только разрешённый локальный hash',async()=>{
 for(const row of DESTINATIONS){await readFile(new URL('../'+row.source,import.meta.url));if(row.hash)assert.match(row.hash,/^#view=[a-z-]+$/);}
 for(const row of HELP_TOPICS)for(const path of row.paths)await readFile(new URL('../'+path,import.meta.url));
 assert.equal(new Set(DESTINATIONS.map(row=>row.id)).size,DESTINATIONS.length);
 assert.equal(allowedHash('https://example.invalid'),false);assert.equal(allowedHash('#view=admin'),false);
});
for(const [command,hash] of [['Открой Академию','#view=academy'],['открой мои проекты','#view=projects'],['Open Code Studio','#view=code-studio'],['go to home','#view=home'],['  ОТКРОЙ   БЛОГ!  ','#view=blog']])test('команда → предложение → один подтверждённый переход: '+command,()=>{
 const f=fixture();const result=text(f,command);assert.equal(result.status,'confirm');assert.equal(f.calls.length,0);
 assert.equal(f.guide.confirm(result.actions[0].token).status,'ok');assert.deepEqual(f.calls,[hash]);
 assert.equal(f.guide.confirm(result.actions[0].token).status,'denied');assert.equal(f.calls.length,1);
});
test('RU и EN отвечают на своём языке; команды не запускают модель',()=>{
 const ru=fixture(),en=fixture({locale:'en'});assert.match(text(ru,'Где я?').text,/Вы здесь: Главная/);assert.match(text(en,'Where am I?').text,/You are here: Home/);
 assert.match(text(ru,'Как работать без интернета').text,/зашифрованная копия/);assert.match(text(en,'how to work offline').text,/encrypted copy/);
});
for(const mode of ['offline-public','offline-private'])test('локальная оболочка не выдаёт unlock за серверный вход: '+mode,()=>{
 const f=fixture({mode});assert.match(text(f,'где я').text,mode==='offline-public'?/Личная копия закрыта/:/Серверный вход этим не подтверждён/);
 assert.equal(text(f,'открой аккаунт').reason,'SERVER_SIGN_IN_REQUIRED');assert.equal(f.calls.length,0);
});
for(const command of ['открой проекты','открой code studio','открой графику'])test('закрытая копия не разрешает приватное направление: '+command,()=>{
 const f=fixture({mode:'offline-public'});assert.equal(text(f,command).reason,'LOCAL_COPY_LOCKED');assert.equal(f.calls.length,0);
});
test('открытая копия разрешает переход, но не выдаёт проект/код',()=>{
 const f=fixture({mode:'offline-private',connected:false});const r=text(f,'открой проекты');assert.equal(r.status,'confirm');assert.equal('project'in r,false);assert.equal('code'in r,false);
});
test('офлайн-команды не перенаправляют online в чужой документ',()=>{
 assert.equal(text(fixture(),'открой личную копию').reason,'OFFLINE_SHELL_REQUIRED');assert.equal(text(fixture({mode:'offline-public'}),'открой личную копию').status,'confirm');
});
test('неподключённые административные права и Skill Graph не маскируются как готовые',()=>{
 const f=fixture();assert.equal(text(f,'открой администрирование').reason,'PERMISSION_CHECK_NOT_CONNECTED');assert.equal(text(f,'открой карту навыков').reason,'NOT_IMPLEMENTED');
 const list=f.guide.request({kind:'list'});assert.equal(list.destinations.some(d=>['admin','skills'].includes(d.id)),false);
});
for(const command of ['удали проект','сохрани работу','запусти программу','publish project','logout'])test('изменяющая операция не исполняется: '+command,()=>{
 const f=fixture();assert.equal(text(f,command).reason,'ACTION_NOT_CONNECTED');assert.equal(f.calls.length,0);
});
for(const command of ['открой javascript:alert(1)','открой https://example.invalid','открой академию и удали проекты','открой #view=admin','сделай всё сам'])test('неизвестная/составная команда не становится исполняемой: '+command,()=>{
 const f=fixture();const r=text(f,command);assert.equal(r.status,'clarify');assert.equal(r.actions.length,0);assert.equal(f.calls.length,0);
});
test('фальшивый token, новый запрос, редактирование ввода и dispose запрещают повторное действие',()=>{
 const f=fixture();assert.equal(f.guide.confirm('p999').status,'denied');let r=text(f,'открой академию');text(f,'где я');assert.equal(f.guide.confirm(r.actions[0].token).status,'denied');
 r=text(f,'открой академию');f.guide.invalidate();assert.equal(f.guide.confirm(r.actions[0].token).status,'denied');
 r=text(f,'открой академию');f.guide.dispose();assert.equal(f.guide.confirm(r.actions[0].token).status,'cancelled');assert.equal(f.calls.length,0);
});
test('смена контекста между предложением и нажатием закрывает доступ',()=>{
 const f=fixture();const r=text(f,'открой проекты');f.invalidate();assert.equal(f.guide.confirm(r.actions[0].token).status,'cancelled');assert.equal(f.calls.length,0);
});
test('смена сети перепроверяется при подтверждении server-раздела',()=>{
 const f=fixture(),r=text(f,'открой аккаунт');f.state.connected=false;assert.equal(f.guide.confirm(r.actions[0].token).reason,'SERVER_SIGN_IN_REQUIRED');assert.equal(f.calls.length,0);
});
test('смена online на локальную оболочку не наследует предложение',()=>{
 const f=fixture(),r=text(f,'открой проекты');f.state.mode='offline-private';assert.equal(f.guide.confirm(r.actions[0].token).status,'cancelled');assert.equal(f.calls.length,0);
});
test('лишние поля полномочий, URL и getter отклоняются без выполнения',()=>{
 const f=fixture();let called=0;const q={kind:'text'};Object.defineProperty(q,'text',{enumerable:true,get(){called++;return 'открой аккаунт'}});
 for(const value of [q,{kind:'navigate',destinationId:'home',canManage:true},{kind:'text',text:'Открой главную',url:'https://example.invalid'},null,[],{kind:'where',text:'x'},{kind:'text',text:'a'.repeat(301)},{kind:'text',text:'a\nb'}])assert.equal(f.guide.request(value).status,'error');
 assert.equal(called,0);assert.equal(f.calls.length,0);
});
test('снимок не читает произвольные secret/code поля адаптера',()=>{
 const f=fixture();Object.defineProperty(f.state,'secret',{get(){throw Error('secret getter')}});Object.defineProperty(f.state.route,'code',{get(){throw Error('code getter')}});
 assert.equal(text(f,'где я').status,'error'); // strict record rejects accessors, never runs them
});
test('внешняя ошибка и отменённое действие не сообщаются как успешный переход',()=>{
 for(const fn of [()=>{throw Error('DO_NOT_REFLECT')},()=>false]){
 const g=createPlatformGuide({isCurrent:()=>true,readState:()=>({mode:'online',connected:true,route:{view:'home'}}),onNavigate:fn});const r=g.request({kind:'text',text:'открой академию'});const answer=g.confirm(r.actions[0].token);assert.notEqual(answer.status,'ok');assert.equal(JSON.stringify(answer).includes('DO_NOT_REFLECT'),false);
 }
});
test('каталог и ответ нельзя изменить после проверки',()=>{
 assert.throws(()=>{DESTINATIONS[0].hash='#view=admin'},TypeError);const f=fixture(),r=text(f,'открой академию');assert.throws(()=>{r.actions[0].id='admin'},TypeError);
});
test('все help-ответы имеют источник; не заявляют неизвестную причину',()=>{
 const f=fixture();for(const topic of HELP_TOPICS){const r=text(f,topic.aliases[0]);assert.equal(r.status,'ok');assert.ok(r.sources.length);}
 assert.match(text(f,'почему кнопка недоступна').text,/не могу достоверно/);assert.match(text(f,'как сохранить работу').text,/не выполняет сохранение/);
});
test('новые уроки M5 индексируются, old IDs сохранены, неизвестный модуль отклоняется',async()=>{
 const m=JSON.parse(await readFile(new URL('../akronikl/knowledge/manifest.json',import.meta.url)));assert.equal(m.programVersion,'cpp-gold-m5-v1');
 for(const index of m.indexes){assert.equal(index.lessons,56);assert.equal(index.goldLessons,55);const b=JSON.parse(await readFile(new URL('../'+index.path,import.meta.url)));for(const id of ['cpp.raii-smart-pointers','cpp.templates-concepts','cpp.exceptions-guarantees','cpp.pointers-references-addresses'])assert.ok(b.records.some(r=>r.lessonId===id));}
});
