import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {clarityPrograms} from '../tests/helpers/cpp-clarity-programs.mjs';
const out=path.resolve(process.env.NEXUS_CLARITY_EVIDENCE||'cpp-clarity-evidence');await mkdir(out,{recursive:true});
const cxx=process.env.CXX||'g++',version=spawnSync(cxx,['--version'],{encoding:'utf8'});assert.equal(version.status,0,'Host C++ compiler is required');
const dir=await mkdtemp(path.join(tmpdir(),'cpp-clarity-')),compiled=new Map(),rows=[];
for(const p of await clarityPrograms()){
 let exe=compiled.get(p.sourceSha256);
 if(!exe){const source=path.join(dir,p.sourceSha256+'.cpp');exe=path.join(dir,p.sourceSha256+(process.platform==='win32'?'.exe':''));await writeFile(source,p.source);const r=spawnSync(cxx,['-std=c++20','-O0','-g','-Wall','-Wextra','-Werror','-pedantic-errors','-fsanitize=undefined','-fno-sanitize-recover=undefined',source,'-o',exe],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,p.id+' '+p.name+'\n'+r.stderr);compiled.set(p.sourceSha256,exe);}
 for(const c of p.cases){const r=spawnSync(exe,[],{input:c.stdin,encoding:'utf8',timeout:5000});rows.push({id:p.id,locale:p.locale,name:p.name,sourceSha256:p.sourceSha256,stdin:c.stdin,expected:c.stdout,actual:r.stdout,stderr:r.stderr,exitCode:r.status});await writeFile(path.join(out,'HOST.json'),JSON.stringify({compiler:version.stdout.trim(),method:'Actual host C++20 + UBSan; distinct from Nexus Clang/WASI',rows},null,2)+'\n');assert.equal(r.status,0);assert.equal(r.stdout,c.stdout,p.id+' '+p.name);assert.equal(r.stderr,'');}
}
console.log(JSON.stringify({status:'PASS',uniquePrograms:compiled.size,observations:rows.length,negativeControls:2,learnerFeedback:'NOT RUN'}));
