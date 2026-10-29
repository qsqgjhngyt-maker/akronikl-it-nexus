const MAX_AUDIO=6000000;
export function speechWav(bytes,{samples}={}){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<44||bytes.byteLength>MAX_AUDIO)throw Error('SPEECH_AUDIO_INVALID');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),str=(a,b)=>String.fromCharCode(...bytes.subarray(a,b));
 if(str(0,4)!=='RIFF'||str(8,12)!=='WAVE'||str(12,16)!=='fmt '||str(36,40)!=='data'||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==24000||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.byteLength-44||samples!==undefined&&bytes.byteLength!==44+samples*2)throw Error('SPEECH_AUDIO_INVALID');
 return bytes;
}
function audioBytes(value){
 if(typeof value!=='string'||value.length>8000000)throw Error('SPEECH_AUDIO_INVALID');
 let raw;try{raw=atob(value);}catch{throw Error('SPEECH_AUDIO_INVALID');}
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function readLocalSpeechStream(response,{text,signal,isCurrent,onChunk,cryptoRef=globalThis.crypto}){
 const current=()=>{signal?.throwIfAborted();if(!isCurrent())throw Error('SPEECH_LOCAL_PAIR_REQUIRED');};current();
 if(!response.headers.get('content-type')?.startsWith('application/x-ndjson')||!response.body)throw Error('SPEECH_AUDIO_INVALID');
 const textHash=[...new Uint8Array(await cryptoRef.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let pending='',wire=0,sequence=0,offset=0,final=null;
 async function packet(line){
  if(!line.trim())return;current();if(final)throw Error('SPEECH_AUDIO_INVALID');
  let value;try{value=JSON.parse(line);}catch{throw Error('SPEECH_AUDIO_INVALID');}
  if(value.code)throw Error(/^SPEECH_[A-Z_]+$/u.test(value.code)?value.code:'SPEECH_UNAVAILABLE');
  if(value.textSha256!==textHash)throw Error('SPEECH_AUDIO_INVALID');
  if(value.chunk===true){
   if(value.seq!==sequence||value.offsetSamples!==offset||!Number.isInteger(value.samples)||value.samples<1||value.samples>2400000||offset+value.samples>2400000||value.sampleRate!==24000)throw Error('SPEECH_AUDIO_INVALID');
   const audio=speechWav(audioBytes(value.audio),{samples:value.samples});sequence++;offset+=value.samples;current();
   await onChunk({audio:audio.buffer,seq:value.seq,offsetSamples:value.offsetSamples,samples:value.samples,sampleRate:24000});return;
  }
  if(value.done!==true||!sequence||value.sampleRate!==24000||!Number.isFinite(value.duration)||value.duration<=0)throw Error('SPEECH_AUDIO_INVALID');
  const bytes=speechWav(audioBytes(value.audio),{samples:offset});if(Math.abs(value.duration*24000-offset)>1)throw Error('SPEECH_AUDIO_INVALID');final=new Blob([bytes],{type:'audio/wav'});
 }
 try{for(;;){current();const part=await reader.read();current();if(part.done)break;wire+=part.value.length;if(wire>18000000)throw Error('SPEECH_AUDIO_INVALID');pending+=decoder.decode(part.value,{stream:true});let end;while((end=pending.indexOf('\n'))>=0){await packet(pending.slice(0,end));pending=pending.slice(end+1);}if(pending.length>9000000)throw Error('SPEECH_AUDIO_INVALID');}pending+=decoder.decode();if(pending.trim())await packet(pending);current();if(!final)throw Error('SPEECH_AUDIO_INVALID');return final;}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
