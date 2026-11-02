import fs from 'node:fs';import {accountClientFixture} from '../../../../../../tests/helpers/account-client-fixture.mjs';
import {createProject,loadProjectDb,saveProjectDb,getProject} from '../../../../../../project-studio/project-store.js';
const fixture=accountClientFixture('synthetic-legacy-writers');fixture.verify();
const p=createProject({title:'Synthetic existing C++ work'}),a=loadProjectDb(),b=loadProjectDb();
b.projects[p.id].description='newer legacy snapshot';saveProjectDb(b);
a.projects[p.id].title='stale legacy snapshot';saveProjectDb(a);
const result={status:'REPRODUCED / REQUIRES CROSS-BRANCH DECISION',scope:'deterministic interleaving of two public legacy read/write snapshots in synthetic in-memory storage; no production data',legacyWriterHonorsS1Lock:false,legacyNewerUpdateLost:getProject(p.id).description!=='newer legacy snapshot',realUserDataTouched:false,implementationChanged:false};
if(!result.legacyNewerUpdateLost)throw Error('Expected baseline risk not reproduced');
console.log(JSON.stringify(result));
