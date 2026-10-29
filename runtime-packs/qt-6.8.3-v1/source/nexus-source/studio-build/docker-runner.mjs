import{spawn}from'node:child_process';
import{mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
import{randomBytes,createHash}from'node:crypto';
import{validateProjectWorkspace}from'../project-studio/project-transfer.js';
import{taskFlowApplicationTemplate}from'../project-studio/application-template.js';
export const BUILD_LIMITS=Object.freeze({timeoutMs:180000,logBytes:128*1024,artifactBytes:64*1024*1024,totalArtifactBytes:96*1024*1024,memory:'2g',cpus:'2',pids:128});
const hash=b=>createHash('sha256').update(b).digest('hex');
const failure=code=>Object.assign(Error(code),{code});
const safeEnv=()=>Object.fromEntries(['PATH','Path','SystemRoot','HOME','USERPROFILE','DOCKER_CONFIG','DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
function command(args,{signal,timeoutMs=BUILD_LIMITS.timeoutMs,maxBytes=BUILD_LIMITS.logBytes,binary=false}={}){
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',args,{env:safeEnv(),windowsHide:true,stdio:['ignore','pipe','pipe']}),out=[],err=[];let bytes=0,limited=false,timedOut=false;
  const collect=(chunks,b)=>{if(limited)return;bytes+=b.length;if(bytes>maxBytes){limited=true;p.kill();return}chunks.push(b)};
  p.stdout.on('data',b=>collect(out,b));p.stderr.on('data',b=>collect(err,b));
  const stop=()=>p.kill(),timer=setTimeout(()=>{timedOut=true;stop()},timeoutMs);signal?.addEventListener('abort',stop,{once:true});
  p.once('error',reject);p.once('close',code=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);const data=Buffer.concat(out);resolve({code,stdout:binary?data:data.toString(),stderr:Buffer.concat(err).toString(),limited,timedOut,aborted:!!signal?.aborted})});if(signal?.aborted)stop();
 });
}
export function dockerBuildCommand(mode){
 const native='cmake -S /input -B /work/build -G Ninja -DNEXUS_GUI=OFF -DCMAKE_CXX_FLAGS="-fsanitize=undefined -fno-sanitize-recover=all" && cmake --build /work/build --parallel 2 && ctest --test-dir /work/build --output-on-failure --no-tests=error';
 const gui='cp -a /emsdk/upstream/emscripten/cache /work/.emscripten_cache && /opt/qt/6.8.3/wasm_singlethread/bin/qt-cmake -S /input -B /work/build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS_RELEASE="-O0 -DNDEBUG" && cmake --build /work/build --target program --parallel 2 && for f in program.js program.wasm program.data qtloader.js qtlogo.svg; do if [ -f "/work/build/$f" ]; then cp "/work/build/$f" /output/; fi; done';
 const assessment='g++ -std=c++20 -fsanitize=undefined -fno-sanitize-recover=all -I/input/include /input/src/task_model.cpp /trusted/task_model_test.cpp -o /work/assessment && /work/assessment';
 if(!['qt-wasm','tests','assessment'].includes(mode))throw failure('BUILD_TARGET_INVALID');return'set -eu; '+(mode==='assessment'?assessment:mode==='tests'?native:gui);
}
export function dockerBuildArgs({name,image,input,mode,trusted}){
 if(!/^nexus-build-[a-f0-9]{24}$/.test(name)||typeof image!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_./:@-]*$/.test(image))throw failure('BUILD_CONFIG_INVALID');dockerBuildCommand(mode);
 const args=['run','--detach','--pull=never','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit',String(BUILD_LIMITS.pids),'--memory',BUILD_LIMITS.memory,'--cpus',BUILD_LIMITS.cpus,'--user','1000:1000','--tmpfs','/work:rw,exec,nosuid,size=1536m,mode=1777','--tmpfs','/tmp:rw,exec,nosuid,size=256m,mode=1777','--tmpfs','/output:rw,noexec,nosuid,nodev,size=96m,mode=1777','--mount','type=bind,source='+input+',target=/input,readonly'];
 if(mode==='assessment'){if(!trusted)throw failure('BUILD_CONFIG_INVALID');args.push('--mount','type=bind,source='+trusted+',target=/trusted,readonly')}
 return[...args,'-e','EM_CACHE=/work/cache','-e','HOME=/work',image,'sleep','infinity'];
}
export async function runDockerBuild({workspace,root,image,mode='qt-wasm',signal}){
 const w=validateProjectWorkspace(workspace);if(!w.files.some(f=>f.path==='CMakeLists.txt'))throw failure('BUILD_MANIFEST_REQUIRED');
 const input=path.resolve(root,'input'),output=path.resolve(root,'output');await mkdir(input,{recursive:true,mode:0o755});await mkdir(output,{recursive:true,mode:0o700});
 for(const f of w.files){const p=path.join(input,f.path);await mkdir(path.dirname(p),{recursive:true,mode:0o755});await writeFile(p,f.content,{flag:'wx',mode:0o644})}
 let trusted;if(mode==='assessment'){trusted=path.resolve(root,'trusted');await mkdir(trusted,{mode:0o755});await writeFile(path.join(trusted,'task_model_test.cpp'),taskFlowApplicationTemplate().files.find(f=>f.path==='tests/task_model_test.cpp').content,{flag:'wx',mode:0o644})}
 const name='nexus-build-'+randomBytes(12).toString('hex'),started=Date.now(),artifacts=[];let result,total=0;
 const budget=cap=>{const left=BUILD_LIMITS.timeoutMs-(Date.now()-started);if(left<=0)throw failure('BUILD_TIMEOUT');return Math.min(cap||left,left)};
 try{
  const identity=await command(['image','inspect',image,'--format','{{.Id}}'],{timeoutMs:budget(10000),signal});if(identity.code!==0)throw failure('STUDIO_SDK_UNAVAILABLE');
  const launch=await command(dockerBuildArgs({name,image,input,mode,trusted}),{timeoutMs:budget(10000),signal});if(launch.code!==0)throw failure('BUILD_CONTAINER_FAILED');
  result=await command(['exec',name,'/emsdk/docker/entrypoint.sh','sh','-c',dockerBuildCommand(mode)],{timeoutMs:budget(),signal});result.imageId=identity.stdout.trim();if(mode==='assessment'&&result.code===0&&result.stdout.trim()!=='TaskFlow tests: PASS')result.code=1;
  if(result.code===0&&!result.limited&&!result.aborted&&!result.timedOut){
   const listing=await command(['exec',name,'/bin/ls','-1A','/output'],{timeoutMs:budget(5000),signal});if(listing.code!==0||listing.limited)throw failure('BUILD_ARTIFACT_INVALID');
   for(const file of listing.stdout.trim().split('\n').filter(Boolean)){
    if(!/^(?:program\.(?:js|wasm|data)|qtloader\.js|qtlogo\.svg)$/.test(file))throw failure('BUILD_ARTIFACT_INVALID');
    const check=await command(['exec',name,'/bin/sh','-c','test -f "$1" && test ! -L "$1"','--','/output/'+file],{timeoutMs:budget(5000),signal});if(check.code!==0)throw failure('BUILD_ARTIFACT_INVALID');
    // Ни bind mount на запись, ни tar extraction: только ограниченный поток bytes.
    const data=await command(['exec',name,'/bin/cat','/output/'+file],{timeoutMs:budget(30000),signal,binary:true,maxBytes:Math.min(BUILD_LIMITS.artifactBytes,BUILD_LIMITS.totalArtifactBytes-total)});
    if(data.limited)throw failure('BUILD_ARTIFACT_QUOTA');if(data.code!==0||data.timedOut||data.aborted)throw failure('BUILD_ARTIFACT_COPY_FAILED');total+=data.stdout.length;
    await writeFile(path.join(output,file),data.stdout,{flag:'wx',mode:0o600});artifacts.push({name:file,bytes:data.stdout.length,sha256:hash(data.stdout)});
   }
   if(mode==='qt-wasm'&&!['program.js','program.wasm','qtloader.js'].every(n=>artifacts.some(a=>a.name===n)))throw failure('BUILD_ARTIFACT_MISSING');
  }
 }finally{await command(['rm','-f',name],{timeoutMs:10000}).catch(()=>{})}
 return{status:signal?.aborted||result.aborted?'cancelled':result.code===0&&!result.limited&&!result.timedOut?'passed':'failed',mode,exitCode:result.code,stdout:result.stdout,stderr:result.stderr,outputLimited:result.limited,timedOut:result.timedOut,elapsedMs:Date.now()-started,imageId:result.imageId,artifacts,limits:BUILD_LIMITS};
}
