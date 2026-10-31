// Распознавание средствами браузера. Аудиозапись, getUserMedia и API провайдеров не создаются.
export function createMicrophone({windowRef=globalThis.window,isCurrent=()=>true,onState=()=>{},onTranscript=()=>{},onEmpty=()=>{}}={}){
 const Recognition=windowRef?.SpeechRecognition||windowRef?.webkitSpeechRecognition;let recognition=null,generation=0,timer=null,dead=false,state='idle';
 const publish=value=>{state=value;onState({state,supported:typeof Recognition==='function'});};
 function stop(){generation++;clearTimeout(timer);const r=recognition;recognition=null;try{r?.abort();}catch{}publish('idle');}
 return Object.freeze({snapshot:()=>({state,supported:typeof Recognition==='function'}),stop,
  start({locale='ru',mode='dictation',processing='browser',remoteConsent=false}={}){
   stop();if(dead||!isCurrent())throw Error('MIC_CONTEXT_CHANGED');if(typeof Recognition!=='function')throw Error('MIC_UNSUPPORTED');if(!['ru','en'].includes(locale)||!['dictation','conversation'].includes(mode)||!['local','browser'].includes(processing))throw Error('MIC_OPTIONS');if(processing==='browser'&&!remoteConsent)throw Error('MIC_CONSENT_REQUIRED');
   const r=new Recognition();if(processing==='local'&&!('processLocally'in r))throw Error('MIC_LOCAL_UNAVAILABLE');if('processLocally'in r)r.processLocally=processing==='local';r.lang=locale==='en'?'en-US':'ru-RU';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;const ticket=++generation;let parts=new Map(),failed=false;
   const current=()=>!dead&&ticket===generation&&recognition===r&&isCurrent();recognition=r;
   r.onstart=()=>{if(current())publish('listening');else stop();};
   r.onresult=event=>{if(!current())return;for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];if(result.isFinal){const text=result[0]?.transcript;if(typeof text!=='string')continue;parts.set(i,text);}}if([...parts.values()].join(' ').length>1500){failed=true;stop();publish('limit');}};
   r.onerror=event=>{if(!current())return;failed=event.error!=='no-speech';clearTimeout(timer);publish(event.error==='no-speech'?'idle':['not-allowed','service-not-allowed'].includes(event.error)?'permission-denied':event.error==='language-not-supported'?'language-unavailable':'error');};
   r.onend=()=>{if(!current())return;clearTimeout(timer);recognition=null;const text=[...parts.entries()].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(' ').trim();if(!failed){publish('idle');if(isCurrent()){if(text)onTranscript({text,mode,processing});else onEmpty({mode,processing});}}};
   timer=setTimeout(()=>{if(current()){failed=true;stop();publish('timeout');}},30000);try{publish('starting');r.start();}catch(error){stop();throw error;}
  },finish(){try{recognition?.stop();}catch{stop();}},dispose(){dead=true;stop();}
 });
}
