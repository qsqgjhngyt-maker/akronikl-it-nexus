// M2-0: независимая проверка probe-исходников настоящим host C++20 + UBSan.
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {M2_PROBES,matchesOutput} from '../tests/fixtures/cpp-module2-probes.mjs';
const cxx=process.env.CXX||'g++',out=path.resolve(process.env.NEXUS_M2_EVIDENCE||'academy-gold-m2-evidence');
await mkdir(out,{recursive:true});
const version=spawnSync(cxx,['--version'],{encoding:'utf8',timeout:10000});
assert.equal(version.status,0,'Нужен настоящий компилятор: '+version.error);
const dir=await mkdtemp(path.join(tmpdir(),'nexus-m2-cpp-')),records=[];
for(const p of M2_PROBES){
 const sourceSha256=createHash('sha256').update(p.source).digest('hex'),file=path.join(dir,p.id+'.cpp'),exe=path.join(dir,p.id+(process.platform==='win32'?'.exe':''));
 await writeFile(file,p.source);
 // -Werror не нужен: учебные probes специально исследуют смешанные знаки
 // и unevaluated operand. Реальные предупреждения сохраняются в evidence.
 const compiled=spawnSync(cxx,['-std=c++20','-O0','-g','-Wall','-Wextra','-pedantic-errors','-fsanitize=undefined','-fno-sanitize-recover=undefined',file,'-o',exe],{encoding:'utf8',timeout:45000});
 if(p.expectation==='compile-error')records.push({probe:p.id,sourceSha256,compile:compiled.status,diagnostic:compiled.stderr,pass:Number.isInteger(compiled.status)&&compiled.status!==0&&/error:/.test(compiled.stderr)});
 else if(compiled.status!==0)records.push({probe:p.id,sourceSha256,compile:compiled.status,diagnostic:compiled.stderr,pass:false});
 else for(const [index,c]of p.cases.entries()){
  const r=spawnSync(exe,[],{input:c.stdin,encoding:'utf8',timeout:3000,maxBuffer:1048576});
  records.push({probe:p.id,index,sourceSha256,stdin:c.stdin,expected:c.stdout,stdout:r.stdout,stderr:r.stderr,exitCode:r.status,compilerWarnings:compiled.stderr,pass:r.status===0&&r.stderr===''&&matchesOutput(p,r.stdout,c)});
 }
 console.log((records.filter(r=>r.probe===p.id).every(r=>r.pass)?'PASS ':'FAIL ')+p.id);
 await writeFile(path.join(out,'HOST_CPP.json'),JSON.stringify({compiler:version.stdout.trim(),standard:'c++20',sanitizer:'undefined',programs:M2_PROBES.length,records,status:records.every(r=>r.pass)?'PASS':'FAIL'},null,2)+'\n');
}
if(records.some(r=>!r.pass))process.exitCode=1;
