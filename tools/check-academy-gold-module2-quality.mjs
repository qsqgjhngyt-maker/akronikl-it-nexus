// Структурный gate и инвентаризация; не имитация педагогического эксперимента.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {module2GoldLessons,module2GoldPrograms} from '../tests/helpers/module2-gold-programs.mjs';
const all=await module2GoldLessons(),programs=await module2GoldPrograms(),ru=all.filter(g=>g.locale==='ru');
assert.equal((await readdir(new URL('../courses/cpp/gold/basics/',import.meta.url))).filter(f=>f.endsWith('.json')).length,24);
const sources=[];for(const g of all){const file='courses/cpp/gold/basics/'+g.lessonId.slice(4)+'.'+g.locale+'.json',bytes=await readFile(new URL('../'+file,import.meta.url));sources.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const result={status:'PASS',scope:'Structure, inventory and immutable source hashes only; real compiler/browser results are separate; no claim of learning effectiveness',objects:all.length,lessons:ru.length,sessions:ru.reduce((n,g)=>n+g.sessions,0),workedExamples:ru.reduce((n,g)=>n+g.workedExamples.length,0),practiceTasks:ru.reduce((n,g)=>n+g.practice.length,0),laboratories:ru.length,blockPractica:ru.filter(g=>g.blockPracticum).length,moduleProjects:ru.filter(g=>g.modulePracticum).length,assessmentQuestions:ru.reduce((n,g)=>n+g.assessment.length,0),readinessQuestions:ru.reduce((n,g)=>n+(g.readinessCheck?.length||0),0),uniqueCppPrograms:programs.length,cppCases:programs.reduce((n,p)=>n+p.cases.length,0),intentionalCompileErrors:programs.filter(p=>p.expectation==='compile-error').length,sourceBytes:sources.reduce((n,s)=>n+s.bytes,0),sources,semanticReview:'docs/ru/03-content/CPP_MODULE2_GOLD_REVIEW_RU.md',autograding:false,progressIdsAdded:0,identityChanges:0,cloudChanges:0,production:false,officialRelease:false};
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');await mkdir(out,{recursive:true});await writeFile(path.join(out,'GOLD_QUALITY.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,sources:undefined}));
