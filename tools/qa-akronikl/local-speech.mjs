import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import {NARRATOR} from '../../akronikl/experience/local-speaker.js';export {NARRATOR};
const transcript='За лесом медленно поднималось солнце. Дом слушал тишину, и в этой тишине рождалась новая надежда.';
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
// ASCII JSON survives even a legacy Windows pipe; the worker also requires UTF-8.
export const speechWire=value=>JSON.stringify(value).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\n';
const timing=value=>Object.fromEntries(Object.entries(value??{}).filter(([k,v])=>['importsMs','modelLoadMs','referenceMs','totalMs','synthesisMs','codeGenerationMs'].includes(k)&&Number.isFinite(v)&&v>=0));
export function createLocalSpeechProvider({python,modelDirectory,referenceFile,privateDirectory,spawnProcess=spawn,timeoutMs=180000,cancelGraceMs=5000,fastMode=true}={}){
 for(const value of [python,modelDirectory,referenceFile,privateDirectory])if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0'))throw Error('SPEECH_CONFIG_INVALID');
 let child=null,ready=null,readyResolve,readyReject,job=null,buffer='',busy=false,closed=false,stopping=null,cleanupFailed=false,waiter=null,loaded=false,loadTimer=null,loadTimings=null,lastTimings=null;
 if(typeof fastMode!=='boolean')throw Error('SPEECH_CONFIG_INVALID');
 const counts={processStarts:0,requests:0,generated:0,cancelled:0,cooperativeCancels:0,forcedStops:0,externalModelCalls:0,downloads:0};
 function fail(code){readyReject?.(Error(code));if(job){const active=job;job=null;active.reject(Error(code));}}
 async function stop(code='SPEECH_UNAVAILABLE'){
  if(stopping)return stopping;const old=child;fail(code);child=null;ready=null;loaded=false;buffer='';clearTimeout(loadTimer);if(!old)return;
  stopping=new Promise((resolve,reject)=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};const timer=setTimeout(()=>{done=true;cleanupFailed=true;reject(Error('SPEECH_CLEANUP_FAILED'));},5000);if(old.exitCode!==null||old.signalCode)finish();else{old.once('close',finish);old.kill();}}).finally(()=>stopping=null);return stopping;
 }
 function start(){
  if(ready)return ready;if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');
  ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});void ready.catch(()=>{});
  const worker=fileURLToPath(new URL('./local-speech-worker.py',import.meta.url));
  const process=child=spawnProcess(python,['-u',worker,'--model-dir',modelDirectory,'--reference',referenceFile,'--reference-text',transcript,...(fastMode?['--speaker-only','--greedy-codes']:[])],{windowsHide:true,stdio:['pipe','pipe','ignore'],env:{...globalThis.process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_DATASETS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',PYTHONDONTWRITEBYTECODE:'1',OMP_NUM_THREADS:'2',MKL_NUM_THREADS:'2',CUDA_CACHE_PATH:path.join(privateDirectory,'cuda-cache'),TORCH_EXTENSIONS_DIR:path.join(privateDirectory,'torch-cache')}});counts.processStarts++;
  loadTimer=setTimeout(()=>{void stop().catch(()=>{});},timeoutMs);
  process.once('error',()=>fail('SPEECH_UNAVAILABLE'));process.once('close',()=>{if(child===process){clearTimeout(loadTimer);child=null;ready=null;loaded=false;fail('SPEECH_UNAVAILABLE');}});
  process.stdin.on('error',()=>{if(child===process){fail('SPEECH_UNAVAILABLE');void stop().catch(()=>{});}});
  process.stdout.on('data',chunk=>{
   if(child!==process)return;buffer+=chunk.toString('utf8');if(buffer.length>9000000){void stop('SPEECH_AUDIO_INVALID').catch(()=>{});return;}
   let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let message;try{message=JSON.parse(line);}catch{void stop('SPEECH_AUDIO_INVALID').catch(()=>{});continue;}
    if(Object.hasOwn(message,'ready')){clearTimeout(loadTimer);if(message.ready===true&&message.localOnly===true&&message.inputEncoding==='utf-8'&&message.protocolVersion===2){loaded=true;loadTimings=timing(message.timings);readyResolve();}else void stop().catch(()=>{});continue;}
    if(!job||message.id!==job.id)continue;const active=job;job=null;
    if(message.code){if(message.code==='SPEECH_CANCELLED')counts.cooperativeCancels++;active.reject(Error(message.code==='SPEECH_CANCELLED'?'SPEECH_CANCELLED':'SPEECH_SYNTHESIS_FAILED'));continue;}
    try{const wav=Buffer.from(message.audio,'base64');if(message.textSha256!==active.textHash||wav.length>6000000||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||!(message.duration>0)||!Number.isInteger(message.codecFrames)||message.codecFrames<1||message.codecFrames>=511)throw Error();counts.generated++;lastTimings=timing(message.timings);active.resolve({audio:wav,duration:message.duration,sampleRate:message.sampleRate,codecFrames:message.codecFrames,textSha256:message.textSha256,timings:lastTimings});}catch{active.reject(Error('SPEECH_AUDIO_INVALID'));}
   }
  });return ready;
 }
 return Object.freeze({voice:NARRATOR,status:()=>({...counts,busy,resident:!!child,warming:!!child&&!loaded,ready:loaded,cleanupFailed,fastMode,loadTimings,lastTimings}),
  async warmup(){if(stopping)await stopping;await start();return {ready:true,timings:loadTimings};},
  async synthesize(text,{signal}={}){
   if(typeof text!=='string'||!text.trim()||text.length>240||text.includes('\0'))throw Error('SPEECH_REQUEST_INVALID');if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');signal?.throwIfAborted();
   if(busy){if(waiter)throw Error('SPEECH_BUSY');await new Promise((resolve,reject)=>{let timer;const aborted=()=>finish(Error('SPEECH_CANCELLED'));const finish=error=>{clearTimeout(timer);signal?.removeEventListener('abort',aborted);waiter=null;error?reject(error):resolve();};waiter=finish;signal?.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>finish(Error('SPEECH_BUSY')),timeoutMs);});}
   if(closed||cleanupFailed)throw Error('SPEECH_UNAVAILABLE');signal?.throwIfAborted();busy=true;counts.requests++;
   let timer,abort,cancelTimer;const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
   const cancelledPromise=new Promise((_,reject)=>{abort=()=>{counts.cancelled++;if(!job){reject(Error('SPEECH_CANCELLED'));return;}try{child.stdin.write(speechWire({cancel:job.id}));}catch{void stop('SPEECH_CANCELLED').catch(()=>{});}cancelTimer=setTimeout(()=>{counts.forcedStops++;void stop('SPEECH_CANCELLED').then(()=>reject(Error('SPEECH_CANCELLED')),reject);},cancelGraceMs);};combined.addEventListener('abort',abort,{once:true});});
   timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{const result=await Promise.race([(async()=>{if(stopping)await stopping;await start();combined.throwIfAborted();return new Promise((resolve,reject)=>{const id=randomUUID(),textHash=hash(text);job={id,textHash,resolve,reject};child.stdin.write(speechWire({id,text,textSha256:textHash}),error=>{if(error)fail('SPEECH_UNAVAILABLE');});});})(),cancelledPromise]);combined.throwIfAborted();return result;}
   catch(error){if(combined.aborted||error.message==='SPEECH_CANCELLED')throw Error('SPEECH_CANCELLED');await stop();throw error;}
   finally{clearTimeout(timer);clearTimeout(cancelTimer);combined.removeEventListener('abort',abort);busy=false;waiter?.();}
  },
  async close(){closed=true;waiter?.(Error('SPEECH_UNAVAILABLE'));await stop('SPEECH_CANCELLED');}
 });
}
