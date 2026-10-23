import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateContentContract,validateSchema,skillIdFor,exerciseIdFor} from '../tools/content-contract-lib.mjs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));

test('CP-1.1 schema accepts the canonical C++ contract',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const contract=json('courses/cpp/content-package.json');
  assert.deepEqual(validateSchema(schema,contract),[]);
});

test('CP-1.1 semantic validator protects production compatibility',()=>{
  const result=validateContentContract(new URL('../',import.meta.url).pathname);
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.deepEqual(result.stats,{modules:6,topics:40,skills:40,exercises:40,practices:6,projects:7});
  for(const required of ['production-cpp-id-compatibility','progress-localstorage-compatibility','runtime-additive-only','future-foundation-only'])assert.ok(result.passes.includes(required),required);
});

test('stable derived IDs are deterministic and scoped',()=>{
  assert.equal(skillIdFor('cpp.pointers-references-addresses'),'skill-cpp-pointers-references-addresses');
  assert.equal(exerciseIdFor('cpp.pointers-references-addresses'),'cpp.pointers-references-addresses.exercise');
});

test('future learning layers are explicitly not implemented',()=>{
  const contract=json('courses/cpp/content-package.json');
  assert.deepEqual(contract.futureExtensions,{skillGraph:'not-implemented',learningEvents:'not-implemented',masteryModel:'not-implemented'});
  assert.equal(contract.runtimeCompatibility.runtimeConsumption,'none-cp1.1');
  assert.equal(contract.runtimeCompatibility.offlinePolicy,'no-runtime-change-cp1.1');
});
