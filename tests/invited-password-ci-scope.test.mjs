import assert from 'node:assert/strict';
import {test} from 'node:test';
import {AUTH_PATHS,isInvitedPasswordOnly,changedPaths} from '../tools/invited-password-ci-scope.mjs';
const auth='server-access/worker/invited-password-service.mjs';
test('only explicit identity paths route to identity workflow',()=>{
 assert.equal(isInvitedPasswordOnly([...AUTH_PATHS]),true);
 assert.equal(isInvitedPasswordOnly([auth,'server-access/staging/start.mjs']),true);
});
test('course, runtime, receipt, unknown core and deployment changes keep legacy gates',()=>{
 for(const p of ['courses/cpp/gold/a.json','courses/onec/a.json','sandbox/sandbox.js','runtime-packs/a',
  'release/P4Q_RELEASE_SCOPE.json','tools/p4q-release-scope.mjs','core/bootstrap.js','server-access/worker/assessment-service.mjs',
  '.github/workflows/other.yml','releases/a','server-access/staging/../../core/bootstrap.js','server-access\\staging\\x'])
  assert.equal(isInvitedPasswordOnly([auth,p]),false,p);
});
test('empty, invalid or unrelated changes do not skip legacy gates',()=>{
 for(const paths of [[],null,{},['core/account-control.js'],[auth,null]])assert.equal(isInvitedPasswordOnly(paths),false);
});
test('missing, option-like and all-zero refs fail closed',()=>{
 for(const ref of [undefined,'main','--help','0'.repeat(40)])assert.throws(()=>changedPaths(ref,'HEAD'),/EXACT_CI_REFS_REQUIRED/);
});
