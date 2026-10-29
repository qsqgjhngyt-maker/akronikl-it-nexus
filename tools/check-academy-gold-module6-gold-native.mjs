// Реальные Gold исходники C++20: сборка один раз на bundle, каждый вход — отдельный процесс.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir,mkdtemp,rm}from'node:fs/promises';import path from'node:path';import os from'node:os';import{spawnSync}from'node:child_process';
const extracted=process.env.NEXUS_GOLD_CONTRACTS?JSON.parse(await readFile(process.env.NEXUS_GOLD_CONTRACTS,'utf8')):await(await import('../tests/helpers/module6-gold-programs.mjs')).module6GoldPrograms();
const programFiles=(p,c)=>({...p.files,...(c.files||{}),'main.cpp':p.source});
const out=path.resolve(process.env.NEXUS_M6_EVIDENCE||'academy-gold-m6-evidence'),work=await mkdtemp(path.join(os.tmpdir(),'nexus-m6-gold-'));await mkdir(out,{recursive:true});
const compiler=process.env.CXX||'g++',v=spawnSync(compiler,['--version'],{encoding:'utf8'});assert.equal(v.status,0,'Требуется настоящий C++ compiler');
const records=[],programs=extracted.filter(p=>p.target==='wasm-cpp');
for(const p of programs){
 const dir=path.join(work,p.id);await mkdir(dir);for(const[f,content]of Object.entries(programFiles(p,p.cases[0]))){assert.ok(!path.isAbsolute(f)&&!f.split('/').includes('..'));await mkdir(path.dirname(path.join(dir,f)),{recursive:true});await writeFile(path.join(dir,f),content);}
 const build=spawnSync(compiler,['-std=c++20','-O0','-g','-fsanitize=undefined','-fno-sanitize-recover=all',...(p.metadata.includeRoots||[]).flatMap(f=>['-I',f]),...(p.metadata.translationUnits||['main.cpp']),'-o','program'],{cwd:dir,encoding:'utf8',timeout:60000});
 for(const[index,c]of p.cases.entries()){
  const run=build.status===0?spawnSync(path.join(dir,'program'),[],{cwd:dir,input:c.stdin,encoding:'utf8',timeout:5000}):null;
  records.push({id:p.id,index,aliases:p.aliases,sourceSha256:p.sourceSha256,pass:build.status===0&&run?.status===0&&run.stdout===c.stdout&&run.stderr==='',compileExit:build.status,diagnostic:build.stderr?.slice(0,1600),stdout:run?.stdout,stderr:run?.stderr,exitCode:run?.status,expected:c.stdout});
 }
 console.log(JSON.stringify({id:p.id,status:records.filter(x=>x.id===p.id).every(x=>x.pass)?'PASS':'FAIL'}));
}
const result={status:records.every(r=>r.pass)?'PASS':'FAIL',programs:programs.length,cases:records.length,passed:records.filter(r=>r.pass).length,compiler:v.stdout.split('\n')[0],ubsan:true,browserRuntimeProved:false,records};await writeFile(path.join(out,'GOLD_NATIVE.json'),JSON.stringify(result,null,2)+'\n');await rm(work,{recursive:true,force:true});console.log(JSON.stringify({...result,records:undefined}));assert.equal(result.status,'PASS');
