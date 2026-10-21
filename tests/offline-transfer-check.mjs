import assert from 'node:assert/strict';
import {makeLocalPayload,transferPlan} from '../pwa/offline-transfer.js';
import {validLocalPayload,createVaultStore} from '../pwa/local-vault.js';
const a={accountId:'synthetic-a',displayName:'Synthetic A',status:'active'},b={accountId:'synthetic-b',status:'active'};
const p={id:'project-a',title:'Synthetic project',languageId:'cpp',access:{ownerId:a.accountId,workspaceKind:'personal'},workspace:{entryFile:'main.cpp',files:[{path:'main.cpp',content:'int main(){}'}]},progress:{},checkpoints:[]};
const state={courses:{cpp:{lessons:{one:{completed:true}}}},skills:{}},owner=x=>x.ownerId===a.accountId;
const payload=()=>makeLocalPayload({account:a,state,projects:[p,{...p,id:'foreign',access:{ownerId:b.accountId,workspaceKind:'personal'}},{...p,id:'team',access:{ownerId:a.accountId,workspaceKind:'team'}}],isOwner:owner});
const meta={vaultId:'synthetic-vault',revision:2};
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('copy contains only own personal projects, learning and explicit source baseline',()=>{
 const data=payload();assert.deepEqual(Object.keys(data.projects),['project-a']);assert.deepEqual(data.state,stateWithSchema());assert.deepEqual(data.base.projects,data.projects);
 assert.ok(!JSON.stringify(data).includes('accountSubjectId'));assert.throws(()=>makeLocalPayload({account:null,state,projects:[],isOwner:owner}),/VERIFIED_ACCOUNT_REQUIRED/);
});
function stateWithSchema(){return{schemaVersion:1,...state}}
check('no changes produce no project write and account guard rejects another subject',()=>{
 assert.equal(transferPlan(payload(),a,state,[p],meta).projects.length,0);
 for(const other of [null,b,{...a,status:'blocked'}])assert.throws(()=>transferPlan(payload(),other,state,[p],meta),/OFFLINE_ACCOUNT_MISMATCH/);
});
check('offline edits update unchanged original only after explicit same-account transfer',()=>{
 const data=payload();data.projects[p.id].workspace.files[0].content='int main(){return 42;}';
 const plan=transferPlan(data,a,state,[p],meta);assert.equal(plan.projects[0].action,'patch');assert.deepEqual(plan.conflicts,[]);
 assert.equal(p.workspace.files[0].content,'int main(){}');assert.equal(plan.projects[0].data.workspace.files[0].content,'int main(){return 42;}');
});
check('online/offline project conflict retains current and plans a distinct copy',()=>{
 const data=payload();data.projects[p.id].title='Offline title';const online={...p,title:'Online title'};
 const plan=transferPlan(data,a,state,[online],meta);assert.equal(plan.projects[0].action,'copy');assert.equal(plan.conflicts[0].kind,'project');assert.equal(online.title,'Online title');
});
check('deleted online project is not silently resurrected under the previous id',()=>{
 const data=payload();data.projects[p.id].title='Offline changed';assert.equal(transferPlan(data,a,state,[],meta).projects[0].action,'copy');
});
check('local lesson progress persists; concurrent online progress is retained with conflict evidence',()=>{
 const data=payload();data.state.courses.cpp.lessons.two={completed:true};
 let plan=transferPlan(data,a,state,[p],meta);assert.equal(plan.state.courses.cpp.lessons.two.completed,true);
 const online=structuredClone(state);online.courses.cpp.lessons.three={completed:true};plan=transferPlan(data,a,online,[p],meta);
 assert.equal(plan.state.courses.cpp.lessons.three.completed,true);assert.equal(Object.keys(plan.state.offlineConflicts).length,1);assert.equal(data.state.courses.cpp.lessons.two.completed,true);
});
check('repeated explicit import is idempotent and preserves later edits',()=>{
 const data=payload();data.projects[p.id].title='Offline title';
 const current={...state,offlineImports:{[meta.vaultId]:meta.revision}};
 assert.equal(transferPlan(data,a,current,[p],meta).alreadyApplied,true);
});
check('partially imported project is recognized by explicit marker without replacement',()=>{
 const data=payload();data.projects[p.id].title='Offline title';
 const imported={...p,origin:{offlineImport:{...meta,sourceId:p.id}}};assert.equal(transferPlan(data,a,state,[imported],meta).projects.length,0);
});
check('local payload cannot become a server context and malformed source is rejected',()=>{
 const data=payload();assert.ok(!('loginMethods'in data));assert.equal(data.owner.status,undefined);
 data.projects[p.id].workspace.files[0].content=42;assert.throws(()=>validLocalPayload(data),/LOCAL_COPY_INVALID/);
});
await assert.rejects(createVaultStore({indexedDB:null}).create(payload(),'Synthetic local phrase only 2026'),/LOCAL_STORE_UNAVAILABLE/);checks++;
console.log(JSON.stringify({status:'PASS',checks,cloudRequests:0,realCredentials:false}));
