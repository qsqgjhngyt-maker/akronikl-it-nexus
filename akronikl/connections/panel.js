import {MODEL_PROFILES} from './profiles.js';
const labels={
 ru:{title:'Модели и подключения',mode:'Режим помощника',check:'Проверить готовность',load:'Подключить выбранную модель',disconnect:'Отключить модель',file:'Локальный файл GGUF',
  note:'Локальный файл и диалог не отправляются внешнему AI. После закрытия окна модель отключается. Проверка готовности не генерирует ответ и не доказывает его качество.',
  cloud:'Внешние модели пока не подключены. Ввод API-ключа появится только после проверки серверного хранения и разрешений. Здесь ключи вводить не нужно.',
  gpu:'WebGPU — эксперимент. Наличие адаптера не доказывает ускорение; фактическая скорость и работа на телефонах ещё не приняты.',
  states:{SOURCES_READY:'Без модели: навигация, справка и материалы доступны.',MODEL_NOT_LOADED:'Модель не загружена. Выберите файл и подключите её.',CHECKING:'Проверяю среду и подготовку runtime…',MODEL_LOADING:'Проверяю файл и загружаю модель…',READY_TO_LOAD:'Среда предварительно готова. Модель ещё не загружена.',MODEL_LOADED:'Локальная модель загружена. Скорость и качество экспериментальные.',RUNTIME_UNAVAILABLE:'Runtime не подготовлен или недоступен. Модель не подключена; материалы курса доступны.',WEBGPU_UNAVAILABLE:'Подходящий WebGPU-адаптер не подтверждён. Выберите процессор явно; автоматической смены профиля нет.',SECURE_CONTEXT_REQUIRED:'Нужен защищённый контекст браузера (HTTPS).',BROWSER_UNSUPPORTED:'Браузер не предоставляет необходимые локальные возможности.',EXTERNAL_DISABLED:'Внешний AI пока отключён.',LOCAL_FILE_REJECTED:'Выберите подходящий локальный GGUF-файл.',MODEL_LOAD_FAILED:'Модель не подключена. Проверьте файл, runtime и выбранный режим.',CONNECTION_TIMEOUT:'Подключение не завершилось вовремя. Материалы остаются доступны.',CONNECTION_CLOSED:'Подключение закрыто.',CONNECTION_BUSY:'Предыдущая операция ещё освобождает ресурсы.',CLEANUP_FAILED:'Освобождение модели не подтверждено. Закройте окно помощника перед повторной попыткой.'}},
 en:{title:'Models and connections',mode:'Assistant mode',check:'Check readiness',load:'Connect selected model',disconnect:'Disconnect model',file:'Local GGUF file',
  note:'The local file and dialogue are not sent to an external AI. Closing this window disconnects the model. A readiness check does not generate an answer or verify its quality.',
  cloud:'External models are not connected yet. API-key entry requires an approved server-side storage and permission design. Do not enter keys here.',
  gpu:'WebGPU is experimental. Adapter availability does not prove acceleration; performance and phones are not accepted yet.',
  states:{SOURCES_READY:'No model: navigation, help and source excerpts are available.',MODEL_NOT_LOADED:'Model not loaded. Select a file and connect.',CHECKING:'Checking the environment and prepared runtime…',MODEL_LOADING:'Checking the file and loading the model…',READY_TO_LOAD:'Preflight ready. The model is not loaded yet.',MODEL_LOADED:'Local model loaded. Speed and quality are experimental.',RUNTIME_UNAVAILABLE:'Runtime not prepared or unavailable. Source excerpts remain available.',WEBGPU_UNAVAILABLE:'A suitable WebGPU adapter was not confirmed. Select CPU explicitly; no automatic profile change.',SECURE_CONTEXT_REQUIRED:'A secure browser context (HTTPS) is required.',BROWSER_UNSUPPORTED:'Required local browser capabilities are unavailable.',EXTERNAL_DISABLED:'External AI is disabled.',LOCAL_FILE_REJECTED:'Select a supported local GGUF file.',MODEL_LOAD_FAILED:'Model not connected. Check the file, runtime and selected mode.',CONNECTION_TIMEOUT:'Connection timed out. Source excerpts remain available.',CONNECTION_CLOSED:'Connection closed.',CONNECTION_BUSY:'The previous operation is still releasing resources.',CLEANUP_FAILED:'Model cleanup was not confirmed. Close the assistant before retrying.'}}
};
Object.assign(labels.ru.states,{CLOUD_READY:'Сервер готов. Нажмите «Подключить выбранную модель».',CLOUD_CONNECTED:'Облачная Qwen подключена. Ответы требуют проверки.',CLOUD_UNAVAILABLE:'Облачное подключение недоступно. Материалы курса остаются доступны.',CLOUD_KEY_REQUIRED:'Для облачной модели ещё не настроен ключ на сервере.'});
Object.assign(labels.en.states,{CLOUD_READY:'Broker ready. Connect the selected model.',CLOUD_CONNECTED:'Cloud Qwen connected. Check the answers.',CLOUD_UNAVAILABLE:'Cloud connection unavailable. Course sources remain available.',CLOUD_KEY_REQUIRED:'The server API key is not configured yet.'});
export function mountConnectionPanel({parent,documentRef,controller,locale='ru',allowWebGPU=true}) {
  const t=labels[locale]||labels.ru;
  const make=(tag,text,root)=>{const n=documentRef.createElement(tag);if(text)n.textContent=text;root.append(n);return n;};
  const root=make('details','',parent);root.dataset.akroniklConnections='';make('summary',t.title,root);
  const modeLabel=make('label',t.mode,root),select=make('select','',modeLabel);select.dataset.akroniklModelProfile='';
  for(const p of MODEL_PROFILES){const o=make('option',locale==='en'?p.labelEn:p.labelRu,select);o.value=p.id;o.disabled=(!(p.enabled||p.id==='external'&&controller.snapshot().cloudAvailable))||(p.id==='local-webgpu'&&!allowWebGPU);}
  const localNote=make('p',t.note,root);
  const fileLabel=make('label',t.file,root),file=make('input','',fileLabel);file.type='file';file.accept='.gguf';file.dataset.akroniklModelFile='';
  const row=make('div','',root);row.className='akronikl-actions';
  const check=make('button',t.check,row),load=make('button',t.load,row),disconnect=make('button',t.disconnect,row);
  for(const b of [check,load,disconnect]){b.type='button';b.className='btn';}
  const status=make('p','',root);status.setAttribute('role','status');status.dataset.akroniklConnectionStatus='';
  const gpuNote=make('p',t.gpu,root),cloudNote=make('p',t.cloud,root);cloudNote.className='akronikl-note';
  let dead=false;
  const display=s=>{
    if(dead)return;select.value=s.profileId;
    const cloud=s.profileId==='external';
    status.textContent=cloud&&s.code==='MODEL_NOT_LOADED'?(locale==='en'?'Cloud model disconnected. Connect when ready.':'Облачная модель отключена. Нажмите «Подключить выбранную модель».'):t.states[s.cleanupFailed?'CLEANUP_FAILED':cloud&&s.code==='MODEL_LOAD_FAILED'?'CLOUD_UNAVAILABLE':s.code]||t.states.MODEL_LOAD_FAILED;
    localNote.hidden=cloud;fileLabel.hidden=cloud;cloudNote.textContent=s.cloudAvailable?(locale==='en'?'Cloud mode sends your question, follow-up context, course excerpts and only explicitly allowed selected code/diagnostics. No API key is entered in this window.':'В облачном режиме отправляются вопрос, контекст продолжения, выдержки курса и только явно разрешённый выделенный код/диагностика. Ключ в этом окне вводить не нужно.'):t.cloud;
    status.dataset.connectionPhase=s.phase;status.dataset.connectionCode=s.code;
    const local=s.profileId.startsWith('local-'),busy=['checking','loading','closed'].includes(s.phase)||s.pendingResources>0||s.cleanupTasks>0||s.cleanupFailed;
    file.disabled=!local||busy||s.phase==='connected';load.disabled=cloud?busy||s.phase==='connected':file.disabled||!file.files?.length;check.disabled=!(local||cloud)||busy||s.phase==='connected';
    disconnect.disabled=s.phase==='closed'||s.profileId==='sources'&&s.pendingResources===0&&s.cleanupTasks===0;
    gpuNote.hidden=s.profileId!=='local-webgpu';
  };
  const unsub=controller.subscribe(display);
  select.addEventListener('change',()=>{file.value='';try{controller.select(select.value);}catch{}display(controller.snapshot());});
  file.addEventListener('change',()=>display(controller.snapshot()));
  check.addEventListener('click',()=>{void controller.inspect();});
  load.addEventListener('click',async()=>{const cloud=controller.snapshot().profileId==='external',chosen=file.files?.[0];if(!cloud&&!chosen)return;try{await controller.connect(chosen);}finally{file.value='';if(!dead)display(controller.snapshot());}});
  disconnect.addEventListener('click',()=>{file.value='';controller.disconnect();});
  return Object.freeze({setWebGPUAvailable(value){const option=select.querySelector('option[value=local-webgpu]');if(option)option.disabled=value!==true;},clearFile(){file.value='';if(!dead)display(controller.snapshot());},dispose(){if(dead)return;dead=true;unsub();file.value='';root.remove();}});
}
