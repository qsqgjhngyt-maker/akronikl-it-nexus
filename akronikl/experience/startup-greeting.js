import {createSpeechController} from './speech.js';import {cloudPreferences} from '../connections/preferences.js';import {createCloudSettingsBroker} from '../tutor/cloud-settings-broker.js';import {startupGreeting} from '../learning/progress.js';
export async function prepareStartupGreeting({readIdentity,readLearningProgress,onPreferences=()=>{},windowRef=window,documentRef=document,broker=null,createSpeech=createSpeechController,random=Math.random,signal}={}){
 const identity=readIdentity(),initialHash=windowRef.location?.hash;if(!identity?.accountId||signal?.aborted)return null;let dead=false,started=false,speech=null,waiting=false;
 let retried=false;const listeners=new AbortController(),current=()=>!dead&&!signal?.aborted&&readIdentity()===identity&&!documentRef.hidden&&windowRef.location?.hash===initialHash;
 const dispose=()=>{if(dead)return;dead=true;listeners.abort();speech?.dispose();};
 const retry=event=>{if(event.isTrusted&&current()&&!started&&!retried){retried=true;waiting=false;speech.arm();speech.read(text);}};
 let text='';
 try{
  broker??=createCloudSettingsBroker({readIdentity,windowRef});const record=await broker.loadState('preferences');if(!current())return null;
  const prefs=cloudPreferences(record.value??undefined);onPreferences(prefs);if(!prefs.speech.auto||!prefs.speech.greeting)return null;
  const capabilities=await broker.capabilities();if(!current())return null;const progress=prefs.learningProgress?await readLearningProgress?.():null;if(!current())return null;text=startupGreeting(progress,prefs.locale,Math.floor(random()*3));
  signal?.addEventListener('abort',dispose,{once:true,signal:listeners.signal});
  speech=createSpeech({windowRef,isCurrent:current,onChange:s=>{windowRef.dispatchEvent(new windowRef.CustomEvent('nexus:assistant-state',{detail:{state:s.state}}));if(s.state==='speaking')started=true;if(s.state==='error'&&!started&&!waiting){waiting=true;documentRef.addEventListener('pointerdown',retry,{capture:true,signal:listeners.signal});documentRef.addEventListener('keydown',retry,{capture:true,signal:listeners.signal});}}});
  speech.setLocalSpeakers(broker.localSpeakers?.()??[]);speech.configure(prefs.speech,prefs.locale);
  for(const type of ['pagehide','hashchange','nexus:session-ending','nexus:session-ended','nexus:context-invalidated','nexus:assistant-speech-changed'])windowRef.addEventListener(type,dispose,{capture:true,signal:listeners.signal});
  documentRef.addEventListener('visibilitychange',()=>{if(documentRef.hidden)dispose();},{signal:listeners.signal});
  if(!capabilities.localSpeechVoice&&!speech.snapshot().available){dispose();return null;}speech.arm();speech.read(text);
  return Object.freeze({dispose});
 }catch{dispose();return null;}
}
