import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
test('experimental remember is not routed into live BFF or Worker',async()=>{
 for(const path of ['server-access/worker/entry.mjs','server-access/bff/server.mjs','server-access/bff/routes.mjs']){
  const source=await read(path);
  assert.ok(!source.includes('remember-device-core.mjs'));
  assert.ok(!source.includes('remember-device-d1.mjs'));
  assert.ok(!source.includes('remembered_device'));
 }
});
test('proposal SQL cannot be accidentally applied by numbered migration scan',async()=>{
 const fsdir=new URL('../server-access/migrations/',import.meta.url);
 const names=await fs.readdir(fsdir);
 assert.ok(!names.some(n=>n.includes('0017')));
 const proposal=await read('docs/ru/identity/proposals/SESSION_REMEMBER_0017_D1_DRAFT.sql.txt');
 assert.ok(proposal.startsWith('-- SESSION-REMEMBER-01: ISOLATED'));
 assert.ok(proposal.includes('DO NOT APPLY TO PRODUCTION'));
});
test('account bootstrap still requires fresh server proof',async()=>{
 const src=await read('core/bootstrap.js');
 assert.match(src,/fetchImpl\('\/api\/v2\/account'/);
 assert.match(src,/credentials:'same-origin'/);
 assert.match(src,/cache:'no-store'/);
 assert.match(src,/storage\.initializeAccountStorage\(session\)/);
});
test('sensitive authorization continues to demand strong method',async()=>{
 const src=await read('server-access/worker/admin-service.mjs');
 const parts=await read('server-access/worker/media-parts.mjs');
 const passkey=await read('server-access/worker/passkey-service.mjs');
 for(const s of [src,parts,passkey])assert.ok(s.includes("auth_strength='account-method-v1'"));
 assert.ok(!src.includes("auth_strength='remembered-device-v1'"));
});
test('remembered session is *not* yet allowed into regular account',async()=>{
 const source=await read('server-access/worker/account-foundation.js');
 assert.ok(source.includes("x.auth_strength = 'account-method-v1'"));
 assert.ok(!source.includes("remembered-device-v1"));
});
test('existing account ingress has no new unsanctioned cookie name',async()=>{
 const source=await read('server-access/bff/gateway-cookie-context.mjs');
 assert.ok(source.includes("'__Host-nexus_session'"));
 assert.ok(!source.includes('__Host-nexus_remember'));
});
