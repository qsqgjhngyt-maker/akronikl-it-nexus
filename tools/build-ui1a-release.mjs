import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {build}=createRequire(new URL('../server-access/package.json',import.meta.url))('esbuild');
const value=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null},source=path.resolve(value('--source')||fileURLToPath(new URL('../',import.meta.url))),out=path.resolve(value('--out')||path.join(source,'dist-ui1a'));
if(out===source||source.startsWith(out+path.sep))throw Error('Нельзя писать build поверх исходников');
try{await stat(out);throw Error('Каталог build уже существует: выберите новый путь')}catch(e){if(e.code!=='ENOENT')throw e}
const config=JSON.parse(await readFile(path.join(source,'release-candidate.json')));
if(value('--generation')&&value('--generation')!==config.assetGeneration&&process.argv.includes('--retain-active'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),config.assetGeneration])];
if(value('--retain-generation')){const generation=value('--retain-generation');if(!/^ui1a-[a-z0-9-]+$/.test(generation))throw Error('Неверное удерживаемое поколение');config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),generation])]}
if(value('--generation')&&value('--version'))Object.assign(config,{assetGeneration:value('--generation'),version:value('--version')});
if(!/^ui1a-[a-z0-9-]+$/.test(config.assetGeneration))throw Error('Неверный generation ID');
const folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl','feedback','pwa'];
const files=[];async function walk(dir,prefix=''){for(const e of await readdir(path.join(source,dir,prefix),{withFileTypes:true})){const f=path.posix.join(dir,prefix,e.name);if(e.isDirectory())await walk(dir,path.posix.join(prefix,e.name));else if(e.isFile())files.push(f);else throw Error('Недопустимый source entry')}}for(const dir of folders)await walk(dir);files.push('version.json');files.sort();
// Необязательное медиа не входит в public authority Service Worker.
try{await stat(path.join(source,'intro-media'));await walk('intro-media')}catch(error){if(error.code!=='ENOENT')throw error}
// В новом поколении нужны новый Desktop и прежний Mobile; опубликованные
// старые поколения удерживаются ниже побайтно, вместе с прежним Desktop.
if(process.argv.includes('--startup-launch')&&files.includes('intro-media/cinematic-v2/desktop.mp4'))for(let i=files.length-1;i>=0;i--)if(/^intro-media\/cinematic-v1\/desktop\.(mp4|webm|jpg)$/.test(files[i]))files.splice(i,1);
const manifest=await readFile(path.join(source,'manifest.webmanifest')),prefix='releases/'+config.assetGeneration+'/',records=[],hash=b=>createHash('sha256').update(b).digest('hex');
async function output(file,b,origin){const target=path.join(out,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,b);records.push({file,bytes:b.length,sha256:hash(b),source:origin})}
const versionMetadata=JSON.parse(await readFile(path.join(source,'version.json')));
if(value('--generation')){
 versionMetadata.version=config.version;versionMetadata.assetGeneration=config.assetGeneration;
 if(versionMetadata.releaseCandidate)Object.assign(versionMetadata.releaseCandidate,{version:config.version,assetGeneration:config.assetGeneration});
}
const versionBytes=value('--generation')?Buffer.from(JSON.stringify(versionMetadata,null,2)+'\n'):await readFile(path.join(source,'version.json'));
for(const file of files){const b=file==='version.json'?versionBytes:await readFile(path.join(source,file));await output(prefix+file,b,file)}
// После rollback корневые документы могут ссылаться на старое поколение.
// Перепривязываются только выходные документы сборки; immutable source bytes
// и активные root-файлы никогда не перезаписываются этим преобразованием.
const renderHTML=html=>{
 let result=html.replaceAll(/\.\/releases\/ui1a-[a-z0-9-]+\//g,'./').replaceAll(/\.\/entry-assets\/ui1a-[a-z0-9-]+\//g,'./entry-assets/'+config.assetGeneration+'/');
 for(const ref of ['styles/app.css','core/app.js','core/bootstrap.js','core/startup-intro-launch.js','assets/icons/apple-touch-icon.png'])result=result.replaceAll('./'+ref,'./'+prefix+ref);
 if(process.argv.includes('--startup-launch')&&result.includes('id="app"')&&result.includes('core/bootstrap.js')){
  // Даже после переключения root на прежнюю M5 candidate воспроизводится
  // из текущих исходников; immutable старого поколения не переписывается.
  if(!result.includes('core/startup-intro-launch.js'))result=result.replace('<script type="module" src="./'+prefix+'core/bootstrap.js','<script type="module" async fetchpriority="low" src="./'+prefix+'core/startup-intro-launch.js"></script><script type="module" src="./'+prefix+'core/bootstrap.js');
  result=result.replace('const target=event.target;const resource=',"const target=event.target;if(target?.closest?.('[data-startup-intro]')||target?.matches?.('[data-startup-intro-style]'))return;const resource=");
 }
 return result.replaceAll(/(\.\/releases\/ui1a-[a-z0-9-]+\/(?:core\/(?:app|bootstrap)\.js|styles\/app\.css))\?v=[^"'<>\s]+/g,'$1?v='+config.version);
};
let index=renderHTML(await readFile(path.join(source,'index.html'),'utf8'));
index=index.replace('href="./manifest.webmanifest"','href="./manifest.webmanifest?v='+config.version+'"');
await output('index.html',Buffer.from(index),'index.html: generation path rendering');await output('manifest.webmanifest',manifest,'manifest.webmanifest: identity preserved');await output('version.json',versionBytes,'version.json');
if(process.argv.includes('--startup-launch'))await output('startup-intro.json',Buffer.from(JSON.stringify({schema:1,module:'/'+prefix+'core/startup-intro.js'})+'\n'),'Публичная конфигурация заставки; NETWORK ONLY');
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
  for(const entry of (await readdir(path.join(source,dir),{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
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
const mime=file=>file.endsWith('.mp4')?'video/mp4':file.endsWith('.webm')?'video/webm':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.md')?'text/markdown':'text/html';
// Сохраняет правило также при будущем удержании прежнего intro-поколения.
const optional=r=>/^releases\/ui1a-[a-z0-9-]+\/intro-media\//.test(r.file);
const optionalAssets=records.filter(optional).map(r=>({url:r.file,sha256:r.sha256,bytes:r.bytes,mime:mime(r.file)}));
const approved=records.filter(r=>!optional(r)&&!['index.html','nexus-shell.html','version.json','startup-intro.json'].includes(r.file)).map(r=>({url:r.file,sha256:r.sha256,bytes:r.bytes,mime:mime(r.file),...(r.version?{version:r.version}:{})})).sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0);
const pwaConfig={generation:config.assetGeneration,version:config.version,assets:approved};
const sw=(await build({absWorkingDir:source,entryPoints:[path.join(source,'pwa/service-worker.js')],bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,define:{__NEXUS_PWA_CONFIG__:JSON.stringify(pwaConfig)},logLevel:'warning'})).outputFiles[0].contents;
await output('service-worker.js',Buffer.from(sw),'pwa/service-worker.js: exact public manifest bound');
const bundle={version:config.version,assetGeneration:config.assetGeneration,prefix,files:records.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0),publicAuthority:'EXACT PUBLIC STATIC FILES / CANDIDATE OWNER PUBLICATION APPROVAL REQUIRED',publicAssets:approved.length,legacyWorkerIncluded:false,verifiedWorkerIncluded:true,manifestIdentity:JSON.parse(manifest),rootHTMLURLReuse:'Network only; independent public offline shell grants no server proof; personal copies require local phrase'};
if(optionalAssets.length)Object.assign(bundle,{optionalAssets,optionalMediaPolicy:'NETWORK ONLY / NO SW INSTALL / NO EXPLICIT OFFLINE DOWNLOAD'});
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(bundle,null,2)+'\n');console.log(JSON.stringify({out,files:records.length,version:config.version,prefix,serviceWorker:true,optionalAssets:optionalAssets.length}));
