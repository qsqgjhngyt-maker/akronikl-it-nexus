import test from 'node:test';import assert from 'node:assert/strict';
import {learningProgress,progressText,startupGreeting,createLearningProgressReader} from '../akronikl/learning/progress.js';import {prepareStartupGreeting} from '../akronikl/experience/startup-greeting.js';import {cloudPreferences} from '../akronikl/connections/preferences.js';import {PIPER_NARRATOR} from '../akronikl/experience/piper-voice.js';
const course={curriculum:{sections:[{lessonIds:['cpp.one','cpp.two','cpp.three']}],lessons:[{id:'cpp.three',title:{ru:'Третья',en:'Third'}},{id:'cpp.one',title:{ru:'Первая',en:'First'}},{id:'cpp.two',title:{ru:'Вторая',en:'Second'}}]}};
test('learning summary uses current curriculum, counts true completion marks and exposes no code or invented grade',()=>{
 const p=learningProgress({course,state:{courses:{cpp:{lessons:{'cpp.one':{completed:true,code:'PRIVATE_CODE'},'cpp.two':{completed:'true'},'cpp.unknown':{completed:true}}}}},resume:{lesson:{id:'cpp.two'}}});assert.equal(p.done,1);assert.equal(p.total,3);assert.equal(p.next.id,'cpp.two');assert.equal(p.last.title,'Вторая');assert.equal(p.completionEvidence,'user-marked-complete');assert.doesNotMatch(JSON.stringify(p),/PRIVATE_CODE|unknown|grade|mastery/);assert.match(progressText(p),/не подтверждают проверку знаний/);assert.match(startupGreeting(p),/Вторая/);assert.equal(learningProgress({course:{}}),null);
});
test('progress reader rejects a delayed result after account switch without reading old account state',async()=>{
 let identity={accountId:'A'},resolve,reads=0;const reader=createLearningProgressReader({readIdentity:()=>identity,loadCourse:()=>new Promise(r=>resolve=r),readState:()=>{reads++;return{};}});const task=reader();identity={accountId:'B'};resolve(course);assert.equal(await task,null);assert.equal(reads,0);
});
function fixture(patch={},options={}){
 const win=new EventTarget(),doc=new EventTarget();win.CustomEvent=class extends Event{constructor(type,{detail}){super(type);this.detail=detail;}};doc.hidden=false;let identity={accountId:'synthetic-A'},capabilities=0,progress=0,created=0,disposed=0,settings=null;const texts=[],prefs=cloudPreferences({...cloudPreferences(),speech:{auto:true,greeting:true,voiceURI:PIPER_NARRATOR.voiceURI,rate:1},...patch});
 const broker={loadState:async()=>({revision:1,value:prefs}),capabilities:async()=>{capabilities++;return {localSpeechVoice:PIPER_NARRATOR}},localSpeakers:()=>[]};
 const args={readIdentity:()=>identity,readLearningProgress:async()=>{progress++;return learningProgress({course,state:{courses:{cpp:{lessons:{'cpp.one':{completed:true}}}}}})},windowRef:win,documentRef:doc,broker,onPreferences:p=>settings=p,createSpeech:({onChange})=>{created++;return {setLocalSpeakers(){},configure(){},arm(){},snapshot:()=>({available:true}),read(text){texts.push(text);onChange({state:options.blocked?'error':'speaking'});},dispose(){disposed++;}};}};
 return {args,win,doc,texts,switchAccount(){identity={accountId:'synthetic-B'}},counts:()=>({capabilities,progress,created,disposed}),get settings(){return settings;}};
}
test('startup greeting uses saved voice/progress, has no AI connection, stops on account invalidation',async()=>{
 const f=fixture(),job=await prepareStartupGreeting(f.args);assert.equal(f.texts.length,1);assert.match(f.texts[0],/Вторая/);assert.deepEqual(f.counts(),{capabilities:1,progress:1,created:1,disposed:0});f.win.dispatchEvent(new Event('nexus:session-ended'));assert.equal(f.counts().disposed,1);job.dispose();assert.equal(f.counts().disposed,1);
});
test('auto off or greeting off never loads a voice or progress; disabled progress stays private',async()=>{
 for(const speech of [{auto:false,greeting:true,voiceURI:'',rate:1},{auto:true,greeting:false,voiceURI:'',rate:1}]){const f=fixture({speech});assert.equal(await prepareStartupGreeting(f.args),null);assert.equal(f.counts().created,0);assert.equal(f.counts().capabilities,0);assert.equal(f.counts().progress,0);assert.ok(f.settings);}
 const f=fixture({learningProgress:false});const job=await prepareStartupGreeting(f.args);assert.equal(f.counts().progress,0);assert.doesNotMatch(f.texts[0],/Вторая|пройден/);job.dispose();
});
test('hidden window and an account switch during preference load cannot speak or read progress',async()=>{
 const f=fixture();let release;f.args.broker.loadState=()=>new Promise(r=>release=r);const task=prepareStartupGreeting(f.args);f.switchAccount();release({value:cloudPreferences()});assert.equal(await task,null);assert.equal(f.counts().created,0);const hidden=fixture();hidden.doc.hidden=true;assert.equal(await prepareStartupGreeting(hidden.args),null);assert.equal(hidden.counts().created,0);
});
test('old speech settings migrate safely; malformed greeting and motion preferences reject',()=>{
 assert.equal(cloudPreferences().speech.auto,false);assert.equal(cloudPreferences().speech.greeting,true);for(const patch of [{speech:{auto:true,greeting:'yes',voiceURI:'',rate:1}},{assistantPresenceMotion:'yes'},{learningProgress:'yes'}])assert.throws(()=>cloudPreferences({...cloudPreferences(),...patch}));
});
test('opening the chat while greeting preferences or capabilities are pending prevents late speech creation',async()=>{
 for(const stage of ['preferences','capabilities']){
  const f=fixture(),control=new AbortController();let release;f.args.signal=control.signal;
  if(stage==='preferences')f.args.broker.loadState=()=>new Promise(r=>release=()=>r({value:f.settings??cloudPreferences({...cloudPreferences(),speech:{auto:true,greeting:true,voiceURI:PIPER_NARRATOR.voiceURI,rate:1}})}));
  else f.args.broker.capabilities=()=>new Promise(r=>release=()=>r({localSpeechVoice:PIPER_NARRATOR}));
  const task=prepareStartupGreeting(f.args);for(let i=0;i<5&&!release;i++)await Promise.resolve();assert.equal(typeof release,'function');control.abort();release();assert.equal(await task,null);assert.equal(f.counts().created,0);assert.deepEqual(f.texts,[]);
 }
});
test('route changes during greeting preparation suppress it and abort stops an already created greeting',async()=>{
 const f=fixture();f.win.location={hash:'#first'};let release;f.args.readLearningProgress=()=>new Promise(r=>release=r);const task=prepareStartupGreeting(f.args);for(let i=0;i<8&&!release;i++)await Promise.resolve();f.win.location.hash='#next';release(null);assert.equal(await task,null);assert.equal(f.counts().created,0);
 const ready=fixture(),control=new AbortController();ready.args.signal=control.signal;const greeting=await prepareStartupGreeting(ready.args);assert.equal(ready.counts().created,1);control.abort();assert.equal(ready.counts().disposed,1);greeting.dispose();assert.equal(ready.counts().disposed,1);
});
