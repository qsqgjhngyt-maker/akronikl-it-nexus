// Один native HTTPS POST к фиксированному Worker. Без fallback, redirect и повторов.
import https from 'node:https';
import {WORKER_ORIGIN} from './account-read.mjs';
const path='/api/v2/account/internal/control';
const inputError=()=>Object.assign(Error('MEDIA_TRANSPORT_INPUT'),{code:'NEXUS_MEDIA_INPUT'});
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNRESET','EPIPE','ENETUNREACH','EHOSTUNREACH','ECONNREFUSED','ETIMEDOUT','ABORT_ERR','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED']);
const failed=(error,state)=>Object.assign(Error('MEDIA_TRANSPORT_FAILED',{cause:{code:networkCodes.has(error?.code)?error.code:'NEXUS_NATIVE_NETWORK'}}),{nexusPhase:!state.tcp?(state.lookup?'tcp':'dns'):!state.tls?'tls':!state.finished?'upload':'response'});
export function requestMediaHTTPS(url,options){
 if(url!==WORKER_ORIGIN+path||options?.method!=='POST'||options.credentials!=='omit'||options.cache!=='no-store'||options.redirect!=='error'||typeof options.body!=='string'||!(options.signal instanceof AbortSignal))return Promise.reject(inputError());
 const body=Buffer.from(options.body),headers=options.headers;
 if(body.length>262144||!headers||Object.keys(headers).sort().join(',')!==['accept','content-type','x-nexus-service-nonce','x-nexus-service-signature','x-nexus-service-timestamp'].sort().join(',')||headers.accept!=='application/json'||headers['content-type']!=='application/json')return Promise.reject(inputError());
 const state={lookup:false,tcp:false,tls:false,finished:false};
 return new Promise((resolve,reject)=>{
  let resolved=false,request;
  try{
   request=https.request({hostname:new URL(WORKER_ORIGIN).hostname,port:443,path,method:'POST',family:4,autoSelectFamily:false,agent:false,rejectUnauthorized:true,signal:options.signal,headers:{...headers,'content-length':body.length,'accept-encoding':'identity'}},response=>{
    try{
    const forwarded=new Headers();
    for(let i=0;i<response.rawHeaders.length;i+=2)forwarded.append(response.rawHeaders[i],response.rawHeaders[i+1]);
    // Проверяем отмену после await: поздний data не попадёт в уже закрытый controller.
    response.on('error',()=>{});
    const iterator=response[Symbol.asyncIterator]();let cancelled=false;
    const web=new ReadableStream({
     async pull(controller){try{
      const part=await iterator.next();if(cancelled)return;
      if(part.done){if(response.rawTrailers?.length){controller.error(Object.assign(Error('MEDIA_TRAILERS_REJECTED'),{code:'NEXUS_MEDIA_TRAILERS'}));return}controller.close()}
      else controller.enqueue(part.value);
     }catch(error){if(!cancelled)controller.error(failed(error,state))}},
     cancel(){cancelled=true;response.destroy();void iterator.return?.().catch(()=>{})}
    });
    resolved=true;
    resolve({status:response.statusCode,redirected:false,headers:forwarded,body:web,nativeEncodingRejected:forwarded.has('content-encoding')&&forwarded.get('content-encoding')!=='identity'});
    }catch(error){response.destroy();request.destroy();reject(failed(error,state))}
   });
   request.once('socket',socket=>{
    socket.once('lookup',error=>{if(!error)state.lookup=true});
    socket.once('connect',()=>{state.tcp=true});
    socket.once('secureConnect',()=>{state.tls=true});
   });
   request.once('finish',()=>{state.finished=true});
   request.once('error',error=>{if(!resolved)reject(failed(error,state))});
   // Не накапливаем дополнительную очередь больших write: следующий кусок после drain.
   let offset=0;
   const send=()=>{
    if(request.destroyed||options.signal.aborted)return;
    while(offset<body.length){const end=Math.min(offset+16384,body.length),chunk=body.subarray(offset,end);offset=end;if(!request.write(chunk)){request.once('drain',send);return}}
    request.end();
   };
   send();
  }catch(error){request?.destroy();reject(failed(error,state))}
 });
}
