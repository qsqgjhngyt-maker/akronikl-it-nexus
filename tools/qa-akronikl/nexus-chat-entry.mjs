// Isolated frontend host; Account proof and lazy assistant bridge are production source modules.
import {createNexusBootstrap} from '../../core/bootstrap-engine.js';
import {verifiedAccount} from '../../core/account-storage.js';
import {createLazyAssistantBridge} from '../../akronikl/context.js';
import {logout} from '../../server-access/public/passkey-client.js';
import {createCloudSettingsBroker} from '../../akronikl/tutor/cloud-settings-broker.js';
import {createKnowledgeIndex} from '../../akronikl/core/index.js';
import {makeCase,blankReview} from './cases.mjs';
import {cloudSelection} from '../../akronikl/connections/cloud-catalog.js';
const root=document.querySelector('#root'),trigger=document.querySelector('[data-akronikl-open]');let ready=false,bridge;
const bootstrap=createNexusBootstrap({importApp:async()=>{ready=true;document.querySelector('#account').textContent=verifiedAccount().displayName;trigger.disabled=false;bridge=createLazyAssistantBridge({root,readIdentity:verifiedAccount,readReady:()=>ready,readRoute:()=>({course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>null});}});
addEventListener('nexus:context-invalidated',()=>{ready=false;trigger.disabled=true;});
document.querySelector('#logout').onclick=async()=>{await logout();dispatchEvent(new Event('nexus:session-ended'));};
let qualityEngine=null,qualityPending=null;const qualityCalls=[],qualityRaw=[],indexes={};
window.qaNexus={get ready(){return ready;},get accountId(){return verifiedAccount()?.accountId??null;},recheck:()=>bootstrap.recheck(),
 async connectQuality(){for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(await(await fetch('/akronikl/knowledge/core-index.'+l+'.json')).json());const broker=createCloudSettingsBroker({readIdentity:verifiedAccount,onOutcome:x=>qualityRaw.push(x)});qualityEngine=await broker.connect({...cloudSelection(),useSaved:true,remember:false});},
 async runQualityCase(item){if(!qualityEngine||qualityPending)throw Error('QA_ENGINE_NOT_IDLE');const before=qualityCalls.length,rawBefore=qualityRaw.length,start=performance.now();const lease={kind:'cloud',transport:'trusted-broker',modelId:qualityEngine.modelId,dispose(){},async generate(request){const row={request:{messages:request.messages,evidencePacket:request.evidencePacket,allowedCitations:request.allowedCitations},response:null,error:null};qualityCalls.push(row);const task=qualityEngine.generate(request);qualityPending=task;try{row.response=await task;return row.response;}catch(e){row.error=e.message;throw e;}finally{row.measurements=qualityEngine.measurements();qualityPending=null;}}};const f=makeCase(item,indexes,lease,{allowCloud:true});let response;try{response=await f.session.ask(f.request);}finally{f.session.dispose();}return{id:item.id,locale:item.locale,kind:item.kind,prompt:item.prompt,scope:'real-cloud-settings API and verified Nexus account; synthetic course/diagnostic host fixtures; isolated backend',uiRoute:f.resolved,requestedIntent:f.request.intent,modelCalled:qualityCalls.length>before,response,callerElapsedMs:performance.now()-start,consentReads:f.reads,drained:qualityPending===null,providerOutcomes:structuredClone(qualityCalls.slice(before)),rawModelOutcomes:structuredClone(qualityRaw.slice(rawBefore)),review:blankReview()};},
 async closeQuality(){await qualityEngine?.dispose();qualityEngine=null;return {pending:qualityPending!==null};}
};
await bootstrap.startNexus();
