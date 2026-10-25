// Реальный native C++20 + UBSan: все полные программы, заготовки и варианты RU/EN.
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {module2GoldPrograms,matchesGoldOutput} from '../tests/helpers/module2-gold-programs.mjs';
const out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence'),cxx=process.env.CXX||'g++';await mkdir(out,{recursive:true});
const version=spawnSync(cxx,['--version'],{encoding:'utf8',timeout:10000});assert.equal(version.status,0,'Настоящий C++ компилятор недоступен: '+version.error);
const programs=await module2GoldPrograms(),dir=await mkdtemp(path.join(tmpdir(),'nexus-m2-gold-')),records=[];
for(const [i,p]of programs.entries()){
 const source=path.join(dir,i+'.cpp'),exe=path.join(dir,i+(process.platform==='win32'?'.exe':''));await writeFile(source,p.source);
 const built=spawnSync(cxx,['-std=c++20','-O0','-Wall','-Wextra','-pedantic-errors','-fsanitize=undefined','-fno-sanitize-recover=undefined',source,'-o',exe],{encoding:'utf8',timeout:45000});
 if(p.expectation==='compile-error')records.push({id:p.id,sourceSha256:p.sourceSha256,aliases:p.aliases,phase:'compile',diagnostic:built.stderr,exitCode:built.status,pass:Number.isInteger(built.status)&&built.status!==0&&/error:/.test(built.stderr)});
 else if(built.status!==0)records.push({id:p.id,sourceSha256:p.sourceSha256,phase:'compile',diagnostic:built.stderr,pass:false});
 else for(const [index,c]of p.cases.entries()){
  const r=spawnSync(exe,[],{input:c.stdin,encoding:'utf8',timeout:3000,maxBuffer:1048576});records.push({id:p.id,index,sourceSha256:p.sourceSha256,aliases:p.aliases,expectation:p.expectation,stdin:c.stdin,expected:c.stdout,stdout:r.stdout,stderr:r.stderr,exitCode:r.status,warnings:built.stderr,pass:r.status===0&&r.stderr===''&&matchesGoldOutput(p,r.stdout,c)});
 }
 console.log((records.filter(r=>r.id===p.id).every(r=>r.pass)?'PASS ':'FAIL ')+p.id);
 await writeFile(path.join(out,'GOLD_HOST_CPP.json'),JSON.stringify({status:records.every(r=>r.pass)?'PASS':'FAIL',compiler:version.stdout.trim(),standard:'c++20',sanitizer:'undefined',programs:programs.length,records},null,2)+'\n');
}
if(records.some(r=>!r.pass))process.exitCode=1;
