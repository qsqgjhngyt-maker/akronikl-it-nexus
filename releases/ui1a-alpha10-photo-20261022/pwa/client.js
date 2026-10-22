import {RUNTIME_GRAPH_ID} from './runtime-manifest.js';
const protocol='nexus-verified-public-v1';
let registration;
function status(controller,timeout=2000){
 return new Promise((resolve,reject)=>{
  if(!controller)return reject(Error('PWA_CONTROLLER_MISSING'));
  const channel=new MessageChannel();let timer,checking=false;
  const arm=ms=>{clearTimeout(timer);timer=setTimeout(()=>{channel.port1.close();reject(Error('PWA_CONTROLLER_UNVERIFIED'))},ms)};arm(timeout);
  channel.port1.onmessage=event=>{const value=event.data;
   // Быстрый сигнал не является proof: ждём полную проверку bytes, без повторного
   // неограниченного продления. Старый молчащий SW сохраняет короткий deadline.
   if(value?.type==='checking'&&value.protocol===protocol&&value.graphId===RUNTIME_GRAPH_ID&&!checking){checking=true;arm(20000);return}
   clearTimeout(timer);channel.port1.close();
   if(value?.protocol!==protocol||value.graphId!==RUNTIME_GRAPH_ID||value.publicReady!==true)return reject(Error('PWA_CONTROLLER_UNVERIFIED'));
   resolve(value);
  };
  controller.postMessage({type:'nexus-pwa-status',progress:true},[channel.port2]);
 });
}
function install(nav,location){
 if(!registration){
  // The historical manifest identity/start_url/scope remain unchanged.
  const path=location.hostname==='qsqgjhngyt-maker.github.io'?'/akronikl-it-nexus/':'/';
  registration=nav.serviceWorker.register(path+'service-worker.js',{scope:path,updateViaCache:'none'}).catch(e=>{registration=null;throw e});
 }
 return registration;
}
export async function ensureSafeController({navigatorImpl=globalThis.navigator,locationImpl=globalThis.location,requireController=false,onWaiting=()=>{}}={}){
 const nav=navigatorImpl;
 if(!nav?.serviceWorker){if(requireController)throw Error('VERIFIED_RUNTIME_CONTROLLER_REQUIRED');return {controlled:false}}
 const existing=nav.serviceWorker.controller;
 const installing=install(nav,locationImpl);
 void installing.catch(()=>{});
 if(!existing&&!requireController){void installing.catch(()=>{});return {controlled:false}}
 if(existing){try{return await status(existing)}catch{onWaiting('Обновляем офлайн-защиту. Не закрывайте страницу.')}}
 const reg=await installing;await reg.update();
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){
  if(nav.serviceWorker.controller){try{return await status(nav.serviceWorker.controller,500)}catch{}}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error('PWA_SAFE_UPDATE_REQUIRED');
}
export const ensureVerifiedRuntime=()=>ensureSafeController({requireController:true});
