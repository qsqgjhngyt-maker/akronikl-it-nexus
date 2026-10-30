import {readFile,writeFile,mkdir,access} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),task=path.dirname(root),dir=path.join(root,'private/teacher6');
try{await access(dir);throw Error('REFUSE_TEACHER6_OVERWRITE');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(path.join(dir,'wav'),{recursive:true});
const prompts=JSON.parse(await readFile(path.join(root,'teacher6-prompts.json'),'utf8'));if(prompts.length!==32||prompts.some(t=>t.length>240))throw Error('PROMPTS_INVALID');
const {createLocalSpeechProvider}=await import(pathToFileURL(path.join(task,'feature/tools/qa-akronikl/local-speech.mjs')));
const config=JSON.parse(await readFile(path.join(task,'state-only-round-20261029/private/speech-config.json'),'utf8'));
const provider=createLocalSpeechProvider({...config,fastMode:true,privateDirectory:dir});
const proof={status:'RUNNING',cloudCalls:0,modelDownloads:0,voiceMode:'speaker-only greedy; one fixed reference',planned:32,generated:0,rows:[],humanAccepted:false};
const save=()=>writeFile(path.join(root,'evidence/TEACHER6_GENERATION.json'),JSON.stringify(proof,null,2)+'\n'),deadline=Date.now()+20*60000;
try{await provider.warmup();for(let i=0;i<prompts.length;i++){
 if(Date.now()>deadline)throw Error('TEACHER_DEADLINE');const prompt=prompts[i],at=performance.now(),r=await provider.synthesize(prompt,{signal:AbortSignal.timeout(75000)}),id='teacher6-'+String(i).padStart(2,'0'),file=path.join(dir,'wav',id+'.wav');
 await writeFile(file,r.audio,{flag:'wx'});proof.rows.push({id,text:prompt,qwenPrompt:prompt,file,wavSha256:createHash('sha256').update(r.audio).digest('hex'),duration:r.duration,sampleRate:r.sampleRate,split:i%4===3?'control':'train',ms:performance.now()-at});proof.generated++;await save();console.log(JSON.stringify({generated:proof.generated,planned:32,ms:proof.rows.at(-1).ms}));
 }proof.status='GENERATED_NOT_HUMAN_OR_ASR_VERIFIED';}
catch(e){proof.status='FAIL';proof.failure=String(e.stack??e);process.exitCode=1;}
finally{await provider.close();proof.afterClose=provider.status();await save();console.log(JSON.stringify({status:proof.status,generated:proof.generated}));}
