import {DESTINATIONS,HELP_TOPICS,destinationById,PLATFORM_SCHEMA_VERSION,PLATFORM_SOURCE} from './catalog.js';
import {exactKeys,field,freeze,record} from '../core/contracts.js';
// Один интерфейс для кнопок/текста; будущий голос обязан использовать его же.
// Host — доверенный адаптер. Эта граница не является sandbox для его JavaScript.
const norm=s=>s.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').trim().replace(/[?!.]+$/u,'').replace(/\s+/gu,' ');
const strings={
 ru:{unknown:'Команда не распознана. Попробуйте «Где я?», «Открой Академию» или «Как работать без интернета».',stale:'Контекст изменился. Откройте помощника заново.',invalid:'Некорректный запрос. Используйте одну короткую команду.',deny:'Переход сейчас недоступен.',notConnected:'Это действие не подключено. Используйте штатный интерфейс Nexus.',confirm:'Подтвердите переход кнопкой. Данные не изменяются этой командой.',done:'Переход запрошен. Готовность страницы определяет Nexus.'},
 en:{unknown:'Command not recognized. Try “Where am I?”, “Open Academy” or “How to work offline”.',stale:'Context changed. Reopen the assistant.',invalid:'Invalid request. Use one short command.',deny:'This destination is currently unavailable.',notConnected:'This action is not connected. Use the existing Nexus interface.',confirm:'Confirm navigation with the button. This command does not modify your data.',done:'Navigation requested. Nexus determines when the page is ready.'}
};
function snapshot(readState){
 const raw=readState();record(raw);const mode=field(raw,'mode'),connected=field(raw,'connected'),route=field(raw,'route');
 if(!['online','offline-public','offline-private'].includes(mode)||typeof connected!=='boolean')throw Error('STATE');
 record(route);const view=field(route,'view')??'home';if(typeof view!=='string'||view.length>80)throw Error('STATE');
 return freeze({mode,connected,view,course:field(route,'course')??field(route,'courseId')??null,
  lesson:field(route,'lesson')??field(route,'lessonId')??null,project:field(route,'project')??field(route,'projectId')??null});
}
export function availability(destination,state){
 if(destination.access==='planned')return 'NOT_IMPLEMENTED';
 if(destination.access==='restricted')return 'PERMISSION_CHECK_NOT_CONNECTED';
 if(destination.access==='server'&&(state.mode!=='online'||!state.connected))return 'SERVER_SIGN_IN_REQUIRED';
 if(destination.access==='private'&&state.mode==='offline-public')return 'LOCAL_COPY_LOCKED';
 if(destination.access==='offline'&&state.mode==='online')return 'OFFLINE_SHELL_REQUIRED';
 return null;
}
export function createPlatformGuide({isCurrent,readState,onNavigate,locale='ru'}={}){
 if([isCurrent,readState,onNavigate].some(fn=>typeof fn!=='function')||!['ru','en'].includes(locale))throw Error('INVALID_PLATFORM_HOST');
 const t=strings[locale];let disposed=false,sequence=0;const proposals=new Map();
 const current=()=>{try{return !disposed&&isCurrent()===true}catch{return false}};
 const result=(status,text,extra={})=>freeze({schemaVersion:PLATFORM_SCHEMA_VERSION,capability:'platform.guide',status,text,sources:[],actions:[],...extra});
 const source=paths=>paths.map(path=>({sourceId:'nexus-platform:'+path,sourcePath:path,sourceRevision:path.startsWith('akronikl/')?'AK-P1-1':PLATFORM_SOURCE}));
 const denied=reason=>result('unavailable',t.deny,{reason});
 function request(raw){
  proposals.clear();if(!current())return result('cancelled',t.stale);
  try{
   exactKeys(raw,['kind','text','destinationId']);const kind=field(raw,'kind');
   if(!['text','list','where','navigate','help'].includes(kind))return result('error',t.invalid);
   let command=kind,id=field(raw,'destinationId'),value=field(raw,'text');
   if((kind==='navigate'&&(typeof id!=='string'||id.length>80||value!==undefined))||
     (kind!=='navigate'&&id!==undefined)||(['list','where'].includes(kind)&&value!==undefined))return result('error',t.invalid);
   if(['text','help'].includes(kind)){
    if(typeof value!=='string'||value.length>300||/[\u0000-\u001f\u007f]/u.test(value))return result('error',t.invalid);
    value=norm(value);
    if(['где я','где я сейчас','текущий раздел','where am i','current screen'].includes(value))command='where';
    else if(['что доступно','разделы nexus','куда можно перейти','list sections','available sections'].includes(value))command='list';
    else{
     const match=/^(?:открой|открыть|перейди в|перейди к|open|go to) (.+)$/u.exec(value);
     if(match){const row=DESTINATIONS.find(d=>d.aliases.includes(match[1]));if(row){command='navigate';id=row.id}else command='unknown'}
     else command='help';
    }
   }
   const state=snapshot(readState);if(!current())return result('cancelled',t.stale);
   if(command==='where'){
    const place=state.lesson?(locale==='en'?'Lesson in the current course':'Урок текущего курса'):state.project?(locale==='en'?'Current project':'Текущий проект'):state.course==='cpp'?'C++':destinationById(state.view)?.label[locale]||(locale==='en'?'Current Nexus screen':'Текущий экран Nexus');
    const mode={online:{ru:'Серверный аккаунт подтверждён приложением.',en:'The application has verified the server account.'},'offline-public':{ru:'Публичная офлайн-оболочка. Личная копия закрыта.',en:'Public offline shell. The private copy is locked.'},'offline-private':{ru:'Личная копия открыта локально. Серверный вход этим не подтверждён.',en:'A private copy is unlocked locally. This does not verify server sign-in.'}}[state.mode][locale];
    return result('ok',(locale==='en'?'You are here: ':'Вы здесь: ')+place+'. '+mode,{sources:source(['core/app.js','pwa/offline-entry.js'])});
   }
   if(command==='list')return result('ok',locale==='en'?'Nexus destinations':'Разделы Nexus',{destinations:DESTINATIONS.filter(d=>!['restricted','planned'].includes(d.access)).map(d=>({id:d.id,label:d.label[locale],reason:availability(d,state)})),sources:source(['core/app.js','pwa/offline-entry.js'])});
   if(command==='navigate'){
    const row=destinationById(id);if(!row)return result('clarify',t.unknown);
    const reason=availability(row,state);if(reason)return denied(reason);
    const token='p'+(++sequence);proposals.set(token,{row,mode:state.mode});
    return result('confirm',t.confirm,{sources:source([row.source]),actions:[{id:row.id,token,label:(locale==='en'?'Open: ':'Открыть: ')+row.label[locale],requiresConfirmation:true,mutatesData:false}]});
   }
   if(command==='help'){
    const topic=HELP_TOPICS.find(topic=>topic.aliases.includes(value));
    if(topic)return result('ok',topic.text[locale],{sources:source(topic.paths)});
    if(/^(сохрани|сохранить|удали|удалить|запусти|выйди|опубликуй|save|delete|run|logout|publish)(\s|$)/u.test(value))return result('unavailable',t.notConnected,{reason:'ACTION_NOT_CONNECTED'});
   }
   return result('clarify',t.unknown);
  }catch{return result('error',t.invalid)}
 }
 function confirm(token){
  if(!current()){proposals.clear();return result('cancelled',t.stale)}
  const proposal=typeof token==='string'?proposals.get(token):null;proposals.clear();
  if(!proposal)return result('denied',t.deny,{reason:'INVALID_OR_USED_PROPOSAL'});
  try{
   const state=snapshot(readState);if(!current()||state.mode!==proposal.mode)return result('cancelled',t.stale);
   const reason=availability(proposal.row,state);if(reason)return denied(reason);
   // Полномочия снова проверены. Hash берётся из каталога, никогда из запроса.
   if(onNavigate(proposal.row.hash)!==true)return denied('NAVIGATION_NOT_ACCEPTED');
   return result('ok',t.done);
  }catch{return result('error',t.invalid)}
 }
 return Object.freeze({request,confirm,invalidate(){proposals.clear()},dispose(){disposed=true;proposals.clear()}});
}
