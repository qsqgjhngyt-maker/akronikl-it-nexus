// Explicit live QA only: saved-key probe + one short Qwen reply, no retries.
// Keeps this same isolated stand/connection open after recording the result.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';
import {serveLocalStand} from './serve-local-stand.mjs';
import {PIPER_NARRATOR} from '../../akronikl/experience/piper-voice.js';
const config=JSON.parse(await readFile(process.argv[2],'utf8')),out=path.resolve(process.argv[3]);
const modelSha='2634b701f18eba89d0f80ee2eeae48543a80610a63301c1e9794853e0ab2dca4';
assert.equal(config.mode,'isolated-qwen-test');assert.equal(config.cloudConfig?.enabled,true);
assert.equal(config.speechConfig?.engine,'piper-browser');assert.equal(config.speechConfig?.voice,'uyut7');
assert.equal(PIPER_NARRATOR.modelId,'ru_RU-uyut7-pilot5-medium');
const modelPath='models/'+PIPER_NARRATOR.modelId+'.onnx';
assert.equal(createHash('sha256').update(await readFile(path.join(config.speechConfig.assetsDirectory,modelPath))).digest('hex'),modelSha);
const budgetFile=path.join(config.privateDir,'qwen-test-budget-v1.json'),before=JSON.parse(await readFile(budgetFile,'utf8'));
assert.ok(before.requests<=before.limits.maxRequests-2,'Two live calls must remain; never reset the budget');
await mkdir(out,{recursive:true});try{await access(path.join(out,'RESULT.json'));throw Error('REFUSE_LIVE_PROOF_OVERWRITE');}catch(e){if(e.code!=='ENOENT')throw e;}
const result={status:'RUNNING',sourceSha:config.sourceSha,voiceModel:PIPER_NARRATOR.modelId,voiceSha256:modelSha,syntheticAnswers:false,syntheticSpeech:false,plannedUpstreamCalls:2,checks:[],budgetBefore:before};
let live,s,page,capture=true;const outcomes=[];const save=()=>writeFile(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n');await save();
async function step(name,fn){const at=performance.now();await fn();result.checks.push({name,status:'PASS',ms:performance.now()-at});await save();console.log('PASS '+name);}
const settings=async tab=>{await page.locator('[data-akronikl-settings]').click();await page.getByRole('button',{name:tab,exact:true}).click();};
const back=()=>page.getByRole('button',{name:'Вернуться к разговору',exact:true}).click();
try{
 live=await serveLocalStand({...config,onOutcome:r=>{if(capture)outcomes.push(r);}});s=live.stand;page=s.page;result.control=live.origin;
 await page.evaluate(()=>{
  window.qaCapture=true;window.qaWorkers=[];window.qaAudio=[];window.qaOriginalWorker=Worker;window.qaOriginalAudio=Audio;
  window.Worker=class extends qaOriginalWorker{constructor(...args){super(...args);const row={url:String(args[0]),messages:[],results:[]};this.qaRow=row;qaWorkers.push(row);this.addEventListener('message',({data})=>{if(qaCapture)row.results.push({...data,audio:data.audio?.slice(0)});});}postMessage(...args){if(qaCapture)this.qaRow.messages.push(args[0]);return super.postMessage(...args);}};
  window.Audio=class extends qaOriginalAudio{constructor(...args){super(...args);if(!qaCapture)return;const row={events:[]};qaAudio.push(row);for(const event of ['playing','ended','error'])this.addEventListener(event,()=>{if(qaCapture)row.events.push({event,at:performance.now(),duration:this.duration});});}};
 });
 await step('Existing Nexus account/history loaded; exact accepted Piper warms without a cloud call',async()=>{
  await page.locator('[data-akronikl-open]').first().click();await page.waitForFunction(()=>document.querySelector('.ak-settings-section')?.inert===false);
  result.existingMessageCount=await page.locator('[data-ak-message]').count();
  await page.waitForFunction(()=>qaWorkers.some(w=>w.results.some(r=>r.ready===true)),null,{timeout:120000});
  result.warmup=await page.evaluate(()=>qaWorkers.flatMap(w=>w.results).find(r=>r.ready===true));assert.equal(result.warmup.model,PIPER_NARRATOR.modelId);
  const delivery=s.fixture.network.find(r=>r.path==='/akronikl/vendor/piper/'+modelPath&&r.status===200);assert.ok(delivery,'New real profile must receive version5 weights');assert.equal(delivery.assetSha256,modelSha);result.actualModelDelivery={sha256:delivery.assetSha256,bytes:delivery.assetBytes};
  assert.equal(s.status().budget.requests,before.requests);
 });
 await step('Select accepted Piper and enable automatic reading in this account',async()=>{
  await settings('Голос');await page.locator('[data-ak-speech-voice]').selectOption(PIPER_NARRATOR.voiceURI);await page.locator('[data-ak-speech-auto]').check();await back();
 });
 await step('Connect Qwen3.8 using the existing encrypted saved key; password field stays empty',async()=>{
  await settings('Модель');await page.locator('[data-akronikl-model-profile]').selectOption('external');await page.locator('[data-ak-cloud-provider]').selectOption('qwen');
  await page.locator('[data-ak-cloud-model]').fill('qwen3.8-flash');await page.locator('[data-ak-cloud-model]').dispatchEvent('change');
  const advanced=page.locator('[data-ak-cloud-fields] details');await advanced.evaluate(n=>n.open=true);
  await page.locator('[data-ak-cloud-region]').selectOption('singapore');await page.locator('[data-ak-cloud-workspace]').fill('');await page.locator('[data-ak-cloud-workspace]').dispatchEvent('change');
  await page.waitForFunction(()=>document.querySelector('[data-ak-cloud-forget]')?.hidden===false);assert.equal(await page.locator('[data-ak-cloud-key]').inputValue(),'');
  assert.equal(await page.locator('[data-ak-cloud-key]').getAttribute('type'),'password');await page.waitForFunction(()=>document.querySelector('[data-ak-cloud-connect]')?.disabled===false);
  await page.locator('[data-ak-cloud-connect]').click();await page.waitForFunction(()=>document.querySelector('[data-connection-phase="connected"]'),null,{timeout:60000});
  assert.equal(s.status().budget.requests,before.requests+1);assert.equal(await page.locator('[data-ak-cloud-key]').inputValue(),'');await back();
 });
 await step('One genuine Qwen answer triggers genuine new Piper synthesis and automatic playback',async()=>{
  await page.locator('[data-ak-chat-new]').click();const question='Когда закрывается файл локального std::ofstream? Ответь одним коротким предложением.';
  const count=await page.locator('[data-ak-message=assistant]').count(),start=await page.evaluate(()=>performance.now()),audioCount=await page.evaluate(()=>qaAudio.length);
  await page.locator('[data-akronikl-message]').fill(question);await page.locator('[data-akronikl-send]').click();
  await page.waitForFunction(n=>document.querySelectorAll('[data-ak-message=assistant]').length>n&&document.querySelector('.ak-composer')?.getAttribute('aria-busy')==='false',count,{timeout:60000});
  const textAt=await page.evaluate(()=>performance.now()),last=page.locator('[data-ak-message=assistant]').last(),answer=await last.locator('.ak-message-text').innerText();
  assert.equal(await last.getAttribute('data-tutor-generated'),'true');assert.ok(answer.trim());assert.equal(s.status().budget.requests,before.requests+2);
  result.dialogue={question,answer,textReadyMs:textAt-start};await save();
  await page.waitForFunction(n=>qaAudio.slice(n).some(a=>a.events.some(e=>e.event==='playing')),audioCount,{timeout:120000});
  const first=await page.evaluate(n=>qaAudio.slice(n).flatMap(a=>a.events).find(e=>e.event==='playing'),audioCount);result.dialogue.firstSpeechMs=first.at-start;result.dialogue.speechAfterTextMs=first.at-textAt;
  await page.waitForFunction(()=>document.querySelector('[data-ak-speech-stop]')?.disabled===true,null,{timeout:120000});
  result.dialogue.audioEvents=await page.evaluate(n=>qaAudio.slice(n),audioCount);assert.ok(result.dialogue.audioEvents.length);assert.ok(result.dialogue.audioEvents.every(a=>a.events.some(e=>e.event==='ended')&&!a.events.some(e=>e.event==='error')));
  const packets=await page.evaluate(()=>qaWorkers.flatMap(w=>w.results.filter(r=>r.audio).map(r=>{const text=w.messages.find(m=>m.id===r.id)?.text;let binary='';const bytes=new Uint8Array(r.audio);for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return{text,textSha256:r.textSha256,synthesisMs:r.synthesisMs,audio:btoa(binary)};})));
  assert.ok(packets.length);assert.equal(packets.map(p=>p.text).join('').replace(/\s+/gu,' ').trim(),answer.replace(/\s+/gu,' ').trim());result.dialogue.chunks=[];
  for(const packet of packets){const bytes=Buffer.from(packet.audio,'base64'),file='QWEN_REPLY_CHUNK_'+(result.dialogue.chunks.length+1)+'.wav';await writeFile(path.join(out,file),bytes,{flag:'wx'});delete packet.audio;result.dialogue.chunks.push({...packet,file,wavSha256:createHash('sha256').update(bytes).digest('hex')});}
 });
 await step('Preferences and this dialogue are saved; same connection remains ready without another probe',async()=>{
  await page.waitForFunction(()=>document.querySelector('[data-ak-state-sync]')?.dataset.state==='saved');
  const persisted=await page.evaluate(async expected=>{const identity=(await import('/core/account-storage.js')).verifiedAccount().accountId,headers={'x-nexus-account-expectation':identity};const read=async p=>{const r=await fetch('/api/akronikl/cloud/'+p,{credentials:'same-origin',cache:'no-store',headers});return{status:r.status,data:await r.json()};};const p=await read('preferences'),c=await read('chats');const contains=(v,s)=>typeof v==='string'?v.includes(s):v&&typeof v==='object'?Object.values(v).some(x=>contains(x,s)):false;return{preferencesStatus:p.status,preferencesRevision:p.data.revision,voiceURI:p.data.value?.speech?.voiceURI,auto:p.data.value?.speech?.auto,chatsStatus:c.status,chatsRevision:c.data.revision,questionSaved:contains(c.data,expected.question),answerSaved:contains(c.data,expected.answer)};},result.dialogue);
  assert.equal(persisted.preferencesStatus,200);assert.equal(persisted.chatsStatus,200);assert.equal(persisted.voiceURI,PIPER_NARRATOR.voiceURI);assert.equal(persisted.auto,true);assert.equal(persisted.questionSaved,true);assert.equal(persisted.answerSaved,true);result.persistence=persisted;
  assert.ok(await page.locator('[data-connection-phase="connected"]').count());assert.equal(s.status().budget.requests,before.requests+2);await page.screenshot({path:path.join(out,'DIALOGUE.png')});
 });
 result.status='REAL_QWEN38_AND_ACCEPTED_PIPER5_AUTO_SPEECH_PASS';
}catch(e){result.status='FAIL';result.failure=String(e.stack??e).slice(0,8000);await page?.screenshot({path:path.join(out,'FAILURE.png')}).catch(()=>{});}
finally{
 capture=false;result.outcomes=outcomes;result.stand=s?.status();result.budgetAfter=s?.status().budget;result.finishedAt=new Date().toISOString();
 await page?.evaluate(()=>{window.qaCapture=false;window.Worker=qaOriginalWorker;window.Audio=qaOriginalAudio;window.qaWorkers=[];window.qaAudio=[];}).catch(()=>{});
 await save();console.log(JSON.stringify({status:result.status,control:live?.origin,budget:result.budgetAfter,dialogue:result.dialogue}));
}
