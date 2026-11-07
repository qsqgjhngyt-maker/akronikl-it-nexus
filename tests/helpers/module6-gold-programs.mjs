import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{GOLD_EVENT_LESSONS,goldLessonPath}from'../../core/academy-gold-catalog.js';
export{programFiles}from'./module4-gold-programs.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export async function module6GoldLessons(){return Promise.all(GOLD_EVENT_LESSONS.flatMap(id=>['ru','en'].map(async locale=>JSON.parse(await readFile(new URL('../../'+goldLessonPath(id,locale),import.meta.url),'utf8')))));}
export async function module6GoldPrograms({includeAuthored=process.env.NEXUS_B6_PROGRAMS==='1'}={}){
 const found=new Map();
 for(const g of await module6GoldLessons()){
  const add=(part,source,cases,files={},metadata={})=>{
   assert.ok(source.includes('int main('),g.lessonId+' '+part);
   const target=g.runtimeTarget,compileFiles=Object.fromEntries(Object.entries(files).filter(([f])=>/\.(?:cpp|hpp|h|cc|cxx)$/.test(f)||f==='CMakeLists.txt'||f==='nexus-application.json'));
   const key=sha(JSON.stringify({target,source,files:compileFiles,metadata,cases:target==='qt-wasm'?cases.map(c=>({stdout:c.stdout})):cases})),alias={lesson:g.lessonId,locale:g.locale,part};
   if(found.has(key))found.get(key).aliases.push(alias);else found.set(key,{id:g.lessonId.slice(4)+'-'+part+(includeAuthored?'-'+key.slice(0,12):''),target,source,sourceSha256:sha(source),files,metadata,cases,aliases:[alias]});
  };
  for(const e of g.workedExamples)add('example-'+e.id,e.code,[{stdin:e.stdin,stdout:e.expectedStdout}],e.files,e.metadata);
  const a=g.laboratory;
  add('lab-starter',a.starterCode,[{stdin:a.cases[0].stdin,stdout:a.starterExpectedStdout}],a.starterFiles,a.metadata);
  add('lab-reference',a.referenceCode,a.cases,a.referenceFiles,a.metadata);
  if(includeAuthored){
   const edition=g.teachingEdition,practice=edition.practice;
   for(const [i,e] of g.workedExamples.entries()){
    const section=edition.sections.find(s=>s.id==='example-'+(i+1)),code=section.code||section.reveal.code;
    add('authored-example-'+e.id,code.source,[{stdin:code.stdin,stdout:code.output}],code.files,code.metadata);
   }
   const files=Object.fromEntries(practice.files.map(f=>[f.path,f.content]));
   const entry=practice.metadata.entryFile||'main.cpp',source=files[entry];delete files[entry];
   const cases=g.runtimeTarget==='qt-wasm'?a.cases:[{stdin:practice.stdin,stdout:practice.starterObservation.stdout,exitCode:0}];
   add('authored-starter',source,cases,files,practice.metadata);
   for(const v of edition.verificationCases||[])add('authored-probe-'+v.id,v.source,[{stdin:v.stdin,stdout:v.output}],v.files,v.metadata);
  }
 }
 return [...found.values()];
}
