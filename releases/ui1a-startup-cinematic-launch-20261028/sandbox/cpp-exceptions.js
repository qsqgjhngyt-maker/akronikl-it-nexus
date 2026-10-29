import {CPP_EXCEPTION_RUNTIME} from '../pwa/runtime-manifest.js';
import {verifyBytes} from '../pwa/policy.js';

// GoogleChromeLabs/wasm-feature-detect, Copyright2023 Google Inc., Apache-2.0.
// Final EH с exnref/try_table. Notice: runtime-packs/wasi-sdk33/licenses/.
const FINAL_EH_PROBE=new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,16,1,14,0,2,105,31,64,1,3,0,0,11,0,11,26,11]);
export function nativeCppExceptionsAvailable(){
  try{return typeof DecompressionStream==='function'&&WebAssembly.validate(FINAL_EH_PROBE)}catch{return false}
}

const invalid=()=>Object.assign(new Error('Пакет библиотеки C++ не прошёл проверку. Повторите подготовку компилятора.'),{code:'WASM_TOOLCHAIN_UNAVAILABLE'});
export async function decodeCppExceptionPack(compressed){
  await verifyBytes(CPP_EXCEPTION_RUNTIME,compressed);
  const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks=[];let total=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>CPP_EXCEPTION_RUNTIME.unpackedBytes)throw invalid();chunks.push(value)}}
  catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
  if(total!==CPP_EXCEPTION_RUNTIME.unpackedBytes)throw invalid();
  const raw=new Uint8Array(total);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.byteLength}
  const size=new DataView(raw.buffer).getUint32(0,true);if(size>128*1024||size<32||4+size>=total)throw invalid();
  const header=JSON.parse(new TextDecoder().decode(raw.subarray(4,4+size)));
  if(header.format!=='nexus-wasi-eh-pack-v1'||header.sdk!=='33.0+m'||!Array.isArray(header.files)||header.files.length>300)throw invalid();
  const files=Object.create(null);let consumed=0;
  for(const row of header.files){
    if(!/^(?:include|lib)\/wasm32-wasip1\/[a-zA-Z0-9_+./-]+$/.test(row.path)||row.path.split('/').some(p=>!p||p==='.'||p==='..')||Object.hasOwn(files,row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.offset!==consumed||4+size+consumed+row.bytes>total)throw invalid();
    files[row.path]=raw.subarray(4+size+consumed,4+size+consumed+row.bytes);consumed+=row.bytes;
  }
  if(consumed+4+size!==total||!files['lib/wasm32-wasip1/eh/libunwind.a']||!files['include/wasm32-wasip1/eh/c++/v1/__config_site'])throw invalid();
  return files;
}

let sysrootPromise;
export function cppExceptionSysroot(){
  return sysrootPromise??=(async()=>{
    const response=await fetch(CPP_EXCEPTION_RUNTIME.url,{credentials:'omit',mode:'cors',redirect:'error'});
    if(response.status!==200||response.redirected)throw invalid();
    const reader=response.body?.getReader();if(!reader)throw invalid();
    const chunks=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>CPP_EXCEPTION_RUNTIME.bytes)throw invalid();chunks.push(value)}}catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
    const bytes=new Uint8Array(size);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.byteLength}
    return decodeCppExceptionPack(bytes);
  })().catch(()=>{sysrootPromise=null;throw invalid()});
}
