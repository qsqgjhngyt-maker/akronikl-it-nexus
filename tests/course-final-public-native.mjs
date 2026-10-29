// Проверка переносимости публичных TODO-проектов; решения и ключи не нужны.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir,mkdtemp,readdir}from'node:fs/promises';import path from'node:path';import os from'node:os';import{spawnSync}from'node:child_process';
const out=path.resolve(process.env.NEXUS_COURSE_FINAL_EVIDENCE||'course-final-public-evidence'),work=await mkdtemp(path.join(os.tmpdir(),'nexus-final-public-')),records=[];await mkdir(out,{recursive:true});
for(const folder of['kits','projects'])for(const name of(await readdir('courses/cpp/final/'+folder)).filter(f=>f.endsWith('.json'))){
 const kit=JSON.parse(await readFile('courses/cpp/final/'+folder+'/'+name)),dir=path.join(work,folder,name.slice(0,-5));
 for(const file of kit.template.files){assert.ok(!path.isAbsolute(file.path)&&!file.path.split('/').includes('..'));const target=path.join(dir,file.path);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,file.content)}
 const run=(cmd,args)=>spawnSync(cmd,args,{encoding:'utf8',timeout:90000,maxBuffer:1048576});
 const configure=run('cmake',['-S',dir,'-B',path.join(dir,'build'),'-DCMAKE_BUILD_TYPE=Debug','-DCMAKE_CXX_FLAGS=-fsanitize=undefined -fno-sanitize-recover=all']),build=configure.status===0?run('cmake',['--build',path.join(dir,'build'),'--parallel','2']):null;
 assert.equal(configure.status,0,configure.stderr);assert.equal(build.status,0,build.stderr);
 const tests=run('ctest',['--test-dir',path.join(dir,'build'),'--output-on-failure']);assert.notEqual(tests.status,0,'TODO starter must not receive ready solution credit');assert.ok(tests.stdout.includes('public_contract'),'Actual test must execute');
 records.push({id:kit.id,status:'PASS',nativeCmakeBuild:true,publicTodoTests:'EXPECTED FAIL',guiNativeProved:false});console.log(JSON.stringify(records.at(-1)));
}
assert.equal(records.length,15);await writeFile(path.join(out,'PUBLIC_NATIVE.json'),JSON.stringify({status:'PASS',records,privateSolutionsUsed:false,ubsan:true},null,2)+'\n');
