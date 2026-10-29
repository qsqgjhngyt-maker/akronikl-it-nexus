import{ensureVerifiedRuntime}from'../../pwa/client.js';
import{QT_BROWSER_PROFILE}from'./profile.js';
export function createQtCompiler({current=()=>true,progress=()=>{}}={}){
 let worker=null,rejectActive=null,timer=null,sequence=0;
 const cancel=()=>{clearTimeout(timer);worker?.terminate();worker=null;const reject=rejectActive;rejectActive=null;reject?.(Object.assign(Error('QT_CANCELLED'),{code:'QT_CANCELLED'}))};
 async function compile(workspace,includeRoots){
  cancel();const id=String(++sequence);await ensureVerifiedRuntime();
  if(!current()||id!==String(sequence))throw Error('QT_CANCELLED');
  return new Promise((resolve,reject)=>{
   rejectActive=reject;worker=new Worker(new URL('./compiler-worker.js',import.meta.url),{type:'module'});
   const finish=(error,value)=>{const w=worker;worker=null;rejectActive=null;clearTimeout(timer);w?.terminate();error?reject(error):resolve(value)};
   const arm=ms=>{clearTimeout(timer);timer=setTimeout(()=>finish(Object.assign(Error('QT_COMPILER_TIMEOUT'),{code:'QT_COMPILER_TIMEOUT'})),ms)};arm(QT_BROWSER_PROFILE.toolchainTimeoutMs);
   worker.onmessage=({data})=>{if(data?.id!==id)return;if(!current()){finish(Error('QT_ACCOUNT_CHANGED'));return}
    if(data.type==='progress'){if(data.phase==='compile')arm(QT_BROWSER_PROFILE.compileTimeoutMs);progress(data.phase);return}
    if(data.type==='compiled')finish(null,data);
    else if(data.type==='error')finish(Object.assign(Error(data.message),{code:data.code,compilerOutput:data.output}));
   };
   worker.onerror=e=>finish(Object.assign(Error(e.message||'QT_WORKER_FAILED'),{code:'QT_WORKER_FAILED'}));
   worker.postMessage({type:'compile',id,workspace,includeRoots});
  });
 }
 return{compile,cancel(){sequence++;cancel()}};
}
