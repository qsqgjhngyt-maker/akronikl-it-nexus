// Public acoustic assets only; user text never goes to a network request.
const assetBase=new URL('/akronikl/vendor/piper/',self.location.origin),nativeFetch=globalThis.fetch.bind(globalThis);
const variant=new URL(self.location.href).searchParams.get('voice')??'irina';
if(!['irina','uyut7'].includes(variant))throw Error('PIPER_VOICE_INVALID');
const modelId='ru_RU-'+variant+'-medium',modelBase='https://huggingface.co/diffusionstudio/piper-voices/resolve/main/ru/ru_RU/'+variant+'/medium/';
globalThis.fetch=(input,init={})=>{
 let url=new URL(typeof input==='string'?input:input.url??input,self.location.href);
 for(const name of [modelId+'.onnx',modelId+'.onnx.json'])if(url.href===modelBase+name)url=new URL('models/'+name,assetBase);
 if(url.origin!==assetBase.origin||!url.pathname.startsWith(assetBase.pathname)||!['GET','HEAD'].includes(init.method??'GET')||init.body)throw Error('PIPER_NETWORK_DENIED');
 return nativeFetch(url,{...init,credentials:'omit',redirect:'error'});
};
let session,busy=false;const started=performance.now();
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
try{
 const {TtsSession}=await import('/akronikl/vendor/piper/runtime.js');
 session=new TtsSession({voiceId:modelId,allowLocalModels:true,fallbackStrategy:'local',wasmPaths:{onnxWasm:new URL('ort/',assetBase).href,piperWasm:new URL('piper_phonemize.wasm',assetBase).href,piperData:new URL('piper_phonemize.data',assetBase).href}});
 await session.waitReady;const loaded=performance.now();const warm=await session.predict('Готово.');if(!(warm instanceof Blob)||warm.size<44)throw Error('PIPER_WARMUP_FAILED');
 postMessage({ready:true,model:modelId,localOnly:true,timings:{loadMs:loaded-started,warmupMs:performance.now()-loaded,totalMs:performance.now()-started}});
}catch{postMessage({ready:false,code:'SPEECH_UNAVAILABLE'});throw Error('PIPER_INITIALIZATION_FAILED');}
self.onmessage=async({data})=>{
 if(!data||Object.keys(data).sort().join(',')!=='id,text,textSha256'||typeof data.id!=='string'||typeof data.text!=='string'||!data.text.trim()||data.text.length>240||data.text.includes('\0'))return;
 if(busy){postMessage({id:data.id,code:'SPEECH_BUSY'});return;}busy=true;
 try{
  const textSha256=await digest(data.text);if(data.textSha256!==textSha256)throw Error('TEXT_CHANGED');const at=performance.now();
  const blob=await session.predict(data.text),audio=await blob.arrayBuffer();if(audio.byteLength<44||audio.byteLength>6000000)throw Error('AUDIO_INVALID');
  postMessage({id:data.id,audio,textSha256,synthesisMs:performance.now()-at},[audio]);
 }catch{postMessage({id:data.id,code:'SPEECH_SYNTHESIS_FAILED'});}finally{busy=false;}
};
