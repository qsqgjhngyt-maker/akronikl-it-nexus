import fs from 'node:fs';
import path from 'node:path';

export const ID_PATTERN=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const read=(root,p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(root,p)=>JSON.parse(read(root,p));
const uniq=a=>new Set(a).size===a.length;
const slug=id=>id.replace(/^cpp\./,'').replace(/\./g,'-');
export const skillIdFor=id=>'skill-cpp-'+slug(id);
export const exerciseIdFor=id=>id+'.exercise';

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
      for(const key of rule.required||[])if(!(key in v))errors.push(p+': missing '+key);
      for(const [key,x]of Object.entries(v))if(rule.properties?.[key])walk(rule.properties[key],x,p+'.'+key);else if(rule.additionalProperties===false)errors.push(p+': unexpected '+key);
    }
  }
  walk(schema,value,'$');
  return errors;
}

function expectedContract({catalog,manifest,curriculum,lessons,practices,projects}){
  const practiceModuleMap={alg:'cpp.section.algorithms',cpp:'cpp.section.cpp-basics',struct:'cpp.section.structured-programming',classic:'cpp.section.classic-algorithms',oop:'cpp.section.oop',gui:'cpp.section.visual-programming'};
  return {
    schemaVersion:1,contractVersion:'1.0.0',courseId:'cpp',status:'reference-contract',
    sourceCompatibility:{catalogPath:'courses/catalog.json',manifestPath:'courses/cpp/manifest.json',curriculumPath:'courses/cpp/curriculum.json',lessonsPath:'courses/cpp/data/lessons.ru.json',practicesPath:'courses/cpp/data/practicums.ru.json',projectsPath:'courses/cpp/data/projects.ru.json'},
    runtimeCompatibility:{academyRoute:'#course=cpp',progressStateKey:'akronikl:it-nexus:state:v1',legacyProgressKey:'cpp_programming_pdf_course_v1',projectStorageKey:'akronikl:it-nexus:projects:v1',runtimeConsumption:'none-cp1.1',offlinePolicy:'no-runtime-change-cp1.1'},
    modules:curriculum.sections.map(s=>({moduleId:s.id,sourceId:s.id,order:s.order,topicIds:[...s.lessonIds]})),
    topics:curriculum.lessons.map(l=>({topicId:l.id,sourceId:l.id,moduleId:l.sectionId,order:l.order,skillIds:[skillIdFor(l.id)],exerciseIds:[exerciseIdFor(l.id)]})),
    skills:curriculum.lessons.map(l=>({skillId:skillIdFor(l.id),code:l.id,topicIds:[l.id],status:'foundation'})),
    exercises:lessons.lessons.map(l=>({exerciseId:exerciseIdFor(l.id),sourceId:l.id,topicId:l.id,skillIds:[skillIdFor(l.id)],kind:'exercise',activityType:'code.exercise',sourceLocale:'ru',sourceFields:{task:'task',hint:'hint',solution:'solution',requirements:'requirements'}})),
    practices:practices.practicums.map(p=>({practiceId:'cpp.practice.'+p.id,sourceId:p.id,moduleId:practiceModuleMap[p.id],kind:'practice',activityType:'code.practice',sourceLocale:'ru'})),
    projects:projects.projects.map(p=>({projectId:'cpp.project.'+p.id,sourceId:p.id,kind:'project',activityType:'code.project',sourceLocale:'ru'})),
    futureExtensions:{skillGraph:'not-implemented',learningEvents:'not-implemented',masteryModel:'not-implemented'}
  };
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(c,m,errors)=>{if(!c)errors.push(m)};
export function validateContentContract(root='.'){
  const errors=[],passes=[];
  const pass=m=>passes.push(m);
  let schema,contract,catalog,manifest,curriculum,lessons,practices,projects;
  try{schema=json(root,'content/schemas/content-package-v1.schema.json');contract=json(root,'courses/cpp/content-package.json');catalog=json(root,contract.sourceCompatibility.catalogPath);manifest=json(root,contract.sourceCompatibility.manifestPath);curriculum=json(root,contract.sourceCompatibility.curriculumPath);lessons=json(root,contract.sourceCompatibility.lessonsPath);practices=json(root,contract.sourceCompatibility.practicesPath);projects=json(root,contract.sourceCompatibility.projectsPath)}catch(e){return{ok:false,errors:['read/parse: '+e.message],passes,stats:{}}}
  const schemaErrors=validateSchema(schema,contract);assert(schemaErrors.length===0,'schema: '+schemaErrors.join('; '),errors);if(!schemaErrors.length)pass('schema-validation');
  const cpp=catalog.courses.find(x=>x.id==='cpp');assert(cpp?.route==='#course=cpp','Academy C++ route changed',errors);assert(cpp?.status==='available-alpha','Academy C++ status changed',errors);if(cpp?.route==='#course=cpp'&&cpp?.status==='available-alpha')pass('academy-cpp-compatibility');
  assert(manifest.id==='cpp'&&curriculum.courseId==='cpp'&&lessons.courseId==='cpp'&&practices.courseId==='cpp'&&projects.courseId==='cpp','courseId mismatch',errors);
  const sectionIds=curriculum.sections.map(x=>x.id),lessonIds=curriculum.lessons.map(x=>x.id),lessonSourceIds=lessons.lessons.map(x=>x.id),practiceIds=practices.practicums.map(x=>x.id),projectIds=projects.projects.map(x=>x.id);
  assert(uniq(sectionIds)&&uniq(lessonIds)&&uniq(practiceIds)&&uniq(projectIds),'source IDs are not unique',errors);
  assert(same(lessonIds,lessonSourceIds),'curriculum lesson IDs differ from RU lesson IDs',errors);
  assert(manifest.lessonCount===lessonIds.length&&manifest.practicumCount===practiceIds.length&&manifest.projectCount===projectIds.length,'manifest counts mismatch',errors);
  assert(curriculum.lessons.every((x,i)=>x.legacyIndex===i),'legacy lesson indexes changed',errors);
  const sectionSet=new Set(sectionIds);for(const l of curriculum.lessons)assert(sectionSet.has(l.sectionId),'missing section '+l.sectionId+' for '+l.id,errors);
  for(const s of curriculum.sections)for(const id of s.lessonIds)assert(lessonIds.includes(id),'section '+s.id+' references missing '+id,errors);
  const expected=expectedContract({catalog,manifest,curriculum,lessons,practices,projects});assert(same(contract,expected),'content-package.json drifted from production C++ sources',errors);if(same(contract,expected))pass('production-cpp-id-compatibility');
  const topicSet=new Set(contract.topics.map(x=>x.topicId)),skillSet=new Set(contract.skills.map(x=>x.skillId)),exerciseSet=new Set(contract.exercises.map(x=>x.exerciseId)),moduleSet=new Set(contract.modules.map(x=>x.moduleId));
  assert(uniq([...moduleSet])&&uniq([...topicSet])&&uniq([...skillSet])&&uniq([...exerciseSet]),'contract IDs are not unique',errors);
  for(const t of contract.topics){assert(moduleSet.has(t.moduleId),'topic module missing '+t.topicId,errors);for(const id of t.skillIds)assert(skillSet.has(id),'topic skill missing '+id,errors);for(const id of t.exerciseIds)assert(exerciseSet.has(id),'topic exercise missing '+id,errors)}
  for(const e of contract.exercises){assert(topicSet.has(e.topicId),'exercise topic missing '+e.exerciseId,errors);for(const id of e.skillIds)assert(skillSet.has(id),'exercise skill missing '+id,errors)}
  for(const p of contract.practices)assert(moduleSet.has(p.moduleId),'practice module missing '+p.practiceId,errors);
  if(!errors.some(x=>/missing|unique/.test(x)))pass('reference-integrity');
  const storage=read(root,'core/storage.js'),migration=read(root,'core/migrations/cpp-v7.js'),registry=read(root,'core/course-registry.js');
  assert(storage.includes("akronikl:it-nexus:state:v1"),'progress state key changed',errors);assert(storage.includes('s.courses.cpp.lessons')&&storage.includes('s.courses.cpp.practicums'),'C++ progress paths changed',errors);assert(migration.includes('cpp_programming_pdf_course_v1'),'legacy C++ progress key missing',errors);if(!errors.some(x=>/progress|legacy/.test(x)))pass('progress-localstorage-compatibility');
  assert(!registry.includes('content-package.json'),'CP-1.1 must not change runtime consumption yet',errors);if(!registry.includes('content-package.json'))pass('runtime-additive-only');
  assert(Object.values(contract.futureExtensions).every(x=>x==='not-implemented'),'future layers must remain not-implemented',errors);if(Object.values(contract.futureExtensions).every(x=>x==='not-implemented'))pass('future-foundation-only');
  return{ok:errors.length===0,errors,passes,stats:{modules:contract.modules.length,topics:contract.topics.length,skills:contract.skills.length,exercises:contract.exercises.length,practices:contract.practices.length,projects:contract.projects.length}};
}
