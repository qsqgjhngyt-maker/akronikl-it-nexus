import test from 'node:test';import assert from 'node:assert/strict';
import {controlFixture} from './helpers/control-fixture.mjs';
import {alphaAccess} from '../server-access/worker/alpha-admission.mjs';
test('old and new BFFs receive complete versioned DTOs; rollback keeps deadlines',async()=>{
 const f=await controlFixture(),base='/api/v2/account/control';
 try{
  const legacy=await f.call(base+'/users',{dtoVersion:0}),modern=await f.call(base+'/users');assert.equal(legacy.status,200);assert.equal(modern.status,200);
  assert.deepEqual(Object.keys(legacy.body.settings).sort(),['limitEnabled','maxTesters','registrationMode','version']);assert.ok(Object.hasOwn(modern.body.settings,'defaultTrialMinutes'));
  assert.ok(!Object.hasOwn(legacy.body.users[0],'trialMinutes'));assert.ok(Object.hasOwn(modern.body.users[0],'trialMinutes'));
  const made=await f.call(base+'/invites',{dtoVersion:0,method:'POST',payload:{requestId:f.requestId(),ttlMinutes:60}});assert.equal(made.status,200);assert.equal(f.db.prepare('SELECT trial_minutes FROM nexus_alpha_members WHERE account_id=?').get(made.body.accountId).trial_minutes,null,'legacy invitations remain unlimited');
  const hidden=await f.call(base+'/users/'+made.body.accountId+'/trial',{dtoVersion:0,method:'POST',payload:{requestId:f.requestId(),version:1,mode:'set',minutes:60}});assert.equal(hidden.status,404);
  const user=f.seed('transition-trial');f.db.prepare('UPDATE nexus_alpha_members SET trial_minutes=60,first_login_at=?,access_expires_at=? WHERE account_id=?').run(new Date(Date.now()-7200000).toISOString(),new Date(Date.now()-1000).toISOString(),user.id);
  assert.equal(await alphaAccess(f.env,user.id),false);assert.equal((await f.call(base+'/users',{dtoVersion:0,actor:user})).status,401,'legacy DTO negotiation never disables expired access enforcement');
 }finally{f.close();}
});
