// Реальная компиляция опубликованных C++ исходников; никаких имитаторов runtime.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {GOLD_ALGORITHM_LESSONS,goldLessonPath} from '../core/academy-gold-catalog.js';
const cxx=process.env.CXX||'g++',out=path.resolve(process.env.NEXUS_GOLD_EVIDENCE||'academy-gold-evidence');
await mkdir(out,{recursive:true});
const version=spawnSync(cxx,['--version'],{encoding:'utf8',timeout:10000});assert.equal(version.status,0,'Реальный C++ компилятор недоступен: '+version.error);
const dir=await mkdtemp(path.join(tmpdir(),'nexus-gold-cpp-')),compiled=new Map(),results=[];
for(const id of GOLD_ALGORITHM_LESSONS)for(const locale of ['ru','en']){
 const g=JSON.parse(await readFile(new URL('../'+goldLessonPath(id,locale),import.meta.url),'utf8'));
 const programs=[...g.workedExamples.map((e,i)=>({name:'example-'+(i+1),code:e.code,cases:[{stdin:e.stdin,stdout:e.expectedStdout},...(e.cases||[])]})),{name:'laboratory',code:g.laboratory.referenceCode,cases:g.laboratory.cases}];
 if(g.modulePracticum)programs.push({name:'module-practicum',code:g.modulePracticum.referenceCode,cases:g.modulePracticum.cases},{name:'module-practicum-starter',code:g.modulePracticum.starterCode,cases:[{stdin:'',stdout:'todo\n'}]});
 for(const p of programs){
  const hash=createHash('sha256').update(p.code).digest('hex');let exe=compiled.get(hash);
  if(!exe){
   const src=path.join(dir,hash+'.cpp');exe=path.join(dir,hash+(process.platform==='win32'?'.exe':''));await writeFile(src,p.code);
   const result=spawnSync(cxx,['-std=c++20','-O0','-g','-Wall','-Wextra','-Werror','-pedantic-errors','-fsanitize=undefined','-fno-sanitize-recover=undefined',src,'-o',exe],{encoding:'utf8',timeout:30000,maxBuffer:1048576});
   assert.equal(result.status,0,id+' '+p.name+'\n'+result.stderr);compiled.set(hash,exe);
  }
  for(const [index,c] of p.cases.entries()){
   const r=spawnSync(exe,[],{input:c.stdin,encoding:'utf8',timeout:3000,maxBuffer:1048576});
   const record={id,locale,program:p.name,index,sourceSha256:hash,stdin:c.stdin,expected:c.stdout,actual:r.stdout,stderr:r.stderr,exitCode:r.status};results.push(record);
   await writeFile(path.join(out,'cpp-results.json'),JSON.stringify({compiler:version.stdout.trim(),standard:'c++20',sanitizer:'undefined',uniquePrograms:compiled.size,cases:results},null,2)+'\n');
   assert.equal(r.status,0,JSON.stringify(record));assert.equal(r.stderr,'',JSON.stringify(record));assert.equal(r.stdout,c.stdout,JSON.stringify(record));
  }
 }
}
console.log('PASS: реальный C++20 + UBSan, '+compiled.size+' уникальных программ, '+results.length+' запусков RU/EN.');
