// TLS/HTTP2 to the fixed Worker only. No HTTP/1 fallback, replay or shared cache.
import http2 from 'node:http2';
import tls from 'node:tls';
import {socketProgress} from './socket-progress.mjs';
import {WORKER_ORIGIN} from './account-read.mjs';
const path='/api/v2/account/internal/control',hostname=new URL(WORKER_ORIGIN).hostname;
const inputError=()=>Object.assign(Error('MEDIA_TRANSPORT_INPUT'),{code:'NEXUS_MEDIA_INPUT'});
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNRESET','EPIPE','ENETUNREACH','EHOSTUNREACH','ECONNREFUSED','ETIMEDOUT','ABORT_ERR','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','NEXUS_MEDIA_H2_REQUIRED','ERR_HTTP2_SESSION_ERROR','ERR_HTTP2_STREAM_ERROR','ERR_HTTP2_GOAWAY_SESSION']);
const failed=(error,state)=>Object.assign(Error('MEDIA_TRANSPORT_FAILED',{cause:{code:networkCodes.has(error?.code)?error.code:'NEXUS_NATIVE_NETWORK'}}),{nexusPhase:!state.tcp?(state.lookup?'tcp':'dns'):!state.tls?'tls':!state.finished?'upload':'response'});
const disconnected=()=>Object.assign(Error('MEDIA_SESSION_CLOSED'),{code:'ECONNRESET'});
function validate(url,options){
 if(url!==WORKER_ORIGIN+path||options?.method!=='POST'||options.credentials!=='omit'||options.cache!=='no-store'||options.redirect!=='error'||typeof options.body!=='string'||!(options.signal instanceof AbortSignal))throw inputError();
 const body=Buffer.from(options.body),headers=options.headers;
 if(!body.length||body.length>262144||!headers||Object.keys(headers).sort().join(',')!==['accept','content-type','x-nexus-service-nonce','x-nexus-service-signature','x-nexus-service-timestamp'].sort().join(',')||headers.accept!=='application/json'||headers['content-type']!=='application/json'||!/^\d{13}$/.test(headers['x-nexus-service-timestamp'])||!/^[a-f0-9]{32}$/.test(headers['x-nexus-service-nonce'])||!/^[a-f0-9]{64}$/.test(headers['x-nexus-service-signature']))throw inputError();
 return{body,headers};
}
function transport({singleUse=false}={}){
 const connection={lookup:false,tcp:false,tls:false},requests=new Set();
 let session,socket,ready=false,closed=false,draining=false;
 const close=(error=disconnected())=>{
  if(closed)return;closed=true;
  for(const request of [...requests])request.stop(error);
  // Do not manipulate a socket bound to Http2Session; session.destroy() owns it.
  if(session)session.destroy();else socket?.destroy();
 };
 const connect=()=>{
  if(session||closed)return;
  try{
   session=http2.connect(WORKER_ORIGIN,{maxHeaderListPairs:32,maxSessionMemory:16,settings:{enablePush:false,maxHeaderListSize:16384},createConnection:()=>{
    socket=tls.connect({host:hostname,port:443,servername:hostname,ALPNProtocols:['h2'],rejectUnauthorized:true,family:4,autoSelectFamily:false});
    socket.once('lookup',error=>{if(!error)connection.lookup=true});socket.once('connect',()=>{connection.tcp=true});
    socket.once('secureConnect',()=>{connection.tls=true;if(!socket.authorized||socket.alpnProtocol!=='h2')close(Object.assign(Error('MEDIA_H2_REQUIRED'),{code:'NEXUS_MEDIA_H2_REQUIRED'}));else if(!socket.setMaxSendFragment(1024))close(inputError())});
    socket.on('error',close);return socket;
   }});
   session.on('error',close);
   session.on('stream',pushed=>{pushed.on('error',()=>{});pushed.destroy();close(Object.assign(Error('MEDIA_PUSH_REJECTED'),{code:'NEXUS_MEDIA_H2_REQUIRED'}))});
   session.on('goaway',(code,lastStreamId)=>{
    draining=true;
    if(code!==http2.constants.NGHTTP2_NO_ERROR||[...requests].some(request=>!request.streamId()||request.streamId()>lastStreamId))close(Object.assign(Error('MEDIA_GOAWAY'),{code:'ERR_HTTP2_GOAWAY_SESSION'}));
   });
   session.once('close',()=>{if(!closed)close(disconnected())});
   session.once('connect',()=>{
    if(closed)return;
    if(!connection.tls||!socket.authorized||socket.alpnProtocol!=='h2'){close(Object.assign(Error('MEDIA_H2_REQUIRED'),{code:'NEXUS_MEDIA_H2_REQUIRED'}));return}
    ready=true;for(const request of [...requests])request.start();
   });
  }catch(error){close(error)}
 };
 const request=(url,options)=>{
  let body,headers;try{({body,headers}=validate(url,options))}catch(error){return Promise.reject(error)}
  if(closed||draining)return Promise.reject(failed(disconnected(),connection));
  return new Promise((resolve,reject)=>{
   let stream,sendTimer,resolved=false,stopped=false,trailer=false,lastWire,webController,finished=false;
   const state=()=>({...connection,finished});
   const capture=()=>{if(options.captureWire===true)lastWire=socketProgress(socket,state(),session,stream);return lastWire};
   const destroy=()=>{
    if(stopped)return;stopped=true;clearTimeout(sendTimer);options.signal.removeEventListener('abort',onAbort);
    requests.delete(entry);stream?.destroy();if(singleUse)close();
   };
   const stop=error=>{
    if(stopped)return;const safe=failed(error,state());if(options.captureWire===true)safe.nexusWire=capture();
    if(!resolved)reject(safe);else{try{webController?.error(safe)}catch{}}
    destroy();
   };
   const onAbort=()=>stop(Object.assign(Error('MEDIA_ABORTED'),{code:'ABORT_ERR'}));
   const start=()=>{
    if(stopped||closed||stream)return;
    if(draining){stop(Object.assign(Error('MEDIA_GOAWAY'),{code:'ERR_HTTP2_GOAWAY_SESSION'}));return}
    try{
     stream=session.request({':method':'POST',':scheme':'https',':authority':hostname,':path':path,...headers,'content-length':String(body.length),'accept-encoding':'identity',[http2.sensitiveHeaders]:['x-nexus-service-signature','x-nexus-service-nonce']},{endStream:false});
     stream.on('error',stop);
     stream.once('close',()=>{if(!resolved&&!stopped)stop(disconnected())});
     stream.once('finish',()=>{finished=true});
     stream.on('headers',()=>stop(Error('MEDIA_INFORMATIONAL_HEADERS_REJECTED')));
     stream.on('trailers',()=>{trailer=true;stop(Object.assign(Error('MEDIA_TRAILERS_REJECTED'),{code:'NEXUS_MEDIA_TRAILERS'}))});
     stream.once('response',(incoming,_flags,raw)=>{
      try{
       if(!Number.isInteger(incoming[':status'])||incoming[':status']<200||incoming[':status']>599)throw inputError();
       if(!Array.isArray(raw)||raw.length%2||raw.length>64)throw inputError();
       const counts=new Map();for(let i=0;i<raw.length;i+=2){if(typeof raw[i]!=='string'||typeof raw[i+1]!=='string')throw inputError();const name=raw[i].toLowerCase();counts.set(name,(counts.get(name)||0)+1)}
       if(counts.get(':status')!==1||['content-type','cache-control','content-length'].some(name=>(counts.get(name)||0)>1))throw inputError();
       const forwarded=new Headers();
       for(const [name,value] of Object.entries(incoming)){
        if(name===':status')continue;if(name.startsWith(':'))throw inputError();
        for(const item of Array.isArray(value)?value:[value]){if(typeof item!=='string')throw inputError();forwarded.append(name,item)}
       }
       const iterator=stream[Symbol.asyncIterator]();let cancelled=false;
       const web=new ReadableStream({
        start(controller){webController=controller},
        async pull(controller){try{const part=await iterator.next();if(cancelled||stopped)return;if(part.done){if(trailer)throw Error('MEDIA_TRAILERS_REJECTED');controller.close();destroy()}else controller.enqueue(part.value)}catch(error){if(!cancelled)stop(error)}},
        cancel(){cancelled=true;destroy();void iterator.return?.().catch(()=>{})}
       });
       capture();resolved=true;resolve({status:incoming[':status'],redirected:false,headers:forwarded,body:web,nativeEncodingRejected:forwarded.has('content-encoding')&&forwarded.get('content-encoding')!=='identity',get nexusWire(){return lastWire}});
      }catch(error){stop(error)}
     });
     let offset=0;
     // Keep the existing 1024-byte framing and pacing for upload compatibility.
     const send=()=>{if(stopped||stream.destroyed||options.signal.aborted)return;if(offset===body.length){stream.end();return}const end=Math.min(offset+1024,body.length),chunk=body.subarray(offset,end);offset=end;stream.write(chunk,error=>{if(error){stop(error);return}if(!stopped&&!stream.destroyed&&!options.signal.aborted)sendTimer=setTimeout(send,2)})};
     send();
    }catch(error){stop(error)}
   };
   const entry={start,stop,streamId:()=>stream?.id};requests.add(entry);
   options.signal.addEventListener('abort',onAbort,{once:true});
   if(options.signal.aborted){onAbort();return}
   connect();if(ready)start();
  });
 };
 return Object.freeze({request,close});
}
// Only an individual photo read owns this session; its caller must close in finally.
// Every request still has its own signed envelope, nonce, authorization and body.
export const createMediaHTTP2Session=()=>transport();
// Uploads and legacy calls retain one connection for one RPC, with no retry.
export const requestMediaHTTP2=(url,options)=>transport({singleUse:true}).request(url,options);
