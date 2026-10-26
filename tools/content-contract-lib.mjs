import fs from 'node:fs';
import path from 'node:path';

export const ID_PATTERN=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export const SKILL_CODE_ALIASES=Object.freeze({'cpp.const-correctness':'cpp.const.correctness'});
export const canonicalSkillCode=code=>SKILL_CODE_ALIASES[code]||code;
export const skillIdForCode=code=>'skill.'+canonicalSkillCode(code);
export const exerciseIdFor=id=>id+'.exercise';

const read=(root,p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(root,p)=>JSON.parse(read(root,p));
const uniq=a=>new Set(a).size===a.length;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(c,m,errors)=>{if(!c)errors.push(m)};
// Only the explicitly audited JSON Schema vocabulary is supported by this dependency-free validator.
// Reject unknown validation keywords instead of silently accepting a schema we cannot enforce.
const SUPPORTED_SCHEMA_KEYWORDS=new Set([
  '$schema','$id','$defs','$ref','title','description','type','required',
  'properties','additionalProperties','const','enum','minLength','pattern',
  'minimum','minItems','uniqueItems','items','minProperties'
]);
function checkSchemaVocabulary(rule,where,errors){
  if(!rule||typeof rule!=='object'||Array.isArray(rule)){
    errors.push(where+': invalid schema rule');return;
  }
  for(const [keyword,value]of Object.entries(rule)){
    if(!SUPPORTED_SCHEMA_KEYWORDS.has(keyword))errors.push(where+': unsupported JSON Schema keyword '+keyword);
    if(keyword==='$defs'||keyword==='properties'){
      if(!value||typeof value!=='object'||Array.isArray(value)){
        errors.push(where+'.'+keyword+': invalid schema map');continue;
      }
      for(const [name,definition]of Object.entries(value))checkSchemaVocabulary(definition,where+'.'+keyword+'.'+name,errors);
    }
    if((keyword==='items'||keyword==='additionalProperties')&&value&&typeof value==='object')checkSchemaVocabulary(value,where+'.'+keyword,errors);
  }
}

function resolveRef(rootSchema,ref){
  if(!ref.startsWith('#/'))throw new Error('Only local JSON Schema refs are supported: '+ref);
  return ref.slice(2).split('/').reduce((v,k)=>v?.[k],rootSchema);
}
function typeOk(type,v){
  if(type==='array')return Array.isArray(v);
  if(type==='object')return !!v&&typeof v==='object'&&!Array.isArray(v);
  if(type==='integer')return Number.isInteger(v);
  if(type==='number')return typeof v==='number'&&Number.isFinite(v);
  return typeof v===type;
}
export function validateSchema(schema,value){
  const errors=[];
  checkSchemaVocabulary(schema,'$schema',errors);
  if(errors.length)return errors;
  function walk(rule,v,p){
    if(rule.$ref)return walk(resolveRef(schema,rule.$ref),v,p);
    if('const' in rule&&v!==rule.const)errors.push(p+': expected const '+JSON.stringify(rule.const));
    if(rule.enum&&!rule.enum.includes(v))errors.push(p+': value not in enum');
    if(rule.type&&!typeOk(rule.type,v)){errors.push(p+': expected '+rule.type);return}
    if(typeof v==='string'){
      if(rule.minLength!==undefined&&v.length<rule.minLength)errors.push(p+': too short');
      if(rule.pattern&&!(new RegExp(rule.pattern)).test(v))errors.push(p+': pattern mismatch');
    }
    if(typeof v==='number'&&rule.minimum!==undefined&&v<rule.minimum)errors.push(p+': below minimum');
    if(Array.isArray(v)){
      if(rule.minItems!==undefined&&v.length<rule.minItems)errors.push(p+': too few items');
      if(rule.uniqueItems&&new Set(v.map(x=>JSON.stringify(x))).size!==v.length)errors.push(p+': duplicate items');
      if(rule.items)v.forEach((x,i)=>walk(rule.items,x,p+'['+i+']'));
    }
    if(v&&typeof v==='object'&&!Array.isArray(v)){
      if(rule.minProperties!==undefined&&Object.keys(v).length<rule.minProperties)errors.push(p+': too few properties');
      for(const key of rule.required||[])if(!(key in v))errors.push(p+': missing '+key);
      for(const [key,x]of Object.entries(v)){
        if(rule.properties?.[key])walk(rule.properties[key],x,p+'.'+key);
        else if(rule.additionalProperties===false)errors.push(p+': unexpected '+key);
        else if(rule.additionalProperties&&typeof rule.additionalProperties==='object')walk(rule.additionalProperties,x,p+'.'+key);
      }
    }
  }
  walk(schema,value,'$');
  return errors;
}

function skillRows(lessons){
  const map=new Map();
  for(const lesson of lessons.lessons){
    for(const sourceCode of lesson.benchmark?.skillGraph?.strengthens||[]){
      const code=canonicalSkillCode(sourceCode);
      if(!map.has(code))map.set(code,{skillId:skillIdForCode(code),code,sourceCodes:[],topicIds:[],status:'declared-reference'});
      const row=map.get(code);
      if(!row.sourceCodes.includes(sourceCode))row.sourceCodes.push(sourceCode);
      if(!row.topicIds.includes(lesson.id))row.topicIds.push(lesson.id);
    }
  }
  return [...map.values()];
}
function topicSkillIds(lesson){return [...new Set((lesson.benchmark?.skillGraph?.strengthens||[]).map(skillIdForCode))]}

export function expectedContract({manifest,curriculum,lessons,practices,projects}){
  const lessonMap=new Map(lessons.lessons.map(x=>[x.id,x]));
  const sectionMap=new Map(curriculum.sections.map(x=>[x.id,x]));
  const practiceModuleMap={alg:'cpp.section.algorithms',cpp:'cpp.section.cpp-basics',struct:'cpp.section.structured-programming',classic:'cpp.section.classic-algorithms',oop:'cpp.section.oop',gui:'cpp.section.visual-programming'};
  return {
    schemaVersion:1,contractVersion:'1.0.0',contentVersion:manifest.version,courseId:'cpp',status:'reference-contract',
    primaryLocale:manifest.primaryLocale,availableLocales:[...manifest.availableLocales],
    sourceCompatibility:{
      catalogPath:'courses/catalog.json',manifestPath:'courses/cpp/manifest.json',curriculumPath:'courses/cpp/curriculum.json',provenancePath:'courses/cpp/PROVENANCE.md',
      contentPaths:{lessons:'courses/cpp/data/lessons.ru.json',practices:'courses/cpp/data/practicums.ru.json',projects:'courses/cpp/data/projects.ru.json'}
    },
    runtimeCompatibility:{academyRoute:'#course=cpp',progressStateKey:'akronikl:it-nexus:state:v1',legacyProgressKey:'cpp_programming_pdf_course_v1',projectStorageKey:'akronikl:it-nexus:projects:v1',runtimeConsumption:'none-cp1.1',offlinePolicy:'no-runtime-change-cp1.1'},
    modules:curriculum.sections.map(s=>({moduleId:s.id,sourceId:s.id,order:s.order,topicIds:[...s.lessonIds]})),
    topics:curriculum.lessons.map(l=>{const ids=topicSkillIds(lessonMap.get(l.id));return{topicId:l.id,sourceId:l.id,moduleId:l.sectionId,order:l.order,skillIds:ids,skillMappingStatus:ids.length?'declared-reference':'pending-cp3'}}),
    skills:skillRows(lessons),
    exercises:curriculum.lessons.map(l=>{const ids=topicSkillIds(lessonMap.get(l.id));return{exerciseId:exerciseIdFor(l.id),sourceId:l.id,scope:'topic',moduleIds:[l.sectionId],topicIds:[l.id],skillIds:ids,skillMappingStatus:ids.length?'declared-reference':'pending-cp3',kind:'exercise',activityType:'code.exercise',sourceLocale:'ru',sourceMapping:{task:'task',hint:'hint',solution:'solution',requirements:'requirements'}}}),
    practices:practices.practicums.map(p=>{const moduleId=practiceModuleMap[p.id];return{practiceId:'cpp.practice.'+p.id,sourceId:p.id,scope:'module',moduleIds:[moduleId],topicIds:[...(sectionMap.get(moduleId)?.lessonIds||[])],skillIds:[],skillMappingStatus:'pending-cp3',kind:'practice',activityType:'code.practice',sourceLocale:'ru',sourceMapping:{tasks:'tasks',challenge:'challenge',starter:'starter',solution:'solution'}}}),
    projects:projects.projects.map(p=>({projectId:'cpp.project.'+p.id,sourceId:p.id,scope:'course',moduleIds:[],topicIds:[],skillIds:[],skillMappingStatus:'pending-cp3',kind:'project',activityType:'code.project',sourceLocale:'ru',sourceMapping:{starter:'starter',milestones:'milestones',criteria:'criteria'}})),
    futureExtensions:{skillGraph:'not-implemented',learningEvents:'not-implemented',masteryModel:'not-implemented'}
  };
}

export function validateContentContract(root='.'){
  const errors=[],passes=[],warnings=[];
  const pass=m=>passes.push(m);
  let schema,contract,catalog,manifest,curriculum,lessons,practices,projects;
  try{
    schema=json(root,'content/schemas/content-package-v1.schema.json');
    contract=json(root,'courses/cpp/content-package.json');
    // Read only established C++ production paths. Candidate-supplied sourceCompatibility
    // is checked against expectedContract later; it must not redirect filesystem reads.
    catalog=json(root,'courses/catalog.json');
    manifest=json(root,'courses/cpp/manifest.json');
    curriculum=json(root,'courses/cpp/curriculum.json');
    lessons=json(root,'courses/cpp/data/lessons.ru.json');
    practices=json(root,'courses/cpp/data/practicums.ru.json');
    projects=json(root,'courses/cpp/data/projects.ru.json');
    read(root,'courses/cpp/PROVENANCE.md');
  }catch(e){return{ok:false,errors:['read/parse: '+e.message],warnings,passes,stats:{}}}

  const schemaErrors=validateSchema(schema,contract);
  assert(schemaErrors.length===0,'schema: '+schemaErrors.join('; '),errors);if(!schemaErrors.length)pass('schema-validation');

  const cpp=catalog.courses.find(x=>x.id==='cpp');
  assert(cpp?.route==='#course=cpp','Academy C++ route changed',errors);
  assert(cpp?.status==='available-alpha','Academy C++ status changed',errors);
  if(cpp?.route==='#course=cpp'&&cpp?.status==='available-alpha')pass('academy-cpp-compatibility');

  assert(contract.contentVersion===manifest.version,'contentVersion differs from C++ manifest version',errors);
  assert(manifest.id==='cpp'&&curriculum.courseId==='cpp'&&lessons.courseId==='cpp'&&practices.courseId==='cpp'&&projects.courseId==='cpp','courseId mismatch',errors);

  const sectionIds=curriculum.sections.map(x=>x.id),lessonIds=curriculum.lessons.map(x=>x.id),lessonSourceIds=lessons.lessons.map(x=>x.id),practiceIds=practices.practicums.map(x=>x.id),projectIds=projects.projects.map(x=>x.id);
  assert(uniq(sectionIds)&&uniq(lessonIds)&&uniq(practiceIds)&&uniq(projectIds),'source IDs are not unique',errors);
  assert(same(lessonIds,lessonSourceIds),'curriculum lesson IDs differ from RU lesson IDs',errors);
  assert(manifest.lessonCount===lessonIds.length&&manifest.practicumCount===practiceIds.length&&manifest.projectCount===projectIds.length,'manifest counts mismatch',errors);
  assert(curriculum.lessons.every((x,i)=>i<40?x.legacyIndex===i:x.legacyIndex===null),'legacy lesson indexes changed',errors);
  if(curriculum.lessons.length!==40)assert(curriculum.programVersion==='cpp-gold-m3-v1'&&manifest.programVersion===curriculum.programVersion&&curriculum.lessons.length===45,'unversioned curriculum expansion',errors);
  const sectionSet=new Set(sectionIds);
  for(const l of curriculum.lessons)assert(sectionSet.has(l.sectionId),'missing section '+l.sectionId+' for '+l.id,errors);
  for(const s of curriculum.sections)for(const id of s.lessonIds)assert(lessonIds.includes(id),'section '+s.id+' references missing '+id,errors);

  const expected=expectedContract({manifest,curriculum,lessons,practices,projects});
  assert(same(contract,expected),'content-package.json drifted from production C++ sources',errors);
  if(same(contract,expected))pass('production-cpp-id-compatibility');

  const moduleIds=contract.modules.map(x=>x.moduleId),topicIds=contract.topics.map(x=>x.topicId),skillIds=contract.skills.map(x=>x.skillId),exerciseIds=contract.exercises.map(x=>x.exerciseId),practiceContractIds=contract.practices.map(x=>x.practiceId),projectContractIds=contract.projects.map(x=>x.projectId);
  const allIds=[contract.courseId,...moduleIds,...topicIds,...skillIds,...exerciseIds,...practiceContractIds,...projectContractIds];
  assert(uniq(allIds),'canonical contract IDs are not globally unique',errors);
  const moduleSet=new Set(moduleIds),topicSet=new Set(topicIds),skillSet=new Set(skillIds),exerciseSet=new Set(exerciseIds);
  for(const t of contract.topics){
    assert(moduleSet.has(t.moduleId),'topic module missing '+t.topicId,errors);
    for(const id of t.skillIds)assert(skillSet.has(id),'topic skill missing '+id,errors);
  }
  for(const e of contract.exercises){
    for(const id of e.moduleIds)assert(moduleSet.has(id),'exercise module missing '+id,errors);
    for(const id of e.topicIds)assert(topicSet.has(id),'exercise topic missing '+id,errors);
    for(const id of e.skillIds)assert(skillSet.has(id),'exercise skill missing '+id,errors);
  }
  for(const p of contract.practices){
    for(const id of p.moduleIds)assert(moduleSet.has(id),'practice module missing '+id,errors);
    for(const id of p.topicIds)assert(topicSet.has(id),'practice topic missing '+id,errors);
    for(const id of p.skillIds)assert(skillSet.has(id),'practice skill missing '+id,errors);
  }
  for(const p of contract.projects){
    for(const id of p.moduleIds)assert(moduleSet.has(id),'project module missing '+id,errors);
    for(const id of p.topicIds)assert(topicSet.has(id),'project topic missing '+id,errors);
    for(const id of p.skillIds)assert(skillSet.has(id),'project skill missing '+id,errors);
  }
  for(const s of contract.skills){
    for(const id of s.topicIds)assert(topicSet.has(id),'skill topic missing '+id,errors);
    assert(contract.topics.some(t=>t.skillIds.includes(s.skillId)),'orphan skill '+s.skillId,errors);
  }
  if(!errors.some(x=>/missing|unique|orphan/.test(x)))pass('reference-integrity');

  const alias=contract.skills.find(x=>x.code==='cpp.const.correctness');
  assert(alias?.sourceCodes.includes('cpp.const-correctness')&&alias?.sourceCodes.includes('cpp.const.correctness'),'legacy const-correctness skill alias was not normalized',errors);
  if(alias?.sourceCodes.length===2)pass('skill-alias-normalization');

  const storage=read(root,'core/storage.js'),migration=read(root,'core/migrations/cpp-v7.js'),registry=read(root,'core/course-registry.js');
  assert(storage.includes("akronikl:it-nexus:state:v1"),'progress state key changed',errors);
  assert(storage.includes('s.courses.cpp.lessons')&&storage.includes('s.courses.cpp.practicums'),'C++ progress paths changed',errors);
  assert(migration.includes('cpp_programming_pdf_course_v1'),'legacy C++ progress key missing',errors);
  if(!errors.some(x=>/progress|legacy/.test(x)))pass('progress-localstorage-compatibility');
  assert(!registry.includes('content-package.json'),'CP-1.1 must not change runtime consumption yet',errors);
  if(!registry.includes('content-package.json'))pass('runtime-additive-only');

  assert(Object.values(contract.futureExtensions).every(x=>x==='not-implemented'),'future layers must remain not-implemented',errors);
  if(Object.values(contract.futureExtensions).every(x=>x==='not-implemented'))pass('future-foundation-only');

  const pendingTopics=contract.topics.filter(x=>x.skillMappingStatus==='pending-cp3').length;
  const mappedTopics=contract.topics.length-pendingTopics;
  if(pendingTopics)warnings.push(pendingTopics+' C++ topics intentionally keep skill mapping pending until CP-3');
  return{ok:errors.length===0,errors,warnings,passes,stats:{modules:contract.modules.length,topics:contract.topics.length,skills:contract.skills.length,exercises:contract.exercises.length,practices:contract.practices.length,projects:contract.projects.length,mappedTopics,pendingTopics}};
}
