import test from 'node:test';import assert from 'node:assert/strict';
import {createSpeechController} from '../akronikl/experience/speech.js';
import {createSpeechFocus} from '../akronikl/experience/speech-focus.js';
function player(windowRef){const jobs=[],preparations=[],s=createSpeechController({windowRef});s.setLocalSpeaker({voice:{voiceURI:'kitsune:piper-uyut7',kind:'local-browser',lang:'ru-RU'},speak(text,events){const job={text,events,cancelled:false,cancel(){this.cancelled=true;},setRate(){}};jobs.push(job);return job;},prepare(text){const p={text,cancelled:false,cancel(){this.cancelled=true;}};preparations.push(p);return p;},dispose(){}});s.configure({auto:true,voiceURI:'kitsune:piper-uyut7',rate:1});s.arm();return {s,jobs,preparations};}
test('new auto speech stops another controller, its lookahead and late end callbacks in one window',()=>{
 const win={},a=player(win),b=player(win);a.s.auto('Длинная первая фраза. '.repeat(25));const previous=a.jobs[0];previous.events.onstart();assert.equal(a.preparations.length,1);
 b.s.auto('Новый ответ.');assert.equal(previous.cancelled,true);assert.equal(a.preparations[0].cancelled,true);assert.equal(a.s.snapshot().state,'idle');previous.events.onend();assert.equal(a.jobs.length,1);
 a.s.dispose();assert.equal(b.jobs[0].cancelled,false);b.jobs[0].events.onstart();b.jobs[0].events.onend();assert.equal(b.s.snapshot().state,'idle');b.s.dispose();
});
function channels(){const all=[],queue=[],payloads=[];class Channel{constructor(name){this.name=name;this.closed=false;all.push(this);}postMessage(data){payloads.push(structuredClone(data));for(const c of all)if(c!==this&&!c.closed&&c.name===this.name)queue.push(()=>c.onmessage?.({data:structuredClone(data)}));}close(){this.closed=true;}}
 return {Channel,payloads,flush(){while(queue.length)queue.shift()();},get open(){return all.filter(c=>!c.closed).length;}};}
test('claims in different tabs converge on one owner and publish no user or account material',()=>{
 const bus=channels(),a=player({BroadcastChannel:bus.Channel}),b=player({BroadcastChannel:bus.Channel});a.s.auto('PRIVATE_A');b.s.auto('PRIVATE_B');bus.flush();assert.equal([a.jobs[0],b.jobs[0]].filter(j=>!j.cancelled).length,1);
 assert.ok(bus.payloads.length>=2);for(const p of bus.payloads){assert.deepEqual(Object.keys(p).sort(),['clock','id','type']);assert.equal(p.type,'claim');assert.doesNotMatch(JSON.stringify(p),/PRIVATE|account|text|audio/i);}
 a.s.dispose();b.s.dispose();assert.equal(bus.open,0);
});
test('a delayed older claim cannot stop newer playback; malformed messages and closed clients cannot acquire it',()=>{
 const bus=channels(),lost=[];const a=createSpeechFocus({windowRef:{BroadcastChannel:bus.Channel},onLost:()=>lost.push('a')}),b=createSpeechFocus({windowRef:{BroadcastChannel:bus.Channel},onLost:()=>lost.push('b')});a.claim();b.claim();b.release();b.claim();bus.flush();assert.ok(lost.includes('a'));assert.equal(lost.includes('b'),false);
 b.dispose();const count=bus.payloads.length;b.claim();assert.equal(bus.payloads.length,count);a.dispose();assert.equal(bus.open,0);
});
