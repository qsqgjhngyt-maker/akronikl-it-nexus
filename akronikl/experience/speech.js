// Device voices and an authenticated local narrator. No historical auto-replay.
import {prepareSpeechText,phraseChunks} from './speech-text.js';
export function speechPreferences(value={auto:false,voiceURI:'',rate:1}){
 if(!value||!['auto,rate,voiceURI','auto,greeting,rate,voiceURI'].includes(Object.keys(value).sort().join(','))||typeof value.auto!=='boolean'||value.greeting!==undefined&&typeof value.greeting!=='boolean'||typeof value.voiceURI!=='string'||value.voiceURI.length>240||!Number.isFinite(value.rate)||value.rate<.7||value.rate>1.5)throw Error('SPEECH_SETTINGS_INVALID');
 return Object.freeze({...value,greeting:value.greeting??true});
}
export const localSpeechChunks=phraseChunks;
export function createSpeechController({windowRef=globalThis.window,isCurrent=()=>true,onChange=()=>{}}={}){
 const engine=windowRef?.speechSynthesis,Utterance=windowRef?.SpeechSynthesisUtterance;
 let prefs=speechPreferences(),locale='ru',state='idle',generation=0,dead=false,armed=false,current=null,localSpeakers=[],localJob=null,prefetchJob=null;
 const nativeSupported=!!engine&&typeof Utterance==='function',supported=()=>nativeSupported||localSpeakers.length>0;
 const voices=()=>{let available=[];try{if(nativeSupported)available=engine.getVoices().filter(v=>v.localService===true&&typeof v.voiceURI==='string');}catch{}return [...localSpeakers.map(s=>s.voice),...available];};
 const publish=value=>{state=value;try{onChange(snapshot());}catch{}};
 const snapshot=()=>Object.freeze({supported:supported(),available:['uyut7:narrator','kitsune:piper-irina','kitsune:piper-uyut7'].includes(prefs.voiceURI)?localSpeakers.some(s=>s.voice.voiceURI===prefs.voiceURI):voices().length>0,state,preferences:prefs});
 function stop(){generation++;prefetchJob?.cancel();prefetchJob=null;localJob?.cancel();localJob=null;if(nativeSupported&&current)engine.cancel();current=null;publish('idle');}
 function read(value){
  if(dead||!isCurrent()){stop();return false;}
  const available=voices(),matching=available.filter(v=>v.lang?.toLowerCase().split('-')[0]===locale);
  const voice=available.find(v=>v.voiceURI===prefs.voiceURI)||(['uyut7:narrator','kitsune:piper-irina','kitsune:piper-uyut7'].includes(prefs.voiceURI)?null:matching.find(v=>v.default)||matching[0]);
  if(!supported()||!voice){publish('unavailable');return false;}
  if(typeof value!=='string'||!value.trim()||value.length>12000){publish('error');return false;}
  let chunks;try{chunks=['local-server','local-browser'].includes(voice.kind)?localSpeechChunks(locale==='ru'?prepareSpeechText(value):value):value.match(/[\s\S]{1,180}(?:\s|$)|[\s\S]{1,180}/gu)||[];}catch{stop();publish('error');return false;}
  if(!chunks.some(c=>c.trim())){stop();return false;}
  stop();if(nativeSupported&&engine.paused)engine.resume();armed=true;const ticket=generation;let at=0;
  function next(){
   if(dead||ticket!==generation||!isCurrent()){if(ticket===generation)stop();return;}
   if(at===chunks.length){current=null;publish('idle');return;}
   if(['local-server','local-browser'].includes(voice.kind)){
    const speaker=localSpeakers.find(s=>s.voice.voiceURI===voice.voiceURI);if(!speaker){publish('unavailable');return;}
    prefetchJob=null;publish('loading');localJob=speaker.speak(chunks[at++],{onstart(){if(ticket!==generation)return;if(!isCurrent())stop();else{publish('speaking');if(at<chunks.length&&!prefetchJob&&speaker.prepare)prefetchJob=speaker.prepare(chunks[at]);}},onend(){if(ticket===generation){localJob=null;next();}},onerror(){if(ticket===generation){stop();publish('error');}}});localJob.setRate(prefs.rate);return;
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
 function setLocalSpeakers(values){
  if(!Array.isArray(values)||values.length>3||values.some(s=>!['uyut7:narrator','kitsune:piper-irina','kitsune:piper-uyut7'].includes(s?.voice?.voiceURI)||typeof s.speak!=='function')||new Set(values.map(s=>s.voice.voiceURI)).size!==values.length)throw Error('SPEECH_SETTINGS_INVALID');
  stop();for(const previous of localSpeakers)if(!values.includes(previous))previous.dispose?.();localSpeakers=[...values];publish('idle');
 }
 if(nativeSupported)engine.addEventListener?.('voiceschanged',changed);
 return Object.freeze({snapshot,voices,read,stop,arm(){if(!dead)armed=true;},auto(value){return prefs.auto&&armed?read(value):false;},
  configure(value,language=locale){stop();prefs=speechPreferences(value);locale=language==='en'?'en':'ru';publish('idle');},
  setLocalSpeaker(value){setLocalSpeakers(value===null?[]:[value]);},setLocalSpeakers,
  pause(){if(state==='speaking'&&(current||localJob)){if(localJob)localJob.pause();else engine.pause();publish('paused');}},resume(){if(state==='paused'&&(current||localJob)){if(localJob)localJob.resume();else engine.resume();publish('speaking');}},
  dispose(){if(dead)return;stop();dead=true;armed=false;for(const speaker of localSpeakers)speaker.dispose?.();localSpeakers=[];engine?.removeEventListener?.('voiceschanged',changed);}
 });
}
