import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
import{validateSchema}from'./content-contract-lib.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url)),DOC='docs/ru/03-content/onec/consolidation';
export function loadConsolidatedBundle(root=ROOT){
 const text=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(text(p));
 const courses=['onec','1c-enterprise'].map(id=>json(`courses/${id}/curriculum.json`));
 const sourceManifest=json(DOC+'/SOURCE62_MANIFEST.json');
 return{courses,contracts:courses.map(c=>json(`courses/${c.courseId}/content-package.json`)),manifests:courses.map(c=>json(`courses/${c.courseId}/manifest.json`)),schema:json('content/schemas/content-package-v1.schema.json'),baseline:json(DOC+'/BASELINE63.json'),mapping:json(DOC+'/TOPIC_MAPPING.json'),sourceManifest,sourceFiles:Object.fromEntries(sourceManifest.files.map(f=>[f.path,text(DOC+'/source62/'+f.path)])),shared:json('courses/onec-education/shared.v1.json'),supplement:json('courses/onec-education/supplement.v1.json'),sources:json('courses/onec-education/sources.v1.json'),nativeModule:text('courses/onec-education/native/service-desk/Ext/ManagedApplicationModule.bsl'),preservedShared:text('courses/onec-education/shared.v1.json'),preservedFixture:text('courses/onec-education/service-desk.v1.json'),lessons:courses.flatMap(c=>c.modules[0].topics.flatMap(t=>['ru','en'].map(locale=>json(`courses/${c.courseId}/${t.content[locale]}`))))};
}
const sha=s=>createHash('sha256').update(s).digest('hex');
export function validateConsolidatedBundle(b){
 const errors=[],check=(ok,message)=>{if(!ok)errors.push(message)};
 try{
  check(JSON.stringify(b.courses.map(c=>c.courseId).sort())===JSON.stringify(['1c-enterprise','onec']),'CANONICAL_COURSE_IDS');
  const topics=new Map(),modules=new Map();
  for(const c of b.courses){check(c.mandatoryOtherCourse===false&&c.modules[0].prerequisites.length===0,'DIRECT_ENTRY');
   const byId=new Map(c.modules.map(m=>[m.moduleId,m]));check(byId.size===c.modules.length,'DUPLICATE_MODULE');const visiting=new Set(),visited=new Set();
   function visit(id){if(visiting.has(id)){check(false,'PREREQUISITE_CYCLE');return;}if(visited.has(id))return;const m=byId.get(id);if(!m){check(false,'MISSING_PREREQUISITE');return;}visiting.add(id);for(const ref of m.prerequisites)visit(ref);visiting.delete(id);visited.add(id);}
   for(const [mi,m]of c.modules.entries()){modules.set(m.moduleId,m);visit(m.moduleId);check(m.status===(mi?'PLANNED':'IMPLEMENTED'),'MODULE_STATUS');for(const t of m.topics){check(!topics.has(t.topicId)&&t.topicId.startsWith(c.courseId+'.'),'DUPLICATE_OR_FOREIGN_TOPIC');topics.set(t.topicId,t);check(t.title.ru?.trim()&&t.title.en?.trim(),'TOPIC_RU_EN');if(mi)check(t.status==='PLANNED'&&!t.content,'FUTURE_TOPIC_NOT_AUTHORED');}}
  }
  let preserved=0;for(const [id,rows]of Object.entries(b.baseline.courses))for(const m of rows)for(const t of m.topics){const current=modules.get(m.moduleId)?.topics.find(x=>x.topicId===t.topicId);check(current&&current.order===t.order&&current.status===t.status&&JSON.stringify(current.content||null)===JSON.stringify(t.content),'BASELINE_TOPIC_PRESERVED '+t.topicId);preserved++;}
  check(preserved===80,'BASELINE_CARDINALITY');check(topics.size===84,'CANONICAL_TOPIC_CARDINALITY');
  check(sha(b.preservedShared)===b.baseline.sharedV1Sha256,'SHARED_V1_BYTES_PRESERVED');check(sha(b.preservedFixture)===b.baseline.serviceDeskSha256,'SERVICE_DESK_BYTES_PRESERVED');
  const sourceRoadmap=JSON.parse(b.sourceFiles['authoring/onec/roadmap.json']);const expectedSource=sourceRoadmap.courses.flatMap(c=>c.modules.flatMap(m=>m.topics.map(t=>c.courseId+'.'+m.id+'.'+t[0])));
  const mapped=b.mapping.entries.map(x=>x.sourceTopicId);check(mapped.length===95&&new Set(mapped).size===95&&JSON.stringify([...mapped].sort())===JSON.stringify(expectedSource.sort()),'EXHAUSTIVE_95_MAPPING');
  for(const row of b.mapping.entries){check(row.progressAlias===false&&row.targetTopicIds.length>0&&row.targetTopicIds.every(id=>topics.has(id)),'MAPPING_TARGET_OR_CREDIT');check(row.rationale.ru&&row.rationale.en,'MAPPING_RATIONALE');}
  for(const id of b.mapping.addedTopicIds)check(topics.get(id)?.status==='PLANNED'&&!topics.get(id)?.content,'ADDITIONS_REMAIN_PLANNED');
  for(const c of b.contracts){
   check(validateSchema(b.schema,c).length===0,'CP11_SCHEMA '+c.courseId);
   check(Object.values(c.futureExtensions).every(x=>x==='not-implemented'),'UNPROVED_FUTURE_EXTENSIONS');
   check(c.runtimeCompatibility.progressStateKey===b.baseline.storageKeys[c.courseId],'PROGRESS_KEY_PRESERVED');
   const curriculum=b.courses.find(x=>x.courseId===c.courseId);
   check(JSON.stringify(c.topics.map(t=>t.topicId))===JSON.stringify(curriculum?.modules.flatMap(m=>m.topics.map(t=>t.topicId))),'CP11_CURRICULUM_IDS');
   const expectedModules=curriculum?.modules.map(m=>[m.moduleId,m.topics.map(t=>t.topicId)]);
   const actualModules=c.modules.map(m=>[m.moduleId,m.topicIds]);
   check(JSON.stringify(actualModules)===JSON.stringify(expectedModules)&&c.topics.every(t=>modules.get(t.moduleId)?.topics.some(x=>x.topicId===t.topicId)),'CP11_MODULE_SCOPE');
  }
  for(const m of b.manifests)check(m.catalogStatus==='planned'&&m.status==='integration-candidate'&&m.identityDecision==='MASTER-00-2026-10-30','UNACCEPTED_AVAILABLE');
  for(const f of b.sourceManifest.files)check(sha(b.sourceFiles[f.path])===f.sha256&&Buffer.byteLength(b.sourceFiles[f.path])===f.bytes,'SOURCE62_HASH '+f.path);
  check(b.sourceManifest.commit==='3167f1d45c9ed235d3ed69ddee3338b153bb714a','SOURCE62_PIN');
  const refs=new Set([b.shared.id+'@'+b.shared.version,b.supplement.id+'@'+b.supplement.version]),sourceIds=new Set(b.sources.sources.map(s=>s.id));
  check(sourceIds.size===b.sources.sources.length&&b.sources.sources.every(s=>new URL(s.url).protocol==='https:'),'SOURCE_REGISTRY');
  const labs=new Set(b.supplement.labs.map(l=>l.id));check(b.supplement.progressCredit==='none','SHARED_CREDIT');
  check(b.lessons.length===16,'EIGHT_BILINGUAL_LESSONS');for(const l of b.lessons){check(topics.has(l.topicId)&&l.topicId.startsWith(l.courseId+'.'),'LESSON_COURSE_SCOPE');check(l.contentRevision==='0.2.0-consolidated','CONTENT_REVISION');check(l.sharedRefs.includes('onec.shared.v1@1.0.0')&&l.sharedRefs.every(ref=>refs.has(ref))&&(!(l.supplementRefs||[]).length||l.sharedRefs.includes('onec.consolidated-labs.v1@1.0.0')),'SHARED_PIN');check(l.sources.every(id=>sourceIds.has(id)),'UNKNOWN_SOURCE');check((l.supplementRefs||[]).every(id=>labs.has(id)),'UNKNOWN_SUPPLEMENT');check(l.sections.length>0&&l.sections.every(s=>s.length>1&&s.slice(1).every(p=>typeof p==='string'&&p.trim())),'EMPTY_THEORY');check(l.lab.steps.length&&l.lab.expected.length&&l.lab.evidence.length,'LAB_PROOF_REQUIRED');}
  for(const ru of b.lessons.filter(l=>l.locale==='ru')){const en=b.lessons.find(l=>l.topicId===ru.topicId&&l.locale==='en');check(en&&JSON.stringify(ru.quiz.map(q=>q.correct))===JSON.stringify(en.quiz.map(q=>q.correct)),'RU_EN_ANSWER_KEYS');}
  for(const lab of b.supplement.labs){check(lab.title.ru&&lab.title.en&&lab.scope.ru&&lab.scope.en,'SUPPLEMENT_RU_EN');if(lab.kind==='classification')for(const c of lab.cases)check(lab.options.some(o=>o.id===c.answer)&&c.prompt.ru&&c.prompt.en&&c.explanation.ru&&c.explanation.en,'CLASSIFICATION_CASE');}
  const original=JSON.parse(b.sourceFiles['authoring/onec/lessons.json']).lessons.find(l=>l.bslExample).bslExample.source,cost=b.supplement.labs.find(l=>l.id==='service-cost');check(b.nativeModule.includes(original)&&sha(original)===cost.sourceFunctionSha256,'EXACT_SERVICE_COST_FUNCTION');check(cost.cases.length===5&&cost.cases.every(c=>c.minutes*c.hourlyRate/60===c.expected),'SERVICE_COST_SPECIFICATION');
  const env=b.supplement.labs.find(l=>l.id==='environment-record').template;check(env.executionVerified===false&&env.actualOutput===null&&env.platformBuild===null&&env.secretsAllowed===false,'UNKNOWN_ENVIRONMENT_NOT_PASS');
 }catch(error){errors.push('INVALID_BUNDLE '+error.message);}
 return{ok:errors.length===0,errors,stats:{sourceTopics:95,canonicalTopics:84,preservedTopicIds:80,addedPlannedTopics:4,authoredLessons:8,localeBodies:16},nativeExecutionClaim:'separate-local-gate'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=validateConsolidatedBundle(loadConsolidatedBundle());console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
