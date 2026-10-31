import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inspectAsrWav} from './wav.mjs';

const lock=JSON.parse(await fs.readFile(new URL('./asr-lock.json',import.meta.url),'utf8'));
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}

// Explicit personal Windows provider. The trusted, locally built recognizer
// receives audio through stdin. This is not the Docker isolation boundary.
export async function createWindowsAsr({buildDirectory,modelDirectory}={}){
 if(process.platform!=='win32')throw Error('ASR_WINDOWS_REQUIRED');
 const build=await fs.realpath(buildDirectory),models=await fs.realpath(modelDirectory);
 const record=JSON.parse((await fs.readFile(path.join(build,'WINDOWS_ASR_BUILD.json'),'utf8')).replace(/^\uFEFF/,''));
 if(record.version!==lock.version||record.sourceArchiveSha256!==lock.sourceSha256||record.curl!==false||record.sharedLibraries!==false||record.target!=='windows-x64-cpu'||!/^[a-f0-9]{64}$/.test(record.binarySha256||''))throw Error('ASR_WINDOWS_BUILD_REQUIRED');
 const exe=path.join(build,'whisper-cli.exe'),stat=await fs.lstat(exe);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32000000||await hash(exe)!==record.binarySha256)throw Error('ASR_BINARY_INTEGRITY');
 const names=await fs.readdir(models);
 if(names.length!==2||names.some(n=>![lock.model.file,lock.vad.file].includes(n)))throw Error('ASR_MODEL_DIRECTORY');
 for(const m of [lock.model,lock.vad]){const file=path.join(models,m.file),s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size!==m.bytes||await hash(file)!==m.sha256)throw Error('ASR_MODEL_INTEGRITY');}
 const descriptor=()=>({engine:lock.engine,version:lock.version,model:lock.model.name,modelSha256:lock.model.sha256,vadSha256:lock.vad.sha256,local:true,audioPersisted:false,provider:'windows-cpu',isolation:'trusted-local-process',hardMemoryLimit:false});
 let busy=false;
 return Object.freeze({descriptor,busy:()=>busy,
  async transcribe(bytes,language,{signal}={}){
   if(!['ru','en'].includes(language))throw Error('ASR_LANGUAGE');
   const info=inspectAsrWav(bytes);
   if(signal?.aborted)throw Error('ASR_CANCELLED');
   if(busy)throw Error('ASR_BUSY');
   if(info.rms<0.0003)return{...descriptor(),language,text:'',speech:false,elapsedMs:0};
   busy=true;const began=Date.now();
   try{
    if(await hash(exe)!==record.binarySha256)throw Error('ASR_BINARY_INTEGRITY');
    const result=await new Promise((resolve,reject)=>{
     const env={SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,PATH:path.join(process.env.SystemRoot,'System32'),OMP_NUM_THREADS:'4'};
     // With stdin, v1.9.5 treats the default output basename "-" as CON on
     // Windows and disables the stdout callback. A fixed basename restores
     // the callback; no --output-* flag is enabled, so no file is created.
     const child=spawn(exe,['-m',path.join(models,lock.model.file),'-f','-','-of','nexus-memory','-l',language,'-nt','-np','-t','4','--vad','--vad-model',path.join(models,lock.vad.file)],{cwd:build,env,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
     const chunks=[];let size=0,reason=null,done=false;
     const stop=why=>{reason??=why;child.kill();};
     const abort=()=>stop('ASR_CANCELLED'),timer=setTimeout(()=>stop('ASR_TIMEOUT'),90000);
     signal?.addEventListener('abort',abort,{once:true});
     child.stdout.on('data',b=>{size+=b.length;if(size>65536)stop('ASR_OUTPUT_LIMIT');else chunks.push(b);});
     child.stderr.on('data',b=>{size+=b.length;if(size>65536)stop('ASR_OUTPUT_LIMIT');});
     child.stdin.on('error',()=>{});child.stdin.end(bytes);
     const clean=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
     child.on('error',()=>{clean();if(!done){done=true;reject(Error('ASR_ENGINE_FAILED'));}});
     child.on('close',code=>{clean();if(done)return;done=true;reason?reject(Error(reason)):code!==0?reject(Error('ASR_ENGINE_FAILED')):resolve(Buffer.concat(chunks).toString('utf8'));});
     if(signal?.aborted)abort();
    });
    if(signal?.aborted)throw Error('ASR_CANCELLED');
    const text=result.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'').trim();
    if(text.length>1500)throw Error('ASR_TRANSCRIPT_LIMIT');
    return{...descriptor(),language,text,speech:!!text,elapsedMs:Date.now()-began,cleaned:true,policy:{audioInput:'stdin-memory',threads:4,wallLimitMs:90000,remoteUrlArguments:false,curlCompiled:false,ambientCredentialsForwarded:false,hardMemoryLimit:false,networkNamespace:false}};
   }finally{busy=false;}
  }
 });
}
