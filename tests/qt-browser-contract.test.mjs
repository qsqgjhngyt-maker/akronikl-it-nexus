import test from'node:test';import assert from'node:assert/strict';import{gzipSync}from'node:zlib';
import{qtProject,qtCompilerArgs}from'../sandbox/qt/project.js';
import{taskFlowApplicationTemplate}from'../project-studio/application-template.js';
import{digest,unpackVerified,readBounded}from'../sandbox/qt/verified-pack.js';
const workspace=()=>{const t=taskFlowApplicationTemplate();return{entryFile:t.entryFile,files:t.files,languageId:'cpp'}};
test('старый TaskFlow выбирает GUI без изменения сохранённой работы',()=>{
 const w=workspace(),f=w.files.find(f=>f.path==='nexus-application.json'),c=JSON.parse(f.content);delete c.targets.gui;f.content=JSON.stringify(c);const before=JSON.stringify(w),p=qtProject(w,['include']);
 assert.deepEqual(p.units,['src/gui.cpp','src/task_model.cpp']);assert.equal(JSON.stringify(w),before);
 assert.deepEqual(p.outputDataFiles,['taskflow.txt']);
});
test('явный GUI target принимает имена, похожие на флаги, только как пути',()=>{
 const w=workspace(),config=w.files.find(f=>f.path==='nexus-application.json');w.files.push({path:'-evil.cpp',content:'int main(){}'});
 const c=JSON.parse(config.content);c.targets.gui=['-evil.cpp'];config.content=JSON.stringify(c);
 const p=qtProject(w),args=qtCompilerArgs(p),separator=args.indexOf('--');
 assert.deepEqual(args.slice(separator+1),['__nexus_student__/-evil.cpp']);assert.ok(args.indexOf('-o')<separator);
 assert.ok(!args.includes('-evil.cpp'));
});
test('неизвестные units/дубли/выход за VFS не отправляются компилятору',()=>{
 for(const units of[['missing.cpp'],['src/gui.cpp','src/gui.cpp'],['../secret.cpp']]){
  const w=workspace(),f=w.files.find(f=>f.path==='nexus-application.json'),c=JSON.parse(f.content);c.targets.gui=units;f.content=JSON.stringify(c);assert.throws(()=>qtProject(w));
 }
});
test('пакет проверяет сжатые и распакованные bytes, усечение и размер',async()=>{
 const raw=new TextEncoder().encode('Qt fixture'),bytes=gzipSync(raw),record={bytes:bytes.length,sha256:await digest(bytes),encoding:'gzip',rawBytes:raw.length,rawSha256:await digest(raw)};
 assert.deepEqual(await unpackVerified(bytes,record),raw);
 const tampered=bytes.slice();tampered[12]^=1;
 for(const[r,b]of[[record,tampered],[record,bytes.subarray(1)],[{...record,rawBytes:raw.length-1},bytes],[{...record,rawSha256:'0'.repeat(64)},bytes]])await assert.rejects(unpackVerified(b,r));
});
test('поток сверх лимита отменяется до дальнейшего чтения',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(10))},cancel(){cancelled=true}});
 await assert.rejects(readBounded(stream,9));assert.equal(cancelled,true);
});
