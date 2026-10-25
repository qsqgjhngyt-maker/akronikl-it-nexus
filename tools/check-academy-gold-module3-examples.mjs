// Настоящий native C++20, без EH; каждый случай получает отдельную рабочую папку.
import assert from 'node:assert/strict';import {mkdir,writeFile,readFile,mkdtemp} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import os from 'node:os';import path from 'node:path';
import {module3GoldPrograms,programFiles} from '../tests/helpers/module3-gold-programs.mjs';
const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});
const compiler=process.env.CXX||'g++',version=spawnSync(compiler,['--version'],{encoding:'utf8'});assert.equal(version.status,0,'Нужен реальный g++, отсутствие compiler не PASS');
const work=await mkdtemp(path.join(os.tmpdir(),'nexus-m3-gold-')),programs=await module3GoldPrograms(),records=[];
for(const [i,p]of programs.entries()){
 const buildDir=path.join(work,String(i));await mkdir(buildDir);
 for(const [file,content]of Object.entries({...p.files,'main.cpp':p.source})){assert.ok(!file.includes('..')&&!path.isAbsolute(file));await mkdir(path.dirname(path.join(buildDir,file)),{recursive:true});await writeFile(path.join(buildDir,file),content);}
 const args=['-std=c++20','-fno-exceptions','-O0','-g','-Wall','-Wextra','-pedantic-errors','-fsanitize=undefined','-fno-sanitize-recover=all',...(p.metadata.includeRoots||[]).flatMap(f=>['-I',f]),...(p.metadata.translationUnits||['main.cpp']),'-o','program'];
 const built=spawnSync(compiler,args,{cwd:buildDir,encoding:'utf8',timeout:60000});
 for(const [index,c]of p.cases.entries()){
  let pass,run,artifacts={};
  if(p.expectation!=='exact')pass=Number.isInteger(built.status)&&built.status!==0&&built.stderr.includes(p.diagnostic);
  else if(built.status!==0)pass=false;
  else{
   const dir=path.join(buildDir,'case-'+index);await mkdir(dir);
   for(const [file,content]of Object.entries(programFiles(p,c))){await mkdir(path.dirname(path.join(dir,file)),{recursive:true});await writeFile(path.join(dir,file),content);}
   run=spawnSync(path.join(buildDir,'program'),[],{cwd:dir,input:c.stdin,encoding:'utf8',timeout:5000,maxBuffer:1048576});
   pass=run.status===(c.exitCode||0)&&run.stderr===''&&run.stdout===c.stdout;
   for(const [file,value]of Object.entries(c.outputFiles||{})){try{artifacts[file]=await readFile(path.join(dir,file),'utf8')}catch{artifacts[file]=null}pass&&=artifacts[file]===value;}
  }
  records.push({id:p.id,index,aliases:p.aliases,sourceSha256:p.sourceSha256,bundleSha256:p.bundleSha256,pass,compileExit:built.status,diagnostic:built.stderr?.slice(0,4000),expected:c.stdout,stdout:run?.stdout,stderr:run?.stderr,exitCode:run?.status,artifacts});
 }
 console.log((records.filter(r=>r.id===p.id).every(r=>r.pass)?'PASS ':'FAIL ')+p.id);
}
const result={status:records.every(r=>r.pass)?'PASS':'FAIL',programs:programs.length,cases:records.length,compiler:version.stdout.trim(),standard:'C++20',exceptions:false,ubsan:true,records};await writeFile(path.join(out,'GOLD_NATIVE.json'),JSON.stringify(result,null,2)+'\n');assert.equal(result.status,'PASS');
