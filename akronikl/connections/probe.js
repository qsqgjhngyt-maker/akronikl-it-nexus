import {modelProfile,RUNTIME_VERSION} from './profiles.js';
const nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const report=(code,extra={})=>Object.freeze({code,readyToLoad:false,runtimeManifest:false,webgpu:'not-checked',generationTested:false,...extra});
const runtimeURL=new URL('../tutor/runtime/RUNTIME_MANIFEST.json',import.meta.url);
export function checkSignal(signal){if(signal!=null){nativeAborted.call(signal);signal.throwIfAborted();}}

// Вызывается только по действию пользователя. Нет requestDevice, весов, вопросов,
// кода, adapter.vendor/device, localStorage и внешних адресов.
export async function probeWebGPU({signal,environment=globalThis}={}) {
  checkSignal(signal);
  if(environment.isSecureContext!==true)return 'insecure';
  const gpu=environment.navigator?.gpu;
  if(typeof gpu?.requestAdapter!=='function')return 'unavailable';
  try{
    const adapter=await gpu.requestAdapter();checkSignal(signal);
    if(!adapter)return 'unavailable';
    const fallback=adapter.info?.isFallbackAdapter??adapter.isFallbackAdapter;
    if(fallback===true)return 'software';
    // Не называем ускорителем адаптер с неизвестным типом.
    if(fallback!==false)return 'unknown';
    return 'available';
  }catch(error){checkSignal(signal);return 'unavailable';}
}
async function readManifest(fetchResource,signal) {
  const response=await fetchResource(runtimeURL.href,{signal,credentials:'omit',redirect:'error',cache:'no-store',method:'GET'});
  if(!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('RUNTIME_UNAVAILABLE');
  const declared=response.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>65536))throw Error('RUNTIME_UNAVAILABLE');
  if(!response.body?.getReader)throw Error('RUNTIME_UNAVAILABLE');
  const reader=response.body.getReader(),parts=[];let size=0;
  try{for(;;){checkSignal(signal);const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)throw Error('RUNTIME_UNAVAILABLE');parts.push(value);}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  checkSignal(signal);const all=new Uint8Array(size);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.byteLength;}
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  if(data.package!=='@wllama/wllama'||data.version!==RUNTIME_VERSION||data.weightsIncluded!==false||!Array.isArray(data.files)||data.files.length>256)throw Error('RUNTIME_UNAVAILABLE');
  const names=new Set();
  for(const f of data.files){
    if(!f||typeof f.file!=='string'||!/^[\w.-]+(?:\/[\w.-]+)*$/.test(f.file)||f.file.split('/').some(p=>p==='..'||p==='.')||names.has(f.file)||!Number.isSafeInteger(f.bytes)||f.bytes<1||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('RUNTIME_UNAVAILABLE');
    names.add(f.file);
  }
  if(!names.has('index.js')||!names.has('wasm/wllama.wasm'))throw Error('RUNTIME_UNAVAILABLE');
}
export async function inspectLocalProfile(id,{signal,environment=globalThis,fetchResource=globalThis.fetch}={}) {
  checkSignal(signal);const p=modelProfile(id);
  if(p.kind==='none')return report('SOURCES_READY',{readyToLoad:true});
  if(p.kind!=='local')return report('EXTERNAL_DISABLED');
  if(environment.isSecureContext!==true)return report('SECURE_CONTEXT_REQUIRED');
  if(!environment.WebAssembly||typeof environment.Worker!=='function'||!environment.crypto?.subtle)return report('BROWSER_UNSUPPORTED');
  if(typeof fetchResource!=='function')return report('RUNTIME_UNAVAILABLE');
  try{await readManifest(fetchResource,signal);}catch{checkSignal(signal);return report('RUNTIME_UNAVAILABLE');}
  const webgpu=id==='local-webgpu'?await probeWebGPU({signal,environment}):'not-checked';checkSignal(signal);
  if(id==='local-webgpu'&&webgpu!=='available')return report('WEBGPU_UNAVAILABLE',{runtimeManifest:true,webgpu});
  // Manifest найден, но это не проверка всех байтов runtime или качества модели.
  return report('READY_TO_LOAD',{readyToLoad:true,runtimeManifest:true,webgpu});
}
