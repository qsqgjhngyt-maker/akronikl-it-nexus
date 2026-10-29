// Независимый host C++20/UBSan, не доказательство browser GUI/EH.
import assert from'node:assert/strict';import{mkdir,writeFile,readFile,mkdtemp}from'node:fs/promises';import{spawnSync}from'node:child_process';import path from'node:path';import os from'node:os';import{createHash}from'node:crypto';
import{M6_PROBES,M6_CASE_COUNT}from'../tests/fixtures/cpp-module6-probes.mjs';
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE||'academy-gold-m6-evidence');await mkdir(out,{recursive:true});
const compiler=process.env.CXX||'g++',version=spawnSync(compiler,['--version'],{encoding:'utf8'});assert.equal(version.status,0,'Нужен настоящий host C++ compiler');
const work=await mkdtemp(path.join(os.tmpdir(),'nexus-m6-native-')),records=[];
for(const p of M6_PROBES){
 const dir=path.join(work,p.id);await mkdir(dir);for(const[f,data]of Object.entries({...p.files,'main.cpp':p.source})){assert.ok(!path.isAbsolute(f)&&!f.split('/').includes('..'));await mkdir(path.dirname(path.join(dir,f)),{recursive:true});await writeFile(path.join(dir,f),data)}
 const args=['-std=c++20','-O0','-g','-fsanitize=undefined','-fno-sanitize-recover=all',...(p.capability==='threads'?['-pthread']:[]),...(p.metadata?.translationUnits||['main.cpp']),'-o','program'];const build=spawnSync(compiler,args,{cwd:dir,encoding:'utf8',timeout:60000});
 for(const[index,c]of p.cases.entries()){
  let run,pass=false;if(p.nativeExpectation==='compile-error')pass=Number.isInteger(build.status)&&build.status!==0&&build.stderr?.toLowerCase().includes(c.diagnostic.toLowerCase());
  else if(build.status===0){run=spawnSync(path.join(dir,'program'),[],{cwd:dir,input:c.stdin,encoding:'utf8',timeout:5000});pass=run.status===0&&run.stderr===''&&run.stdout===c.stdout;for(const[f,value]of Object.entries(p.outputFiles||{}))pass&&=(await readFile(path.join(dir,f),'utf8'))===value;}
  records.push({probe:p.id,index,pass,boundary:p.boundary||null,sourceSha256:createHash('sha256').update(p.source).digest('hex'),compileExit:build.status,compileStderr:build.stderr?.slice(0,1800),stdout:run?.stdout,stderr:run?.stderr,exitCode:run?.status});
 }console.log(JSON.stringify({probe:p.id,status:records.filter(r=>r.probe===p.id).every(r=>r.pass)?'PASS':'FAIL'}));
}
const result={status:records.length===M6_CASE_COUNT&&records.every(r=>r.pass)?'PASS':'FAIL',programs:M6_PROBES.length,cases:records.length,passed:records.filter(r=>r.pass).length,compiler:version.stdout.split('\n')[0],standard:'c++20',ubsan:true,browserOrQtSupportProved:false,records};await writeFile(path.join(out,'NATIVE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,records:undefined}));assert.equal(result.status,'PASS');
