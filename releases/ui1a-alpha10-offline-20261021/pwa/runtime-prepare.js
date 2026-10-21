import {ensureVerifiedRuntime} from './client.js';
import {RUNTIME_GRAPH_ID,RUNTIME_RESOURCES} from './runtime-manifest.js';
export const runtimeBytes=RUNTIME_RESOURCES.reduce((n,r)=>n+r.bytes,0);
export async function runtimeReadiness({prepare=false,onProgress=()=>{}}={}){
 await ensureVerifiedRuntime();
 if(prepare){
  const estimate=await navigator.storage?.estimate?.();
  if(estimate?.quota&&estimate.quota-(estimate.usage||0)<runtimeBytes*1.2)throw Object.assign(Error('Недостаточно места для компилятора. Проекты сохранены.'),{code:'RUNTIME_STORAGE_SPACE'});
  // Отказ persist не считается успехом и не блокирует проверенную обычную IDB.
  try{await navigator.storage?.persist?.()}catch{}
 }
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('Подготовка не завершена. Проверьте сеть и доступное место.'))},prepare?900000:60000);
  channel.port1.onmessage=event=>{
   const value=event.data;
   if(value?.type==='progress'){onProgress(value);return}
   clearTimeout(timer);channel.port1.close();
   if(value?.protocol!=='nexus-verified-public-v1'||value.graphId!==RUNTIME_GRAPH_ID||!value.publicReady||value.error)return reject(Object.assign(Error('Не удалось сохранить проверенный компилятор. Проекты не изменены.'),{code:value?.error||'RUNTIME_NOT_READY'}));
   resolve({ready:value.runtimeReady===true,graphId:value.graphId,bytes:runtimeBytes});
  };
  navigator.serviceWorker.controller.postMessage({type:prepare?'nexus-runtime-prepare':'nexus-pwa-status',includeRuntime:true},[channel.port2]);
 });
}
