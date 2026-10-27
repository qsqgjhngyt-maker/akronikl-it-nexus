import {createTutorSession} from './session.js';
// Режим генерации включается только после явного выбора проверенного локального файла.
export function mountTutor({parent,documentRef,host,loadKnowledge,locale,getInclude,loadModel=async(file,options)=>(await import('./local-model.js')).loadLocalModel(file,options)}) {
  const en=locale==='en', make=(tag,text,root)=>{const n=documentRef.createElement(tag);if(text)n.textContent=text;root.append(n);return n;};
  const details=make('details','',parent);details.dataset.akroniklTutor='';make('summary',en?'Learning dialogue — experimental':'Учебный диалог — эксперимент',details);
  const note=make('p',en?'Without a model: course excerpts. With a prepared local model: experimental explanations. History lives only in this window.':'Без модели — выдержки курса. С подготовленной локальной моделью — экспериментальные объяснения. История живёт только в этом окне.',details);
  note.className='akronikl-note';
  const label=make('label',en?'Question for the tutor':'Вопрос наставнику',details), input=make('textarea','',label);input.maxLength=1500;input.rows=3;input.dataset.akroniklTutorQuestion='';
  const controls=make('div','',details);controls.className='akronikl-actions';
  const state=make('p',en?'Mode: source excerpts, no model.':'Режим: материалы курса, без модели.',details);state.setAttribute('role','status');
  const output=make('div','',details);output.dataset.akroniklTutorMessages='';output.setAttribute('role','log');output.setAttribute('aria-label',en?'Tutor dialogue':'Учебный диалог');output.setAttribute('aria-live','polite');
  let provider=null,session,dead=false,seq=0,loading=null;
  const renew=()=>{session?.dispose();session=createTutorSession({host:host.adapter,loadKnowledge,locale,provider});};renew();
  const button=(title,fn)=>{const b=make('button',title,controls);b.type='button';b.className='btn';b.addEventListener('click',fn);return b;};
  function render(question,result){
    const item=make('section','',output);item.dataset.tutorTurn='';make('p',question,item);const answer=make('p',result.text,item);answer.dataset.tutorAnswer='';item.dataset.tutorGenerated=String(result.generated);
    if(result.notice)make('small',result.notice,item);
    for(const s of result.sources){const source=make('details','',item);make('summary',`${s.label}: ${s.title}`,source);make('p',s.text,source);if(s.kind==='course')make('small',s.sourcePath+' · '+s.contentVersion,source);else make('small',[s.filePath,s.revision].filter(v=>v!==undefined).join(' · '),source);}
    while(output.children.length>4)output.firstElementChild.remove();
  }
  async function ask(intent,followUp=false){
    if(dead||loading||!host.current())return;const query=input.value.trim()||(followUp?(en?'Explain more simply':'Объясни проще'):'');if(!query)return;
    const ticket=++seq;delete state.dataset.tutorProgress;state.textContent=en?'Preparing answer…':'Готовлю ответ…';output.setAttribute('aria-busy','true');
    let lastPhase='';
    const result=await session.ask({text:query,intent,followUp,include:getInclude()},{onProgress(progress){
      if(dead||ticket!==seq||!host.current())return;
      // Только счётчики; непроверенный ответ не попадает в live-region.
      state.dataset.tutorProgress=JSON.stringify(progress);
      if(progress.phase!==lastPhase){lastPhase=progress.phase;state.textContent=progress.phase==='generation'?(en?'Generating locally; answer is being checked…':'Локальная генерация; ответ проходит проверку…'):(en?'Processing the selected context on this device…':'Обрабатываю выбранный контекст на этом устройстве…');}
    }});
    if(dead||ticket!==seq||!host.current())return;
    output.removeAttribute('aria-busy');state.textContent=result.generated?(en?'Local-model answer; verify against sources.':'Ответ локальной модели; проверьте по источникам.'):(result.status==='ok'?(en?'Source excerpts, not generated.':'Выдержки курса, не генерация.'):result.text);
    render(query,result);
  }
  button(en?'Ask about the material':'Спросить по материалам',()=>void ask('explain'));
  button(en?'Give a hint':'Дать подсказку',()=>void ask('hint'));
  button(en?'Simpler':'Объясни проще',()=>void ask('simpler',true));
  button(en?'Explain selected code':'Разобрать выбранный код',()=>void ask('code'));
  button(en?'Stop answer':'Остановить ответ',()=>{cancelLoading();seq++;session.cancel();output.removeAttribute('aria-busy');state.textContent=en?'Cancelled.':'Отменено.';});
  function cancelLoading(){if(loading){loading.abort();loading=null;provider=null;renew();load.disabled=false;file.disabled=false;}}
  function clear(){delete state.dataset.tutorProgress;cancelLoading();seq++;session.clear();input.value='';output.replaceChildren();output.removeAttribute('aria-busy');}
  button(en?'Clear dialogue':'Очистить диалог',clear);
  const local=make('details','',details);make('summary',en?'Local model — separate preparation':'Локальная модель — отдельная подготовка',local);
  make('p',en?'Experimental CPU mode. Select the official Qwen3-0.6B Q8_0 GGUF (~639 MB). It stays on this device and is not stored by the assistant. A prepared same-origin runtime is required. Phones and answer quality are not accepted yet.':'Экспериментальный CPU-режим. Выберите официальный Qwen3-0.6B Q8_0 GGUF (~639 МБ). Файл остаётся на устройстве и не сохраняется помощником. Нужен подготовленный runtime с того же сайта. Работа на телефонах и качество ответов ещё не приняты.',local);
  const fileLabel=make('label',en?'Local GGUF file':'Локальный файл GGUF',local),file=make('input','',fileLabel);file.type='file';file.accept='.gguf';file.dataset.akroniklModelFile='';
  const load=make('button',en?'Load selected model on this device':'Загрузить выбранную модель на этом устройстве',local);load.type='button';load.className='btn';
  load.addEventListener('click',async()=>{
    if(dead||loading||!file.files?.length||!host.current())return;
    clear();session.dispose();provider=null;const controller=new AbortController();loading=controller;const ticket=++seq;load.disabled=true;file.disabled=true;
    state.textContent=en?'Checking file and loading local runtime…':'Проверяю файл и загружаю локальный runtime…';
    try{const model=await loadModel(file.files[0],{signal:controller.signal});if(dead||ticket!==seq||!host.current()){await model.dispose();return;}provider=model;renew();state.textContent=en?'Experimental local model ready.':'Экспериментальная локальная модель готова.';}
    catch{if(!dead&&ticket===seq){provider=null;renew();state.textContent=en?'Model unavailable. Check the file and prepared runtime. Source mode remains available.':'Модель недоступна. Проверьте файл и подготовку runtime. Режим материалов остаётся доступным.';}}
    finally{if(loading===controller){file.value='';loading=null;load.disabled=false;file.disabled=false;}}
  });
  const unload=make('button',en?'Unload model':'Выгрузить модель',local);unload.type='button';unload.className='btn';unload.addEventListener('click',()=>{loading?.abort();clear();session.dispose();provider=null;renew();state.textContent=en?'Model unloaded; source mode.':'Модель выгружена; режим материалов.';});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();void ask('explain');}});
  return Object.freeze({clear,dispose(){if(dead)return;dead=true;seq++;loading?.abort();session.dispose();provider=null;file.value='';input.value='';output.replaceChildren();details.remove();}});
}
