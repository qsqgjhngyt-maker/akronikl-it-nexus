import {verifyBytes} from './policy.js';

// Ограничиваем сеть, но не authority: каждое поколение по-прежнему должно
// целиком пройти SHA256-проверку и одну durable-транзакцию перед активацией.
export const PUBLIC_INSTALL_CONCURRENCY=8;
export async function stagePublicGeneration({generation,records,store,acquire}){
 const jobs=new Map(),buffers=new Map(),controller=new AbortController();
 for(const record of records){
  const key=record.sha256+':'+record.bytes;
  if(!jobs.has(key))jobs.set(key,[]);
  jobs.get(key).push(record);
 }
 const groups=[...jobs.values()];let next=0,firstError;
 async function worker(){
  while(!controller.signal.aborted&&next<groups.length){
   const group=groups[next++],record=group[0];
   try{
    let bytes;
    // read() проверяет реальные bytes, а не запись о готовности. Повреждённый
    // публичный объект можно заменить только заново проверенным сетевым телом.
    try{bytes=await store.read(record)}catch{}
    if(controller.signal.aborted)return;
    if(!bytes)bytes=await acquire(record,{signal:controller.signal});
    if(controller.signal.aborted)return;
    await verifyBytes(record,bytes);
    for(const alias of group)buffers.set(alias.url,bytes);
   }catch(error){
    if(!controller.signal.aborted){firstError=error;controller.abort(error)}
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(PUBLIC_INSTALL_CONCURRENCY,groups.length)},worker));
 if(controller.signal.aborted)throw firstError;
 // stage() повторно проверяет все записи и атомарно сохраняет поколение.
 // Ни прерванная сеть, ни quota fault не публикуют частичную готовность.
 await store.stage(generation,records,buffers);
}
