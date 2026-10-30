import test from 'node:test';import assert from 'node:assert/strict';
import {createCloudSettingsBroker} from '../akronikl/tutor/cloud-settings-broker.js';
import {NARRATOR} from '../akronikl/experience/local-speaker.js';
import {PIPER_NARRATOR} from '../akronikl/experience/piper-voice.js';
const broker=value=>createCloudSettingsBroker({origin:'http://127.0.0.1:23456',windowRef:{Audio:class{},Worker:class{terminate(){}}},fetchResource:async()=>Response.json({available:true,stateAvailable:true,localSpeechVoice:PIPER_NARRATOR,...value})});
test('capabilities expose both fixed voices and preserve legacy single-voice responses',async()=>{
 const b=broker({localSpeechVoices:[PIPER_NARRATOR,NARRATOR]});const c=await b.capabilities();assert.equal(c.localSpeechVoice,PIPER_NARRATOR);assert.deepEqual(c.localSpeechVoices,[PIPER_NARRATOR,NARRATOR]);
 const speakers=b.localSpeakers();assert.deepEqual(speakers.map(s=>s.voice.voiceURI),[PIPER_NARRATOR.voiceURI,NARRATOR.voiceURI]);for(const s of speakers)s.dispose();
 const legacy=broker({});assert.deepEqual((await legacy.capabilities()).localSpeechVoices,[PIPER_NARRATOR]);
});
test('duplicate, mismatched and arbitrary remote voice descriptions fail closed',async()=>{
 for(const value of [{localSpeechVoices:[PIPER_NARRATOR,PIPER_NARRATOR]},{localSpeechVoices:[NARRATOR]},{localSpeechVoices:[{...PIPER_NARRATOR,kind:'local-server'}]},{localSpeechVoices:[{...NARRATOR,voiceURI:'https://untrusted.invalid/model'}]}])await assert.rejects(broker(value).capabilities(),/CLOUD_RESPONSE_INVALID/);
});
