import {CLOUD_PROVIDERS,cloudProvider,cloudSelection} from './cloud-catalog.js';
let serial=0;
export function mountCloudFields({parent,documentRef:doc,controller,locale='ru',onChange=()=>{}}){
 const en=locale==='en',make=(tag,text,root=parent)=>{const n=doc.createElement(tag);if(text)n.textContent=text;root.append(n);return n;};
 const root=make('div','');root.dataset.akCloudFields='';
 const field=(label,tag)=>{const l=make('label',label,root);return make(tag,'',l);};
 const provider=field(en?'Provider':'Провайдер','select');provider.dataset.akCloudProvider='';for(const p of CLOUD_PROVIDERS){const o=make('option',p.label,provider);o.value=p.id;}
 const model=field(en?'Model':'Модель','input');model.type='text';model.maxLength=160;model.autocomplete='off';model.dataset.akCloudModel='';
 const list=make('datalist','',root);list.id='ak-cloud-models-'+(++serial);model.setAttribute('list',list.id);
 const keyLabel=make('label','',root),keyCaption=make('span',en?'API key':'API-ключ',keyLabel),key=make('input','',keyLabel);key.type='password';key.autocomplete='off';key.spellcheck=false;key.maxLength=4096;key.dataset.akCloudKey='';
 const rememberLabel=make('label','',root),remember=make('input','',rememberLabel);rememberLabel.className='ak-cloud-remember';remember.type='checkbox';remember.checked=true;remember.dataset.akCloudRemember='';make('span',en?'Save key in my account':'Сохранить ключ в моём аккаунте',rememberLabel);
 const hint=make('p',en?'Saved keys are encrypted. Next time, connect without entering the key again.':'Сохранённый ключ зашифрован. В следующий раз можно подключиться без повторного ввода.',root);hint.className='akronikl-note';
 const forget=make('button',en?'Delete saved key':'Удалить сохранённый ключ',root);forget.type='button';forget.className='btn';forget.dataset.akCloudForget='';forget.hidden=true;forget.addEventListener('click',()=>{clear();void controller.forgetCloud();});let hasSaved=false;
 const getKey=make('a',en?'Get an API key':'Получить API-ключ',root);getKey.target='_blank';getKey.rel='noopener noreferrer';
 const advanced=make('details','',root);make('summary',en?'Provider options':'Параметры провайдера',advanced);
 const optionField=(label,tag)=>{const l=make('label',label,advanced);return {label:l,input:make(tag,'',l)};};
 const region=optionField(en?'Qwen region':'Регион Qwen','select');region.input.dataset.akCloudRegion='';for(const [value,label]of [['singapore','Singapore'],['beijing','Beijing'],['virginia','US Virginia']]){const o=make('option',label,region.input);o.value=value;}
 const workspace=optionField(en?'Workspace ID (if needed)':'Рабочая область — ID (при необходимости)','input');workspace.input.type='text';workspace.input.maxLength=100;workspace.input.dataset.akCloudWorkspace='';
 const scope=optionField(en?'GigaChat account':'Аккаунт GigaChat','select');scope.input.dataset.akCloudScope='';for(const [value,label]of [['GIGACHAT_API_PERS',en?'Personal':'Физическое лицо'],['GIGACHAT_API_B2B',en?'Business packages':'ИП / организация, пакеты'],['GIGACHAT_API_CORP',en?'Business pay-as-you-go':'ИП / организация, pay-as-you-go']]){const o=make('option',label,scope.input);o.value=value;}
 function clear(){key.value='';key.type='password';}
 function config(){return cloudSelection({providerId:provider.value,modelId:model.value.trim(),options:provider.value==='qwen'?{region:region.input.value,workspaceId:workspace.input.value.trim()}:provider.value==='gigachat'?{scope:scope.input.value}:provider.value==='anthropic'?{workspaceId:workspace.input.value.trim()}:{}});}
 function commit(){try{model.setCustomValidity?.('');controller.configureCloud(config());return true;}catch{model.setCustomValidity?.(en?'Enter a valid model ID and provider options.':'Введите корректный ID модели и параметры провайдера.');model.reportValidity?.();return false;}}
 provider.addEventListener('change',()=>{clear();const p=cloudProvider(provider.value),saved=controller.snapshot().cloudSaved?.find(x=>x.providerId===p.id);model.value=saved?.modelId??p.modelId;region.input.value=saved?.options.region??'singapore';workspace.input.value=saved?.options.workspaceId??(p.id==='qwen'?cloudSelection().options.workspaceId:'');scope.input.value=saved?.options.scope??'GIGACHAT_API_PERS';commit();onChange();});
 for(const n of [model,region.input,workspace.input,scope.input])n.addEventListener('change',()=>{clear();commit();onChange();});key.addEventListener('input',onChange);remember.addEventListener('change',onChange);
 return Object.freeze({
  display(s){
   root.hidden=s.profileId!=='external'||!s.cloudSettingsAvailable;if(root.hidden){clear();return;}
   const c=s.cloudSelection,p=cloudProvider(c.providerId),busy=['checking','loading','closed'].includes(s.phase)||s.pendingResources>0||s.cleanupTasks>0||s.cleanupFailed||!!s.cloudSavedOperation;
   hasSaved=s.cloudSaved?.some(x=>x.providerId===c.providerId)===true;forget.hidden=true;forget.disabled=busy;remember.disabled=busy||s.phase==='connected';
   provider.value=c.providerId;if(doc.activeElement!==model)model.value=c.modelId;
   list.replaceChildren();for(const id of p.models){const o=make('option','',list);o.value=id;}
   getKey.href=p.keyUrl;keyCaption.textContent=p.id==='gigachat'?(en?'Authorization Key':'Ключ авторизации (Authorization Key)'):(en?'API key':'API-ключ');region.label.hidden=p.id!=='qwen';scope.label.hidden=p.id!=='gigachat';workspace.label.hidden=!['qwen','anthropic'].includes(p.id);advanced.hidden=!['qwen','gigachat','anthropic'].includes(p.id);
   region.input.value=c.options.region??'singapore';if(doc.activeElement!==workspace.input)workspace.input.value=c.options.workspaceId??'';scope.input.value=c.options.scope??'GIGACHAT_API_PERS';
   for(const n of [provider,model,region.input,workspace.input,scope.input])n.disabled=busy;key.disabled=busy||s.phase==='connected';key.placeholder=hasSaved?(en?'Key saved — enter a new one to replace':'Ключ сохранён — новый можно вставить для замены'):s.phase==='connected'?(en?'Connected — key is hidden':'Подключено — ключ скрыт'):'';
   hint.textContent=remember.checked?(en?'Saved keys are encrypted. Next time, connect without entering the key again.':'Сохранённый ключ зашифрован. В следующий раз можно подключиться без повторного ввода.'):(en?'New keys are used for this connection only. Use Delete to remove an existing saved key.':'Новый ключ используется только для этого подключения. Ранее сохранённый ключ удаляется отдельной кнопкой.');
  },focusKey(){(key.disabled?provider:key).focus();},hasKey:()=>key.value.trim().length>=16||hasSaved,
  credentials(){if(!commit())return null;const apiKey=key.value.trim();clear();return {apiKey,remember:remember.checked,useSaved:!apiKey&&hasSaved};},clearSecret:clear,dispose(){clear();root.remove();}
 });
}
