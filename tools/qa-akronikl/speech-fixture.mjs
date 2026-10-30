// UI contract only. Explicitly synthetic; never evidence of audible/native speech.
export function installSyntheticSpeech(){
 const events=new EventTarget(),calls=[];let current=null,paused=false,cancels=0,hold=false;
 const engine={get paused(){return paused;},getVoices:()=>[{voiceURI:'qa-local-ru',name:'QA local RU',lang:'ru-RU',localService:true},{voiceURI:'qa-local-en',name:'QA local EN',lang:'en-US',localService:true},{voiceURI:'qa-remote',name:'QA remote',lang:'ru-RU',localService:false}],
 speak(u){current=u;calls.push({text:u.text,lang:u.lang,voiceURI:u.voice.voiceURI,rate:u.rate});queueMicrotask(()=>{if(current!==u)return;u.onstart?.();if(!hold&&!paused){current=null;u.onend?.();}});},
 cancel(){current=null;cancels++;},pause(){paused=true;},resume(){paused=false;},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
 Object.defineProperty(window,'speechSynthesis',{value:engine,configurable:true});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}},configurable:true});
 window.qaSpeech={calls,get cancels(){return cancels;},get active(){return !!current;},setHold(value){hold=value;}};
}
