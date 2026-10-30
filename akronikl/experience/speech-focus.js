// Coordinate playback only. No text, account IDs, keys or audio leave the owner.
const key=Symbol.for('nexus.assistant.speech-focus.v1'),fallback=new WeakMap();
function hubFor(win){
 let hub=win[key]??fallback.get(win);if(hub)return hub;
 const clients=new Set();let active=null,channel=null,serial=0,last={clock:0,id:''};
 const pageId=win.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)+Date.now().toString(36);
 const newer=(a,b)=>a.clock>b.clock||a.clock===b.clock&&a.id>b.id;
 const lose=()=>{const previous=active;active=null;try{previous?.lost();}catch{}};
 function connect(){
  if(channel||typeof win.BroadcastChannel!=='function')return;
  try{channel=new win.BroadcastChannel('nexus-assistant-speech-v1');channel.onmessage=({data})=>{
   if(!data||Object.keys(data).sort().join(',')!=='clock,id,type'||data.type!=='claim'||!Number.isSafeInteger(data.clock)||data.clock<0||data.clock>Date.now()+60000||typeof data.id!=='string'||data.id.length>96)return;
   if(newer(data,last)){last={clock:data.clock,id:data.id};lose();}
  };}catch{channel=null;}
 }
 hub={register(lost){
  const client={lost};clients.add(client);connect();let dead=false;
  return Object.freeze({
   claim(){if(dead)return;lose();active=client;last={clock:Math.max(Date.now(),last.clock+1),id:pageId+':'+(++serial)};try{channel?.postMessage({type:'claim',...last});}catch{}},
   release(){if(active===client)active=null;},
   dispose(){if(dead)return;dead=true;if(active===client)active=null;clients.delete(client);if(!clients.size){channel?.close();channel=null;}}
  });
 }};
 fallback.set(win,hub);try{Object.defineProperty(win,key,{value:hub,configurable:true});}catch{}return hub;
}
export function createSpeechFocus({windowRef,onLost}={}){
 if(!windowRef||typeof windowRef!=='object'||typeof onLost!=='function')throw Error('SPEECH_SETTINGS_INVALID');
 return hubFor(windowRef).register(onLost);
}
