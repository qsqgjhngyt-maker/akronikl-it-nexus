import {createKnowledgeIndex} from '../../akronikl/core/index.js';
import {createQwenBrokerConnection} from '../../akronikl/tutor/qwen-broker.js';
import {openAssistantPanel} from '../../akronikl/ui/panel.js';
import {makeCase,blankReview} from './cases.mjs';
const corpus=await(await fetch('/tests/fixtures/akronikl-tutor-quality-v1.json')).json(),indexes={};
for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(await(await fetch(`/akronikl/knowledge/core-index.${l}.json`)).json());
const outcomes=[],rawOutcomes=[];let engine=null,pending=null,panel=null,calls=0,identity={};
const broker=createQwenBrokerConnection({onOutcome:x=>rawOutcomes.push(x)});
function lease(){return {kind:'cloud',transport:'trusted-broker',modelId:engine.modelId,
 async generate(request){
  calls++;const record={call:calls,request:{messages:request.messages,evidencePacket:request.evidencePacket,allowedCitations:request.allowedCitations},response:null,error:null};outcomes.push(record);const start=performance.now(),task=engine.generate(request);pending=task;
  try{record.response=await task;return record.response;}catch(e){record.error=e.message;throw e;}finally{record.elapsedMs=performance.now()-start;record.measurements=engine.measurements();if(pending===task)pending=null;}
 },dispose(){}};}
const connection=Object.freeze({inspect:broker.inspect,async connect(options){engine=await broker.connect(options);return lease();}});
async function settle(){if(!pending)return true;let timer;try{return await Promise.race([pending.then(()=>true,()=>true),new Promise(r=>timer=setTimeout(()=>r(false),15000))]);}finally{clearTimeout(timer);}}
const root=document.querySelector('#root'),trigger=document.querySelector('#open');
trigger.onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,trigger,readIdentity:()=>identity,readRoute:()=>({course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>null,cloudBroker:connection});};
window.qa={corpus,get calls(){return calls;},get loaded(){return !!engine;},get pending(){return !!pending;},outcomes:()=>structuredClone(outcomes),rawOutcomes:()=>structuredClone(rawOutcomes),measurements:()=>engine?.measurements()??null,lifecycle:()=>engine?.lifecycle()??null,settle,
 async runCase(item){
  if(!engine||pending)throw Error('QA_ENGINE_NOT_IDLE');const before=calls,rawBefore=rawOutcomes.length,start=performance.now(),f=makeCase(item,indexes,lease(),{allowCloud:true});
  let response;try{response=await f.session.ask(f.request);}finally{f.session.dispose();}
  return {id:item.id,locale:item.locale,kind:item.kind,prompt:item.prompt,scope:'real-cloud-api; synthetic-host; no-production-account',uiRoute:f.resolved,requestedIntent:f.request.intent,modelCalled:calls>before,response,callerElapsedMs:performance.now()-start,visibleAnswerMs:null,consentReads:f.reads,drained:await settle(),measurements:calls>before?engine.measurements():null,providerOutcomes:structuredClone(outcomes.slice(before)),rawModelOutcomes:structuredClone(rawOutcomes.slice(rawBefore)),review:blankReview()};
 },async close(){panel?.dispose();await engine?.dispose();await settle();return engine?.lifecycle()??null;}
};
