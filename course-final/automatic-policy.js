// Проверяется поведение по фиксированному контракту. Это самостоятельная,
// непрокторируемая работа: браузерные наблюдения не доказывают авторство.
export const AUTOMATIC_POLICY='automatic-self-study-v1';
export const AUTOMATIC_PROFILE='nexus-cpp-final-checks-v1';
export const THEORY_IDS=Object.freeze([...Array.from({length:12},(_,i)=>'C'+String(i+1).padStart(2,'0')),...Array.from({length:8},(_,i)=>'D'+String(i+1).padStart(2,'0'))]);
export const PRACTICAL_CHECKS=Object.freeze({
 P1:Object.freeze({build:3,validRecords:3,boundaries:3,invalidRecords:3,atomicFailure:3}),
 P2:Object.freeze({build:3,indexOrder:3,knownKey:3,absentKey:3,duplicates:3}),
 P3:Object.freeze({build:3,independentOwnership:3,moveReuse:3,invalidReplacement:3,atomicFailure:3}),
 P4:Object.freeze({build:3,guiAction:3,rejectedAction:3,saveRoundTrip:3,atomicLoad:3})
});
// Баллы за конкретные наблюдаемые требования, без автоматической оценки
// красоты архитектуры, полноты обоснования или происхождения исходников.
export const PROJECT_CHECKS=Object.freeze(Object.fromEntries([
 'build','createValid','createBoundary','rejectInvalid','rejectDuplicate',
 'actionValid','actionBoundary','rejectActionAtomic','unknownIdAtomic','stableOrder',
 'filterSubset','filterRestores','saveRoundTrip','badLoadAtomic','futureVersionAtomic',
 'guiAdd','guiAction','guiReject','guiRestore','portableRoundTrip'
].map(id=>[id,5])));
export const DEFENSE_CHECKS=Object.freeze({build:25,newBehavior:25,boundary:25,regression:25});
export const PROJECT_REQUIRED=Object.freeze(['build','rejectActionAtomic','unknownIdAtomic','saveRoundTrip','badLoadAtomic','futureVersionAtomic','guiAdd','guiAction','guiReject','guiRestore','portableRoundTrip']);
export const DEFENSE_CHALLENGES=Object.freeze({taskflow:'taskflow.reopen.v1',finance:'finance.transfer-limit.v1',logscope:'logscope.component-filter.v1'});
const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const hash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const fail=()=>{throw Object.assign(Error('ASSESSMENT_AUTOMATIC_INVALID'),{code:'ASSESSMENT_AUTOMATIC_INVALID'})};
function checks(value,maxima){if(!exact(value,Object.keys(maxima))||Object.values(value).some(v=>typeof v!=='boolean'))fail();return value}
function observation(value,maxima){if(value===null)return null;if(!exact(value,['sourceHash','checks'])||!hash(value.sourceHash))fail();checks(value.checks,maxima);return value}
export function validateAutomaticEvidence(value,{trackId,validateSource}){
 if(!exact(value,['profile','practical','project','defense'])||value.profile!==AUTOMATIC_PROFILE||!exact(value.practical,Object.keys(PRACTICAL_CHECKS)))fail();
 for(const[id,maxima]of Object.entries(PRACTICAL_CHECKS))observation(value.practical[id],maxima);observation(value.project,PROJECT_CHECKS);
 const d=value.defense;if(d!==null){if(!exact(d,['source','sourceHash','baselineHash','challengeId','checks'])||!hash(d.sourceHash)||!hash(d.baselineHash)||d.challengeId!==DEFENSE_CHALLENGES[trackId])fail();validateSource(d.source);checks(d.checks,DEFENSE_CHECKS)}
 return value;
}
export function validateTheoryChoices(value){if(!exact(value,THEORY_IDS)||Object.values(value).some(v=>v!==null&&!['o1','o2','o3','o4'].includes(v)))fail();return value}
export function validateAutomaticProof(value){
 if(!exact(value,['policy','choices','practical','project','defense','codeChanged'])||value.policy!==AUTOMATIC_POLICY||typeof value.codeChanged!=='boolean')fail();validateTheoryChoices(value.choices);
 if(!exact(value.practical,Object.keys(PRACTICAL_CHECKS)))fail();for(const[id,maxima]of Object.entries(PRACTICAL_CHECKS))checks(value.practical[id],maxima);checks(value.project,PROJECT_CHECKS);checks(value.defense,DEFENSE_CHECKS);return value;
}
export const emptyChecks=maxima=>Object.fromEntries(Object.keys(maxima).map(k=>[k,false]));
export function calculateAutomatic(proof,privateKeys){
 validateAutomaticProof(proof);
 if(!exact(privateKeys,THEORY_IDS)||Object.values(privateKeys).some(v=>!['o1','o2','o3','o4'].includes(v)))throw Object.assign(Error('ASSESSMENT_KEYS_UNAVAILABLE'),{code:'ASSESSMENT_KEYS_UNAVAILABLE'});
 const theory=Object.fromEntries(THEORY_IDS.map(id=>[id,proof.choices[id]===privateKeys[id]?2:0]));
 const score=(out,maxima)=>Object.entries(maxima).reduce((n,[id,max])=>n+(out[id]?max:0),0);
 const practical=Object.fromEntries(Object.entries(PRACTICAL_CHECKS).map(([id,max])=>[id,proof.practical[id].build?score(proof.practical[id],max):0]));
 const exam=Object.values(theory).reduce((a,b)=>a+b,0)+Object.values(practical).reduce((a,b)=>a+b,0);
 const project=proof.project.build?score(proof.project,PROJECT_CHECKS):0;
 const defense=proof.codeChanged&&proof.defense.build?score(proof.defense,DEFENSE_CHECKS):0;
 const blockingReasons=[];
 if(Object.values(theory).reduce((a,b)=>a+b,0)<24)blockingReasons.push('exam-theory-minimum');
 for(const[id,points]of Object.entries(practical))if(points<9)blockingReasons.push('exam-'+id+'-minimum');
 if(!proof.practical.P4.build)blockingReasons.push('practical-gui-build');
 for(const id of PROJECT_REQUIRED)if(!proof.project[id])blockingReasons.push('project-'+id);
 if(!proof.codeChanged)blockingReasons.push('defense-code-unchanged');
 if(!proof.defense.newBehavior)blockingReasons.push('defense-control-change');
 if(!proof.defense.boundary)blockingReasons.push('defense-boundary');
 if(!proof.defense.regression)blockingReasons.push('defense-regression');
 const passed=exam>=60&&project>=60&&defense>=60&&blockingReasons.length===0;
 return{exam,project,defense,weighted:Math.round((.4*exam+.5*project+.1*defense)*100)/100,status:passed?'passed':'requires-revision',policyVersion:AUTOMATIC_POLICY,empiricallyValidated:false,authority:'automatic-self-study',credentialEligible:false,theoryVerifiedServer:true,codeVerifiedServer:false,breakdown:{theory,practical,practicalChecks:Object.fromEntries(Object.entries(proof.practical).map(([id,out])=>[id,{...out}])),project:{...proof.project},defense:{...proof.defense}},blockingReasons};
}
export function stableJSON(value){
 if(Array.isArray(value))return'['+value.map(stableJSON).join(',')+']';
 if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJSON(value[k])).join(',')+'}';return JSON.stringify(value);
}
export function sourceIdentity(project,{codeOnly=false}={}){
 const files=project.workspace.files.filter(f=>!codeOnly||/\.(?:c|cc|cpp|cxx|h|hh|hpp|hxx)$/i.test(f.path)).map(f=>({path:f.path,content:f.content})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 return stableJSON(codeOnly?files:{entryFile:project.workspace.entryFile,files,manifest:project.manifest});
}
export function validAutomaticResult(value){
 try{
  if(!exact(value,['exam','project','defense','weighted','status','policyVersion','empiricallyValidated','authority','credentialEligible','theoryVerifiedServer','codeVerifiedServer','breakdown','blockingReasons'])||!exact(value.breakdown,['theory','practical','practicalChecks','project','defense'])||!exact(value.breakdown.theory,THEORY_IDS)||Object.values(value.breakdown.theory).some(n=>n!==0&&n!==2)||!exact(value.breakdown.practical,Object.keys(PRACTICAL_CHECKS))||!exact(value.breakdown.practicalChecks,Object.keys(PRACTICAL_CHECKS)))return false;
  // Восстанавливаем баллы по DTO, не пытаясь проверять закрытый answer key в UI.
  for(const[id,points]of Object.entries(value.breakdown.practical)){const out=checks(value.breakdown.practicalChecks[id],PRACTICAL_CHECKS[id]),expected=out.build?Object.entries(PRACTICAL_CHECKS[id]).reduce((sum,[key,max])=>sum+(out[key]?max:0),0):0;if(points!==expected)return false;}
  checks(value.breakdown.project,PROJECT_CHECKS);checks(value.breakdown.defense,DEFENSE_CHECKS);
  const exam=Object.values(value.breakdown.theory).reduce((a,b)=>a+b,0)+Object.values(value.breakdown.practical).reduce((a,b)=>a+b,0),project=value.breakdown.project.build?Object.values(value.breakdown.project).filter(Boolean).length*5:0;
  const changed=Array.isArray(value.blockingReasons)&&!value.blockingReasons.includes('defense-code-unchanged');
  const defense=changed&&value.breakdown.defense.build?Object.values(value.breakdown.defense).filter(Boolean).length*25:0;
  const allowed=['exam-theory-minimum',...Object.keys(PRACTICAL_CHECKS).map(k=>'exam-'+k+'-minimum'),'practical-gui-build',...PROJECT_REQUIRED.map(k=>'project-'+k),'defense-code-unchanged','defense-control-change','defense-boundary','defense-regression'];
  if(!Array.isArray(value.blockingReasons)||value.blockingReasons.length>allowed.length||new Set(value.blockingReasons).size!==value.blockingReasons.length||value.blockingReasons.some(k=>!allowed.includes(k)))return false;
  for(const k of PROJECT_REQUIRED)if(value.blockingReasons.includes('project-'+k)===value.breakdown.project[k])return false;
  if(value.blockingReasons.includes('exam-theory-minimum')!==(Object.values(value.breakdown.theory).reduce((a,b)=>a+b,0)<24))return false;
  if(value.blockingReasons.includes('practical-gui-build')===value.breakdown.practicalChecks.P4.build)return false;
  for(const[k,n]of Object.entries(value.breakdown.practical))if(value.blockingReasons.includes('exam-'+k+'-minimum')!==(n<9))return false;
  for(const[k,reason]of Object.entries({newBehavior:'defense-control-change',boundary:'defense-boundary',regression:'defense-regression'}))if(value.blockingReasons.includes(reason)===value.breakdown.defense[k])return false;
  const status=exam>=60&&project>=60&&defense>=60&&value.blockingReasons.length===0?'passed':'requires-revision';
  return value.exam===exam&&value.project===project&&value.defense===defense&&value.weighted===Math.round((.4*exam+.5*project+.1*defense)*100)/100&&value.status===status&&value.policyVersion===AUTOMATIC_POLICY&&value.empiricallyValidated===false&&value.authority==='automatic-self-study'&&value.credentialEligible===false&&value.theoryVerifiedServer===true&&value.codeVerifiedServer===false;
 }catch{return false}
}
