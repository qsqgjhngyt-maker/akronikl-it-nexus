import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {ROOT,BASE} from '../tools/startup-intro-contract.mjs';
import {DELIVERY,RECEIPT,RECEIPT_SHA256,recordMatches,sha256,validateDelivery} from '../tools/startup-intro-publication.mjs';
import {DELIVERY_WORKFLOWS,routeDeliveryWorkflow} from '../tools/startup-intro-delivery-workflows.mjs';
test('Допуск доставки отклоняет чужой source, release, неизвестные поля и режим',async()=>{
 const c=JSON.parse(await readFile(new URL('../'+DELIVERY,import.meta.url)));validateDelivery(c);validateDelivery({...c,kind:'production-test-rollback'});
 for(const patch of [{baseCommit:'main'},{acceptedSource:'HEAD'},{schema:2},{officialRelease:true},{kind:'release'},{extraPaths:['courses/new.json']}])assert.throws(()=>validateDelivery({...c,...patch}));
 const receipt=await readFile(new URL('../'+RECEIPT,import.meta.url));assert.equal(sha256(receipt),RECEIPT_SHA256);assert.notEqual(sha256(Buffer.concat([receipt,Buffer.from(' ')])),RECEIPT_SHA256);
});
test('Изменённые bytes и небезопасные пути не получают authority',()=>{
 const b=Buffer.from('synthetic');const r={file:'releases/ui1a-test/core/app.js',bytes:b.length,sha256:sha256(b)};recordMatches(r,b);
 assert.throws(()=>recordMatches(r,Buffer.from('changed')));
 for(const file of ['../core/app.js','/core/app.js','C:/core/app.js','releases/a/../x','releases/a\\x','releases//x'])assert.throws(()=>recordMatches({...r,file},b));
});
test('Проверки M5 сохраняют команды и настоящие suites на candidate, source receipts — на базе',async()=>{
 for(const [file,jobs]of Object.entries(DELIVERY_WORKFLOWS)){
  const old=execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8'}),actual=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.equal(actual,routeDeliveryWorkflow(old,jobs));
  for(const line of old.split('\n').filter(l=>/^        run: node tests\/|^          node tests\/|^          node --test|^        run: node \$/.test(l)))assert.ok(actual.includes(line));
  assert.ok(actual.includes('node tools/check-startup-intro-delivery.mjs --build '));
  assert.ok(!actual.includes("startup_delivery.outputs.enabled =="),'Настоящие suites не выключаются');
 }
});
