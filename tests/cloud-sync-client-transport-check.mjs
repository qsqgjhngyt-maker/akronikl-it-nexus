// The old bootstrap/token fixture predates verified account storage. Test the current contract.
import assert from 'node:assert/strict';
import {accountClientFixture} from './helpers/account-client-fixture.mjs';
import {listCloudProjects,enableProjectCloud,pullProjectNow,bootstrapCloudAccount} from '../sync/cloud-sync.js';
import {createProject,getProject,projectStorageKey} from '../project-studio/project-store.js';
import {accountLocalStorage} from '../core/account-storage.js';
const f=accountClientFixture('synthetic-cloud-transport'),calls=[];let remote=null,revision=0;
globalThis.fetch=async(url,options={})=>{
 calls.push({path:String(url),method:options.method});
 assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
 assert.equal(options.headers['x-nexus-cloud-account'],f.accountId);
 assert.equal(options.headers.authorization,undefined);assert.equal(options.headers.cookie,undefined);
 if(url==='/api/v2/cloud/projects')return Response.json({projects:remote?[{id:remote.id,title:remote.title,revision}]:[]});
 if(url==='/api/v2/cloud/projects/cloud-transport-test'&&options.method==='PUT'){
  remote=JSON.parse(options.body).project;return Response.json({ok:true,projectId:remote.id,revision:++revision});
 }
 if(url==='/api/v2/cloud/projects/cloud-transport-test')return Response.json({project:remote,meta:{id:remote.id,revision}});
 throw Error('UNEXPECTED_REQUEST');
};
await assert.rejects(listCloudProjects(),{code:'VERIFIED_ACCOUNT_REQUIRED'});assert.equal(calls.length,0);
f.verify();
await assert.rejects(bootstrapCloudAccount({baseUrl:'https://synthetic.invalid',bootstrapSecret:'SYNTHETIC'}),/текущий вход/);
const project=createProject({id:'cloud-transport-test',title:'Cloud Transport',files:[{path:'src/main.cpp',content:'int main(){return 0;}\n',languageId:'cpp'}]});
await enableProjectCloud(project.id);let local=getProject(project.id);
assert.equal(local.sync.status,'synced');assert.equal(local.sync.serverRevision,1);assert.equal(remote.access.ownerId,f.accountId);
assert.equal((await listCloudProjects())[0].id,project.id);
remote={...remote,title:'Changed in synthetic Cloud',manifest:{...remote.manifest,title:'Changed in synthetic Cloud'}};revision=2;
await pullProjectNow(project.id);local=getProject(project.id);
assert.equal(local.title,remote.title);assert.equal(local.sync.serverRevision,2);assert.equal(local.sync.status,'synced');
assert.ok(accountLocalStorage().getItem(projectStorageKey()));assert.equal(f.local.getItem(projectStorageKey()),null);
assert.equal(calls.length,3);
console.log('CLOUD_SYNC_CLIENT_TRANSPORT_PASS: verified account, first-party cookie, push/list/pull; unverified bootstrap rejected');
