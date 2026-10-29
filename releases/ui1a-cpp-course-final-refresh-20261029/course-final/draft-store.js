import{accountLocalStorage,verifiedAccount}from'../core/account-storage.js';import{THEORY_IDS}from'./automatic-policy.js';import{submissionProject}from'./contract.js';
export const FINAL_DRAFT_KEY='akronikl:it-nexus:cpp-final:v1';
export const emptyAnswers=()=>Object.fromEntries(THEORY_IDS.map(id=>[id,{optionId:null,reflection:''}]));
export function createFinalDraftStore(){
 const accountId=verifiedAccount()?.accountId,storage=accountLocalStorage();let raw=storage.getItem(FINAL_DRAFT_KEY),db;
 try{db=raw?JSON.parse(raw):{schemaVersion:1,attempts:{},pendingOpen:null}}catch{throw Error('ASSESSMENT_LOCAL_DRAFT_INVALID')}
 if(db?.schemaVersion!==1||!db.attempts||typeof db.attempts!=='object'||Array.isArray(db.attempts))throw Error('ASSESSMENT_LOCAL_DRAFT_INVALID');
 const current=()=>!!accountId&&verifiedAccount()?.accountId===accountId;
 function write(){if(!current())throw Error('ACCOUNT_SESSION_CHANGED');const latest=storage.getItem(FINAL_DRAFT_KEY);if(latest!==raw)throw Error('ASSESSMENT_LOCAL_CONFLICT');const text=JSON.stringify(db);storage.setItem(FINAL_DRAFT_KEY,text);raw=text;return true}
 return{accountId,current,write,get database(){return db},get(id){return db.attempts[id]||null},ensure(attempt){
  if(!current())throw Error('ACCOUNT_SESSION_CHANGED');if(!db.attempts[attempt.id])db.attempts[attempt.id]={answers:emptyAnswers(),projects:{P1:null,P2:null,P3:null,P4:null,project:null,defense:null},evidence:{P1:null,P2:null,P3:null,P4:null,project:null,defense:null},report:'',pendingUpload:null,lastAttempt:attempt};return db.attempts[attempt.id];
 }};
}
export function finalSource(project){
 if(!project?.workspace||!project?.manifest)throw Error('ASSESSMENT_SOURCE_REQUIRED');
 const source={title:String(project.title||'C++ source').slice(0,120),manifest:{sourceRoots:project.manifest.sourceRoots,includeRoots:project.manifest.includeRoots,testRoots:project.manifest.testRoots},workspace:{languageId:'cpp',entryFile:project.workspace.entryFile,files:project.workspace.files.map(({path,content})=>({path,content,languageId:'cpp'})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)}};submissionProject(source);return source;
}
