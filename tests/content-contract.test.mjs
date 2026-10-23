import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateContentContract,validateSchema,canonicalSkillCode,skillIdForCode,exerciseIdFor} from '../tools/content-contract-lib.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));

test('CP-1.1 schema accepts the canonical C++ contract',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const contract=json('courses/cpp/content-package.json');
  assert.deepEqual(validateSchema(schema,contract),[]);
});

test('CP-1.1 schema is course-generic and accepts a non-code activity type',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const skill='skill.graphics.pixels.coordinate-model';
  const sample={
    schemaVersion:1,contractVersion:'1.0.0',contentVersion:'0.1.0',courseId:'computer-graphics',status:'draft-contract',primaryLocale:'ru',availableLocales:['ru'],
    sourceCompatibility:{catalogPath:'courses/catalog.json',manifestPath:'courses/computer-graphics/manifest.json',curriculumPath:'courses/computer-graphics/curriculum.json',provenancePath:'courses/computer-graphics/PROVENANCE.md',contentPaths:{topics:'courses/computer-graphics/topics.ru.json'}},
    runtimeCompatibility:{academyRoute:'#course=computer-graphics',progressStateKey:'akronikl:it-nexus:state:v1',projectStorageKey:'akronikl:it-nexus:projects:v1',runtimeConsumption:'none-cp1.1',offlinePolicy:'no-runtime-change-cp1.1'},
    modules:[{moduleId:'graphics.basics',sourceId:'graphics.basics',order:1,topicIds:['graphics.pixels']}],
    topics:[{topicId:'graphics.pixels',sourceId:'graphics.pixels',moduleId:'graphics.basics',order:1,skillIds:[skill],skillMappingStatus:'declared-reference'}],
    skills:[{skillId:skill,code:'graphics.pixels.coordinate-model',sourceCodes:['graphics.pixels.coordinate-model'],topicIds:['graphics.pixels'],status:'declared-reference'}],
    exercises:[{exerciseId:'graphics.pixels.exercise',sourceId:'pixel-lab',scope:'topic',moduleIds:['graphics.basics'],topicIds:['graphics.pixels'],skillIds:[skill],skillMappingStatus:'declared-reference',kind:'exercise',activityType:'graphics.exercise',sourceLocale:'ru',sourceMapping:{task:'task'}}],
    practices:[],projects:[],futureExtensions:{skillGraph:'not-implemented',learningEvents:'not-implemented',masteryModel:'not-implemented'}
  };
  assert.deepEqual(validateSchema(schema,sample),[]);
});

test('schema rejects invalid IDs and premature future-layer claims',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const contract=json('courses/cpp/content-package.json');
  const badId=structuredClone(contract);badId.courseId='C++ BAD';
  assert.ok(validateSchema(schema,badId).some(x=>x.includes('pattern mismatch')));
  const premature=structuredClone(contract);premature.futureExtensions.skillGraph='implemented';
  assert.ok(validateSchema(schema,premature).some(x=>x.includes('expected const')));
});

test('CP-1.1 semantic validator protects production compatibility',()=>{
  const result=validateContentContract(new URL('../',import.meta.url).pathname);
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.deepEqual(result.stats,{modules:6,topics:40,skills:15,exercises:40,practices:6,projects:7,mappedTopics:3,pendingTopics:37});
  for(const required of ['production-cpp-id-compatibility','progress-localstorage-compatibility','runtime-additive-only','future-foundation-only','skill-alias-normalization'])assert.ok(result.passes.includes(required),required);
  assert.equal(result.warnings.length,1);
});

test('stable derived IDs are deterministic and legacy skill alias is canonicalized',()=>{
  assert.equal(canonicalSkillCode('cpp.const-correctness'),'cpp.const.correctness');
  assert.equal(skillIdForCode('cpp.const-correctness'),'skill.cpp.const.correctness');
  assert.equal(skillIdForCode('cpp.const.correctness'),'skill.cpp.const.correctness');
  assert.equal(exerciseIdFor('cpp.pointers-references-addresses'),'cpp.pointers-references-addresses.exercise');
});

test('future learning layers are explicitly not implemented',()=>{
  const contract=json('courses/cpp/content-package.json');
  assert.deepEqual(contract.futureExtensions,{skillGraph:'not-implemented',learningEvents:'not-implemented',masteryModel:'not-implemented'});
  assert.equal(contract.runtimeCompatibility.runtimeConsumption,'none-cp1.1');
  assert.equal(contract.runtimeCompatibility.offlinePolicy,'no-runtime-change-cp1.1');
});
