import {Agent,getGlobalDispatcher,setGlobalDispatcher} from 'undici';
import {WORKER_ORIGIN} from './account-read.mjs';
import {createWorkerTLSConnector} from './worker-tls-connector.mjs';
const installed=Symbol.for('nexus.worker.network.tls-race.v1');
export function createWorkerDispatcher({fallback,worker}){
 return {
  dispatch(options,handler){let url;try{url=new URL(String(options.origin));}catch{}const target=url?.origin===WORKER_ORIGIN&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password;return target?worker.dispatch(options,handler):fallback.dispatch(options,handler);},
  async close(){await Promise.all([worker.close(),fallback.close()]);},
  async destroy(cause){await Promise.all([worker.destroy(cause),fallback.destroy(cause)]);}
 };
}
export function installWorkerNetwork(){
 if(globalThis[installed])return;
 const fallback=getGlobalDispatcher(),worker=new Agent({connect:createWorkerTLSConnector(),connections:4,pipelining:1,maxOrigins:1});
 const dispatcher=createWorkerDispatcher({fallback,worker});
 setGlobalDispatcher(dispatcher);Object.defineProperty(globalThis,installed,{value:true});
}
