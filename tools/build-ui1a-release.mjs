import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {build}=createRequire(new URL('../server-access/package.json',import.meta.url))('esbuild');
const value=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null},source=path.resolve(value('--source')||fileURLToPath(new URL('../',import.meta.url))),out=path.resolve(value('--out')||path.join(source,'dist-ui1a'));
if(out===source||source.startsWith(out+path.sep))throw Error('Нельзя писать build поверх исходников');
try{await stat(out);throw Error('Каталог build уже существует: выберите новый путь')}catch(e){if(e.code!=='ENOENT')throw e}
const config=value('--generation')&&value('--version')?{assetGeneration:value('--generation'),version:value('--version')}:JSON.parse(await readFile(path.join(source,'release-candidate.json')));if(!/^ui1a-[a-z0-9-]+$/.test(config.assetGeneration))throw Error('Неверный generation ID');
const folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa'];
const files=[];async function walk(dir,prefix=''){for(const e of await readdir(path.join(source,dir,prefix),{withFileTypes:true})){const f=path.posix.join(dir,prefix,e.name);if(e.isDirectory())await walk(dir,path.posix.join(prefix,e.name));else if(e.isFile())files.push(f);else throw Error('Недопустимый source entry')}}for(const dir of folders)await walk(dir);files.push('version.json');files.sort();
const manifest=await readFile(path.join(source,'manifest.webmanifest')),prefix='releases/'+config.assetGeneration+'/',records=[],hash=b=>createHash('sha256').update(b).digest('hex');
async function output(file,b,origin){const target=path.join(out,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,b);records.push({file,bytes:b.length,sha256:hash(b),source:origin})}
for(const file of files){const b=await readFile(path.join(source,file));await output(prefix+file,b,file)}
// После rollback корневые документы могут ссылаться на старое поколение.
// Перепривязываются только выходные документы сборки; immutable source bytes
// и активные root-файлы никогда не перезаписываются этим преобразованием.
const renderHTML=html=>{
 let result=html.replaceAll(/\.\/releases\/ui1a-[a-z0-9-]+\//g,'./').replaceAll(/\.\/entry-assets\/ui1a-[a-z0-9-]+\//g,'./entry-assets/'+config.assetGeneration+'/');
 for(const ref of ['styles/app.css','core/app.js','core/bootstrap.js','assets/icons/apple-touch-icon.png'])result=result.replaceAll('./'+ref,'./'+prefix+ref);
 return result.replaceAll(/(\.\/releases\/ui1a-[a-z0-9-]+\/(?:core\/(?:app|bootstrap)\.js|styles\/app\.css))\?v=[^"'<>\s]+/g,'$1?v='+config.version);
};
let index=renderHTML(await readFile(path.join(source,'index.html'),'utf8'));
index=index.replace('href="./manifest.webmanifest"','href="./manifest.webmanifest?v='+config.version+'"');
await output('index.html',Buffer.from(index),'index.html: generation path rendering');await output('manifest.webmanifest',manifest,'manifest.webmanifest: identity preserved');await output('version.json',await readFile(path.join(source,'version.json')),'version.json');
try{
 const shell=renderHTML(await readFile(path.join(source,'nexus-shell.html'),'utf8'));
 await output('nexus-shell.html',Buffer.from(shell),'nexus-shell.html: Account bootstrap');
 for(const name of ['entry.css','entry.js','galaxy.js','oauth-client.js']){
  const input=path.join(source,'server-access/public',name);
  const bytes=name.endsWith('.js')?(await build({absWorkingDir:source,entryPoints:[input],bundle:true,platform:'browser',format:'esm',target:'es2022',external:['/account/access/passkey-client.js'],write:false,logLevel:'warning'})).outputFiles[0].contents:await readFile(input);
  await output('entry-assets/'+config.assetGeneration+'/'+name,Buffer.from(bytes),'server-access/public/'+name+': browser bundle');
 }
}catch(error){if(error.code!=='ENOENT')throw error;if(index.includes('entry-assets/'))throw Error('Auth gate build requires shell and public entry assets')}
// Предыдущие immutable public bytes нужны старым вкладкам после смены SW.
// Их hashes формирует producer; неизвестные URL из IDB не получают authority.
for(const generation of config.retainedPublicGenerations||[]){
 if(generation===config.assetGeneration||!/^ui1a-[a-z0-9-]+$/.test(generation))throw Error('Invalid retained public generation');
 const version=JSON.parse(await readFile(path.join(source,'releases',generation,'version.json'))).version;
 async function retained(dir){
  for(const entry of await readdir(path.join(source,dir),{withFileTypes:true})){
   const file=path.posix.join(dir,entry.name);
   if(entry.isDirectory())await retained(file);
   else if(entry.isFile()){await output(file,await readFile(path.join(source,file)),'Retained immutable public generation');records.at(-1).version=version}
   else throw Error('Invalid retained source');
  }
 }
 await retained('releases/'+generation);await retained('entry-assets/'+generation);
}
// Stable manifest icon aliases содержат прежние bytes; не меняют id/start_url/scope.
for(const file of ['assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'])await output(file,await readFile(path.join(source,file)),file);
const offline=renderHTML(await readFile(path.join(source,'offline.html'),'utf8')).replaceAll('./pwa/','./'+prefix+'pwa/');
await output('offline.html',Buffer.from(offline),'offline.html: independent public educational shell; local vault unlock required');
const mime=file=>file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.md')?'text/markdown':'text/html';
const approved=records.filter(r=>!['index.html','nexus-shell.html','version.json'].includes(r.file)).map(r=>({url:r.file,sha256:r.sha256,bytes:r.bytes,mime:mime(r.file),...(r.version?{version:r.version}:{})}));
const pwaConfig={generation:config.assetGeneration,version:config.version,assets:approved};
const sw=(await build({absWorkingDir:source,entryPoints:[path.join(source,'pwa/service-worker.js')],bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,define:{__NEXUS_PWA_CONFIG__:JSON.stringify(pwaConfig)},logLevel:'warning'})).outputFiles[0].contents;
await output('service-worker.js',Buffer.from(sw),'pwa/service-worker.js: exact public manifest bound');
const bundle={version:config.version,assetGeneration:config.assetGeneration,prefix,files:records.sort((a,b)=>a.file.localeCompare(b.file)),publicAuthority:'EXACT PUBLIC STATIC FILES / CANDIDATE OWNER PUBLICATION APPROVAL REQUIRED',publicAssets:approved.length,legacyWorkerIncluded:false,verifiedWorkerIncluded:true,manifestIdentity:JSON.parse(manifest),rootHTMLURLReuse:'Network only; independent public offline shell grants no server proof; personal copies require local phrase'};
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(bundle,null,2)+'\n');console.log(JSON.stringify({out,files:records.length,version:config.version,prefix,serviceWorker:true}));
