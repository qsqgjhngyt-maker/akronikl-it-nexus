// Security gate: the P1A building blocks are entirely dormant in production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const text=async path=>readFile(new URL(path,root),'utf8');
test('BFF ingress and Worker routing do NOT install experimental remember handlers',async()=>{
 const bff=await Promise.all(['server-access/bff/routes.mjs','server-access/bff/server.mjs','server-access/build-bff.mjs'].map(text));
 const worker=await Promise.all(['server-access/worker/entry.mjs','server-access/build-worker.mjs'].map(text));
 for(const src of [...bff,...worker]){
  assert.ok(!src.includes('remember-device-transport.mjs'));
  assert.ok(!src.includes('remember-device-internal.mjs'));
  assert.ok(!src.includes('REMEMBER_DEVICE_ENABLED'));
 }
});
test('0017 migration remains a proposal, not executable live migration',async()=>{
 const migrations=await readdir(new URL('server-access/migrations/',root));
 assert.ok(!migrations.some(x=>x.includes('remember')||x.startsWith('0017')));
 assert.ok((await text('docs/ru/identity/proposals/SESSION_REMEMBER_0017_D1_DRAFT.sql.txt')).startsWith('-- SESSION-REMEMBER-01'));
});
test('No browser JS module imports private server remember secret handling',async()=>{
 for(const path of ['core/app.js','core/bootstrap.js','core/account-shell.js','pwa/client.js']){
  const src=await text(path);
  assert.ok(!src.includes('REMEMBER_SERVICE_KEY'));
  assert.ok(!src.includes('nexus_remembered_grants'));
  assert.ok(!src.includes('remember-device-transport'));
 }
});
