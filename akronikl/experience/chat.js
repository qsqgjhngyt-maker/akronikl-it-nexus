import {createChatTree} from './chat-tree.js';
import {readChatAttachment,imageCapable} from './attachments.js';
import {cloudPreferences} from '../connections/preferences.js';
import {createSpeechController,speechPreferences} from './speech.js';
import {createAssistantCore} from '../core/index.js';
import {createUiHost} from '../ui/nexus-host.js';
import {loadUiKnowledge} from '../ui/knowledge-loader.js';
import {bindDialogFocusCycle} from '../ui/focus-cycle.js';
import {createPlatformGuide} from '../platform/service.js';
import {allowedHash} from '../platform/catalog.js';
import {createTutorSession} from '../tutor/session.js';
import {createModelConnections} from '../connections/controller.js';
import {mountConnectionPanel} from '../connections/panel.js';
import {resolveMessage} from './intents.js';
import {textFor} from './strings.js';
import {currentStudy} from '../learning/current-study.js';
import {createPersonality} from '../personality/controller.js';
import {mountPersonalityPanel} from '../personality/panel.js';

// Один экран разговора; все прежние привилегированные действия остаются в host.
// Cloud requires an explicit trusted host broker and user-selected connection.
// No keys, browser storage, raw HTML, automatic code/audio upload or fallback.
export function openExperience(options) {
  const doc=options.documentRef??globalThis.document, win=options.windowRef??globalThis.window;
  const {root,trigger,onDispose=()=>{},onNavigate=()=>{},loadKnowledge=loadUiKnowledge}=options;
  const host=createUiHost(options);
  if(!host.current())throw Error('AKRONIKL_CONTEXT_CHANGED');
  const initialHash=win.location.hash;
  let locale=options.readLocale()==='en'?'en':'ru',dead=false,seq=0,request=null,session=null;
  let connections=null,connectionPanel=null,connectedRevision=-1,settingsOpen=false,settingsSection='basics';
  let lessonAllowed=true,codeAllowed=false,diagnosticsAllowed=false,privacyBoundary={},busy=false,slowTimer=null,lastMetrics=null;
  let suggestionsEnabled=true,enterSends=true,generalChat=options.cloudBroker?.settings===true,pendingFiles=[],rendering=false,privateReady=!options.cloudBroker?.accountBound;
  const tree=createChatTree(),revisions={preferences:0,chats:0};let fileOperation=null,preparingFiles=false;let preferenceTimer,chatTimer,stateQueue=Promise.resolve(),hydrating=false;
  let voicePrefs=speechPreferences(),voiceFields=null,lastCloudChoiceStamp=null,offlineHelp=false;
  const speech=createSpeechController({windowRef:win,isCurrent:()=>!dead&&host.current(),onChange:()=>refreshSpeech()});
  const chatText=(ru,en)=>locale==='en'?en:ru;
  const personality=createPersonality({isCurrent:()=>!dead&&host.current(),locale,onChange(){
    // Уже показанные реплики не переписываем. Новая сессия не наследует старый стиль.
    stop();privacyBoundary={};renew();if(!hydrating)scheduleSave('preferences');status.textContent=t('personalityChanged');
  }});
  const cloudLabels={windowOnly:options.cloudBroker?.accountBound?['Настройки сохраняются в вашем аккаунте Nexus.','Settings are saved to your Nexus account.']:null,local:['В локальном режиме контекст остаётся на устройстве. При подключении облачной модели отправляются вопрос, контекст продолжения и разрешённые материалы или выделенный код.','Local mode keeps context on this device. Connecting a cloud model sends the question, follow-up context and allowed sources or selected code.'],external:['Облачная модель включается выбором модели и подключением. Ключи здесь не запрашиваются.','Cloud AI requires selecting and connecting it. No API keys are requested here.']};
  const listeners=new AbortController(),t=key=>options.cloudBroker&&cloudLabels[key]?cloudLabels[key][locale==='en'?1:0]:textFor(locale,key),labels=[];
  const el=(tag,parent,cls='',text='')=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;parent?.append(n);return n;};
  const label=(n,key,attr)=>{if(!n.closest?.('[data-ak-message]'))labels.push({n,key,attr});if(attr)n.setAttribute(attr,t(key));else n.textContent=t(key);return n;};
  const button=(parent,key,fn,cls='ak-btn')=>{const b=label(el('button',parent,cls),key);b.type='button';if(fn)b.addEventListener('click',fn);return b;};
  if(!doc.querySelector('link[data-akronikl-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('../ui/panel.css',import.meta.url).href;link.dataset.akroniklStyle='';doc.head.append(link);}
  const dialog=el('dialog',null,'akronikl-core-dialog ak-chat');dialog.dataset.akroniklPanel='';dialog.dataset.akTheme='auto';dialog.lang=locale;dialog.setAttribute('aria-labelledby','ak-chat-title');
  const header=el('header',dialog,'ak-header');const brand=el('div',header,'ak-brand');el('span',brand,'ak-avatar','A').setAttribute('aria-hidden','true');
  const heading=el('div',brand);const title=el('h2',heading,'','Akronikl');title.id='ak-chat-title';title.tabIndex=-1;
  const status=el('p',heading,'ak-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.akroniklStatus='';
  const headActions=el('div',header,'ak-header-actions');
  const gear=button(headActions,'settings',()=>toggleSettings(!settingsOpen),'ak-icon');gear.textContent='⚙';gear.setAttribute('aria-label',t('settings'));gear.setAttribute('aria-expanded','false');gear.setAttribute('aria-controls','ak-chat-settings');gear.dataset.akroniklSettings='';
  const close=button(headActions,'close',dispose,'ak-icon');close.textContent='×';close.setAttribute('aria-label',t('close'));close.dataset.akroniklClose='';
  const body=el('div',dialog,'ak-body');const main=el('section',body,'ak-conversation');main.dataset.akConversation='';
  const log=el('div',main,'ak-messages');log.dataset.akroniklMessages='';log.setAttribute('role','log');log.setAttribute('aria-label',locale==='en'?'Conversation with Akronikl':'Разговор с Akronikl');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');log.tabIndex=0;
  const welcome=el('section',log,'ak-welcome');el('span',welcome,'ak-orbit','✦').setAttribute('aria-hidden','true');label(el('h3',welcome),'welcome');label(el('p',welcome),'intro');
  const latest=button(main,'newMessages',()=>{log.scrollTop=log.scrollHeight;latest.hidden=true;},'ak-latest');latest.hidden=true;
  const hints=el('div',main,'ak-suggestions');hints.setAttribute('aria-label',locale==='en'?'Suggestions':'Предложения');
  const form=el('form',main,'ak-composer');const inputLabel=label(el('label',form,'ak-sr'),'message');inputLabel.htmlFor='ak-chat-message';
  const input=el('textarea',form);input.id='ak-chat-message';input.rows=2;input.maxLength=1500;input.autocomplete='off';input.setAttribute('enterkeyhint','send');input.dataset.akroniklMessage='';label(input,'placeholder','placeholder');
  const composerBar=el('div',form,'ak-composer-bar');const inputHint=label(el('small',composerBar,'ak-muted'),'hint');
  const send=button(composerBar,'send',null,'ak-btn ak-primary');send.type='submit';send.dataset.akroniklSend='';send.disabled=true;
  const stopButton=button(composerBar,'stop',()=>stop(true),'ak-btn');stopButton.dataset.akroniklStop='';stopButton.hidden=true;
  const branchRow=el('div',main,'ak-chat-branches');main.insertBefore(branchRow,log);
  const branchSelect=el('select',branchRow);branchSelect.dataset.akChatBranches='';branchSelect.setAttribute('aria-label',chatText('Ветки разговора','Conversation branches'));
  const newChat=el('button',branchRow,'ak-btn',chatText('Новый разговор','New conversation'));newChat.type='button';newChat.dataset.akChatNew='';
  const fileInput=el('input',composerBar);fileInput.type='file';fileInput.multiple=true;fileInput.accept='.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.log,.yaml,.yml,.cpp,.h,.hpp,.c,.js,.mjs,.ts,.py,.rs,.go,.java,.cs,.sql,.css,.html,.pdf,.docx,.xlsx,.pptx';fileInput.hidden=true;fileInput.dataset.akChatUpload='';
  const attachButton=el('button',composerBar,'ak-btn',chatText('Прикрепить','Attach'));attachButton.type='button';attachButton.dataset.akChatAttach='';attachButton.onclick=()=>fileInput.click();
  const filePreview=el('div',form,'ak-chat-files');form.insertBefore(filePreview,input);
  const fileNote=el('p',form,'ak-muted',chatText('Изображения, PDF и текст Office отправляются выбранному ИИ с сообщением. У длинных PDF и Office рисунки не анализируются; формулы таблиц не пересчитываются.','Images, PDF and Office text are sent with your message. Long PDFs and Office exclude pictures; spreadsheet formulas are not recalculated.'));fileNote.dataset.akChatFileNote='';
  const offlineNote=el('div',form,'ak-muted');offlineNote.hidden=true;label(el('p',offlineNote),'offlinePublic');const restorePrivate=button(offlineNote,'restorePrivate',()=>{void hydrate();});restorePrivate.dataset.akRestorePrivate='';
  const drawer=el('aside',body,'ak-settings');drawer.id='ak-chat-settings';drawer.hidden=true;drawer.inert=true;drawer.setAttribute('aria-labelledby','ak-settings-title');
  const drawerHeader=el('div',drawer,'ak-settings-heading');const drawerTitle=label(el('h3',drawerHeader),'settings');drawerTitle.id='ak-settings-title';drawerTitle.tabIndex=-1;
  button(drawerHeader,'back',()=>toggleSettings(false),'ak-btn ak-back');
  const nav=el('nav',drawer,'ak-settings-nav');nav.setAttribute('aria-label',t('settings'));const sections={},tabs={};
  for(const key of ['basics','personality','model','voice','privacy','advanced']){tabs[key]=button(nav,key,()=>showSection(key),'ak-tab');tabs[key].setAttribute('aria-controls','ak-settings-'+key);sections[key]=el('section',drawer,'ak-settings-section');sections[key].id='ak-settings-'+key;sections[key].hidden=key!=='basics';label(el('h4',sections[key]),key);}
  const selectField=(parent,key,items)=>{const l=el('label',parent,'ak-setting-label');label(el('span',l),key);const s=el('select',l);for(const [value,caption] of items){const o=el('option',s);o.value=value;if(caption.startsWith('@'))label(o,caption.slice(1));else o.textContent=caption;}return s;};
  const language=selectField(sections.basics,'lang',[['ru','Русский'],['en','English']]);language.value=locale;language.dataset.akLanguage='';
  const theme=selectField(sections.basics,'theme',[['auto','@themeAuto'],['light','@themeLight'],['dark','@themeDark']]);theme.dataset.akThemeSelect='';
  const checkField=(parent,key,checked)=>{const l=el('label',parent,'ak-check');const c=el('input',l);c.type='checkbox';c.checked=checked;label(el('span',l),key);return c;};
  const suggest=checkField(sections.basics,'suggestions',true),enter=checkField(sections.basics,'enter',true);label(el('p',sections.basics,'ak-muted'),'windowOnly');
  const personalityPanel=mountPersonalityPanel({parent:sections.personality,documentRef:doc,controller:personality,locale});
  const voiceAuto=el('input',el('label',sections.voice,'ak-check'));voiceAuto.type='checkbox';voiceAuto.dataset.akSpeechAuto='';el('span',voiceAuto.parentElement,'',t('voiceAuto'));
  const voiceLabel=el('label',sections.voice,'ak-setting-label');el('span',voiceLabel,'',t('voiceDevice'));const voiceSelect=el('select',voiceLabel);voiceSelect.dataset.akSpeechVoice='';
  const rateLabel=el('label',sections.voice,'ak-setting-label');el('span',rateLabel,'',t('voiceRate'));const voiceRate=el('select',rateLabel);voiceRate.dataset.akSpeechRate='';for(const r of [.7,.85,1,1.15,1.3,1.5]){const o=el('option',voiceRate,'',String(r)+'×');o.value=String(r);}voiceRate.value='1';
  const voiceActions=el('div',sections.voice,'ak-message-actions');const voiceTest=el('button',voiceActions,'ak-btn',t('voiceTest')),voicePause=el('button',voiceActions,'ak-btn',t('voicePause')),voiceStop=el('button',voiceActions,'ak-btn',t('voiceStop'));for(const b of [voiceTest,voicePause,voiceStop])b.type='button';voiceTest.dataset.akSpeechTest='';voiceStop.dataset.akSpeechStop='';
  const voiceStatus=el('p',sections.voice,'ak-muted');voiceStatus.setAttribute('role','status');voiceStatus.dataset.akSpeechStatus='';el('p',sections.voice,'ak-muted',chatText('Используются установленные голоса устройства. Автоозвучка читает только новые ответы после вашего действия; старая история не воспроизводится. Микрофон не включается.','Uses installed device voices. Auto speech reads only new replies after your interaction; history is not replayed. The microphone is not used.'));
  voiceFields={voiceAuto,voiceSelect,voiceRate,voiceStatus,voiceTest,voicePause,voiceStop};label(voiceStatus.nextElementSibling,'voiceNote');for(const [n,key]of [[voiceAuto.nextElementSibling,'voiceAuto'],[voiceLabel.firstElementChild,'voiceDevice'],[rateLabel.firstElementChild,'voiceRate'],[voiceTest,'voiceTest'],[voicePause,'voicePause'],[voiceStop,'voiceStop']])label(n,key);voicePause.dataset.akSpeechPause='';speech.configure(voicePrefs,locale);
  const saveVoice=()=>{voicePrefs=speechPreferences({auto:voiceAuto.checked,voiceURI:voiceSelect.value,rate:Number(voiceRate.value)});speech.configure(voicePrefs,locale);speech.arm();scheduleSave('preferences');};for(const f of [voiceAuto,voiceSelect,voiceRate])f.addEventListener('change',saveVoice);
  voiceTest.onclick=()=>speech.read(chatText('Здравствуйте! Я помогу разобраться в материалах курса.','Hello! I can help you understand your course.'));voiceStop.onclick=()=>speech.stop();voicePause.onclick=()=>speech.snapshot().state==='paused'?speech.resume():speech.pause();refreshSpeech();
  const generalMode=el('input',el('label',sections.model,'ak-check'));generalMode.type='checkbox';generalMode.checked=generalChat;generalMode.dataset.akChatMode='';el('span',generalMode.parentElement,'',chatText('Общий чат и анализ вложений','General chat and attachment analysis'));generalMode.parentElement.hidden=!options.cloudBroker?.settings;
  const lesson=checkField(sections.privacy,'lesson',true);lesson.dataset.akLessonConsent='';
  const selection=checkField(sections.privacy,'code',false);selection.disabled=!host.selectionAvailable;selection.dataset.akCodeConsent='';
  const compilerConsent=checkField(sections.privacy,'diagnosticConsent',false);compilerConsent.disabled=true;compilerConsent.dataset.akDiagnosticConsent='';
  label(el('p',sections.privacy,'ak-muted'),'diagnosticNote');
  label(el('p',sections.privacy,'ak-muted'),'codeNote');label(el('p',sections.privacy),'local');
  button(sections.privacy,'inspect',()=>{toggleSettings(false);void submit(t('inspect'),{kind:'context'});});
  button(sections.privacy,'revoke',()=>{lessonAllowed=false;codeAllowed=false;diagnosticsAllowed=false;lesson.checked=false;selection.checked=false;compilerConsent.checked=false;compilerConsent.disabled=true;clear(true);status.textContent=t('revoked');});
  button(sections.privacy,'clear',()=>{clear(true);status.textContent=t('cleared');});
  label(el('p',sections.advanced),'external');label(el('h4',sections.advanced),'diagnostics');
  const diagnostic=el('pre',sections.advanced,'ak-diagnostics');diagnostic.dataset.akTechnicalState='';

  const sessionHost=Object.freeze({
    readBoundary:()=>host.current()?privacyBoundary:null,
    authorize:q=>host.current()&&(!(q.input?.include||[]).includes('selection')||codeAllowed)&&
      (!(q.input?.include||[]).includes('diagnostics')||diagnosticsAllowed&&codeAllowed)&&host.adapter.authorize(q),
    readContext(q){const c=host.adapter.readContext(q);return lessonAllowed?c:{...c,learning:undefined,route:{...c.route,courseId:null,lessonId:null,taskId:null}};}
  });
  let core=createAssistantCore({host:sessionHost,policy:{selection:true,diagnostics:true}});
  const guide=createPlatformGuide({isCurrent:host.current,readState:host.platformState,locale,onNavigate:hash=>{if(!host.current()||!allowedHash(hash))return false;dispose();onNavigate({kind:'platform',hash});return true;}});
  // Пересоздание guide при смене языка не меняет прав/маршрутов host.
  let activeGuide=guide;
  function renew(){session?.dispose();session=createTutorSession({host:sessionHost,loadKnowledge,locale,provider:connections?.lease()??null,allowCloud:!!options.cloudBroker,readPersonality:()=>personality.snapshot(),
    readCommunicationState:options.readCommunicationState??(()=> 'unknown')});}
  function current(ticket){return !dead&&ticket===seq&&host.current();}
  function readyStatus(){offlineNote.hidden=!offlineHelp;restorePrivate.disabled=hydrating||win.navigator?.onLine===false;if(!dead)attachButton.disabled=busy||preparingFiles||!privateReady||!generalChat||!connections?.snapshot().cloudEnabled||win.navigator?.onLine===false||offlineHelp;if(!dead&&!busy)status.textContent=offlineHelp?t('offlineHelp'):win.navigator?.onLine===false?t('offline'):t('ready');}
  function setBusy(value){busy=value;send.disabled=value||preparingFiles||!privateReady||!input.value.trim();attachButton.disabled=value||preparingFiles||!privateReady||!generalChat||!connections?.snapshot().cloudEnabled||win.navigator?.onLine===false||offlineHelp;branchSelect.disabled=value||!privateReady;newChat.disabled=value||!privateReady;stopButton.hidden=!value;form.setAttribute('aria-busy',String(value));clearTimeout(slowTimer);if(value){status.textContent=t('answering');slowTimer=setTimeout(()=>{if(!dead&&busy)status.textContent=t('slow');},15000);}else readyStatus();}
  function stop(announce=false){speech.stop();seq++;request?.abort();request=null;session?.cancel();core.invalidate();activeGuide.invalidate();connections?.cancelPending();setBusy(false);log.querySelectorAll('[data-ak-pending]').forEach(n=>n.remove());log.querySelectorAll('[data-akronikl-confirm]').forEach(n=>n.disabled=true);if(announce)status.textContent=t('stopped');}
  function clear(revokeSession=false){stop();if(revokeSession){privacyBoundary={};renew();}else session?.clear();lastMetrics=null;tree.clear();scheduleSave('chats');renderBranches();log.replaceChildren(welcome);welcome.hidden=false;pendingFiles=[];renderFiles();input.value='';send.disabled=true;latest.hidden=true;refreshHints();}
  function onModelInvalidate(){if(dead)return;fileOperation?.abort();stop();pendingFiles=[];renderFiles();privacyBoundary={};session?.dispose();session=null;if(generalChat)renderTree();else{tree.clear();log.replaceChildren(welcome);welcome.hidden=false;}input.value='';lastMetrics=null;renew();status.textContent=t('modelChange');}
  connections=createModelConnections({isCurrent:()=>!dead&&host.current(),loadLocal:options.loadTutorModel??(async(file,settings)=>(await import('../tutor/local-model.js')).loadLocalModel(file,settings)),inspect:options.inspectTutorModel,cloudBroker:options.cloudBroker??null,onInvalidate:onModelInvalidate});
  const unsubConnection=connections.subscribe(s=>{if(dead)return;const choiceStamp=JSON.stringify(s.cloudSelection);if(choiceStamp!==lastCloudChoiceStamp){lastCloudChoiceStamp=choiceStamp;scheduleSave('preferences');}if(s.phase==='connected'&&connectedRevision!==s.revision){connectedRevision=s.revision;renew();}attachButton.disabled=busy||preparingFiles||!privateReady||!generalChat||!s.cloudEnabled||win.navigator?.onLine===false||offlineHelp;refreshDiagnostics(s);readyStatus();});
  function refreshDiagnostics(s=connections.snapshot()){diagnostic.textContent=JSON.stringify({profile:s.profileId,phase:s.phase,code:s.code,inspection:s.inspection,measurements:lastMetrics,externalAI:s.cloudEnabled},null,2);}
  function mountModels(){connectionPanel?.dispose();connectionPanel=mountConnectionPanel({parent:sections.model,documentRef:doc,controller:connections,locale,allowWebGPU:false});const d=sections.model.querySelector('details');if(d)d.open=true;}
  mountModels();renew();
  const gpuStatus=el('p',sections.model,'ak-muted');
  button(sections.model,'gpuCheck',async()=>{const ticket=seq;try{const {probeWebGPU}=await import('../connections/probe.js');const result=await probeWebGPU({signal:listeners.signal,environment:win});if(dead||ticket!==seq||!host.current())return;connectionPanel.setWebGPUAvailable(result==='available');gpuStatus.textContent=t(result==='available'?'gpuReady':'gpuNotReady');}catch{if(!dead)gpuStatus.textContent=t('gpuNotReady');}});
  function refreshHints(){hints.replaceChildren();hints.hidden=!suggestionsEnabled;if(!suggestionsEnabled)return;let inLesson=false;try{const r=host.platformState().route;inLesson=!!(r.lesson||r.lessonId);}catch{}for(const key of [inLesson?'simple':'where','academy','saveHelp'])button(hints,key,()=>{input.value=t(key);void submit(input.value);},'ak-chip');}
  function showSection(key){settingsSection=key;for(const k of Object.keys(sections)){sections[k].hidden=k!==key;tabs[k].setAttribute('aria-pressed',String(k===key));}if(key==='advanced')refreshDiagnostics();}
  function toggleSettings(open){settingsOpen=open;drawer.hidden=!open;drawer.inert=!open;main.inert=open;dialog.dataset.settingsOpen=String(open);gear.setAttribute('aria-expanded',String(open));if(open){showSection(settingsSection);drawerTitle.focus();}else gear.focus();}
  function appendMessage(role,text,badge='system',attachments=[],restored=null){
    const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80;welcome.hidden=true;
    const node=restored??tree.append({role,text,badge,generated:['generated','uncertain'].includes(badge),attachments});
    const item=el('article',log,'ak-message ak-'+role);item.dataset.akMessage=role;item.dataset.akChatNode=node.id;item.dataset.tutorGenerated=String(node.generated);
    if(role==='assistant')label(el('small',item,'ak-message-kind'),badge);else label(el('small',item,'ak-sr'),'you');
    const content=el('div',item,'ak-message-text');content.textContent=text; // Никогда HTML/Markdown с активными ссылками.
    for(const a of node.attachments){el('small',item,'ak-muted',a.name);if(a.type==='image'){const image=el('img',item,'ak-chat-image');image.src='data:'+a.mime+';base64,'+a.data;image.alt=a.name;}}
    const actions=el('div',item,'ak-message-actions');const fork=el('button',actions,'ak-btn',chatText('Ответить в ветке','Branch here')),remove=el('button',actions,'ak-btn',chatText('Удалить с продолжением','Delete from here'));fork.type=remove.type='button';fork.dataset.akChatFork=node.id;remove.dataset.akChatDelete=node.id;fork.onclick=()=>changeBranch(()=>tree.fork(node.id));remove.onclick=()=>changeBranch(()=>tree.remove(node.id));
    if(role==='assistant'){const listen=el('button',actions,'ak-btn',chatText('Озвучить','Read aloud'));listen.type='button';listen.dataset.akSpeechRead=node.id;listen.onclick=()=>speech.read(text);}
    if(role==='assistant'&&!rendering&&!restored&&['generated','uncertain','guide'].includes(badge))speech.auto(text);
    if(!rendering){renderBranches();scheduleSave('chats');}
    if(role==='user'||nearBottom){log.scrollTop=log.scrollHeight;latest.hidden=true;}else latest.hidden=false;
    return item;
  }
  function addSources(item,sources){if(!sources?.length)return;if(!rendering){tree.sources(item.dataset.akChatNode,sources.map(s=>Object.fromEntries(Object.entries(s).filter(([,v])=>v===null||['string','number','boolean'].includes(typeof v)))));scheduleSave('chats');}const details=el('details',item,'ak-sources');label(el('summary',details),'sources');for(const s of sources){const card=el('section',details,'ak-source');el('strong',card,'',s.title||s.sourcePath||t('guide'));if(s.text)el(s.kind==='selection'?'pre':'p',card,'',s.text);if(s.truncated)label(el('small',card),'excerpt');if(s.lessonId&&s.courseId==='cpp'){const b=button(card,'openLesson',()=>void navigateLesson(s.lessonId));b.dataset.akLesson=s.lessonId;}const origin=el('details',card);label(el('summary',origin),'sourceDetails');el('small',origin,'',[s.sourcePath,s.contentVersion,s.contentHash].filter(Boolean).join('\n'));}}
  function platformResult(result){const item=appendMessage('assistant',result.text,'guide');if(result.reason){el('p',item,'',result.reason==='PERMISSION_CHECK_NOT_CONNECTED'?t('permissionCheck'):result.reason==='LOCAL_COPY_LOCKED'?t('locked'):result.reason==='OFFLINE_SHELL_REQUIRED'?t('offlineShell'):t('permission'));}for(const dest of result.destinations||[]){const b=el('button',item,'ak-btn',dest.label);b.type='button';b.disabled=!!dest.reason;b.addEventListener('click',()=>{if(host.current())platformResult(activeGuide.request({kind:'navigate',destinationId:dest.id}));});}
    for(const a of result.actions||[]){const b=el('button',item,'ak-btn ak-primary',a.label);b.type='button';b.dataset.akroniklConfirm='';b.addEventListener('click',()=>{if(!host.current()){dispose();return;}const r=activeGuide.confirm(a.token);if(!dead){b.disabled=true;platformResult(r);}});}addSources(item,result.sources);}
  async function navigateLesson(id){if(!host.current()){dispose();return;}stop();const ticket=seq;request=new AbortController();setBusy(true);try{const index=await loadKnowledge(options.readCourseLocale(),{signal:request.signal});if(!current(ticket))return;core.dispose();core=createAssistantCore({host:sessionHost,knowledge:[index],policy:{selection:true,diagnostics:true}});const result=await core.invoke({capability:'navigation.propose',input:{lessonId:id,locale:options.readCourseLocale()}},{signal:request.signal});if(!current(ticket))return;const proposal=result.status==='ok'&&result.actions.find(a=>a.kind==='navigation.proposal');if(proposal){dispose();onNavigate(proposal.target);}else appendMessage('assistant',t('unavailable'));}catch(error){if(current(ticket))appendMessage('assistant',chatText('Ответ не получен. ', 'No answer received. ')+(error.message==='CHAT_IMAGE_UNSUPPORTED'?chatText('Модель не поддерживает изображения.','This model does not support images.'):t('error')));}finally{if(current(ticket))setBusy(false);}}
  async function submit(value,override){if(dead||busy||preparingFiles||!privateReady)return;if(!host.current()){dispose();return;}speech.arm();const message=resolveMessage(value);if(message.kind==='invalid'){appendMessage('assistant',t('invalid'));return;}
    stop();const ticket=seq;request=new AbortController();const signal=request.signal;let action=override??message;const attachments=pendingFiles;pendingFiles=[];renderFiles();try{appendMessage('user',value.trim(),'system',attachments);}catch{pendingFiles=attachments;renderFiles();status.textContent=chatText('Чат заполнен: до 128 сообщений, 12 веток и 3 МБ данных. Удалите ненужное.','Chat limit: 128 messages, 12 branches and 3 MB. Delete unused content.');return;}input.value='';setBusy(true);
    try{
      if(!offlineHelp&&win.navigator?.onLine!==false&&generalChat&&connections.snapshot().cloudEnabled&&!override&&(action.kind==='tutor'||attachments.length)){const turns=tree.path().slice(-24).map(n=>({role:n.role,text:n.text,attachments:n.attachments}));const response=await connections.lease().chat({turns,locale,personality:personality.snapshot(),signal});if(!current(ticket))return;const item=appendMessage('assistant',response.answer,'generated');item.dataset.tutorGenerated='true';item.dataset.tutorAnswer='';return;}
      if(attachments.length){appendMessage('assistant',chatText('Для анализа вложений подключите облачную модель и включите общий чат.','Connect a cloud model and enable general chat to analyze attachments.'));return;}
      if(action.kind==='platform'){platformResult(activeGuide.request(action.request));return;}
      if(action.kind==='task'){appendMessage('assistant',t('noTask'));return;}
      if(action.kind==='resume'){appendMessage('assistant',t('resume'));return;}
      if(action.kind==='study'){
        if(!lessonAllowed){appendMessage('assistant',t('noLesson'));return;}
        const r=await core.invoke({capability:'context.current',input:{include:[]}},{signal});if(!current(ticket))return;
        if(r.status!=='ok'){appendMessage('assistant',t('unavailable'));return;}
        const index=await loadKnowledge(options.readCourseLocale(),{signal});if(!current(ticket))return;
        const study=currentStudy(index,r.data);if(!study){appendMessage('assistant',t('noStudy'));return;}
        const item=appendMessage('assistant',`${t('currentStudy')}: ${study.title}.\n${t('studyLimits')}`,'course');addSources(item,[study]);return;
      }
      if(action.kind==='diagnostic'){
        if(!codeAllowed||!diagnosticsAllowed){appendMessage('assistant',t('needDiagnosticConsent'));return;}
        const r=await core.invoke({capability:'context.current',input:{include:['selection','diagnostics']}},{signal});if(!current(ticket))return;
        if(r.status!=='ok'||!r.data.diagnostics?.length){appendMessage('assistant',t('noDiagnostic'));return;}
        const facts=r.data.diagnostics;const item=appendMessage('assistant',t('compilerFact'),'compiler');
        for(const fact of facts){el('pre',item,'',fact.message);const meta=el('details',item);label(el('summary',meta),'sourceDetails');el('small',meta,'',`${fact.filePath} · ${t('revisionContext')} ${fact.revision}`);}
        // Факт показан отдельно. Ни модель, ни помощник не запускают компиляцию.
        if(connections.snapshot().phase!=='connected'){appendMessage('assistant',t('noModel'));return;}
        action={kind:'tutor',intent:'diagnostic',text:value.trim(),followUp:false};
      }
      if(action.kind==='context'){const r=await core.invoke({capability:'context.current',input:{include:codeAllowed?(diagnosticsAllowed?['selection','diagnostics']:['selection']):[]}},{signal});if(!current(ticket))return;if(r.status!=='ok'){appendMessage('assistant',t('unavailable'));return;}platformResult(activeGuide.request({kind:'where'}));const editorInfo=host.editorContext();if(editorInfo)appendMessage('assistant',`${t('fileContext')}: ${editorInfo.filePath} (${editorInfo.languageId}) · ${t('revisionContext')} ${editorInfo.revision}`);if(r.data.selection){const item=appendMessage('assistant',t('selected'),'selected');el('pre',item,'',r.data.selection.code);}else appendMessage('assistant',t('noSelection'));return;}
      if(action.kind==='search'){const index=await loadKnowledge(options.readCourseLocale(),{signal});if(!current(ticket))return;core.dispose();core=createAssistantCore({host:sessionHost,knowledge:[index],policy:{selection:true,diagnostics:true}});const r=await core.invoke({capability:'knowledge.search',input:{query:action.text,locale:options.readCourseLocale(),limit:5}},{signal});if(!current(ticket))return;const item=appendMessage('assistant',r.status==='ok'?t('course'):t('missing'),r.status==='ok'?'course':'system');addSources(item,r.data?.matches);return;}
      if(action.intent==='code'&&!codeAllowed){appendMessage('assistant',t('noCode'));return;}
      const offlineSession=offlineHelp||win.navigator?.onLine===false?createTutorSession({host:sessionHost,loadKnowledge,locale}):null;let result;try{result=await(offlineSession??session).ask({text:action.text,intent:action.intent,followUp:action.followUp,include:codeAllowed?(action.intent==='diagnostic'&&diagnosticsAllowed?['selection','diagnostics']:['selection']):[]},{signal,onProgress:p=>{if(!current(ticket))return;if(p.phase==='generation')status.textContent=t('generating');lastMetrics={phase:p.phase,elapsedMs:p.elapsedMs,outputPieces:p.pieces};}});}finally{offlineSession?.dispose();}
      if(!current(ticket))return;
      const badge=result.generated?(result.status==='uncertain'?'uncertain':'generated'):result.status==='ok'?'course':'system';
      const messageText=result.mode==='sources'?t('noModel'):result.status==='empty'?t('missing'):result.status==='clarify'?(action.intent==='code'?t('noCode'):t('noTopic')):result.text;
      const item=appendMessage('assistant',messageText,badge);item.dataset.tutorGenerated=String(result.generated);item.dataset.tutorAnswer='';addSources(item,result.sources);
    }catch{if(current(ticket))appendMessage('assistant',t('error'));}finally{if(current(ticket)){setBusy(false);refreshDiagnostics();}}
  }

  function renderBranches(){branchSelect.replaceChildren();const value=tree.snapshot();for(const b of value.branches){const o=el('option',branchSelect,'',b.title);o.value=b.id;}branchSelect.value=value.active;}
  function renderTree(){rendering=true;log.replaceChildren(welcome);welcome.hidden=tree.path().length>0;for(const n of tree.path()){const item=appendMessage(n.role,n.text,n.badge,n.attachments,n);addSources(item,n.sources);}rendering=false;renderBranches();}
  function changeBranch(action){if(!privateReady)return;fileOperation?.abort();stop();pendingFiles=[];renderFiles();session?.clear();try{action();renderTree();scheduleSave('chats');}catch{status.textContent=chatText('Достигнут предел: 12 веток и 128 сообщений. Удалите ненужное.','Limit: 12 branches and 128 messages. Delete unused content.');}}
  function renderFiles(){filePreview.replaceChildren();const docs=pendingFiles.filter(a=>a.type==='text'&&/\.(?:pdf|docx|xlsx|pptx)$/iu.test(a.name));const belongs=(a,d)=>a===d||a.type==='image'&&a.name.startsWith(d.name.slice(0,90)+' - page ');for(const a of pendingFiles){if(a.type==='image'&&docs.some(d=>belongs(a,d)))continue;const count=docs.includes(a)?pendingFiles.filter(n=>belongs(n,a)&&n.type==='image').length:0;const scope=docs.includes(a)?(count?' · '+count+' стр. изображениями':chatText(' · только текст',' · text only')):'';const row=el('div',filePreview,'',a.name+scope+' '),remove=el('button',row,'ak-btn',chatText('Убрать','Remove'));remove.type='button';remove.onclick=()=>{pendingFiles=pendingFiles.filter(n=>docs.includes(a)?!belongs(n,a):n!==a);renderFiles();};}fileNote.hidden=!generalChat;}
  async function addFiles(files){if(!generalChat||!connections.snapshot().cloudEnabled||busy||preparingFiles||!privateReady)return;const ticket=seq,controller=new AbortController();fileOperation=controller;preparingFiles=true;setBusy(busy);status.textContent=chatText('Читаю вложения на этом устройстве…','Reading attachments on this device…');try{const added=[];for(const f of files){const result=await readChatAttachment(f,{imageAllowed:imageCapable(connections.snapshot().cloudSelection),signal:controller.signal});if(!current(ticket)||controller.signal.aborted)return;const list=Array.isArray(result)?result:[result];if(pendingFiles.length+added.length+list.length>4)throw Error('CHAT_LIMIT');if(JSON.stringify([...pendingFiles,...added,...list]).length>2500000)throw Error('CHAT_FILES_TOTAL_LIMIT');added.push(...list);}pendingFiles.push(...added);renderFiles();status.textContent=chatText('Вложения готовы. Отправьте сообщение.','Attachments ready. Send your message.');}catch(error){if(!current(ticket)||controller.signal.aborted)return;const messages={CHAT_IMAGE_UNSUPPORTED:'Для изображений и сканов нужна модель с поддержкой изображений.',CHAT_FORMAT_UNSUPPORTED:'Поддержаны PDF, DOCX, XLSX, PPTX, изображения и текст/код. Старые DOC/XLS/PPT, архивы и исполняемые файлы не читаются.',CHAT_FILE_TOO_LARGE:'Файл слишком большой: до 6 МБ; текст до 128 КБ.',CHAT_TEXT_UTF8_REQUIRED:'Текстовый файл должен быть в UTF-8.',CHAT_LIMIT:'Лимит — четыре подготовленных вложения. Короткий PDF включает текст и изображения страниц.',CHAT_FILES_TOTAL_LIMIT:'Суммарный размер подготовленных вложений превышает лимит. Уберите часть файлов.',CHAT_ATTACHMENT_INVALID:'Файл не прошёл проверку формата или размера.',CHAT_DOCUMENT_INVALID:'Документ повреждён, содержит неподдерживаемую структуру или макросы.',CHAT_DOCUMENT_TOO_LARGE:'Документ превышает лимит: PDF до 30 страниц, текст до 64 тысяч знаков, таблица до 5000 ячеек.',CHAT_DOCUMENT_NO_TEXT:'В документе не найден текст. Сохраните нужные страницы как изображения.',CHAT_DOCUMENT_TIMEOUT:'Документ не удалось прочитать за отведённое время.',CHAT_DOCUMENT_PASSWORD_REQUIRED:'PDF защищён паролем. Загрузите разрешённую незашифрованную копию.',CHAT_PDF_SCAN_LIMIT:'PDF без текста длиннее трёх страниц. Разделите его на части до трёх страниц для анализа сканов.'};status.textContent=messages[error.message]??'Не удалось прочитать вложение.';}finally{if(fileOperation===controller){fileOperation=null;preparingFiles=false;fileInput.value='';renderFiles();attachButton.disabled=busy||!privateReady||!generalChat||!connections.snapshot().cloudEnabled;send.disabled=busy||!privateReady||!input.value.trim();}}}
  fileInput.addEventListener('change',()=>void addFiles([...fileInput.files]));input.addEventListener('paste',event=>{if(event.clipboardData?.files.length){event.preventDefault();void addFiles([...event.clipboardData.files]);}});form.addEventListener('dragover',event=>event.preventDefault());form.addEventListener('drop',event=>{event.preventDefault();void addFiles([...event.dataTransfer.files]);});
  branchSelect.addEventListener('change',()=>changeBranch(()=>tree.select(branchSelect.value)));newChat.onclick=()=>changeBranch(()=>tree.fork(null));
  function refreshSpeech(){if(!voiceFields)return;const s=speech.snapshot();voiceAuto.checked=voicePrefs.auto;if(![...voiceRate.options].some(o=>o.value===String(voicePrefs.rate))){const o=el('option',voiceRate,'',String(voicePrefs.rate)+'×');o.value=String(voicePrefs.rate);}voiceRate.value=String(voicePrefs.rate);voiceSelect.replaceChildren();const defaultOption=el('option',voiceSelect,'',chatText('По языку помощника','Match assistant language'));defaultOption.value='';for(const v of speech.voices()){const o=el('option',voiceSelect,'',v.name+' · '+v.lang);o.value=v.voiceURI;}voiceSelect.value=voicePrefs.voiceURI;for(const f of [voiceAuto,voiceRate,voiceSelect,voiceTest])f.disabled=!privateReady||!s.supported||!s.available;voicePause.disabled=voiceStop.disabled=!['speaking','paused'].includes(s.state);const captions={idle:chatText('Нажмите «Озвучить» у ответа или включите автоозвучку.','Use Read aloud on a reply or enable auto speech.'),speaking:chatText('Озвучиваю…','Reading…'),paused:chatText('Озвучка на паузе.','Speech paused.'),error:chatText('Не удалось озвучить. Выберите другой голос и повторите.','Speech failed. Choose another voice and retry.'),unavailable:chatText('Нет установленного голоса для этого языка. Добавьте его в настройках речи устройства.','No installed voice for this language. Add one in device speech settings.')};voiceStatus.textContent=!s.supported?chatText('Браузер не поддерживает озвучку.','This browser does not support speech.'):!s.available?captions.unavailable:captions[s.state];}
  function preferences(){return cloudPreferences({theme:theme.value,locale,suggestions:suggestionsEnabled,enterSends,personality:personality.snapshot(),speech:voicePrefs,cloudChoice:options.cloudBroker?.settings?connections.snapshot().cloudSelection:null});}
  function scheduleSave(key){if(!options.cloudBroker?.accountBound||!privateReady||hydrating||offlineHelp||dead||!host.current())return;const save=()=>{const value=key==='preferences'?preferences():tree.snapshot();stateQueue=stateQueue.then(async()=>{const result=await options.cloudBroker.saveState(key,value,revisions[key]);revisions[key]=result.revision;}).catch(()=>{if(!dead)status.textContent=chatText('Изменения не сохранены. Возможно, данные изменились в другой вкладке. Откройте чат заново.','Changes were not saved. Another tab may have changed them. Reopen the chat.');});};save();}
  function useOfflineHelp(){
    if(dead||!host.current())return;
    offlineHelp=true;privateReady=true;connections.select('sources');
    sections.basics.inert=false;sections.personality.inert=false;sections.model.inert=true;
    offlineNote.hidden=false;refreshSpeech();setBusy(false);
  }
  async function hydrate(){
    if(dead||!host.current()||hydrating)return;
    if(win.navigator?.onLine===false){useOfflineHelp();return;}
    stop();hydrating=true;privateReady=false;restorePrivate.disabled=true;setBusy(false);sections.basics.inert=true;sections.personality.inert=true;sections.model.inert=true;
    try{
      const [prefs,chats]=await Promise.all(['preferences','chats'].map(k=>options.cloudBroker.loadState(k)));
      if(dead||!host.current())return;
      revisions.preferences=prefs.revision;revisions.chats=chats.revision;offlineHelp=false;tree.clear();
      if(prefs.value){const p=cloudPreferences(prefs.value);if(p.cloudChoice&&options.cloudBroker?.settings)connections.configureCloud(p.cloudChoice);voicePrefs=p.speech;speech.configure(voicePrefs,p.locale);theme.value=p.theme;dialog.dataset.akTheme=p.theme;language.value=p.locale;if(locale!==p.locale)changeLanguage();suggestionsEnabled=suggest.checked=p.suggestions;enterSends=enter.checked=p.enterSends;personality.update(p.personality.profile==='custom'?{humor:p.personality.humor,directness:p.personality.directness,friendliness:p.personality.friendliness}:{profile:p.personality.profile});personalityPanel.setLocale(locale);}
      if(chats.value)tree.replace(chats.value);renderTree();privateReady=true;offlineNote.hidden=true;
      sections.basics.inert=false;sections.personality.inert=false;sections.model.inert=false;refreshSpeech();refreshHints();setBusy(false);
    }catch{useOfflineHelp();}
    finally{hydrating=false;readyStatus();}
  }

  function changeLanguage(){if(!['ru','en'].includes(language.value))return;connections.disconnect();locale=language.value;personality.update({locale});personalityPanel.setLocale(locale);privacyBoundary={};activeGuide.dispose();activeGuide=createPlatformGuide({isCurrent:host.current,readState:host.platformState,locale,onNavigate:hash=>{if(!host.current()||!allowedHash(hash))return false;dispose();onNavigate({kind:'platform',hash});return true;}});clear(true);for(const l of labels){if(l.attr)l.n.setAttribute(l.attr,t(l.key));else l.n.textContent=t(l.key);}gear.textContent='⚙';close.textContent='×';gear.setAttribute('aria-label',t('settings'));close.setAttribute('aria-label',t('close'));speech.configure(voicePrefs,locale);dialog.lang=locale;log.setAttribute('aria-label',locale==='en'?'Conversation with Akronikl':'Разговор с Akronikl');nav.setAttribute('aria-label',t('settings'));mountModels();refreshHints();inputHint.textContent=t(enterSends?'hint':'hintAlt');readyStatus();}
  function viewport(){const v=win.visualViewport;dialog.style.setProperty('--ak-viewport-height',(v?.height??win.innerHeight)+'px');dialog.style.setProperty('--ak-viewport-top',(v?.offsetTop??0)+'px');}
  function dispose(){if(dead)return;dead=true;speech.dispose();seq++;request?.abort();clearTimeout(slowTimer);listeners.abort();fileOperation?.abort();clearTimeout(preferenceTimer);clearTimeout(chatTimer);pendingFiles=[];fileInput.value='';filePreview.replaceChildren();observer.disconnect();unsubscribeWorkspace?.();releaseFocus();unsubConnection();connections.dispose();connectionPanel?.dispose();session?.dispose();core.dispose();activeGuide.dispose();personalityPanel.dispose();personality.dispose();host.dispose();codeAllowed=false;diagnosticsAllowed=false;lessonAllowed=false;input.value='';log.replaceChildren();diagnostic.textContent='';dialog.remove();onDispose();if(trigger?.isConnected&&win.location.hash===initialHash)trigger.focus();}
  const observer=new win.MutationObserver(()=>{if(!host.current())dispose();});observer.observe(root,{childList:true,subtree:true});
  const unsubscribeWorkspace=host.workspace?.subscribe?.(()=>dispose());const releaseFocus=bindDialogFocusCycle(dialog);
  form.addEventListener('submit',e=>{e.preventDefault();void submit(input.value);});
  input.addEventListener('input',()=>{send.disabled=busy||preparingFiles||!privateReady||!input.value.trim();activeGuide.invalidate();log.querySelectorAll('[data-akronikl-confirm]').forEach(b=>b.disabled=true);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!e.shiftKey&&(enterSends||e.ctrlKey||e.metaKey)){e.preventDefault();void submit(input.value);}});
  selection.addEventListener('change',()=>{codeAllowed=selection.checked&&host.selectionAvailable;compilerConsent.disabled=!codeAllowed;if(!codeAllowed){diagnosticsAllowed=false;compilerConsent.checked=false;}clear(true);});lesson.addEventListener('change',()=>{lessonAllowed=lesson.checked;clear(true);});
  compilerConsent.addEventListener('change',()=>{diagnosticsAllowed=codeAllowed&&compilerConsent.checked;clear(true);});
  generalMode.addEventListener('change',()=>{stop();generalChat=generalMode.checked;pendingFiles=[];renderFiles();session?.clear();setBusy(false);});
  suggest.addEventListener('change',()=>{suggestionsEnabled=suggest.checked;refreshHints();});enter.addEventListener('change',()=>{enterSends=enter.checked;inputHint.textContent=t(enterSends?'hint':'hintAlt');});
  language.addEventListener('change',changeLanguage);theme.addEventListener('change',()=>{dialog.dataset.akTheme=['light','dark'].includes(theme.value)?theme.value:'auto';});
  log.addEventListener('scroll',()=>{if(log.scrollHeight-log.scrollTop-log.clientHeight<80)latest.hidden=true;});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(settingsOpen)toggleSettings(false);else dispose();});dialog.addEventListener('close',dispose);
  for(const name of ['hashchange','pagehide','nexus:session-ending','nexus:session-ended','nexus:context-invalidated'])win.addEventListener(name,dispose,{capture:true,signal:listeners.signal});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)dispose();},{signal:listeners.signal});
  win.addEventListener('online',readyStatus,{signal:listeners.signal});win.addEventListener('offline',readyStatus,{signal:listeners.signal});
  win.visualViewport?.addEventListener('resize',viewport,{signal:listeners.signal});win.visualViewport?.addEventListener('scroll',viewport,{signal:listeners.signal});
  for(const field of [theme,language,suggest,enter])field.addEventListener('change',()=>scheduleSave('preferences'));
  if(options.cloudBroker?.accountBound){void hydrate();}
  renderBranches();renderFiles();
  if(win.navigator?.onLine!==false)void loadKnowledge(options.readCourseLocale(),{signal:listeners.signal}).catch(()=>{});root.append(dialog);dialog.showModal();viewport();refreshHints();showSection('basics');setBusy(false);readyStatus();
  if(win.matchMedia?.('(max-width: 640px)').matches)title.focus();else input.focus();
  return Object.freeze({dispose,focus(){if(settingsOpen)drawerTitle.focus();else input.focus();}});
}
