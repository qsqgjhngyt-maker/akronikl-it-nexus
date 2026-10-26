import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
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

test('generic schema has no C++ runtime constants and still rejects invalid stable IDs',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const raw=JSON.stringify(schema);
  for(const forbidden of ['#course=cpp','cpp_programming_pdf_course_v1','code.exercise'])assert.equal(raw.includes(forbidden),false,forbidden);
  const contract=json('courses/cpp/content-package.json');
  const badId=structuredClone(contract);badId.courseId='C++ BAD';
  assert.ok(validateSchema(schema,badId).some(x=>x.includes('pattern mismatch')));
});

test('generic schema allows future lifecycle states while CP-1.1 candidate stays not-implemented',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const future=structuredClone(json('courses/cpp/content-package.json'));
  future.futureExtensions.skillGraph='planned';
  future.skills[0].status='active';
  future.exercises[0].scope='module';
  assert.deepEqual(validateSchema(schema,future),[]);
});

test('CP-1.1 semantic validator protects production compatibility',()=>{
  const result=validateContentContract(fileURLToPath(new URL('../',import.meta.url)));
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.deepEqual(result.stats,{modules:6,topics:50,skills:15,exercises:50,practices:6,projects:7,mappedTopics:3,pendingTopics:47});
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


const trackedFixtureFiles=[
  'content/schemas/content-package-v1.schema.json',
  'courses/cpp/content-package.json',
  'courses/catalog.json',
  'courses/cpp/manifest.json',
  'courses/cpp/curriculum.json',
  'courses/cpp/data/lessons.ru.json',
  'courses/cpp/data/practicums.ru.json',
  'courses/cpp/data/projects.ru.json',
  'courses/cpp/PROVENANCE.md',
  'core/storage.js',
  'core/migrations/cpp-v7.js',
  'core/course-registry.js'
];
function withMutatedCandidate(mutate){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cp11-кириллица path-'));
  const source=fileURLToPath(new URL('../',import.meta.url));
  try{
    for(const rel of trackedFixtureFiles){
      const dst=path.join(root,rel);
      fs.mkdirSync(path.dirname(dst),{recursive:true});
      fs.copyFileSync(path.join(source,rel),dst);
    }
    const file=path.join(root,'courses/cpp/content-package.json');
    const contract=JSON.parse(fs.readFileSync(file,'utf8'));
    mutate(contract);
    fs.writeFileSync(file,JSON.stringify(contract,null,2));
    return validateContentContract(root);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

test('semantic gate rejects incorrect content reference and duplicate IDs',()=>{
  const broken=withMutatedCandidate(c=>{c.topics[0].moduleId='missing.module'});
  assert.equal(broken.ok,false);
  assert.ok(broken.errors.some(x=>x.includes('topic module missing')||x.includes('drifted')));
  const duplicate=withMutatedCandidate(c=>{c.exercises[1].exerciseId=c.exercises[0].exerciseId});
  assert.equal(duplicate.ok,false);
  assert.ok(duplicate.errors.some(x=>x.includes('globally unique')));
});

test('semantic gate rejects premature Learning Events and source redirect',()=>{
  const premature=withMutatedCandidate(c=>{c.futureExtensions.learningEvents='implemented'});
  assert.equal(premature.ok,false);
  assert.ok(premature.errors.some(x=>x.includes('future layers must remain not-implemented')));
  const redirected=withMutatedCandidate(c=>{c.sourceCompatibility.manifestPath='../../private-data.json'});
  assert.equal(redirected.ok,false);
  assert.ok(redirected.errors.some(x=>x.includes('drifted')));
  assert.ok(!redirected.errors.some(x=>x.includes('ENOENT')||x.includes('private-data.json')));
});

test('validator rejects unsupported schema keywords instead of silently passing',()=>{
  const schema=json('content/schemas/content-package-v1.schema.json');
  const bad=structuredClone(schema);
  bad.properties.courseId.oneOf=[{type:'string'}];
  assert.ok(validateSchema(bad,json('courses/cpp/content-package.json')).some(x=>x.includes('unsupported JSON Schema keyword oneOf')));
});
