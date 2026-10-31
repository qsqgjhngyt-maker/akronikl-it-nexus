import{randomUUID}from'node:crypto';
import{validateNativeResult,requestRecord}from'../native-run-model.mjs';
const codes=new Map([[31,'COMPILE_REJECTED'],[32,'RUNTIME_REJECTED'],[33,'TIMED_OUT'],[34,'RESOURCE_LIMIT'],[35,'POLICY_REJECTED'],[36,'POLICY_REJECTED'],[37,'LOCAL_TEST_REJECTED']]);
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
export function decodeNativeDiagnostic(n,count){if(!Number.isSafeInteger(n)||n<0||n>2147483647)throw Error('DIAGNOSTIC_CODE');const d={fileIndex:(n&127)-1,line:(n>>>7)&16383,column:(n>>>21)&255,kind:(n>>>29)&3};if(d.fileIndex>=count)throw Error('DIAGNOSTIC_FILE');return d}
async function bounded(run,milliseconds,signal){if(signal?.aborted)throw Error('CANCELLED');const controller=new AbortController();let timer,abort;const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('TIME_LIMIT'))},milliseconds);if(signal){abort=()=>{controller.abort();reject(Error('CANCELLED'))};signal.addEventListener('abort',abort,{once:true})}});try{return await Promise.race([Promise.resolve().then(()=>run(controller.signal)),expired])}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}}
export async function superviseLearner({request,runnerBinarySha256,start,prepare,execute,diagnostic,stop,signal,runLimitMs=110000,prepareLimitMs=1260000,cleanupLimitMs=20000}={}){
 const binding=requestRecord(request);if(!/^[a-f0-9]{64}$/.test(runnerBinarySha256||'')||runLimitMs<1||runLimitMs>110000||prepareLimitMs<1||prepareLimitMs>1260000||cleanupLimitMs<1||cleanupLimitMs>20000)throw Error('SUPERVISOR_POLICY');
 const launchId=randomUUID(),result={schemaVersion:1,format:'nexus-onec-native-result-v1',launchId,...binding,runtime:'official-1C-training',platformVersion:'8.3.27.1508',outcome:'POLICY_REJECTED',elapsedMs:0,runnerBinarySha256,cleanupVerified:false,diagnostic:{fileIndex:-1,line:0,column:0,kind:0},codeVerifiedServer:false,credentialEligible:false,automaticGrade:false,progressWritten:false,outputTrusted:false,hostInstallPerformed:false,hostOutputMapping:false};delete result.files;let owned=null,startAttempted=false;const began=Date.now();
 try{
  if(signal?.aborted)throw Error('CANCELLED');startAttempted=true;owned=await bounded(start,30000,signal);if(!uuid(owned))throw Error('OWNED_SANDBOX_ID');
  await bounded(s=>prepare(owned,s),prepareLimitMs,signal);const code=await bounded(s=>execute(owned,launchId,s),runLimitMs,signal);result.outcome=code===0?(binding.mode==='check'?'CHECK_COMPLETED':'RUN_COMPLETED'):(codes.get(code)||'POLICY_REJECTED');
  if(code===0||code===31||code===32||code===37){try{result.diagnostic=decodeNativeDiagnostic(await bounded(s=>diagnostic(owned,launchId,s),5000,signal),binding.files.length)}catch{result.outcome=signal?.aborted?'CANCELLED':'POLICY_REJECTED'}}
 }catch(error){result.outcome=error.message==='TIME_LIMIT'?'TIMED_OUT':error.message==='CANCELLED'?'CANCELLED':'POLICY_REJECTED';}
 finally{
  // Всегда останавливается только UUID, возвращённый нашим start. Не PID/служба/чужая VM.
  if(uuid(owned)){try{result.cleanupVerified=await bounded(s=>stop(owned,s),cleanupLimitMs)===true}catch{result.cleanupVerified=false}}
  else result.cleanupVerified=!startAttempted;
  if(!result.cleanupVerified)result.outcome='CLEANUP_FAILED';result.elapsedMs=Math.min(3600000,Math.max(0,Date.now()-began));
 }
 return validateNativeResult(result,binding);
}
