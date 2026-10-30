import {cloudSelection} from './cloud-catalog.js';
import {modelProfile} from './profiles.js';
import {inspectLocalProfile} from './probe.js';
const safeCodes=new Set(['CLOUD_ACCOUNT_REQUIRED','SOURCES_READY','READY_TO_LOAD','RUNTIME_UNAVAILABLE','WEBGPU_UNAVAILABLE','SECURE_CONTEXT_REQUIRED','BROWSER_UNSUPPORTED','EXTERNAL_DISABLED','CLOUD_READY','CLOUD_UNAVAILABLE','CLOUD_KEY_REQUIRED']);
const safeReport=r=>Object.freeze({code:safeCodes.has(r?.code)?r.code:'RUNTIME_UNAVAILABLE',readyToLoad:['READY_TO_LOAD','CLOUD_READY'].includes(r?.code)&&r.readyToLoad===true,
  runtimeManifest:r?.runtimeManifest===true,webgpu:['not-checked','available','unavailable','insecure','software','unknown'].includes(r?.webgpu)?r.webgpu:'unknown',generationTested:false});

// Один владелец runtime. Сессии получают отзываемый доступ, а не право закрывать
// общий runtime. Ни credentials, ни File, ни исключения не входят в snapshot.
export function createModelConnections({isCurrent,loadLocal,inspect=inspectLocalProfile,onInvalidate=()=>{},timeoutMs=180000,cloudBroker=null,retainCloudOnDispose=false}={}) {
  if(typeof isCurrent!=='function'||typeof loadLocal!=='function'||typeof inspect!=='function'||typeof onInvalidate!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<20||timeoutMs>180000)throw Error('CONNECTION_CONFIG_INVALID');
  if(cloudBroker!==null&&(typeof cloudBroker.inspect!=='function'||typeof cloudBroker.connect!=='function'))throw Error('CONNECTION_CONFIG_INVALID');
  let selection=cloudSelection(),selectionExplicit=false,saved=[],savedRevision=0,savedStatus='idle',savedError=null,savedOperation=null,generationAllowed=cloudBroker!==null,stateServiceAvailable=false;
  let selected='sources',phase='ready',code='SOURCES_READY',revision=0,provider=null,lifetime=null,operation=null,dead=false;
  let pendingResources=0,cleanupTasks=0,cleanupFailed=false,lastProbe=null,retainedClose=false;const listeners=new Set();
  function current(){try{return !dead&&isCurrent()===true;}catch{return false;}}
  const state=()=>Object.freeze({profileId:selected,phase,code,revision,modelId:provider?provider.modelId:null,
    pendingResources,cleanupTasks,cleanupFailed,inspection:lastProbe,cloudEnabled:provider?.kind==='cloud',cloudAvailable:generationAllowed,personalStateAvailable:stateServiceAvailable,cloudSettingsAvailable:cloudBroker?.settings===true&&generationAllowed,cloudKeyManagementAvailable:cloudBroker?.settings===true&&(generationAllowed||stateServiceAvailable),cloudSavedStatus:savedStatus,cloudSavedError:savedError,cloudSavedOperation:savedOperation,cloudSelection:selection,cloudSaved:Object.freeze([...saved])});
  function emit(){const value=state();for(const fn of listeners){try{fn(value);}catch{}}return value;}
  function cleanup(p,retain=false){if(!p)return;cleanupTasks++;Promise.resolve().then(()=>retain&&p.kind==='cloud'&&typeof p.suspend==='function'?p.suspend():p.dispose()).catch(()=>{cleanupFailed=true;}).finally(()=>{cleanupTasks--;if(!dead)emit();});}
  function invalidate(retain=false){revision++;operation?.abort();operation=null;lifetime?.abort();lifetime=null;const old=provider;provider=null;
    try{onInvalidate();}catch{}cleanup(old,retain);}
  function ensure(){if(current())return true;dispose();return false;}
  function dispose({retainCloudConnection=retainCloudOnDispose}={}){if(dead)return;const retain=retainCloudConnection===true&&current();retainedClose=retain;dead=true;invalidate(retain);savedRevision++;saved=[];savedStatus='idle';savedError=null;savedOperation=null;phase='closed';code='CONNECTION_CLOSED';lastProbe=null;emit();listeners.clear();}
  function select(id){const p=modelProfile(id);if(!ensure())return state();if(!p.enabled&&!(id==='external'&&generationAllowed))return Object.freeze({status:'denied',code:'EXTERNAL_DISABLED'});
    invalidate();selected=id;lastProbe=null;phase=id==='sources'?'ready':'disconnected';code=id==='sources'?'SOURCES_READY':'MODEL_NOT_LOADED';if(id==='external')void refreshCloudSaved();return emit();}
  async function refreshCloudSaved(){if(!ensure()||!cloudBroker?.listSaved)return;const ticket=++savedRevision,original=selection;savedStatus='loading';savedError=null;emit();try{const entries=(await cloudBroker.listSaved()).map(cloudSelection);if(current()&&ticket===savedRevision){saved=entries;savedStatus='ready';if(selected==='external'&&phase==='disconnected'&&!selectionExplicit&&selection===original)selection=entries.find(x=>x.providerId===selection.providerId)??selection;emit();}}catch{if(current()&&ticket===savedRevision){savedStatus='error';savedError='CLOUD_VAULT_UNAVAILABLE';emit();}}}
  async function forgetCloud(providerId=selection.providerId){
    if(!ensure()||!cloudBroker?.forget)return Object.freeze({status:'error',code:'CLOUD_ACCOUNT_REQUIRED'});
    const id=cloudSelection({providerId,modelId:'validation-only'}).providerId;if(savedOperation)return Object.freeze({status:'busy'});
    savedRevision++;savedOperation=id;savedError=null;if(selected==='external'&&selection.providerId===id){invalidate();phase='disconnected';code='MODEL_NOT_LOADED';}emit();
    try{await cloudBroker.forget(id);if(!current())return Object.freeze({status:'closed'});saved=saved.filter(x=>x.providerId!==id);savedStatus='ready';savedOperation=null;emit();await refreshCloudSaved();return Object.freeze({status:'deleted',providerId:id});}
    catch{if(current()){savedOperation=null;savedStatus='error';savedError='CLOUD_VAULT_UNAVAILABLE';emit();}return Object.freeze({status:'error',code:'CLOUD_VAULT_UNAVAILABLE'});}
  }
  async function restoreCloud(value){try{return await cloudBroker.resume(value);}catch(error){if(error.message==='CLOUD_NOT_CONNECTED'&&cloudBroker.accountBound&&cloudBroker.restoreSaved)return cloudBroker.restoreSaved(value);throw error;}}
  async function run(file,connect,{resume=false}={}){
    if(!ensure())return state();
    if(selected==='sources')return emit();
    if(selected==='external'&&!generationAllowed)return Object.freeze({status:'denied',code:'CLOUD_GENERATION_DISABLED'});
    if(operation||pendingResources||cleanupTasks||cleanupFailed)return Object.freeze({status:'busy',code:cleanupFailed?'CLEANUP_FAILED':'CONNECTION_BUSY'});
    if(provider)return state();
    const ticket=revision,id=selected,controller=new AbortController();operation=controller;phase=connect?'loading':'checking';code=connect?'MODEL_LOADING':'CHECKING';emit();
    let timer,timedOut=false;const aborted=new Promise(resolve=>controller.signal.addEventListener('abort',()=>resolve(null),{once:true}));
    const active=()=>current()&&ticket===revision&&operation===controller&&!controller.signal.aborted;
    timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
    const task=(async()=>{
      let loaded=null;
      try{
        const external=id==='external';
        const checked=external?await cloudBroker.inspect({signal:controller.signal}):await inspect(id,{signal:controller.signal});
        if(!active())return;
        lastProbe=safeReport(checked);
        if(!lastProbe.readyToLoad){phase='unavailable';code=lastProbe.code;return;}
        if(!connect){phase='checked';code=external?'CLOUD_READY':'READY_TO_LOAD';return;}
        if(!external&&(!(file instanceof Blob)||file.size<1024)){phase='error';code='LOCAL_FILE_REJECTED';return;}
        pendingResources++;emit();
        try{loaded=external?resume?await restoreCloud({...selection,signal:controller.signal}):await cloudBroker.connect(cloudBroker.settings?{...selection,apiKey:file?.apiKey,remember:file?.remember,useSaved:file?.useSaved,signal:controller.signal}:{signal:controller.signal}):await loadLocal(file,{signal:controller.signal,profile:id});}finally{pendingResources--;}
        if(!active()){cleanup(loaded,resume&&retainedClose);return;}
        if(!loaded||!(external?loaded.kind==='cloud'&&loaded.transport==='trusted-broker':loaded.kind==='local'&&loaded.transport==='in-process')||external&&cloudBroker.settings&&loaded.connectionVerified!==true||loaded.modelId!==(external&&cloudBroker.settings?selection.modelId:modelProfile(id).modelId)||typeof loaded.generate!=='function'||typeof loaded.dispose!=='function'){
          cleanup(loaded);phase='error';code='MODEL_LOAD_FAILED';return;
        }
        provider=loaded;lifetime=new AbortController();phase='connected';code=external?'CLOUD_CONNECTED':'MODEL_LOADED';
        if(external)void refreshCloudSaved();
      }catch(error){
        if(active()){phase='error';code=id==='external'&&externalSafe(error?.message)?error.message:'MODEL_LOAD_FAILED';}
      }finally{if(!dead)emit();}
    })();
    await Promise.race([task,aborted]);clearTimeout(timer);
    if(ticket===revision&&operation===controller){operation=null;if(timedOut){phase='error';code='CONNECTION_TIMEOUT';}else if(controller.signal.aborted){phase='disconnected';code='MODEL_NOT_LOADED';}}
    if(!current()&&!dead)dispose();else if(!dead)emit();return state();
  }
  function externalSafe(code){return ['CLOUD_ACCOUNT_REQUIRED','CLOUD_KEY_INVALID','CLOUD_AUTH_FAILED','CLOUD_ACCESS_DENIED','CLOUD_MODEL_NOT_FOUND','CLOUD_NOT_CONNECTED','CLOUD_RATE_LIMITED','CLOUD_BUDGET_EXHAUSTED','CLOUD_BUDGET_UNAVAILABLE','CLOUD_REQUEST_REJECTED','CLOUD_SERVICE_UNAVAILABLE','CLOUD_TLS_FAILED','CLOUD_RESPONSE_INVALID','CLOUD_VAULT_UNAVAILABLE'].includes(code);}
  function configureCloud(value){if(!ensure()||!cloudBroker?.settings)return state();const next=cloudSelection(value);selectionExplicit=true;if(JSON.stringify(next)===JSON.stringify(selection))return state();if(selected!=='external'){selection=next;return emit();}invalidate();selection=next;phase='disconnected';code='MODEL_NOT_LOADED';return emit();}
  function lease(){
    if(!ensure()||!provider||phase!=='connected')return null;
    const selectedProvider=provider,connectionSignal=lifetime.signal,ticket=revision;let released=false;
    const valid=()=>!released&&current()&&ticket===revision&&provider===selectedProvider&&!connectionSignal.aborted;
    return Object.freeze({kind:selectedProvider.kind,transport:selectedProvider.transport,modelId:selectedProvider.modelId,
      async chat(request){if(!valid()||typeof selectedProvider.chat!=='function')throw Error('CHAT_PROVIDER_REQUIRED');const signal=request.signal?AbortSignal.any([request.signal,connectionSignal]):connectionSignal;const response=await selectedProvider.chat({...request,signal});if(!valid()||signal.aborted)throw Error('MODEL_LEASE_EXPIRED');return response;},
      async generate(request){
        if(!valid())throw Error('MODEL_LEASE_EXPIRED');
        const signal=request.signal?AbortSignal.any([request.signal,connectionSignal]):connectionSignal;
        const {onProgress,...rest}=request;
        const response=await selectedProvider.generate({...rest,signal,onProgress(value){if(valid()&&!signal.aborted)onProgress?.(value);}});
        if(!valid()||signal.aborted)throw Error('MODEL_LEASE_EXPIRED');return response;
      },dispose(){released=true;}});
  }
  return Object.freeze({select,configureCloud,refreshCloudSaved,forgetCloud,setCloudAvailability(value,{stateAvailable=false}={}){if(typeof value!=='boolean')throw Error('CONNECTION_CONFIG_INVALID');generationAllowed=value&&cloudBroker!==null;stateServiceAvailable=stateAvailable===true;if(!generationAllowed){if(!stateServiceAvailable){savedRevision++;saved=[];savedStatus='idle';savedError=null;}if(selected==='external'){invalidate();selected='sources';phase='ready';code='SOURCES_READY';}}return emit();},inspect:()=>run(null,false),connect:file=>run(file,true),lease,
    resume(){if(selected!=='external'||!cloudBroker?.resume)return Promise.resolve(Object.freeze({status:'unavailable'}));return run(null,true,{resume:true});},
    snapshot(){ensure();return state();},
    cancelPending(){if(operation){invalidate();phase=selected==='sources'?'ready':'disconnected';code=selected==='sources'?'SOURCES_READY':'MODEL_NOT_LOADED';emit();}},
    disconnect(){return select('sources');},dispose,
    subscribe(fn){if(typeof fn!=='function')throw Error('CONNECTION_OBSERVER_INVALID');if(dead)return()=>{};listeners.add(fn);try{fn(state());}catch{}return()=>listeners.delete(fn);}
  });
}
