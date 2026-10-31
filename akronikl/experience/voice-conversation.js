// Один явный голосовой сеанс: слушать → ответ → озвучить → слушать.
// Текст, аудио, аккаунт и настройки не сохраняются этим контроллером.
export function createVoiceConversation({isCurrent,contextKey,listen,abortListening,answer,speak,stopSpeaking,onState=()=>{},retryDelay=250}={}){
 for(const fn of [isCurrent,contextKey,listen,abortListening,answer,speak,stopSpeaking])if(typeof fn!=='function')throw Error('VOICE_SESSION_CONFIG');
 let active=false,dead=false,state='idle',epoch=0,key=null,config=null,controller=null,retry=null;
 const publish=value=>{state=value;onState({active,state});};
 const current=t=>!dead&&active&&t===epoch&&isCurrent()===true&&contextKey()===key&&!controller.signal.aborted;
 function stop(reason='idle'){active=false;epoch++;clearTimeout(retry);retry=null;controller?.abort();controller=null;abortListening();stopSpeaking();publish(reason);}
 function fail(){stop('error');}
 async function arm(t){if(!current(t)){if(active&&epoch===t)stop();return;}publish('preparing');try{await listen(config);if(current(t))publish('listening');else if(active&&epoch===t)stop();}catch{if(current(t))fail();}}
 return Object.freeze({snapshot:()=>Object.freeze({active,state}),
  async start(options){stop();if(dead||!isCurrent())throw Error('VOICE_CONTEXT_CHANGED');key=contextKey();config=Object.freeze({...options});active=true;controller=new AbortController();const t=++epoch;await arm(t);},
  async receive(text){const t=epoch;if(!current(t)||!['preparing','listening'].includes(state))return false;if(typeof text!=='string'||!text.trim()||text.length>1500){fail();return false;}
   clearTimeout(retry);retry=null;abortListening();publish('answering');const signal=controller.signal;
   try{const response=await answer(text,{signal});if(!current(t)){if(active&&epoch===t)stop();return false;}if(typeof response!=='string'||!response.trim()||response.length>12000)throw Error('VOICE_REPLY_UNAVAILABLE');publish('speaking');await speak(response,{signal});if(!current(t)){if(active&&epoch===t)stop();return false;}await arm(t);return current(t);}catch{if(current(t))fail();return false;}
  },
  empty(){const t=epoch;if(!current(t)||!['preparing','listening'].includes(state))return;abortListening();publish('waiting');clearTimeout(retry);retry=setTimeout(()=>{retry=null;void arm(t);},Math.max(100,retryDelay));},
  captureState(value){if(active&&['permission-denied','language-unavailable','error','limit'].includes(value))fail();},
  stop(){stop();},dispose(){if(dead)return;stop();dead=true;}
 });
}
