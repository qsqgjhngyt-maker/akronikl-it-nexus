// Очередь хранит только уже зафиксированные jobs; источники переживают перезапуск.
// По одному pending job на аккаунт обеспечивает FIFO между аккаунтами.
export function createBuildQueue({concurrency=2}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>8)throw Error('STUDIO_QUEUE_CONFIG_INVALID');
 const waiting=[];let running=0;
 function drain(){while(running<concurrency&&waiting.length){const entry=waiting.shift();running++;Promise.resolve().then(entry.run).then(entry.resolve,entry.reject).finally(()=>{running--;drain()});}}
 return{schedule(id,run){return new Promise((resolve,reject)=>{waiting.push({id,run,resolve,reject});drain()})},position(id){const i=waiting.findIndex(e=>e.id===id);return i<0?0:i+1},stats:()=>({running,waiting:waiting.length})};
}
