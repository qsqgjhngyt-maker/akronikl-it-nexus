// Пассивный QA-наблюдатель. Не заменяет listener fixture и не меняет критерии FAIL.
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

function safeUrl(value) {
 const raw=String(value||'');
 if(raw.startsWith('blob:'))return 'blob:'+safeUrl(raw.slice(5));
 try {
  const u=new URL(raw);
  if(u.protocol==='http:'||u.protocol==='https:')return u.origin+u.pathname.replace(/(\/artifacts\/[a-f0-9-]+\/)[a-f0-9]{64}/gi,'$1[redacted]');
  if(u.protocol==='about:'&&u.pathname==='blank')return 'about:blank';
  return u.protocol+'[redacted]';
 }catch{return '[unavailable URL]';}
}
function safeText(value,limit=12000) {
 return String(value||'').slice(0,limit)
  .replace(/(?:https?|blob|data|file):[^\s)\]}>'"]+/gi,safeUrl)
  .replace(/\b(access_token|refresh_token|id_token|token|secret|password|authorization)\s*[=:]\s*[^\s,;]+/gi,'$1=[redacted]');
}
async function boundedSnapshot(frame) {
 let timer;
 try {
  const data=await Promise.race([
   frame.evaluate(()=>{
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const geometry=node=>({tag:node.tagName,widthAttribute:node.getAttribute('width'),heightAttribute:node.getAttribute('height'),widthProperty:typeof node.width==='number'?node.width:null,heightProperty:typeof node.height==='number'?node.height:null,rect:rect(node),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility});
    return {innerWidth:innerWidth,innerHeight:innerHeight,devicePixelRatio:devicePixelRatio,visibilityState:document.visibilityState,canvases:[...document.querySelectorAll('canvas')].slice(0,16).map(geometry),iframes:[...document.querySelectorAll('iframe')].slice(0,8).map(geometry)};
   }),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SNAPSHOT_TIMEOUT')),1500);})
  ]);
  return {availability:'observed',...data};
 }catch(error){return {availability:'unavailable',reason:safeText(error.message,1000)};}
 finally{clearTimeout(timer);}
}

export function observeQtPageErrors({page,file,browserVersion,browserMode,generation,profile}) {
 const events=[],pending=new Set();let totalPageErrors=0;
 let phase={programId:null,bundleIndex:null,action:'initialization'};
 const listener=error=>{
  totalPageErrors++;
  if(events.length>=64)return;
  let url='[unavailable URL]',viewport=null;
  try{url=safeUrl(page.url());}catch{}
  try{viewport=page.viewportSize();}catch{}
  const event={receivedAtUTC:new Date().toISOString(),message:safeText(error.message,2000),stack:typeof error.stack==='string'?safeText(error.stack):null,stackAvailability:typeof error.stack==='string'?'observed':'unavailable',phase:{...phase},url,viewportAtReceipt:viewport,viewportAvailability:viewport?'observed':'unavailable',snapshotRequestedAtUTC:new Date().toISOString(),frames:[]};
  events.push(event);
  const task=(async()=>{
   try {
    const frames=page.frames().slice(0,8);
    event.frames=await Promise.all(frames.map(async frame=>{
     let url;try{url=safeUrl(frame.url());}catch{url='[unavailable URL]';}
     return {url,...await boundedSnapshot(frame)};
    }));
    if(!frames.length)event.geometryAvailability='unavailable: no frames';
   }catch(error){event.geometryAvailability='unavailable';event.geometryReason=safeText(error.message,1000);}
   event.snapshotCompletedAtUTC=new Date().toISOString();
  })();
  pending.add(task);void task.finally(()=>pending.delete(task));
 };
 page.on('pageerror',listener);
 return {
  setPhase(action,details={}){phase={...phase,...details,action};},
  async flush(){
   await Promise.allSettled([...pending]);
   const report={kind:'passive Qt pageerror diagnostic',browserVersion:browserVersion||'unavailable',browserMode:browserMode||'unavailable',generation,profile,totalPageErrors,recordedEvents:events.length,unrecordedEvents:totalPageErrors-events.length,phaseSemantics:'Последняя отметка действия теста при получении события; она сама по себе не устанавливает причинную связь с программой или действием.',geometryTiming:'Геометрия прочитана асинхронно после получения pageerror; время запроса и завершения записаны. Это не гарантированный синхронный снимок момента ошибки. Недоступные данные не подменяются.',existingErrorCollectionChanged:false,events};
   await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(report,null,2)+'\n');
   return report;
  }
 };
}
