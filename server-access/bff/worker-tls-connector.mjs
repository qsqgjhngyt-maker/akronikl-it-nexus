import {lookup as dnsLookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import tls from 'node:tls';
import {WORKER_ORIGIN} from './account-read.mjs';
const hostname=new URL(WORKER_ORIGIN).hostname;
function publicIPv4(value){
 if(isIP(value)!==4)return false;const [a,b,c]=value.split('.').map(Number);
 return a!==0&&a!==10&&a!==127&&a<224&&!(a===100&&b>=64&&b<=127)&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0||b===2))&&!(a===198&&(b===18||b===19||b===51&&c===100))&&!(a===203&&b===0&&c===113);
}
const error=code=>Object.assign(new Error(code),{code});
// Measured OpenSSL 3.5 interoperability profile; CA/SNI and TLS 1.3 stay enabled.
// Race handshakes, never HTTP requests. Only the winning verified socket reaches Undici.
export function createWorkerTLSConnector({lookup=dnsLookup,connect=tls.connect,timeoutMs=1800,staggerMs=150}={}){
 return function workerConnect(options,callback){
  if(options.hostname!==hostname||options.protocol!=='https:'||options.port&&String(options.port)!=='443'||options.servername&&options.servername!==hostname||options.httpSocket||options.localAddress){queueMicrotask(()=>callback(error('NEXUS_WORKER_ORIGIN_DENIED'),null));return;}
  let settled=false,next=0,inFlight=0,addresses=[],stagger,lastError;const sockets=new Set();
  function finish(cause,winner){
   if(settled){if(winner)winner.destroy();return;}settled=true;clearTimeout(deadline);clearTimeout(stagger);
   for(const socket of sockets)if(socket!==winner)socket.destroy();sockets.clear();callback(cause??null,winner??null);
  }
  const deadline=setTimeout(()=>finish(error('UND_ERR_CONNECT_TIMEOUT')),timeoutMs);
  function launch(){
   clearTimeout(stagger);if(settled||next>=addresses.length)return;const address=addresses[next++];inFlight++;let socket,failed=false;
   const fail=cause=>{if(failed||settled)return;failed=true;inFlight--;lastError=cause;socket?.destroy();if(next<addresses.length)launch();else if(!inFlight)finish(lastError??error('NEXUS_WORKER_CONNECT_FAILED'));};
   try{
    socket=connect({host:address,port:443,servername:hostname,rejectUnauthorized:true,ecdhCurve:'X25519:P-256',ALPNProtocols:['http/1.1'],family:4,autoSelectFamily:false});sockets.add(socket);socket.setNoDelay?.(true);
    socket.on('error',fail);socket.once('close',()=>{if(!settled&&!failed)fail(error('ECONNRESET'));});
    socket.once('secureConnect',()=>{
     if(settled||failed){socket.destroy();return;}
     const identityError=tls.checkServerIdentity(hostname,socket.getPeerCertificate());
     if(socket.authorized!==true||identityError||socket.alpnProtocol&&socket.alpnProtocol!=='http/1.1'){fail(identityError??error('NEXUS_WORKER_TLS_REJECTED'));return;}
     finish(null,socket);
    });
   }catch(cause){fail(cause);}
   if(!failed&&!settled&&next<addresses.length)stagger=setTimeout(launch,staggerMs);
  }
  Promise.resolve().then(()=>lookup(hostname,{all:true,family:4,verbatim:true})).then(records=>{
   if(settled)return;addresses=[...new Set(records.filter(r=>r.family===4&&publicIPv4(r.address)).map(r=>r.address))].slice(0,4);
   if(!addresses.length){finish(error('NEXUS_WORKER_DNS_REJECTED'));return;}launch();
  },cause=>{if(!settled)finish(cause);});
 };
}
