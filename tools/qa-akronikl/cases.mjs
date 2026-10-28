// P4-Q: подготовка только синтетических сценариев из утверждённого корпуса.
// Не генерирует ответов и не назначает педагогический PASS.
import {createNexusContextAdapter, diagnosticFromNexus} from '../../akronikl/core/index.js';
import {createTutorSession} from '../../akronikl/tutor/session.js';
import {resolveMessage} from '../../akronikl/experience/intents.js';
import {personalityPreset} from '../../akronikl/personality/config.js';

export function makeCase(item, indexes, provider, {readPersonality=null, situation='unknown'}={}) {
  if (!item || typeof item.id!=='string' || !['ru','en'].includes(item.locale)) throw Error('QA_CASE_INVALID');
  let boundary=Object.freeze({});
  const route=item.source?.lessonId
    ? {view:'lesson',course:'cpp',lesson:item.source.lessonId}
    : {view:'code-studio',project:'qa-synthetic'};
  const selected=item.kind==='compiler-diagnostic'
    ? {filePath:'main.cpp',languageId:'cpp',revision:1,code:item.code,startLine:1,endLine:item.code.split('\n').length}
    : null;
  let diagnostics=[];
  if(selected) {
    const m=item.diagnostic.match(/^main\.cpp:(\d+):(\d+):\s*(?:fatal error|error|warning):/m);
    if(!m) throw Error('QA_DIAGNOSTIC_COORDINATES_MISSING');
    const value=diagnosticFromNexus({compilerDiagnostic:true,file:'main.cpp',line:+m[1],column:+m[2],raw:item.diagnostic},{selection:selected,runRevision:1});
    if(!value) throw Error('QA_DIAGNOSTIC_REJECTED');
    diagnostics=[value];
  }
  let reads={selection:0,diagnostics:0};
  const include=selected?['selection','diagnostics']:[];
  const host=createNexusContextAdapter({readBoundary:()=>boundary,readRoute:()=>route,
    readLocale:()=>item.locale,readCourseLocale:()=>item.locale,
    readSelection:()=>{reads.selection++;return selected;},
    readDiagnostics:()=>{reads.diagnostics++;return diagnostics;},
    authorize:q=>(q.input?.include??[]).every(k=>include.includes(k))});
  const resolved=resolveMessage(item.prompt);
  const request={text:item.prompt,intent:selected?'diagnostic':resolved.kind==='tutor'?resolved.intent:'explain',
    followUp:selected?false:resolved.kind==='tutor'?resolved.followUp:false,include};
  const style=personalityPreset('mentor',item.locale);
  const session=createTutorSession({host,loadKnowledge:async language=>indexes[language],provider,locale:item.locale,
    readPersonality:readPersonality??(()=>style),readCommunicationState:()=>situation});
  return {session,request,resolved,host,reads,diagnostics,lock(){boundary=null;},change(){boundary={};}};
}

export const blankReview=()=>({status:'NOT_REVIEWED',reviewer:null,independent:false,
  correctness:null,completeness:null,beginnerClarity:null,exampleUse:null,grounding:null,pedagogicalSequence:null,
  criticalFailures:[],notes:[]});
