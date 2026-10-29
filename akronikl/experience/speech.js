// Device voices and an authenticated local narrator. No historical auto-replay.
export function speechPreferences(value={auto:false,voiceURI:'',rate:1}){
 if(!value||Object.keys(value).sort().join(',')!=='auto,rate,voiceURI'||typeof value.auto!=='boolean'||typeof value.voiceURI!=='string'||value.voiceURI.length>240||!Number.isFinite(value.rate)||value.rate<.7||value.rate>1.5)throw Error('SPEECH_SETTINGS_INVALID');
 return Object.freeze({...value});
}
export function createSpeechController({windowRef=globalThis.window,isCurrent=()=>true,onChange=()=>{}}={}){
 const engine=windowRef?.speechSynthesis,Utterance=windowRef?.SpeechSynthesisUtterance;
 let prefs=speechPreferences(),locale='ru',state='idle',generation=0,dead=false,armed=false,current=null,localSpeaker=null,localJob=null;
 const nativeSupported=!!engine&&typeof Utterance==='function',supported=()=>nativeSupported||!!localSpeaker;
 const voices=()=>{let available=[];try{if(nativeSupported)available=engine.getVoices().filter(v=>v.localService===true&&typeof v.voiceURI==='string');}catch{}return [...(localSpeaker?[localSpeaker.voice]:[]),...available];};
 const publish=value=>{state=value;try{onChange(snapshot());}catch{}};
 const snapshot=()=>Object.freeze({supported:supported(),available:prefs.voiceURI==='uyut7:narrator'?!!localSpeaker:voices().length>0,state,preferences:prefs});
 function stop(){generation++;localJob?.cancel();localJob=null;if(nativeSupported&&current)engine.cancel();current=null;publish('idle');}
 function read(value){
  if(dead||!isCurrent()){stop();return false;}
  const available=voices(),matching=available.filter(v=>v.lang?.toLowerCase().split('-')[0]===locale);
  const voice=available.find(v=>v.voiceURI===prefs.voiceURI)||(prefs.voiceURI==='uyut7:narrator'?null:matching.find(v=>v.default)||matching[0]);
  if(!supported()||!voice){publish('unavailable');return false;}
  if(typeof value!=='string'||!value.trim()||value.length>12000){publish('error');return false;}
  stop();if(nativeSupported&&engine.paused)engine.resume();armed=true;const ticket=generation,chunks=value.match(/[\s\S]{1,180}(?:\s|$)|[\s\S]{1,180}/gu)||[];let at=0;
  function next(){
   if(dead||ticket!==generation||!isCurrent()){if(ticket===generation)stop();return;}
   if(at===chunks.length){current=null;publish('idle');return;}
   if(voice.kind==='local-server'){
    publish('loading');localJob=localSpeaker.speak(chunks[at++],{onstart(){if(ticket!==generation)return;if(!isCurrent())stop();else publish('speaking');},onend(){if(ticket===generation){localJob=null;next();}},onerror(){if(ticket===generation){generation++;localJob?.cancel();localJob=null;publish('error');}}});localJob.setRate(prefs.rate);return;
   }
   const u=new Utterance(chunks[at++]);u.voice=voice;u.lang=voice.lang;u.rate=prefs.rate;current=u;
   u.onstart=()=>{if(ticket===generation){if(!isCurrent())stop();else publish('speaking');}};
   u.onend=()=>{if(ticket===generation)next();};
   u.onerror=()=>{if(ticket===generation){generation++;current=null;engine.cancel();publish('error');}};
   try{publish('speaking');engine.speak(u);}catch{u.onerror();}
  }
  next();return true;
 }
 function changed(){if(!dead)publish(state);}
 if(nativeSupported)engine.addEventListener?.('voiceschanged',changed);
 return Object.freeze({snapshot,voices,read,stop,arm(){if(!dead)armed=true;},auto(value){return prefs.auto&&armed?read(value):false;},
  configure(value,language=locale){stop();prefs=speechPreferences(value);locale=language==='en'?'en':'ru';publish('idle');},
  setLocalSpeaker(value){if(value!==null&&(value?.voice?.voiceURI!=='uyut7:narrator'||typeof value.speak!=='function'))throw Error('SPEECH_SETTINGS_INVALID');stop();localSpeaker=value;publish('idle');},
  pause(){if(state==='speaking'&&(current||localJob)){if(localJob)localJob.pause();else engine.pause();publish('paused');}},resume(){if(state==='paused'&&(current||localJob)){if(localJob)localJob.resume();else engine.resume();publish('speaking');}},
  dispose(){if(dead)return;stop();dead=true;armed=false;engine?.removeEventListener?.('voiceschanged',changed);}
 });
}
