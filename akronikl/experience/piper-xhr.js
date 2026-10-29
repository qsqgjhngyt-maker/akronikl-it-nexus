import {PIPER_PUBLIC_ASSETS} from './piper-assets.js';import {readPiperChunks} from './piper-asset-loader.js';
// Emscripten uses XHR for its phonemizer data. Keep its exact bytes and event contract.
export function installPiperXHR({scope=globalThis,base,fetchResource=fetch}={}){
 const Native=scope.XMLHttpRequest;
 scope.XMLHttpRequest=class extends Native{
  _part=null;
  open(method,input,async=true,...rest){
   if(this._part)this.abort();const url=new URL(input,base),file=url.pathname.slice(base.pathname.length),record=PIPER_PUBLIC_ASSETS[file];
   if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||url.search||url.hash||!record||!['GET','HEAD'].includes(method)||rest.some(Boolean))throw Error('PIPER_NETWORK_DENIED');
   if(record.chunks){if(!async||method!=='GET')throw Error('PIPER_NETWORK_DENIED');this._part={file,record,url:url.href,state:1,status:0,response:null,type:'',controller:new AbortController(),sent:false,ended:false,timeout:0};this.dispatchEvent(new Event('readystatechange'));}
   else{this._part=null;super.open(method,url.href,async);}
  }
  get readyState(){return this._part?.state??super.readyState;}
  get status(){return this._part?.status??super.status;}
  get statusText(){return this._part?(this._part.status===200?'OK':''):super.statusText;}
  get response(){return this._part?this._part.response:super.response;}
  get responseText(){return this._part?'':super.responseText;}
  get responseURL(){return this._part?.url??super.responseURL;}
  get responseType(){return this._part?.type??super.responseType;}
  set responseType(value){if(this._part){if(!['','arraybuffer'].includes(value))throw Error('PIPER_ASSET_INVALID');this._part.type=value;}else super.responseType=value;}
  get timeout(){return this._part?.timeout??super.timeout;}
  set timeout(value){if(this._part){if(!Number.isFinite(value)||value<0)throw Error('PIPER_ASSET_INVALID');this._part.timeout=value;}else super.timeout=value;}
  get withCredentials(){return false;}
  set withCredentials(value){if(value)throw Error('PIPER_NETWORK_DENIED');super.withCredentials=false;}
  getResponseHeader(name){if(!this._part)return super.getResponseHeader(name);return ({'content-type':this._part.record.mime,'content-length':String(this._part.record.bytes)})[String(name).toLowerCase()]??null;}
  getAllResponseHeaders(){return this._part?'content-type: '+this._part.record.mime+'\r\ncontent-length: '+this._part.record.bytes+'\r\n':super.getAllResponseHeaders();}
  setRequestHeader(name,value){if(this._part)throw Error('PIPER_NETWORK_DENIED');super.setRequestHeader(name,value);}
  overrideMimeType(value){if(!this._part)super.overrideMimeType(value);}
  abort(){const p=this._part;if(!p){super.abort();return;}if(p.ended)return;p.ended=true;p.controller.abort();clearTimeout(p.timer);p.state=0;this.dispatchEvent(new Event('abort'));this.dispatchEvent(new Event('loadend'));}
  send(body=null){const p=this._part;if(!p){if(body!==null&&body!==undefined)throw Error('PIPER_NETWORK_DENIED');super.send();return;}
   if(p.sent||body!==null&&body!==undefined)throw Error('PIPER_NETWORK_DENIED');p.sent=true;p.state=2;this.dispatchEvent(new Event('readystatechange'));
   if(p.timeout)p.timer=setTimeout(()=>{if(!p.ended){p.timedOut=true;p.controller.abort();}},p.timeout);
   void readPiperChunks(p.file,{base,fetchResource,signal:p.controller.signal,onProgress:(loaded,total)=>{if(p.ended)return;p.state=3;this.dispatchEvent(new ProgressEvent('progress',{lengthComputable:true,loaded,total}));}}).then(async r=>{const response=await r.arrayBuffer();if(p.ended||this._part!==p)return;p.response=response;p.status=200;p.state=4;p.ended=true;clearTimeout(p.timer);this.dispatchEvent(new Event('readystatechange'));this.dispatchEvent(new ProgressEvent('load',{lengthComputable:true,loaded:p.record.bytes,total:p.record.bytes}));this.dispatchEvent(new Event('loadend'));}).catch(()=>{if(p.ended)return;p.ended=true;p.state=4;clearTimeout(p.timer);this.dispatchEvent(new Event(p.timedOut?'timeout':'error'));this.dispatchEvent(new Event('loadend'));});
  }
 };
 return ()=>{scope.XMLHttpRequest=Native;};
}
