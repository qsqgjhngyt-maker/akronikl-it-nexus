// Только учебные данные и личные проекты; ни identity, ни Cookie/session/config.
const clone=value=>structuredClone(value),canonical=value=>JSON.stringify(value??null);
const editable=p=>p?{title:p.title,description:p.description||'',workspace:p.workspace,progress:p.progress,checkpoints:p.checkpoints||[]}:null;
const safeProject=p=>({id:p.id,languageId:p.languageId||'cpp',...clone(editable(p)),...(p.origin?.kind==='course-project'&&p.origin.courseId==='cpp'?{origin:{kind:'course-project',courseId:'cpp',projectId:String(p.origin.projectId||'')}}:{})});
export function makeLocalPayload({account,state,projects,isOwner}){
 if(!account?.accountId||account.status!=='active')throw Error('VERIFIED_ACCOUNT_REQUIRED');
 const personal=projects.filter(p=>p.access?.workspaceKind==='personal'&&isOwner(p.access));
 const data=Object.fromEntries(personal.map(p=>[p.id,safeProject(p)]));
 const learning=clone({schemaVersion:1,courses:state.courses||{},skills:state.skills||{}});
 return {schemaVersion:1,owner:{accountId:account.accountId,displayName:account.displayName||''},state:learning,projects:data,base:{state:clone(learning),projects:clone(data)}};
}
export function transferPlan(payload,currentAccount,currentState,currentProjects,{vaultId,revision}){
 if(!currentAccount||currentAccount.accountId!==payload.owner.accountId||currentAccount.status!=='active')throw Error('OFFLINE_ACCOUNT_MISMATCH');
 if(currentState.offlineImports?.[vaultId]===revision)return {projects:[],state:clone(currentState),alreadyApplied:true,conflicts:[]};
 const byId=Object.fromEntries(currentProjects.map(p=>[p.id,p])),projects=[],conflicts=[];
 for(const [id,next] of Object.entries(payload.projects)){
  const base=payload.base.projects[id];if(canonical(editable(next))===canonical(editable(base)))continue;
  if(currentProjects.some(p=>p.origin?.offlineImport?.vaultId===vaultId&&p.origin.offlineImport.revision===revision&&p.origin.offlineImport.sourceId===id))continue;
  const current=byId[id],unchanged=canonical(editable(current))===canonical(editable(base));
  const action=current&&unchanged?'patch':'copy';
  if(!unchanged&&current)conflicts.push({kind:'project',id});
  projects.push({action,id,data:clone(next),marker:{vaultId,revision,sourceId:id}});
 }
 const state=clone(currentState);state.courses??={};state.skills??={};
 // Трёхстороннее сравнение каждого учебного элемента; конфликт не затирается.
 for(const area of ['courses','skills']){
  for(const [key,next] of Object.entries(payload.state[area]||{})){
   const base=payload.base.state[area]?.[key],current=state[area][key];
   if(canonical(next)===canonical(base))continue;
   if(canonical(current)===canonical(base)||canonical(current)===canonical(next))state[area][key]=clone(next);
   else {conflicts.push({kind:'progress',id:key});state.offlineConflicts??={};state.offlineConflicts[vaultId+':'+revision+':'+area+':'+key]={local:clone(next),current:clone(current)}}
  }
 }
 state.offlineImports={...state.offlineImports,[vaultId]:revision};
 return {projects,state,conflicts,alreadyApplied:false};
}
