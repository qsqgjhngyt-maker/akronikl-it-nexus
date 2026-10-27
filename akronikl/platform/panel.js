import {createPlatformGuide} from './service.js';
const reasons={
 ru:{NOT_IMPLEMENTED:'Эта функция пока запланирована.',PERMISSION_CHECK_NOT_CONNECTED:'Проверка административных прав помощником не подключена. Используйте штатную навигацию.',SERVER_SIGN_IN_REQUIRED:'Нужны обычный Nexus, сеть и проверка серверного аккаунта.',LOCAL_COPY_LOCKED:'Сначала откройте личную офлайн-копию.',OFFLINE_SHELL_REQUIRED:'Откройте Офлайн-центр: эта команда доступна в отдельной офлайн-оболочке.',NAVIGATION_NOT_ACCEPTED:'Переход не был принят приложением.'},
 en:{NOT_IMPLEMENTED:'This feature is still planned.',PERMISSION_CHECK_NOT_CONNECTED:'Assistant permission checks for administration are not connected. Use existing navigation.',SERVER_SIGN_IN_REQUIRED:'This requires online Nexus, connectivity and verified server sign-in.',LOCAL_COPY_LOCKED:'Unlock the private offline copy first.',OFFLINE_SHELL_REQUIRED:'Open the Offline center. This command is available in the separate offline shell.',NAVIGATION_NOT_ACCEPTED:'The application did not accept navigation.'}
};
export function mountPlatformGuide({parent,documentRef,locale,host,onNavigate}){
 const en=locale==='en',language=en?'en':'ru';
 const make=(tag,text,root=parent)=>{const n=documentRef.createElement(tag);if(text)n.textContent=text;root.append(n);return n};
 const section=make('section');section.dataset.akroniklPlatform='';section.setAttribute('aria-labelledby','akronikl-platform-title');
 const title=make('h3',en?'Nexus navigation and help':'Навигация и справка Nexus',section);title.id='akronikl-platform-title';
 const label=make('label',en?'Command or question about Nexus':'Команда или вопрос о Nexus',section);
 const input=make('input','',label);input.type='text';input.maxLength=300;input.autocomplete='off';input.dataset.akroniklCommand='';
 input.setAttribute('aria-describedby','akronikl-platform-hint');
 const hint=make('p',en?'Examples: “Where am I?”, “Open Academy”, “How to work offline”. Navigation requires confirmation.':'Например: «Где я?», «Открой Академию», «Как работать без интернета». Переход требует подтверждения.',section);hint.id='akronikl-platform-hint';hint.className='akronikl-note';
 const row=make('div','',section);row.className='akronikl-actions';
 const button=(text,fn)=>{const n=make('button',text,row);n.type='button';n.className='btn';n.addEventListener('click',fn);return n};
 const output=make('section','',section);output.dataset.akroniklPlatformResult='';output.setAttribute('aria-label',en?'Nexus help result':'Ответ по Nexus');output.setAttribute('aria-live','polite');output.setAttribute('aria-atomic','true');
 const guide=createPlatformGuide({isCurrent:host.current,readState:host.platformState,onNavigate,locale:language});
 function show(result){
  output.replaceChildren();make('p',result.text,output);
  if(result.reason&&reasons[language][result.reason])make('p',reasons[language][result.reason],output);
  for(const dest of result.destinations||[]){
   const line=make('div','',output);const b=make('button',dest.label,line);b.type='button';b.className='btn';
   if(dest.reason){b.disabled=true;make('span',' — '+(reasons[language][dest.reason]||dest.reason),line)}
   else b.addEventListener('click',()=>show(guide.request({kind:'navigate',destinationId:dest.id})));
  }
  for(const action of result.actions){const b=make('button',action.label,output);b.type='button';b.className='btn primary';b.dataset.akroniklConfirm='';b.addEventListener('click',()=>show(guide.confirm(action.token)));}
  if(result.sources.length){const details=make('details','',output);make('summary',en?'Basis in Nexus':'Основание в Nexus',details);for(const s of result.sources)make('p',s.sourcePath,details)}
 }
 const run=()=>show(guide.request({kind:'text',text:input.value}));
 button(en?'Check command':'Проверить команду',run);
 button(en?'Where am I?':'Где я?',()=>show(guide.request({kind:'where'})));
 button(en?'Nexus sections':'Разделы Nexus',()=>show(guide.request({kind:'list'})));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();run()}});
 input.addEventListener('input',()=>{guide.invalidate();output.replaceChildren()});
 return Object.freeze({focus(){input.focus()},clear(){guide.invalidate();input.value='';output.replaceChildren()},dispose(){guide.dispose();input.value='';output.replaceChildren();section.remove()}});
}
