import {emptyClarityDraft,validateClarityDraft,prepareClarityDraft,validateWorkReferences,canonicalJson,sha256Utf8,snapshotDigests,CLARITY_CONTENT_REVISION} from './cpp-clarity-r3-state.mjs';
import {verifiedAccount,accountStorageLocked} from './account-storage.js';
import {readCourseStateStrict,courseWorkToken,withCourseStateWriter,patchLesson,patchPracticum,saveCppClarityDraft,saveState} from './storage.js';
const clone=v=>structuredClone(v);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const failure=code=>Object.assign(Error(code),{code});

// Одна очередь экземпляра. ACK старого захвата не очищает новый ввод.
export function createLearningSession({topicId,adapter,capture,onStatus=()=>{},onSaved=()=>{},draftEnabled=true}){
 let initial=adapter.read();let draft=draftEnabled?clone(initial.draft||emptyClarityDraft(topicId)):null;
 if(draft)validateClarityDraft(topicId,draft,{persisted:!!initial.draft});
 let expected=initial.workToken,binding=initial.binding||null,revision=draft?.stateRevision||0;
 let ackWork=initial.work?canonicalJson(initial.work):null,ackDraft=draft?canonicalJson(draft):null;
 initial=null;let epoch=0,acked=0,active=false,disposed=false,timer=null,tail=Promise.resolve(),lastError=null,branchReceipt=null;
 const current=()=>!disposed&&adapter.isCurrent();
 const check=()=>{if(!current())throw failure('R3_CONTEXT_CHANGED');};
 const status=(kind,error)=>{if(current())onStatus(kind,error);};
 const mark=({work=false}={})=>{check();epoch++;active ||= work;status('dirty');clearTimeout(timer);if(!lastError)timer=setTimeout(()=>void flush().catch(()=>{}),300);};
 const change=fn=>{check();fn(draft);mark();};
 async function persist(){
  check();clearTimeout(timer);
  for(;;){
   const captured=capture();check();const capturedEpoch=epoch,work=captured?.work||null;
   const next=draft?clone(draft):null;let workSaved=false;
   try{
    if(active&&work&&canonicalJson(work)!==ackWork){
     status('saving');const receipt=await adapter.saveWork(clone(work),expected);check();
     expected=receipt.workToken;binding=clone(receipt.binding);ackWork=canonicalJson(work);workSaved=true;
     if(receipt.branched)branchReceipt=receipt;
    }
    if(next){
     next.stateRevision=revision;next.workBinding=clone(binding);
     if(binding&&captured?.cursor){next.activeFile=work?.workspace?.activeFile||null;next.cursor=clone(captured.cursor);}else if(!binding){next.activeFile=null;next.cursor=null;}
     // Только текущий буфер редактируется. Исторический снимок результата не меняется.
     if(canonicalJson(next)!==ackDraft){
      status('saving');const receipt=await adapter.saveDraft(next,revision);check();
      if(receipt.branched)branchReceipt=receipt;revision=receipt.stateRevision;next.stateRevision=revision;ackDraft=canonicalJson(next);
      draft.stateRevision=revision;draft.workBinding=clone(binding);
      if(capturedEpoch===epoch){draft.activeFile=next.activeFile;draft.cursor=clone(next.cursor);}
     }
    }
    check();lastError=null;acked=capturedEpoch;onSaved({binding:clone(binding),revision,epoch:capturedEpoch});
    if(epoch===capturedEpoch){status(branchReceipt?'branched':'saved',branchReceipt);return {binding:clone(binding),revision};}
   }catch(error){lastError=error;if(current())status(workSaved?'partial':'error',error);throw error;}
  }
 }
 function flush(){const operation=tail.catch(()=>{}).then(persist);tail=operation;operation.catch(()=>{});return operation;}
 return {
  isCurrent:current,mark,change,flush,
  get draft(){check();return draft;},get binding(){check();return clone(binding);},
  get dirty(){return epoch!==acked||!!lastError;},get error(){return lastError;},
  async prepareNavigation(){try{await flush();return current();}catch{return false;}},
  retry(){lastError=null;return flush();},
  attachNewWork(work,receipt){check();if(binding)throw failure('R3_WORK_ALREADY_BOUND');expected=receipt.workToken;binding=clone(receipt.binding);ackWork=canonicalJson(work);mark();},
  async replaceWork(work){await flush();check();const capturedEpoch=epoch,receipt=await adapter.saveWork(clone(work),expected);check();expected=receipt.workToken;binding=clone(receipt.binding);ackWork=canonicalJson(work);if(epoch!==capturedEpoch){active=true;throw failure('R3_INPUT_CHANGED');}return receipt;},
  dispose(){disposed=true;clearTimeout(timer);draft=null;expected=null;binding=null;ackWork=null;ackDraft=null;branchReceipt=null;},
  exportBuffer(){check();return {topicId,draft:clone(draft),work:clone(capture()?.work||null)};}
 };
}

export function createCppAccountAdapter(kind,id){
 const account=verifiedAccount();if(!account)throw failure('VERIFIED_ACCOUNT_REQUIRED');
 const current=()=>!accountStorageLocked()&&verifiedAccount()===account;
 const check=()=>{if(!current())throw failure('ACCOUNT_STORAGE_CONTEXT_CHANGED');};
 const area=kind==='lesson'?'lessons':'practicums',patch=kind==='lesson'?patchLesson:patchPracticum;
 const bindingFor=(state,entry)=>entry?.workspace?{kind:'lesson',topicId:id,workspaceDigest:sha256Utf8(courseWorkToken(state,kind,id))}:null;
 return {
  isCurrent:current,
  read(){check();const s=readCourseStateStrict(),entry=s.courses.cpp?.[area]?.[id]||{};return {entry,work:entry.workspace?{workspace:entry.workspace,code:entry.code??'',stdin:entry.stdin??''}:null,workToken:courseWorkToken(s,kind,id),binding:bindingFor(s,entry),draft:entry.clarityDraft||null};},
  saveWork(work,expectedWorkToken){check();return withCourseStateWriter(()=>{check();const next=patch(id,work,{expectedWorkToken});return {workToken:courseWorkToken(next,kind,id),binding:bindingFor(next,next.courses.cpp[area][id])};},{expectedContext:account});},
  saveDraft(value,expectedStateRevision){check();return saveCppClarityDraft(id,value,{expectedStateRevision,expectedContext:account});},
  progress(update){check();return withCourseStateWriter(()=>{check();const s=readCourseStateStrict();return patch(id,typeof update==='function'?update(s.courses.cpp?.[area]?.[id]||{}):update);},{expectedContext:account});}
 };
}

export function writeCppClarityDraft(id,draft,{expectedStateRevision,expectedContext}={}){
 if(id!=='cpp.programming-process')throw failure('R3_TOPIC_REJECTED');
 return withCourseStateWriter(()=>{
  const current=readCourseStateStrict(),entry=current.courses.cpp?.lessons?.[id];if(entry!==undefined&&(!entry||typeof entry!=='object'||Array.isArray(entry)))throw failure('COURSE_STATE_INVALID');
  const prepared=prepareClarityDraft(id,draft,{previous:entry?.clarityDraft??null,expectedStateRevision});
  const accessible=entry?.workspace?{binding:{kind:'lesson',topicId:id,workspaceDigest:sha256Utf8(courseWorkToken(current,'lesson',id))},files:entry.workspace.files}:null;
  validateWorkReferences(id,prepared.value,accessible);
  current.courses.cpp??={courseId:'cpp'};current.courses.cpp.lessons??={};current.courses.cpp.lessons[id]={...entry,clarityDraft:prepared.value};saveState(current);return{stateRevision:prepared.value.stateRevision,draft:prepared.value};
 },{expectedContext});
}

export function createClarityRunObserver({session,topicId,onResult=()=>{},onError=()=>{}}){
 let latest=null;
 const report=error=>{if(session.isCurrent())try{onError(error);}catch{}};
 const shape=request=>({languageId:request.languageId,source:request.source,stdin:request.stdin,entryFile:request.entryFile,files:Object.entries(request.files||{}).map(([path,content])=>({path,content})),metadata:request.metadata});
 return {
  capture(request){
   const ticket={runId:'run-'+crypto.randomUUID(),request:clone(request),binding:session.binding,contentRevision:CLARITY_CONTENT_REVISION,record:null};latest=ticket;
   try{const inputSnapshot=shape(ticket.request),digests=snapshotDigests(inputSnapshot);ticket.record={kind:'runtime',runId:ticket.runId,contentRevision:ticket.contentRevision,workspaceRevision:inputSnapshot.metadata.workspaceRevision,workBinding:clone(ticket.binding),inputSnapshot,...digests,output:{stdout:'',stderr:''},exitCode:null,providerId:'pending'};}catch(error){report(error);}
   return freeze(ticket);
  },
  isCurrent(ticket,request){return session.isCurrent()&&ticket===latest&&canonicalJson(ticket.request)===canonicalJson(request);},
  captureError:report,
  async complete(ticket,{result,error,provider}){
   if(!session.isCurrent()||ticket!==latest||!ticket.record||!provider?.id)return;
   const record={...ticket.record,output:{stdout:String(result?.stdout??''),stderr:String(result?.stderr??error?.stderr??error?.message??'')},exitCode:Number.isSafeInteger(result?.exitCode)?result.exitCode:null,providerId:provider.id};
   // Проверяем лимиты до изменения буфера; успешный runtime не становится ошибкой записи.
   const candidate=clone(session.draft);candidate.lastResult=record;validateClarityDraft(topicId,candidate,{persisted:false});
   session.change(d=>{d.lastResult=record;});onResult(record);await session.flush();
  }
 };
}

export async function createOnecClarityAdapter(store,topicId,isMounted=()=>true){
 const account=verifiedAccount(),[{ownedOnec,createOnecWork,saveOnecWork},{withProjectWriter}]=await Promise.all([import('../courses/onec-education/studio-store.mjs'),import('../project-studio/project-writer.js')]);
 const current=()=>!!account&&!accountStorageLocked()&&verifiedAccount()===account&&isMounted();
 const check=()=>{if(!current())throw failure('ACCOUNT_STORAGE_CONTEXT_CHANGED');};
 const receipt=p=>({workToken:p.sync.localRevision,binding:{kind:'project',id:p.id,expectedLocalRevision:p.sync.localRevision}});
 let workId=null;
 return {
  isCurrent:current,
  read(){check();const draft=store.read().lessons[topicId]?.clarityDraft||null;let p=null;if(draft?.workBinding){validateClarityDraft(topicId,draft);if(draft.workBinding.kind!=='project')throw failure('R3_BINDING_REJECTED');p=ownedOnec(draft.workBinding.id,'edit');workId=p.id;}return{draft,work:p?{workspace:p.workspace,code:p.workspace.files.find(f=>f.path===p.workspace.entryFile)?.content||'',stdin:''}:null,...(p?receipt(p):{workToken:null,binding:null})};},
  createWork(work,title){check();return withProjectWriter(()=>{check();if(workId)throw failure('R3_WORK_ALREADY_BOUND');const p=createOnecWork({title,workspace:work.workspace,origin:{kind:'lesson-work',courseId:'onec',topicId}});workId=p.id;return receipt(p);});},
  saveWork(work,expectedLocalRevision){check();return withProjectWriter(()=>{check();if(!workId)throw failure('R3_WORK_UNBOUND');return receipt(saveOnecWork(workId,work.workspace,{expectedLocalRevision}));});},
  saveDraft(draft,expectedStateRevision){check();return store.saveClarityDraft(topicId,draft,{expectedStateRevision,isCurrent:current});}
 };
}

export function createCppVaultAdapter({topicId,readData,commit,isCurrent}){
 if(topicId!=='cpp.programming-process')throw failure('R3_TOPIC_REJECTED');
 const projectId='exercise-lesson-'+topicId;
 const check=()=>{if(!isCurrent())throw failure('LOCAL_COPY_LOCKED');};
 function inspect(){check();const data=readData(),state=data?.state;if(!state||(state.schemaVersion!==undefined&&state.schemaVersion!==1)||!state.courses||typeof state.courses!=='object'||Array.isArray(state.courses)||!data.projects||typeof data.projects!=='object'||Array.isArray(data.projects))throw failure('COURSE_STATE_INVALID');
  const cpp=state.courses.cpp,lessons=cpp?.lessons,entry=lessons?.[topicId];for(const v of [cpp,lessons,entry])if(v!==undefined&&(!v||typeof v!=='object'||Array.isArray(v)))throw failure('COURSE_STATE_INVALID');
  const project=data.projects[projectId];if(project&&(project.learning?.kind!=='lesson'||project.learning?.id!==topicId))throw failure('R3_WORK_REFERENCE_INVALID');
  const workspace=project?.workspace||entry?.workspace,code=workspace?.files?.find(f=>f.path===workspace.entryFile)?.content??entry?.code??'',stdin=project?.stdin??entry?.stdin??'';
  const work=workspace?{workspace,code,stdin}:null,workToken=JSON.stringify({workspace:workspace??null,code:entry?.code??(project?code:null),stdin});
  const binding=workspace?(project?{kind:'local-project',id:projectId,workspaceDigest:sha256Utf8(workToken)}:{kind:'lesson',topicId,workspaceDigest:sha256Utf8(workToken)}):null;
  return {data,entry:entry||{},project,work,workToken,binding};
 }
 const ensureEntry=next=>{next.state.courses.cpp??={courseId:'cpp'};next.state.courses.cpp.lessons??={};return next.state.courses.cpp.lessons[topicId]??={};};
 return {isCurrent,
  read(){const s=inspect();return{work:s.work,workToken:s.workToken,binding:s.binding,draft:s.entry.clarityDraft||null};},
  async saveWork(work,expected){const s=inspect();if(s.workToken!==expected)throw failure('COURSE_WORK_CONFLICT');const next=clone(s.data),entry=ensureEntry(next);Object.assign(entry,clone(work));if(s.project){next.projects[projectId].workspace=clone(work.workspace);next.projects[projectId].stdin=work.stdin;}
   const receipt=await commit(next);check();if(!receipt||typeof receipt.id!=='string'||!Number.isSafeInteger(receipt.revision))throw failure('R3_ACK_MISSING');const saved=inspect();return{workToken:saved.workToken,binding:saved.binding,...receipt};},
  async saveDraft(draft,expectedStateRevision){const s=inspect(),prepared=prepareClarityDraft(topicId,draft,{previous:s.entry.clarityDraft??null,expectedStateRevision});validateWorkReferences(topicId,prepared.value,s.work?{binding:s.binding,files:s.work.workspace.files}:null);const next=clone(s.data);ensureEntry(next).clarityDraft=prepared.value;const receipt=await commit(next);check();if(!receipt||typeof receipt.id!=='string'||!Number.isSafeInteger(receipt.revision))throw failure('R3_ACK_MISSING');return{stateRevision:prepared.value.stateRevision,draft:prepared.value,...receipt};}
 };
}

// Прежние уроки используют тот же writer. Их содержание и отметки не мигрируют в R3.
export async function bindLegacyLearning({root,prefs,r,cpp,item,goldPresentation,sandboxRuntimeModule,loadProjectStudio,rerender,t,savePrefs,bindMemoryLab,bindOopLab,bindGlossaryDrawer}){
 const [{bindCodeStudio},{withProjectWriter}]=await Promise.all([import('../sandbox/code-studio.js'),import('../project-studio/project-writer.js')]);
 const kind=r.lesson?'lesson':'practicum',id=r.lesson||r.practicum,adapter=createCppAccountAdapter(kind,id),initial=adapter.read(),st=initial.entry;
 const en=prefs.uiLocale==='en',ed=root.querySelector('#editor'),stdin=root.querySelector('#stdin'),out=root.querySelector('#output');
 let studio=null,disposed=false,controller=null;const acceptedHash=location.hash;
 const notice=document.createElement('p');notice.setAttribute('role','status');notice.dataset.courseSave='';
 (ed?.closest('.sandbox-block')||root).append(notice);
 const retry=document.createElement('button'),exportButton=document.createElement('button');retry.className=exportButton.className='btn';retry.textContent=en?'Retry saving':'Повторить сохранение';exportButton.textContent=en?'Download my work':'Скачать мою работу';retry.hidden=exportButton.hidden=true;notice.after(retry,exportButton);
 const current=()=>!disposed&&adapter.isCurrent()&&root.isConnected;
 const capture=()=>{if(!studio)return {work:null};const c=studio.captureForPersistence();return {work:{workspace:c.workspace,code:c.workspace.files.find(f=>f.path===c.workspace.entryFile)?.content||'',stdin:stdin?.value||''},cursor:c.cursor};};
 const session=createLearningSession({topicId:id,adapter,capture,draftEnabled:false,onStatus:(kind,error)=>{if(!current())return;notice.textContent=kind==='saved'?(en?'Saved on this device.':'Сохранено на устройстве.'):kind==='saving'?(en?'Saving…':'Сохраняем…'):kind==='dirty'?(en?'Unsaved changes.':'Есть несохранённые изменения.'):(en?'Not saved. Keep this window open and retry or download your work.':'Не сохранено. Оставьте окно открытым; повторите сохранение или скачайте работу.');retry.hidden=exportButton.hidden=!['error','partial'].includes(kind);}});
 retry.onclick=()=>void session.retry().catch(()=>{});exportButton.onclick=()=>{if(!current())return;const url=URL.createObjectURL(new Blob([JSON.stringify(session.exportBuffer(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=id+'-my-work.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const action=fn=>async()=>{try{await fn();}catch{if(current())notice.textContent=en?'Action was not saved; your work remains in this window.':'Действие не сохранено; работа остаётся в этом окне.';}};
 const change=()=>{if(current())session.mark({work:true});};
 let terms=null;
 if(kind==='lesson'){
  const lessonGrid=document.querySelector('#lessonGrid');const setRightRailCollapsed=value=>{prefs=savePrefs({...prefs,rightRailCollapsed:!!value});lessonGrid?.classList.toggle('rail-collapsed',prefs.rightRailCollapsed);const quick=document.querySelector('#rightRailQuick');if(quick){quick.classList.toggle('active',prefs.rightRailCollapsed);quick.setAttribute('aria-pressed',String(prefs.rightRailCollapsed))}};document.querySelector('#rightRailToggle')?.addEventListener('click',()=>setRightRailCollapsed(true));document.querySelector('#rightRailQuick')?.addEventListener('click',()=>setRightRailCollapsed(!prefs.rightRailCollapsed));
  if(item.gold)goldPresentation.bindAcademyGold(root,item.gold);bindMemoryLab(item.benchmark?.interactiveMemory,prefs.courseLocale);bindOopLab(item.benchmark?.interactiveOop,prefs.courseLocale);terms=bindGlossaryDrawer(root);
  root.querySelector('#completeLesson')?.addEventListener('click',action(async()=>{await session.flush();await adapter.progress(old=>({completed:!old.completed}));await rerender();}));
 }
 if(ed&&item.gold?.runtimeTarget!=='qt-wasm'){
  const languageId=cpp?.manifest?.language||'cpp',files=st.workspace?.files||[{path:'main.cpp',content:st.code??item.code??item.starter??'',languageId}],entryFile=st.workspace?.entryFile||'main.cpp';
  studio=bindCodeStudio({editor:ed,locale:prefs.uiLocale,languageId,fileName:entryFile,files,activeFile:st.workspace?.activeFile||entryFile,sessionKey:`course:cpp:${kind}:${id}`,onWorkspaceChange:(_,type)=>{if(type!=='init'&&type!=='view-state')change();}});
  controller=sandboxRuntimeModule.createSandboxController({editor:ed,stdin,output:out,engine:root.querySelector('#engine'),status:root.querySelector('#sandboxStatus'),routeInfo:root.querySelector('#runtimeRoute'),requirements:item.requirements||[],locale:prefs.uiLocale,languageId,codeStudio:studio,onCodeChange:change});
  stdin?.addEventListener('input',change);
  if(item.gold)goldPresentation.bindClarityEditor(root,item.gold,{studio,persist:patch=>session.replaceWork(patch),isCurrent:current,createCopy:async(files,title,entryFile)=>{await session.flush();const api=await loadProjectStudio();if(!current())throw failure('STALE_LESSON');return withProjectWriter(()=>{if(!current())throw failure('STALE_LESSON');return api.createProject({title,files,entryFile,sourceRoots:['.']});});}});
  const reset=async()=>{const code=item.code??item.starter??'',files=[{path:'main.cpp',content:code,languageId}],input=kind==='practicum'?item.stdin||'':stdin?.value||'';await session.replaceWork({code,stdin:input,workspace:{languageId,entryFile:'main.cpp',activeFile:'main.cpp',revision:(studio.getSnapshot().revision||0)+1,files}});if(!current())return;studio.setWorkspace(files,'main.cpp',{emit:false});if(stdin)stdin.value=input;controller.renderAnalysis();out.className='output';out.textContent=en?'Starter restored.':'Заготовка восстановлена.';};
  root.querySelector('#resetCode,#resetPracticum')?.addEventListener('click',action(reset));
  root.querySelector('#runCode')?.addEventListener('click',action(async()=>{change();await session.flush();if(current())await controller.run();}));
  root.querySelector('#testRuntime')?.addEventListener('click',()=>{if(current())void controller.selfTest().catch(()=>{});});
  root.querySelector('#clearOutput')?.addEventListener('click',()=>{studio.clearRuntimeDiagnostics();out.className='output';out.textContent=en?'Program output will appear here.':'Вывод программы появится здесь.';});
 }
 root.querySelector('#checkQuiz')?.addEventListener('click',action(async()=>{const chosen=root.querySelector('input[name="quiz"]:checked'),fb=root.querySelector('#quizFeedback');if(!chosen){fb.textContent=en?'Choose an answer.':'Выберите вариант.';return;}const i=Number(chosen.value);await adapter.progress({quiz:i});if(!current())return;const ok=i===item.quiz.correctIndex;fb.className='quiz-feedback '+(ok?'ok':'bad');fb.textContent=ok?(en?'Correct. Explain why this answer works.':'Верно. Объясните, почему этот ответ подходит.'):(en?'Not yet. Review the explanation and try again.':'Пока нет. Вернитесь к объяснению и попробуйте ещё раз.');}));
 root.querySelectorAll('.benchmark-check').forEach(btn=>btn.addEventListener('click',()=>{const card=btn.closest('.knowledge-card'),picked=card?.querySelector('input[type="radio"]:checked'),fb=card?.querySelector('.knowledge-feedback');if(!fb)return;if(!picked){fb.textContent=en?'Choose an answer.':'Выберите вариант.';return;}const ok=Number(picked.value)===Number(btn.dataset.answer);fb.className='knowledge-feedback '+(ok?'ok':'bad');fb.textContent=(ok?(en?'Correct. ':'Верно. '):(en?'Not yet. ':'Пока нет. '))+(btn.dataset.explain||'');}));
 root.querySelector('#askAkronikl')?.addEventListener('click',()=>alert(t('journey.mentor.planned',{topic:item.title})));
 const before=event=>{if(session.dirty){event.preventDefault();event.returnValue='';}};
 const invalid=()=>{if(!adapter.isCurrent()){dispose();root.replaceChildren();}};
 const hidden=()=>{dispose();root.replaceChildren();};
 addEventListener('beforeunload',before);addEventListener('nexus:context-invalidated',invalid);addEventListener('pagehide',hidden);
 function dispose(){if(disposed)return;disposed=true;session.dispose();studio?.dispose();terms?.();removeEventListener('beforeunload',before);removeEventListener('nexus:context-invalidated',invalid);removeEventListener('pagehide',hidden);}
 return {dispose,async prepareNavigation(){if(!current())return true;const okay=await session.prepareNavigation();if(!okay&&current())history.replaceState(null,'',acceptedHash);return okay;}};
}
