import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechController,speechPreferences} from '../akronikl/experience/speech.js';
import {cloudPreferences} from '../akronikl/connections/preferences.js';
function fixture(){const utterances=[],events=new EventTarget();let cancels=0;const voices=[{voiceURI:'ru-local',lang:'ru-RU',localService:true},{voiceURI:'en-local',lang:'en-US',localService:true},{voiceURI:'remote',lang:'ru-RU',localService:false}];const windowRef={SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{getVoices:()=>voices,speak:u=>utterances.push(u),cancel(){cancels++;},pause(){},resume(){},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}};return {windowRef,utterances,get cancels(){return cancels;}};}
test('voice is opt-in, local-only and only reads automatically after interaction',()=>{const f=fixture(),s=createSpeechController(f);assert.equal(s.auto('OLD'),false);s.configure({auto:true,voiceURI:'remote',rate:1});assert.equal(s.auto('OLD'),false);s.arm();assert.equal(s.auto('NEW'),true);assert.equal(f.utterances[0].voice.voiceURI,'ru-local');assert.equal(f.utterances[0].text,'NEW');s.dispose();});
test('stop invalidates late speech events and prevents subsequent chunks',()=>{const f=fixture(),s=createSpeechController(f);const text='Long text. '.repeat(100);s.read(text);assert.ok(f.utterances[0].text.length<=181);const old=f.utterances[0];s.stop();old.onend();assert.equal(f.utterances.length,1);assert.equal(s.snapshot().state,'idle');s.dispose();});
test('text chunks preserve every character and configured rate',()=>{const f=fixture(),s=createSpeechController(f);s.configure({auto:false,voiceURI:'en-local',rate:1.2},'en');const text='A sample. '.repeat(60);s.read(text);for(let i=0;i<f.utterances.length;i++)f.utterances[i].onend();assert.equal(f.utterances.map(u=>u.text).join(''),text);assert.ok(f.utterances.every(u=>u.rate===1.2));s.dispose();});
test('account invalidation/dispose prevent speech and late callbacks',()=>{const f=fixture();let current=true;const s=createSpeechController({...f,isCurrent:()=>current});s.read('FIRST');current=false;f.utterances[0].onend();assert.equal(s.read('OTHER ACCOUNT'),false);s.dispose();assert.equal(s.read('AFTER DISPOSE'),false);assert.equal(f.utterances.length,1);});
test('unavailable speech and synthesis errors are visible, not simulated audio',()=>{const none=createSpeechController({windowRef:{}});assert.equal(none.read('hello'),false);assert.equal(none.snapshot().state,'unavailable');const f=fixture(),s=createSpeechController(f);s.read('hello');f.utterances[0].onerror();assert.equal(s.snapshot().state,'error');s.dispose();});
test('pause/resume and old preference migration preserve safe defaults',()=>{const f=fixture(),s=createSpeechController(f);s.read('hello');s.pause();assert.equal(s.snapshot().state,'paused');s.resume();assert.equal(s.snapshot().state,'speaking');assert.deepEqual(cloudPreferences().speech,{auto:false,voiceURI:'',rate:1});assert.throws(()=>speechPreferences({auto:true,voiceURI:'x',rate:99}));s.dispose();});

test('two narrators route exactly by selected voice and stop late chunks on switching',()=>{
 const jobs=[],disposed=[];const speaker=(voiceURI,kind)=>({voice:{voiceURI,kind,lang:'ru-RU',localService:true},speak(text,events){const job={voiceURI,text,events,cancelled:false,cancel(){this.cancelled=true},setRate(){}};jobs.push(job);return job;},dispose(){disposed.push(voiceURI);}});
 const fast=speaker('kitsune:piper-uyut7','local-browser'),original=speaker('uyut7:narrator','local-server'),s=createSpeechController({windowRef:{}});
 s.setLocalSpeakers([fast,original]);assert.deepEqual(s.voices().map(v=>v.voiceURI),[fast.voice.voiceURI,original.voice.voiceURI]);
 s.configure({auto:false,voiceURI:fast.voice.voiceURI,rate:1});assert.equal(s.read('Первый текст. '.repeat(30)),true);const old=jobs[0];
 s.configure({auto:false,voiceURI:original.voice.voiceURI,rate:1});assert.equal(old.cancelled,true);s.read('Прежний рассказчик.');old.events.onend();assert.equal(jobs.length,2);assert.equal(jobs[1].voiceURI,original.voice.voiceURI);
 s.setLocalSpeakers([fast]);assert.equal(jobs[1].cancelled,true);assert.deepEqual(disposed,[original.voice.voiceURI]);assert.equal(s.read('Недоступный выбранный голос.'),false);assert.equal(jobs.length,2);
 s.dispose();assert.deepEqual(disposed,[original.voice.voiceURI,fast.voice.voiceURI]);
});

test('invalid narrator lists cannot replace a working speaker',()=>{
 let disposed=0;const p={voice:{voiceURI:'uyut7:narrator',kind:'local-server',lang:'ru-RU'},speak(){return {cancel(){},setRate(){}}},dispose(){disposed++;}},s=createSpeechController({windowRef:{}});s.setLocalSpeakers([p]);
 for(const value of [[p,p],[{...p,voice:{voiceURI:'untrusted'}}],[{voice:p.voice}]])assert.throws(()=>s.setLocalSpeakers(value),/SPEECH_SETTINGS_INVALID/);
 assert.equal(disposed,0);assert.equal(s.voices().length,1);s.dispose();assert.equal(disposed,1);
});
