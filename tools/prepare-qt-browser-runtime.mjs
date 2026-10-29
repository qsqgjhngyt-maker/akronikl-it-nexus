// Сборка только в явно указанную новую локальную папку. Ничего не публикует.
import{readFile,writeFile,mkdir,copyFile}from'node:fs/promises';
import{execFile}from'node:child_process';import{promisify}from'node:util';
import{gzipSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import path from'node:path';import{fileURLToPath}from'node:url';
import{runDockerBuild}from'../studio-build/docker-runner.mjs';
import{installQtAccessibleControls}from'../studio-build/preview.mjs';
const value=flag=>{const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]},repo=fileURLToPath(new URL('../',import.meta.url)),arg=value('--out');
if(!arg)throw Error('Укажите новую папку --out');const out=path.resolve(arg),pack=path.join(out,'runtime-packs/qt-6.8.3-v1');
const base=value('--public-base')||'https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/runtime-packs/qt-6.8.3-v1/';
const parent=value('--parent')||'https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
const local=process.argv.includes('--local-test');
for(const u of[base,parent]){const parsed=new URL(u);if(parsed.username||parsed.password||parsed.search||parsed.hash||parsed.protocol!=='https:'&&!(local&&parsed.protocol==='http:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw Error('QT_PUBLIC_URL_INVALID')}
if(!base.endsWith('/')||new URL(parent).origin!==parent)throw Error('QT_PUBLIC_URL_INVALID');
await mkdir(out,{recursive:false});await mkdir(pack,{recursive:true});
// При самостоятельной пересборке image ID закономерно отличается. Получатель
// явно закрепляет свой ID, а не отключает проверку целостности.
const image=value('--image')||'nexus-m6-qt:6.8.3-ems3.1.56',imageId=value('--expected-image-id')||'sha256:d6bcaf3ab7c3ebe08b38ea816ee67acbe366421701d99210fd355ce2a8ccb9ef';
if(!/^sha256:[a-f0-9]{64}$/.test(imageId)||! /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,220}$/.test(image))throw Error('QT_SDK_IMAGE_INVALID');
const execute=promisify(execFile),inspection=await execute('docker',['image','inspect',image,'--format','{{.Id}}']);
if(inspection.stdout.trim()!==imageId)throw Error('QT_SDK_IMAGE_CHANGED');
const files=await Promise.all([['host.cpp','host.cpp'],['CMakeLists.txt','CMakeLists.txt'],['export-generator.txt','export-generator.py']].map(async([name,source])=>({path:name,content:await readFile(path.join(repo,'studio-build/browser-qt',source),'utf8'),languageId:'cpp'})));
const result=await runDockerBuild({workspace:{entryFile:'host.cpp',files},root:path.join(out,'build'),image,mode:'qt-wasm'});
await writeFile(path.join(out,'BUILD_RESULT.json'),JSON.stringify(result,null,2)+'\n');if(result.status!=='passed')throw Error('QT_HOST_BUILD_FAILED');
const headerScript=`import pathlib,json,gzip,sys
files={}
for source,prefix in [('/opt/qt/6.8.3/wasm_singlethread/include','qt/include'),('/opt/qt/6.8.3/wasm_singlethread/mkspecs','qt/mkspecs'),('/emsdk/upstream/emscripten/cache/sysroot/include','emscripten/include')]:
 root=pathlib.Path(source)
 for p in sorted(root.rglob('*')):
  if p.is_file():
   try: text=p.read_text(encoding='utf-8')
   except UnicodeError: continue
   files[prefix+'/'+p.relative_to(root).as_posix()]=text
sys.stdout.buffer.write(gzip.compress(json.dumps(files,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode('utf-8'),mtime=0))
`;
const extracted=await execute('docker',['run','--rm','--network','none','--read-only','--entrypoint','python3',image,'-c',headerScript],{encoding:'buffer',maxBuffer:12*1024*1024});
const hash=b=>createHash('sha256').update(b).digest('hex'),sri=b=>'sha256-'+createHash('sha256').update(b).digest('base64'),rows=[];
async function output(name,bytes){await writeFile(path.join(pack,name),bytes);rows.push({name,bytes:bytes.length,sha256:hash(bytes)});return{url:base+name,bytes:bytes.length,sha256:hash(bytes)}}
async function compressed(name,raw,bytes=gzipSync(raw,{level:9})){return{...await output(name,bytes),encoding:'gzip',rawBytes:raw.length,rawSha256:hash(raw)}}
const headers=await compressed('headers.bin',gunzipSync(extracted.stdout),extracted.stdout),headerFiles=Object.keys(JSON.parse(gunzipSync(extracted.stdout))).length;
const wasm=await compressed('program.wasm.bin',await readFile(path.join(out,'build/output/program.wasm')));
const programBytes=await readFile(path.join(out,'build/output/program.js')),program={...await output('program.js',programBytes),integrity:sri(programBytes)};
const qtloader=await readFile(path.join(out,'build/output/qtloader.js'));await output('qtloader.js',qtloader);
const profile={id:'qt-6.8.3-ems3.1.56-browser-v1',license:'GPL-3.0-only',parentOrigins:[parent],previewUrl:base+'index.html',headers,headerFiles,wasm,program,maxStudentBytes:8*1024*1024,toolchainTimeoutMs:240000,compileTimeoutMs:90000,maxLinearMemoryBytes:268435456,modules:['QtCore','QtGui','QtWidgets'],threads:false,moc:false,cmakeInBrowser:false};
const profileJS='// Генерируется tools/prepare-qt-browser-runtime.mjs; только exact public bytes.\nexport const QT_BROWSER_PROFILE=Object.freeze('+JSON.stringify(profile,null,2)+');\n';
await output('profile.js',Buffer.from(profileJS));
await output('verified-pack.js',await readFile(path.join(repo,'sandbox/qt/verified-pack.js')));
await output('a11y.js',Buffer.from('export '+installQtAccessibleControls.toString()+'\n'));
await output('preview.js',await readFile(path.join(repo,'sandbox/qt/preview/preview.js')));
const html=(await readFile(path.join(repo,'sandbox/qt/preview/index.html'),'utf8')).replace('__QT_LOADER_INTEGRITY__',sri(qtloader));await output('index.html',Buffer.from(html));
await writeFile(path.join(out,'PROFILE.json'),JSON.stringify(profile,null,2)+'\n');
await writeFile(path.join(out,'PACK_MANIFEST.json'),JSON.stringify({status:'LOCAL BUILD / GPL SOURCE GATE REQUIRED BEFORE PUBLICATION',imageId,profile:profile.id,localTest:local,files:rows,sourceFiles:await Promise.all(files.map(async f=>({path:f.path,sha256:hash(Buffer.from(f.content))})))},null,2)+'\n');
if(value('--profile-out'))await writeFile(path.resolve(value('--profile-out')),profileJS);
console.log(JSON.stringify({status:'LOCAL BUILD PASS',pack,profile:profile.id,files:rows.length,compressedBytes:headers.bytes+wasm.bytes+program.bytes,headerFiles,publication:false}));
