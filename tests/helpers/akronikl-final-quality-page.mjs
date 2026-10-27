// QA only. Public course questions and synthetic host; actual P4 UI/session/runtime.
import {openAssistantPanel} from '../../akronikl/ui/panel.js';
import {loadLocalModel} from '../../akronikl/tutor/local-model.js';
import {createCodeWorkspace} from '../../sandbox/code-workspace.js';
import {createNexusContextAdapter} from '../../akronikl/core/index.js';
import {createTutorSession} from '../../akronikl/tutor/session.js';
import {loadUiKnowledge} from '../../akronikl/ui/knowledge-loader.js';

window.prepareQualityCase = c => {
  const root=document.querySelector('#root'),editor=document.querySelector('#editor');
  const code=c.code??'int synthetic_value = 1;';
  const workspace=createCodeWorkspace({files:[{path:'main.cpp',content:code,languageId:'cpp'}]});
  editor.value=code;editor.setSelectionRange(0,code.length);editor.__nexusCodeStudio={workspace};
  const identity={},route=c.source?{course:'cpp',lesson:c.source.lessonId}:{view:'code-studio',project:'synthetic-quality'};
  const f=window.qualityFixture={c,root,editor,workspace,identity,route,calls:[],loads:[],pending:0,disposed:0,observer:null,askedAt:null,renderedAt:null};
  f.begin=()=>{f.askedAt=performance.now();f.renderedAt=null;f.calls=[];f.observer?.disconnect();
    f.observer=new MutationObserver(()=>{if(f.renderedAt!==null)return;const all=[...root.querySelectorAll('[data-ak-message="assistant"]')];
      if(all.length>f.assistantCount&&all.at(-1)?.querySelector('.ak-message-text')?.textContent)f.renderedAt=performance.now();});
    f.assistantCount=root.querySelectorAll('[data-ak-message="assistant"]').length;
    f.observer.observe(root,{childList:true,subtree:true,characterData:true});};
  const load=async(file,settings)=>{
    const start=performance.now();const raw=await loadLocalModel(file,settings);
    f.loads.push({checkAndLoadMs:performance.now()-start,profile:settings.profile});
    const wrapped={kind:raw.kind,transport:raw.transport,modelId:raw.modelId,measurements:()=>raw.measurements(),
      async generate(args){
        const call={messages:structuredClone(args.messages),allowedCitations:[...args.allowedCitations],started:performance.now()};f.calls.push(call);f.pending++;
        try{const answer=await raw.generate(args);call.rawResponse=structuredClone(answer);return answer;}
        catch(e){call.errorCode=String(e.message).slice(0,120);throw e;}
        finally{call.measurement=raw.measurements();call.finished=performance.now();f.pending--;}
      },async dispose(){f.disposed++;await raw.dispose();}};
    f.provider=wrapped;return wrapped;
  };
  f.panel=openAssistantPanel({root,trigger:document.querySelector('#open'),readIdentity:()=>f.identity,readRoute:()=>route,
    readLocale:()=>c.locale,readCourseLocale:()=>c.locale,readEditor:()=>editor,loadTutorModel:load});
  f.capture=()=>{
    const item=[...root.querySelectorAll('[data-ak-message="assistant"]')].at(-1);
    return {answer:item?.querySelector('.ak-message-text')?.textContent??'',generated:item?.dataset.tutorGenerated==='true',
      badge:item?.querySelector('.ak-message-kind')?.textContent??null,
      sources:[...(item?.querySelectorAll('.ak-source')??[])].map(n=>({title:n.querySelector('strong')?.textContent,text:n.querySelector('p,pre')?.textContent,origin:n.querySelector('details small')?.textContent})),
      calls:f.calls,load:f.loads.at(-1),firstDisplayedMs:f.renderedAt===null?null:f.renderedAt-f.askedAt,
      fullUiMs:f.askedAt===null?null:performance.now()-f.askedAt,pending:f.pending};};
  // Separate programmatic contract test. This is NOT a connected compiler UI.
  f.diagnosticContract=async()=>{
    const boundary={},revision=workspace.revision;
    const selection={filePath:'main.cpp',languageId:'cpp',revision,code,startLine:1,endLine:code.split('\n').length};
    const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>({view:'code-studio',project:'synthetic-quality'}),
      readLocale:()=>c.locale,readCourseLocale:()=>c.locale,readSelection:()=>selection,
      readDiagnostics:()=>[{source:'compiler',severity:'error',filePath:'main.cpp',revision,message:c.diagnostic}],authorize:()=>true});
    const session=createTutorSession({host,loadKnowledge:loadUiKnowledge,provider:f.provider,locale:c.locale});
    f.calls=[];const started=performance.now();
    const result=await session.ask({text:c.prompt,intent:'diagnostic',include:['selection','diagnostics']});
    const output={result,calls:f.calls,totalMs:performance.now()-started,scope:'programmatic-diagnostic-contract-not-integrated-ui'};
    session.dispose();return output;
  };
  return true;
};
