import {createKnowledgeIndex} from '../../akronikl/core/index.js';
import {createCloudSettingsBroker} from '../../akronikl/tutor/cloud-settings-broker.js';
import {openAssistantPanel} from '../../akronikl/ui/panel.js';
const indexes={};for(const l of ['ru','en'])indexes[l]=createKnowledgeIndex(await(await fetch(`/akronikl/knowledge/core-index.${l}.json`)).json());
const rawOutcomes=[],broker=createCloudSettingsBroker({onOutcome:value=>rawOutcomes.push(value)});let panel=null,engine=null,calls=0,pending=null;
const cloudBroker=Object.freeze({settings:true,inspect:broker.inspect,listSaved:broker.listSaved,forget:broker.forget,async connect(options){
 const selected=await broker.connect(options);engine=selected;
 return {kind:'cloud',transport:'trusted-broker',modelId:selected.modelId,providerId:selected.providerId,connectionVerified:selected.connectionVerified,remembered:selected.remembered,chat:request=>selected.chat(request),
  async generate(request){calls++;const task=selected.generate(request);pending=task;try{return await task;}finally{if(pending===task)pending=null;}},
  dispose:()=>selected.dispose()};
}});
const root=document.querySelector('#root'),trigger=document.querySelector('#open');
trigger.onclick=()=>{panel?.dispose();panel=openAssistantPanel({root,trigger,readIdentity:()=>identity,readRoute:()=>({course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>null,cloudBroker,loadKnowledge:async l=>indexes[l]});};
let identity={};
window.qaSettings={get calls(){return calls;},get pending(){return !!pending;},outcomes:()=>structuredClone(rawOutcomes),metrics:()=>engine?.measurements()??null,lock(){identity=null;window.dispatchEvent(new Event('nexus:context-invalidated'));},async close(){panel?.dispose();await engine?.dispose();},};
