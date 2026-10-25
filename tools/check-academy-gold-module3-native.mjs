// Изолированные native C++20/UBSan контроли теми же исходниками, без browser mock.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';import path from 'node:path';
import {createHash} from 'node:crypto';
import {M3_PROBES,M3_CASE_COUNT} from '../tests/fixtures/cpp-module3-probes.mjs';
const out=path.resolve(process.env.NEXUS_M3_EVIDENCE||'academy-gold-m3-evidence');await mkdir(out,{recursive:true});
const compiler=process.env.CXX||'g++',version=spawnSync(compiler,['--version'],{encoding:'utf8'});
assert.equal(version.status,0,'Требуется настоящий g++ C++20; отсутствие compiler не PASS');
const records=[],work=await mkdtemp(path.join(os.tmpdir(),'nexus-m3-native-'));
for(const p of M3_PROBES){
 const dir=path.join(work,p.id);await mkdir(dir);const files={...(p.files||{}),...(p.nativeSetup||{}),'main.cpp':p.source};
 for(const [f,content]of Object.entries(files)){assert.ok(!f.includes('..')&&!path.isAbsolute(f));await mkdir(path.dirname(path.join(dir,f)),{recursive:true});await writeFile(path.join(dir,f),content);}
 const args=['-std=c++20','-fno-exceptions','-O0','-g','-fsanitize=undefined','-fno-sanitize-recover=all',...(p.metadata?.includeRoots||[]).flatMap(p=>['-I',p]),...(p.metadata?.translationUnits||Object.keys(files).filter(f=>/\.(cpp|cc|cxx)$/.test(f))),'-o','program'];
 const build=spawnSync(compiler,args,{cwd:dir,encoding:'utf8',timeout:60000});
 for(const [index,c]of p.cases.entries()){
  let run,pass;if(p.expectation==='compile-error')pass=build.status!==0&&!!build.stderr?.toLowerCase().includes(c.diagnostic.toLowerCase());
  else{assert.equal(build.status,0,p.id+' '+build.stderr);run=spawnSync(path.join(dir,'program'),[],{cwd:dir,input:c.stdin,encoding:'utf8',timeout:5000});pass=run.status===0&&run.stderr===''&&run.stdout===c.stdout;if(p.outputFiles)for(const [f,value]of Object.entries(p.outputFiles))pass&&=(await readFile(path.join(dir,f),'utf8'))===value;}
  records.push({probe:p.id,index,pass,sourceSha256:createHash('sha256').update(p.source).digest('hex'),compileExit:build.status,compileStderr:build.stderr?.slice(0,3000),stdout:run?.stdout,stderr:run?.stderr,exitCode:run?.status,scope:p.nativeSetup?'Host input explicitly seeded; no browser persistence claim':undefined});
 }
 console.log(JSON.stringify({probe:p.id,status:records.filter(r=>r.probe===p.id).every(r=>r.pass)?'PASS':'FAIL'}));
}
const result={status:records.length===M3_CASE_COUNT&&records.every(r=>r.pass)?'PASS':'FAIL',programs:M3_PROBES.length,cases:records.length,compiler:version.stdout.split('\n')[0],ubsan:true,exceptions:false,records};
await writeFile(path.join(out,'NATIVE.json'),JSON.stringify(result,null,2)+'\n');assert.equal(result.status,'PASS');
