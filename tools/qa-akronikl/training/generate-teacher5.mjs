// Genuine local synthesis in the exact previously accepted fast-speaker mode.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const root=process.cwd(),directory=path.join(root,'private/teacher5'),proof='evidence/TEACHER5_GENERATION.json';
try{await access(directory);throw Error('REFUSE_TEACHER_CORPUS_OVERWRITE');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(path.join(directory,'wav'),{recursive:true});
const source=JSON.parse(await readFile('evidence/SOURCE_candidate-77.json','utf8')),prompts=JSON.parse(await readFile('teacher5-prompts.json','utf8'));
if(prompts.length!==32||prompts.some(x=>typeof x!=='string'||x.length>130||x.length<30))throw Error('TEACHER_PROMPT_BOUNDS');
const {createLocalSpeechProvider}=await import(pathToFileURL(path.join(source.qa,'tools/qa-akronikl/local-speech.mjs')));
const config=JSON.parse(await readFile('../state-only-round-20261029/private/speech-config.json','utf8'));
const state={status:'LOADING_LOCAL_TEACHER',cloudCalls:0,downloads:0,mode:'accepted fast-speaker: speaker-only plus greedy-codes',sourceSha:source.sourceSha,acceptedReference:'evidence/ORIGINAL_APPROVED_FAST_KITSUNE.wav',plannedRequests:32,generated:0,samples:[],startedAt:new Date().toISOString(),asrVerified:false,qualityAccepted:false};
const save=()=>writeFile(proof,JSON.stringify(state,null,2)+'\n');await save();
const provider=createLocalSpeechProvider({...config,fastMode:true,referenceFile:path.join(source.qa,'akronikl/experience/voices/uyut7-narrator.wav'),privateDirectory:directory});
const rows=[],deadline=Date.now()+20*60000;
try{
 await provider.warmup();state.status='GENERATING_APPROVED_STYLE_LOCAL_AUDIO';state.warmup=provider.status().loadTimings;await save();
 for(let i=0;i<prompts.length;i++){
  if(Date.now()>deadline)throw Error('TEACHER_GENERATION_DEADLINE');
  const text=prompts[i],at=performance.now(),r=await provider.synthesize(text,{signal:AbortSignal.timeout(60000)}),sha=createHash('sha256').update(r.audio).digest('hex');
  const id='teacher-'+String(i).padStart(2,'0'),file=path.join(directory,'wav',id+'.wav');await writeFile(file,r.audio,{flag:'wx'});
  rows.push({id,text,textSha256:r.textSha256,wavSha256:sha,file,duration:r.duration,sampleRate:r.sampleRate,codecFrames:r.codecFrames,split:i%8===7?'control':'train'});
  state.samples.push({id,textSha256:r.textSha256,wavSha256:sha,duration:r.duration,wallMs:performance.now()-at,split:rows.at(-1).split});state.generated=rows.length;
  await writeFile(path.join(directory,'PRIVATE_MANIFEST.json'),JSON.stringify(rows,null,2)+'\n');await save();console.log(JSON.stringify({generated:rows.length,planned:32,duration:r.duration}));
 }
 state.status='LOCAL_TEACHER_GENERATION_FINISHED_NOT_ASR_OR_HUMAN_VERIFIED';
}catch(e){state.status='FAIL';state.failure=String(e);process.exitCode=1;}
finally{state.beforeClose=provider.status();await provider.close().catch(e=>{state.cleanupError=String(e);state.status='FAIL';process.exitCode=1;});state.afterClose=provider.status();state.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:state.status,generated:state.generated,cloudCalls:0}));}
