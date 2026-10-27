// Только новая QA-копия. Не скачивает модель и не меняет production/build metadata.
import {readFile,mkdir,cp,readdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const source=arg('--package'),target=arg('--dest');if(!source||!target)throw Error('Укажите --package и --dest');
const pkg=path.resolve(source),dest=path.resolve(target);
if(dest===fileURLToPath(new URL('../akronikl/tutor/runtime',import.meta.url))||dest===pkg||pkg.startsWith(dest+path.sep))throw Error('Нужна отдельная QA-копия');
try{await stat(dest);throw Error('Каталог назначения уже существует');}catch(e){if(e.code!=='ENOENT')throw e;}
const metadata=JSON.parse(await readFile(path.join(pkg,'package.json'),'utf8'));
if(metadata.name!=='@wllama/wllama'||metadata.version!=='3.12.0')throw Error('Неверная закреплённая версия runtime');
await mkdir(path.dirname(dest),{recursive:true});await cp(path.join(pkg,'esm'),dest,{recursive:true,errorOnExist:true});
const files=[];async function walk(d){for(const entry of await readdir(d,{withFileTypes:true})){const file=path.join(d,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile()){const b=await readFile(file);files.push({file:path.relative(dest,file).replaceAll(path.sep,'/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}else throw Error('SYMLINK_DENIED');}}
await walk(dest);for(const required of ['index.js','wasm/wllama.wasm'])if(!files.some(f=>f.file===required))throw Error('RUNTIME_ASSET_MISSING');
await cp(path.join(pkg,'LICENSE'),path.join(dest,'LICENSE.txt'));
const evidence={package:metadata.name,version:metadata.version,files:files.sort((a,b)=>a.file.localeCompare(b.file)),weightsIncluded:false,productSourceChanged:false};
await writeFile(path.join(dest,'RUNTIME_MANIFEST.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({status:'PREPARED_QA_ONLY',files:files.length,weightsIncluded:false}));
