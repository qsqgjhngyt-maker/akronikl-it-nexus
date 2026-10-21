// Actual production guard/client/project modules, isolated document per scenario.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {accountClientFixture} from './helpers/account-client-fixture.mjs';
import {initializeAccountStorage,lockAccountStorage,createAccountStorageController} from '../core/account-storage.js';
import {createProject,getProject,projectStorageKey} from '../project-studio/project-store.js';
import {pushProjectNow,pullProjectNow} from '../sync/cloud-sync.js';
const scenario=process.argv[2];
if(!scenario){
 let checks=0;
 for(const action of ['push','pull'])for(const transition of ['switch','logout'])for(const outcome of ['success','conflict','network']){
  const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),[action,transition,outcome].join(':')],{encoding:'utf8'});
  assert.equal(child.status,0,child.stdout+child.stderr);checks++;console.log('PASS '+[action,transition,outcome].join(' '));
 }
 console.log(JSON.stringify({status:'PASS',checks,synthetic:true,networkRequests:0,cloudWrites:0}));
}else{
 const [action,transition,outcome]=scenario.split(':'),f=accountClientFixture('closure-account-a'),B=structuredClone(f.dto);B.account.accountId='closure-account-b';
 f.verify();const a=createProject({id:'same-id',title:'Preserve A'});
 // Separate document B sharing the origin's storage; never replace the document A context.
 const b=createAccountStorageController({localStorage:f.local,sessionStorage:f.session});b.initializeAccountStorage(B);
 b.accountLocalStorage().setItem(projectStorageKey(),JSON.stringify({schemaVersion:2,projects:{'same-id':{...a,title:'Preserve B',access:{...a.access,ownerId:B.account.accountId}}}}));
 let finish,fail,calls=0;
 globalThis.fetch=()=>{calls++;return new Promise((resolve,reject)=>{finish=resolve;fail=reject})};
 const op=action==='push'?pushProjectNow('same-id'):pullProjectNow('same-id'),rejected=assert.rejects(op);
 if(transition==='switch')assert.throws(()=>initializeAccountStorage(B),{code:'ACCOUNT_SWITCH_REQUIRES_NAVIGATION'});
 lockAccountStorage();const before=new Map(f.local.data);
 if(outcome==='network')fail(Error('SYNTHETIC_NETWORK_FAULT'));
 else if(outcome==='conflict')finish(Response.json({error:{code:'REVISION_CONFLICT',details:{serverRevision:9,baseRevision:0}}},{status:409}));
 else finish(Response.json(action==='push'?{revision:3,updatedAt:'synthetic'}:{project:{id:'same-id',title:'FORBIDDEN LATE A'},meta:{revision:3}}));
 await rejected;assert.equal(calls,1,'No automatic retry');assert.deepEqual(f.local.data,before,'No stale writes in either namespace');
 assert.equal(JSON.parse(b.accountLocalStorage().getItem(projectStorageKey())).projects['same-id'].title,'Preserve B');
 assert.throws(()=>initializeAccountStorage(f.dto),{code:'ACCOUNT_STORAGE_LOCKED'});
}
