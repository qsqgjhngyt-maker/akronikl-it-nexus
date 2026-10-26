// Host C++20/UBSan не заменяет доказательство browser EH.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {M5_PROBES,M5_CASE_COUNT} from '../tests/fixtures/cpp-module5-probes.mjs';
const out=path.resolve(process.env.NEXUS_M5_EVIDENCE||'academy-gold-m5-evidence');await mkdir(out,{recursive:true});
const compiler=process.env.CXX||'g++',version=spawnSync(compiler,['--version'],{encoding:'utf8'});assert.equal(version.status,0,'Требуется настоящий host C++ compiler');
const work=await mkdtemp(path.join(os.tmpdir(),'nexus-m5-native-')),records=[];
for(const p of M5_PROBES){
 const dir=path.join(work,p.id);await mkdir(dir);const files={...(p.files||{}),'main.cpp':p.source};
 for(const [f,data]of Object.entries(files)){assert.ok(!path.isAbsolute(f)&&!f.split('/').includes('..'));await mkdir(path.dirname(path.join(dir,f)),{recursive:true});await writeFile(path.join(dir,f),data);}
 const args=['-std=c++20',...(p.capability==='exceptions'?[]:['-fno-exceptions']),'-O0','-g','-fsanitize=undefined','-fno-sanitize-recover=all',...(p.metadata?.includeRoots||[]).flatMap(f=>['-I',f]),...(p.metadata?.translationUnits||['main.cpp']),'-o','program'];
 const build=spawnSync(compiler,args,{cwd:dir,encoding:'utf8',timeout:60000});
 for(const [index,c]of p.cases.entries()){
  let run,pass=false;if(p.expectation==='compile-error')pass=Number.isInteger(build.status)&&build.status!==0&&!!build.stderr?.toLowerCase().includes(c.diagnostic.toLowerCase());
  else if(build.status===0){run=spawnSync(path.join(dir,'program'),[],{cwd:dir,input:c.stdin,encoding:'utf8',timeout:5000});pass=run.status===0&&run.stderr===''&&run.stdout===c.stdout;for(const [f,data]of Object.entries(p.outputFiles||{}))pass&&=(await readFile(path.join(dir,f),'utf8'))===data;}
  records.push({probe:p.id,index,pass,capability:p.capability||'standard-cpp',ehEnabled:p.capability==='exceptions',sourceSha256:createHash('sha256').update(p.source).digest('hex'),compileExit:build.status,compileStderr:build.stderr?.slice(0,2400),stdout:run?.stdout,stderr:run?.stderr,exitCode:run?.status});
 }
 console.log(JSON.stringify({probe:p.id,status:records.filter(r=>r.probe===p.id).every(r=>r.pass)?'PASS':'FAIL'}));
}
const result={status:records.length===M5_CASE_COUNT&&records.every(r=>r.pass)?'PASS':'FAIL',programs:M5_PROBES.length,cases:records.length,passed:records.filter(r=>r.pass).length,compiler:version.stdout.split('\n')[0],standard:'c++20',ubsan:true,browserEhProved:false,records};
await writeFile(path.join(out,'NATIVE.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,records:undefined}));assert.equal(result.status,'PASS');
