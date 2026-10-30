// Real clean-runtime synthesis. Only a byte-verified previously published module
// may be stopped temporarily; it is restarted in finally. No cloud AI requests.
import fs from 'node:fs/promises';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {once} from 'node:events';
const [rootArg,outArg,priorFileArg]=process.argv.slice(2),root=path.resolve(rootArg),out=path.resolve(outArg),origin='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net',hash=b=>createHash('sha256').update(b).digest('hex'),wait=ms=>new Promise(r=>setTimeout(r,ms));await fs.mkdir(out,{recursive:true});
let prior,stopped=false,child,endpoint,restored=false;const proof={status:'RUNNING',cloudModelCalls:0,modelDownloads:0,usesGlobalKitsune:false};
try{
 if(priorFileArg){prior=JSON.parse(await fs.readFile(priorFileArg,'utf8'));if(hash(await fs.readFile(prior.module))!==prior.moduleSha256)throw Error('UNKNOWN_PRIOR_MODULE_DO_NOT_STOP');
  const script="$v=[Console]::In.ReadToEnd()|ConvertFrom-Json;$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$v.pid);$expected='\"'+$v.node+'\" \"'+$v.module+'\" \"'+$v.config+'\"';if(-not $p -or $p.ExecutablePath -ne $v.node -or $p.CommandLine.Trim() -ne $expected){throw 'PRIOR_PROCESS_CHANGED'};Write-Output 'MATCH'";
  if(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input:JSON.stringify(prior),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()!=='MATCH')throw Error('PRIOR_PROCESS_CHANGED');
  execFileSync('taskkill.exe',['/PID',String(prior.pid),'/T','/F'],{stdio:'pipe'});stopped=true;await wait(1500);
 }
 const config=path.join(out,'voice-config.private.json');await fs.writeFile(config,JSON.stringify({python:path.join(root,'runtime/python.exe'),modelDirectory:path.join(root,'model'),privateDirectory:path.join(out,'cache'),port:0}),{flag:'wx'});
 const start=performance.now();child=spawn(path.join(root,'runtime/node.exe'),[path.join(root,'local-voice.mjs'),config],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PATH:path.join(root,'runtime')+';'+path.join(process.env.WINDIR,'System32'),PYTHONPATH:''}});let buffer='';child.stdout.on('data',b=>{buffer+=b;for(const row of buffer.split('\n'))try{const d=JSON.parse(row);if(d.status==='LOCAL_VOICE_READY')endpoint=d.endpoint;}catch{}});
 for(let n=0;n<200&&!endpoint;n++){if(child.exitCode!==null)throw Error('PORTABLE_MODULE_EXITED');await wait(100);}if(!endpoint)throw Error('PORTABLE_MODULE_NOT_LISTENING');
 let status;for(let n=0;n<180;n++){status=await(await fetch(endpoint+'/status')).json();if(status.ready)break;if(child.exitCode!==null)throw Error('PORTABLE_MODULE_EXITED');await wait(1000);}if(!status.ready||status.build!=='uyut7-qwen-20261030.1')throw Error('PORTABLE_MODEL_NOT_READY');proof.warmupMs=Math.round(performance.now()-start);
 const html=await(await fetch(endpoint+'/')).text(),code=html.match(/value="(\d{8})"/)?.[1];if(!code)throw Error('PAIRING_CODE_MISSING');
 const actor='portable-installer-self-check',paired=await(await fetch(endpoint+'/pair',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({accountId:actor,code})})).json();if(!paired.paired)throw Error('PAIRING_FAILED');
 const synthesis=performance.now(),response=await fetch(endpoint+'/speech',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+paired.token,'x-nexus-account-expectation':actor},body:JSON.stringify({text:'Проверка установки. Всё готово к работе.'}),signal:AbortSignal.timeout(120000)}),audio=Buffer.from(await response.arrayBuffer());if(response.status!==200||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE'||audio.length<10000)throw Error('REAL_SYNTHESIS_FAILED');
 await fs.writeFile(path.join(out,'PORTABLE_FIRST_VOICE.wav'),audio,{flag:'wx'});Object.assign(proof,{status:'REAL_PORTABLE_QWEN_VOICE_PASS',synthesisMs:Math.round(performance.now()-synthesis),audioBytes:audio.length,audioSha256:hash(audio),build:status.build});
}catch(e){proof.status='FAIL';proof.code=/^[A-Z0-9_]+$/.test(e.message)?e.message:'PORTABLE_RUNTIME_FAILED';process.exitCode=1;}
finally{
 if(child&&child.exitCode===null){try{execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'pipe'});}catch{}await Promise.race([once(child,'close'),wait(5000)]);}
 if(stopped){const old=spawn(prior.node,[prior.module,prior.config],{detached:true,windowsHide:true,stdio:'ignore'});old.unref();restored=true;}
 proof.previousKnownModuleRestarted=restored;await fs.writeFile(path.join(out,'REAL_PORTABLE_RESULT.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
}
