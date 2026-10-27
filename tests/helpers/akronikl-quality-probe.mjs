// Изолированная приёмка: настоящий Tutor/Core/индекс, только публичный корпус.
import {createKnowledgeIndex,createNexusContextAdapter,diagnosticFromNexus} from '../../akronikl/core/index.js';
import {createTutorSession} from '../../akronikl/tutor/session.js';
import {personalityPreset,updatePersonality} from '../../akronikl/personality/config.js';
import {resolveMessage} from '../../akronikl/experience/intents.js';
import {createPlatformGuide} from '../../akronikl/platform/service.js';
export function makeQualityProbe(c,engine,indices,{situation='unknown',humor=null}={}){
  let boundary={},calls=0,pending=null,packet=null,metrics=null,providerError=null;
  const selection=c.code?{filePath:'main.cpp',languageId:'cpp',revision:1,code:c.code,startLine:1,endLine:c.code.split('\n').length}:null;
  const primary=c.diagnostic?.split('\n').map(s=>/^main\.cpp:(\d+):(\d+):\s*error:/.exec(s)).find(Boolean);
  const diagnostics=primary?[diagnosticFromNexus({compilerDiagnostic:true,file:'main.cpp',line:+primary[1],column:+primary[2],raw:c.diagnostic},{selection,runRevision:1})]:[];
  const route=c.source?{course:'cpp',lesson:c.source.lessonId}:{view:selection?'code-studio':'akronikl'};
  const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>route,readLocale:()=>c.locale,readSelection:()=>selection,readDiagnostics:()=>diagnostics,authorize:({input})=>(input?.include||[]).every(k=>selection&&(k==='selection'||k==='diagnostics'&&diagnostics.length))});
  let style=personalityPreset('partner',c.locale);if(humor!==null)style=updatePersonality(style,{humor});
  const provider=engine?{kind:'local',transport:'in-process',modelId:engine.modelId,dispose(){},async generate(request){
    calls++;packet={messages:request.messages,allowedCitations:request.allowedCitations};
    pending=Promise.resolve().then(()=>engine.generate(request));
    try{return await pending;}catch(e){providerError=e?.name==='AbortError'?'AbortError':String(e?.message||'ERROR').slice(0,80);throw e;}
    finally{metrics=engine.measurements?.()??null;pending=null;}
  }}:null;
  const session=createTutorSession({host,loadKnowledge:async l=>indices[l],provider,locale:c.locale,readPersonality:()=>style,readCommunicationState:()=>situation});
  const action=c.kind==='compiler-diagnostic'?{kind:'tutor',intent:'diagnostic',followUp:false,text:c.prompt}:resolveMessage(c.prompt);
  const request={text:c.prompt,intent:action.intent||'explain',followUp:action.followUp===true,include:selection?['selection','diagnostics']:[]};
  return {session,action,async run(options){
    if(action.kind==='platform'){
      const guide=createPlatformGuide({isCurrent:()=>boundary!==null,readState:()=>({mode:'offline-public',connected:false,route}),onNavigate(){throw Error('QA_NAVIGATION_DENIED');},locale:c.locale});
      try{return {...guide.request(action.request),generated:false};}finally{guide.dispose();}
    }
    return session.ask(request,options);
  },details:()=>({calls,packet,metrics,providerError,situation,personality:style}),
  async settle(){const p=pending;if(!p)return true;return Promise.race([p.then(()=>true,()=>true),new Promise(r=>setTimeout(()=>r(false),5000))]);},
  invalidate(){boundary=null;session.cancel();},dispose(){session.dispose();}};
}
export function makeIndices(ru,en){return{ru:createKnowledgeIndex(ru),en:createKnowledgeIndex(en)};}
