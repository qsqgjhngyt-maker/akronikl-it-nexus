import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {NARRATOR} from '../../akronikl/experience/local-speaker.js';export {NARRATOR};
const transcript='За лесом медленно поднималось солнце. Дом слушал тишину, и в этой тишине рождалась новая надежда.';
export function createLocalSpeechProvider({python,modelDirectory,referenceFile,privateDirectory,spawnProcess=spawn,timeoutMs=180000}={}){
 for(const value of [python,modelDirectory,referenceFile,privateDirectory])if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0'))throw Error('SPEECH_CONFIG_INVALID');
 let child=null,ready=null,readyResolve,readyReject,job=null,buffer='',busy=false,closed=false,stopping=null,cleanupFailed=false,waiter=null;
 const counts={processStarts:0,requests:0,generated:0,cancelled:0,externalModelCalls:0,downloads:0};
 function fail(code){readyReject?.(Error(code));if(job){job.reject(Error(code));job=null;}}
 async function stop(){if(stopping)return stopping;const old=child;child=null;ready=null;buffer='';if(!old)return;stopping=new Promise((resolve,reject)=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};const timer=setTimeout(()=>{done=true;cleanupFailed=true;reject(Error('SPEECH_CLEANUP_FAILED'));},5000);if(old.exitCode!==null||old.signalCode)finish();else{old.once('close',finish);old.kill();}}).finally(()=>stopping=null);return stopping;}
 function start(){
  if(ready)return ready;if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');
  ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const worker=fileURLToPath(new URL('./local-speech-worker.py',import.meta.url));
  const process=child=spawnProcess(python,['-u',worker,'--model-dir',modelDirectory,'--reference',referenceFile,'--reference-text',transcript],{windowsHide:true,stdio:['pipe','pipe','ignore'],env:{...globalThis.process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_DATASETS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',PYTHONDONTWRITEBYTECODE:'1',CUDA_CACHE_PATH:path.join(privateDirectory,'cuda-cache'),TORCH_EXTENSIONS_DIR:path.join(privateDirectory,'torch-cache')}});counts.processStarts++;
  process.once('error',()=>fail('SPEECH_UNAVAILABLE'));process.once('close',()=>{if(child===process){child=null;ready=null;fail('SPEECH_UNAVAILABLE');}});
  process.stdin.on('error',()=>{if(child===process){fail('SPEECH_UNAVAILABLE');void stop().catch(()=>{});}});
  process.stdout.on('data',chunk=>{if(child!==process)return;buffer+=chunk.toString('utf8');if(buffer.length>9000000){fail('SPEECH_AUDIO_INVALID');void stop().catch(()=>{});return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let message;try{message=JSON.parse(line);}catch{fail('SPEECH_AUDIO_INVALID');continue;}
   if(Object.hasOwn(message,'ready')){if(message.ready===true&&message.localOnly===true)readyResolve();else fail('SPEECH_UNAVAILABLE');continue;}
   if(!job||message.id!==job.id)continue;const active=job;job=null;
   if(message.code){active.reject(Error('SPEECH_SYNTHESIS_FAILED'));continue;}
   try{const wav=Buffer.from(message.audio,'base64');if(wav.length>6000000||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||!(message.duration>0)||!Number.isInteger(message.codecFrames)||message.codecFrames<1||message.codecFrames>=511)throw Error();counts.generated++;active.resolve({audio:wav,duration:message.duration,sampleRate:message.sampleRate,codecFrames:message.codecFrames});}catch{active.reject(Error('SPEECH_AUDIO_INVALID'));}
  }});
  return ready;
 }
 return Object.freeze({voice:NARRATOR,status:()=>({...counts,busy,resident:!!child,cleanupFailed}),
  async synthesize(text,{signal}={}){
   if(typeof text!=='string'||!text.trim()||text.length>240||text.includes('\0'))throw Error('SPEECH_REQUEST_INVALID');if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');signal?.throwIfAborted();
   // One bounded waiter lets Stop → Read wait for the old GPU process to drain.
   // It cannot cancel a different account's work and never queues unbounded audio.
   if(busy){if(waiter)throw Error('SPEECH_BUSY');await new Promise((resolve,reject)=>{let timer;const aborted=()=>finish(Error('SPEECH_CANCELLED'));const finish=error=>{clearTimeout(timer);signal?.removeEventListener('abort',aborted);waiter=null;error?reject(error):resolve();};waiter=finish;signal?.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>finish(Error('SPEECH_BUSY')),timeoutMs);});}
   if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');signal?.throwIfAborted();busy=true;counts.requests++;
   let timer,abort;const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
   const cancelled=new Promise((_,reject)=>{abort=()=>{counts.cancelled++;fail('SPEECH_CANCELLED');void stop().then(()=>reject(Error('SPEECH_CANCELLED')),reject);};combined.addEventListener('abort',abort,{once:true});});
   timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{return await Promise.race([(async()=>{if(stopping)await stopping;await start();combined.throwIfAborted();return new Promise((resolve,reject)=>{job={id:randomUUID(),resolve,reject};child.stdin.write(JSON.stringify({id:job.id,text})+'\n',error=>{if(error)fail('SPEECH_UNAVAILABLE');});});})(),cancelled]);}
   catch(error){await stop();throw error;}
   finally{clearTimeout(timer);combined.removeEventListener('abort',abort);busy=false;waiter?.();}
  },
  async close(){closed=true;waiter?.(Error('SPEECH_UNAVAILABLE'));fail('SPEECH_CANCELLED');await stop();}
 });
}
