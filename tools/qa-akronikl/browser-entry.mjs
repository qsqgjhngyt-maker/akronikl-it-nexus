// Изолированный браузерный QA-host. Нет Account/backend и пользовательских данных.
import {createKnowledgeIndex} from '../../akronikl/core/index.js';
import {loadLocalModel} from '../../akronikl/tutor/local-model.js';
import {probeWebGPU} from '../../akronikl/connections/probe.js';
import {openAssistantPanel} from '../../akronikl/ui/panel.js';
import {makeCase,blankReview} from './cases.mjs';

const corpus=await(await fetch('/tests/fixtures/akronikl-tutor-quality-v1.json')).json();
const indexes={};for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(await(await fetch(`/akronikl/knowledge/core-index.${l}.json`)).json());
let engine=null,pending=null,active=null,calls=0,modelLoadMs=null,identity={},panel=null;const outcomes=[];
const pageHeap=()=>Number.isSafeInteger(performance.memory?.usedJSHeapSize)?performance.memory.usedJSHeapSize:null;
const beforeHeap=pageHeap();
function lease(){return{kind:'local',transport:'in-process',modelId:engine.modelId,
  async generate(request){calls++;const record={call:calls,request:{messages:request.messages,allowedCitations:request.allowedCitations},startedMs:performance.now(),response:null,error:null};outcomes.push(record);const task=engine.generate(request);pending=task;try{record.response=await task;return record.response;}catch(e){record.error=e.message;throw e;}finally{record.elapsedMs=performance.now()-record.startedMs;record.measurements=engine.measurements();if(pending===task)pending=null;}},dispose(){}};}
async function settle(){if(!pending)return true;let timer;try{return await Promise.race([pending.then(()=>true,()=>true),new Promise(r=>timer=setTimeout(()=>r(false),15000))]);}finally{clearTimeout(timer);}}
const root=document.querySelector('#root'),trigger=document.querySelector('#open');
trigger.onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,trigger,readIdentity:()=>identity,
 readRoute:()=>({course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>null,
 async loadTutorModel(file,options){if(engine)throw Error('QA_ALREADY_LOADED');const start=performance.now();engine=await loadLocalModel(file,options);modelLoadMs=performance.now()-start;return lease();}});};
window.qa={corpus,
 get calls(){return calls;},outcomes:()=>structuredClone(outcomes),lifecycle:()=>engine?.lifecycle()??null,
 get pending(){return !!pending;},get loaded(){return !!engine;},
 async environment(){return{modelLoadMs,jsHeapBeforeLoad:beforeHeap,jsHeapAfterLoad:pageHeap(),webgpuProbe:await probeWebGPU(),hardwareInferenceTested:false,
   userAgent:navigator.userAgent,cpuLogicalProcessors:navigator.hardwareConcurrency??null,deviceMemoryGiB:navigator.deviceMemory??null};},
 async runCase(item){
  if(!engine||pending)throw Error('QA_ENGINE_NOT_IDLE');
  const before=calls,start=performance.now();active=makeCase(item,indexes,lease());
  let response;try{response=await active.session.ask(active.request);}finally{active.session.dispose();}
  const total=performance.now()-start,drained=await settle();
  const row={id:item.id,locale:item.locale,kind:item.kind,prompt:item.prompt,
    scope:'real-tutor-core-model; synthetic-host; no-full-app-account',uiRoute:active.resolved,requestedIntent:active.request.intent,
    modelCalled:calls>before,response,realModel:calls>before,measurements:calls>before?engine.measurements():null,
    callerElapsedMs:total,visibleAnswerMs:null,consentReads:active.reads,drained,providerOutcomes:structuredClone(outcomes.slice(before)),lifecycle:engine.lifecycle(),review:blankReview()};
  active=null;return row;
 },
 measurements:()=>engine?.measurements()??null,
 settle,
 lock(){identity=null;active?.lock();window.dispatchEvent(new Event('nexus:context-invalidated'));},
 async close(){panel?.dispose();active?.session.dispose();await settle();if(engine)await engine.dispose();const lifecycle=engine?.lifecycle();engine=null;return{lifecycle,jsHeapAfterDispose:pageHeap(),memoryScope:'page JS heap only; not Worker/WASM/RSS; no full-memory-erasure claim'};}
};
