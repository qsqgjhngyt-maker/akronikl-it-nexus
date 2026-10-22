// Только счётчики своего transport socket. Адреса, порты, payload и headers не возвращаются.
import {openSync,readSync,closeSync} from 'node:fs';
const number=value=>Number.isSafeInteger(value)&&value>=0&&value<=0xffffffff?value:0;
export const WIRE_FIELDS=Object.freeze(['v','tcp','tls','finished','written','read','writeq','h2q','kernel','ktx','krx','kstate','retrans']);
export function parseOwnTCPRow(text,port,remotePort=443){
 if(typeof text!=='string'||text.length>65536||!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(remotePort)||remotePort<1||remotePort>65535)return null;
 const suffix=':'+port.toString(16).padStart(4,'0').toUpperCase();
 const remoteSuffix=':'+remotePort.toString(16).padStart(4,'0').toUpperCase();
 const matches=text.split('\n').map(v=>v.trim().split(/\s+/)).filter(v=>v[1]?.endsWith(suffix)&&v[2]?.endsWith(remoteSuffix));
 if(matches.length!==1)return null;const row=matches[0];
 if(!/^[0-9A-F]{2}$/i.test(row[3])||!/^([0-9A-F]{8}):([0-9A-F]{8})$/i.test(row[4])||!/^[0-9A-F]{8}$/i.test(row[6]))return null;
 const [tx,rx]=row[4].split(':').map(v=>parseInt(v,16));return {kernel:1,ktx:tx,krx:rx,kstate:parseInt(row[3],16),retrans:parseInt(row[6],16)};
}
export function socketProgress(socket,state,session,stream){
 const out={v:1,tcp:state?.tcp===true?1:0,tls:state?.tls===true?1:0,finished:state?.finished===true?1:0,written:0,read:0,writeq:0,h2q:0,kernel:0,ktx:0,krx:0,kstate:0,retrans:0};
 try{out.written=number(socket?.bytesWritten);out.read=number(socket?.bytesRead);out.writeq=number(socket?.writableLength);out.h2q=number(session?.state?.outboundQueueSize)+number(stream?.writableLength)}catch{}
 try{if(process.platform==='linux'&&Number.isInteger(socket?.remotePort)&&Number.isInteger(socket.localPort)){
  let fd;try{fd=openSync('/proc/net/tcp','r');const bytes=Buffer.alloc(65536),size=readSync(fd,bytes,0,bytes.length,null);if(size<bytes.length){const row=parseOwnTCPRow(bytes.subarray(0,size).toString('ascii'),socket.localPort,socket.remotePort);if(row)Object.assign(out,row)}}catch{}finally{if(fd!==undefined)try{closeSync(fd)}catch{}}
 }}catch{}
 return Object.freeze(out);
}
export function wireHeaders(value){
 if(!value||value.v!==1||Object.keys(value).some(key=>!WIRE_FIELDS.includes(key))||!WIRE_FIELDS.every(key=>Number.isSafeInteger(value[key])&&value[key]>=0&&value[key]<=0xffffffff))return {};
 if(['tcp','tls','finished','kernel'].some(key=>value[key]>1)||value.kstate>255)return {};
 return Object.fromEntries(WIRE_FIELDS.map(key=>['x-nexus-wire-'+key,String(value[key])]));
}
