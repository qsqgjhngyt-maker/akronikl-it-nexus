import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {withStartupCover} from '../core/startup-intro-cover.js';
import {withEarlyIntro} from '../core/startup-intro-early-html.js';
import {staticMime} from '../pwa/static-mime.js';
import {PIPER_PUBLIC_ASSETS} from '../akronikl/experience/piper-assets.js';
const {build}=createRequire(new URL('../server-access/package.json',import.meta.url))('esbuild');
const value=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null},source=path.resolve(value('--source')||fileURLToPath(new URL('../',import.meta.url))),out=path.resolve(value('--out')||path.join(source,'dist-ui1a'));
if(out===source||source.startsWith(out+path.sep))throw Error('Нельзя писать build поверх исходников');
try{await stat(out);throw Error('Каталог build уже существует: выберите новый путь')}catch(e){if(e.code!=='ENOENT')throw e}
const config=JSON.parse(await readFile(path.join(source,'release-candidate.json')));
if(value('--generation')&&value('--generation')!==config.assetGeneration&&process.argv.includes('--retain-active'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),config.assetGeneration])];
if(value('--retain-generation')){const generation=value('--retain-generation');if(!/^ui1a-[a-z0-9-]+$/.test(generation))throw Error('Неверное удерживаемое поколение');config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),generation])]}
if(process.argv.includes('--startup-first-paint'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),'ui1a-startup-cinematic-launch-20261028'])];
if(process.argv.includes('--startup-smooth'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),'ui1a-startup-cinematic-launch-20261028','ui1a-startup-first-paint-20261028'])];
if(process.argv.includes('--startup-fast'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),'ui1a-startup-smooth-20261028'])];
if(process.argv.includes('--startup-mobile-restore'))config.retainedPublicGenerations=[...new Set([...(config.retainedPublicGenerations||[]),'ui1a-startup-fast-opening-20261029'])];
if(value('--generation')&&value('--version'))Object.assign(config,{assetGeneration:value('--generation'),version:value('--version')});
if(!/^ui1a-[a-z0-9-]+$/.test(config.assetGeneration))throw Error('Неверный generation ID');
const folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','course-final','sync','collaboration','akronikl','feedback','pwa'];
const files=[];async function walk(dir,prefix=''){for(const e of await readdir(path.join(source,dir,prefix),{withFileTypes:true})){const f=path.posix.join(dir,prefix,e.name);if(e.isDirectory())await walk(dir,path.posix.join(prefix,e.name));else if(e.isFile())files.push(f);else throw Error('Недопустимый source entry')}}for(const dir of folders)await walk(dir);files.push('version.json');files.sort();
// Необязательное медиа не входит в public authority Service Worker.
try{await stat(path.join(source,'intro-media'));await walk('intro-media')}catch(error){if(error.code!=='ENOENT')throw error}
// В новом поколении нужны новый Desktop и прежний Mobile; опубликованные
// старые поколения удерживаются ниже побайтно, вместе с прежним Desktop.
if(process.argv.includes('--startup-launch')&&files.includes('intro-media/cinematic-v2/desktop.mp4'))for(let i=files.length-1;i>=0;i--)if(/^intro-media\/cinematic-v1\/desktop\.(mp4|webm|jpg)$/.test(files[i]))files.splice(i,1);
if(process.argv.includes('--startup-first-paint')&&files.includes('intro-media/cinematic-v3/desktop/mp4/part-000.mp4'))for(let i=files.length-1;i>=0;i--)if(files[i].startsWith('intro-media/')&&!files[i].startsWith('intro-media/cinematic-v3/'))files.splice(i,1);
if(process.argv.includes('--startup-smooth'))for(let i=files.length-1;i>=0;i--)if(files[i].startsWith('intro-media/')&&!files[i].startsWith('intro-media/cinematic-v4/'))files.splice(i,1);
const manifest=await readFile(path.join(source,'manifest.webmanifest')),prefix='releases/'+config.assetGeneration+'/',records=[],hash=b=>createHash('sha256').update(b).digest('hex');
async function output(file,b,origin){const target=path.join(out,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,b);records.push({file,bytes:b.length,sha256:hash(b),source:origin})}
const versionMetadata=JSON.parse(await readFile(path.join(source,'version.json')));
if(value('--generation')){
 versionMetadata.version=config.version;versionMetadata.assetGeneration=config.assetGeneration;
 if(versionMetadata.releaseCandidate)Object.assign(versionMetadata.releaseCandidate,{version:config.version,assetGeneration:config.assetGeneration});
}
const versionBytes=value('--generation')?Buffer.from(JSON.stringify(versionMetadata,null,2)+'\n'):await readFile(path.join(source,'version.json'));
for(const file of files){const b=file==='version.json'?versionBytes:file==='core/startup-intro.js'?(await build({absWorkingDir:source,entryPoints:[path.join(source,file)],bundle:true,platform:'browser',format:'esm',target:'es2022',write:false,logLevel:'warning'})).outputFiles[0].contents:await readFile(path.join(source,file));await output(prefix+file,b,file);if(process.argv.includes('--startup-smooth')&&file.startsWith('intro-media/cinematic-v4/'))await output(file,b,'Публичный CDN: '+file)}
// Полный комплект курса сохраняет и стабильные CDN URL заставки. Эти медиа
// по-прежнему исключаются из обязательного public graph Service Worker.
if(config.publication?.module==='cpp-course-final')for(const file of files.filter(f=>f.startsWith('intro-media/'))){if(!records.some(r=>r.file===file))await output(file,await readFile(path.join(source,file)),'Стабильный публичный CDN: '+file)}
// Прежние мобильные части уже опубликованы: повторная поставка тех же bytes
// в необязательный CDN-каталог, вне обязательного SW install.
if(process.argv.includes('--startup-mobile-restore'))for(const format of ['mp4','webm'])for(let i=0;i<4;i++){
 const file='intro-media/cinematic-v3/mobile/'+format+'/part-'+String(i).padStart(3,'0')+'.'+format;await output(file,await readFile(path.join(source,file)),'Прежний Mobile CDN: '+file);
}
// После rollback корневые документы могут ссылаться на старое поколение.
// Перепривязываются только выходные документы сборки; immutable source bytes
// и активные root-файлы никогда не перезаписываются этим преобразованием.
const renderHTML=html=>{
 let result=html.replaceAll(/\.\/releases\/ui1a-[a-z0-9-]+\//g,'./').replaceAll(/\.\/entry-assets\/ui1a-[a-z0-9-]+\//g,'./entry-assets/'+config.assetGeneration+'/');
 for(const ref of ['styles/app.css','core/app.js','core/bootstrap.js','core/startup-intro-launch.js','assets/icons/apple-touch-icon.png','assets/brand-mark.svg'])result=result.replaceAll('./'+ref,'./'+prefix+ref);
 if(process.argv.includes('--startup-launch')&&result.includes('id="app"')&&result.includes('core/bootstrap.js')){
  // Даже после переключения root на прежнюю M5 candidate воспроизводится
  // из текущих исходников; immutable старого поколения не переписывается.
  if(!result.includes('core/startup-intro-launch.js'))result=result.replace('<script type="module" src="./'+prefix+'core/bootstrap.js','<script type="module" async fetchpriority="low" src="./'+prefix+'core/startup-intro-launch.js"></script><script type="module" src="./'+prefix+'core/bootstrap.js');
  result=result.replace('const target=event.target;const resource=',"const target=event.target;if(target?.closest?.('[data-startup-intro]')||target?.matches?.('[data-startup-intro-style]'))return;const resource=");
 }
 result=result.replaceAll(/(\.\/releases\/ui1a-[a-z0-9-]+\/(?:core\/(?:app|bootstrap)\.js|styles\/app\.css))\?v=[^"'<>\s]+/g,'$1?v='+config.version);
 result=(process.argv.includes('--startup-first-paint')||process.argv.includes('--startup-smooth'))?withStartupCover(result):result;
 return withEarlyIntro(result,config.assetGeneration);
};
let index=renderHTML(await readFile(path.join(source,'index.html'),'utf8'));
index=index.replace('href="./manifest.webmanifest"','href="./manifest.webmanifest?v='+config.version+'"');
await output('index.html',Buffer.from(index),'index.html: generation path rendering');await output('manifest.webmanifest',manifest,'manifest.webmanifest: identity preserved');await output('version.json',versionBytes,'version.json');
if(process.argv.includes('--startup-launch'))await output('startup-intro.json',Buffer.from(JSON.stringify({schema:1,module:'/'+prefix+'core/startup-intro.js'})+'\n'),'Публичная конфигурация заставки; NETWORK ONLY');
else try{
 const bytes=await readFile(path.join(source,'startup-intro.json')),intro=JSON.parse(bytes);
 if(intro.schema!==1||!/^\/releases\/ui1a-[a-z0-9-]+\/core\/startup-intro\.js$/.test(intro.module))throw Error('Неверная существующая конфигурация заставки');
 await output('startup-intro.json',Buffer.from(JSON.stringify({schema:1,module:'/'+prefix+'core/startup-intro.js'})+'\n'),'Конфигурация заставки указывает на проверяемое новое поколение; NETWORK ONLY');
}catch(error){if(error.code!=='ENOENT')throw error}
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
const mime=staticMime;
// Сохраняет правило также при будущем удержании прежнего intro-поколения.
const optional=r=>/^(?:releases\/ui1a-[a-z0-9-]+\/)?intro-media\//.test(r.file);
const optionalAssets=records.filter(optional).map(r=>({url:r.file,sha256:r.sha256,bytes:r.bytes,mime:mime(r.file)})).sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0);
const approved=records.filter(r=>!optional(r)&&!['index.html','nexus-shell.html','version.json','startup-intro.json'].includes(r.file)).map(r=>({url:r.file,sha256:r.sha256,bytes:r.bytes,mime:mime(r.file),...(r.version?{version:r.version}:{})})).sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0);
const lazyAssets=Object.entries(PIPER_PUBLIC_ASSETS).flatMap(([file,r])=>(r.chunks??[{file,bytes:r.bytes,sha256:r.sha256}]).map(c=>({url:'akronikl/vendor/piper/'+c.file,bytes:c.bytes,sha256:c.sha256,mime:r.chunks?'application/octet-stream':r.mime})));
const pwaConfig={generation:config.assetGeneration,version:config.version,assets:approved,lazyAssets};
const sw=(await build({absWorkingDir:source,entryPoints:[path.join(source,'pwa/service-worker.js')],bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,define:{__NEXUS_PWA_CONFIG__:JSON.stringify(pwaConfig)},logLevel:'warning'})).outputFiles[0].contents;
await output('service-worker.js',Buffer.from(sw),'pwa/service-worker.js: exact public manifest bound');
const bundle={version:config.version,assetGeneration:config.assetGeneration,prefix,files:records.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0),publicAuthority:'EXACT PUBLIC STATIC FILES / CANDIDATE OWNER PUBLICATION APPROVAL REQUIRED',publicAssets:approved.length,legacyWorkerIncluded:false,verifiedWorkerIncluded:true,manifestIdentity:JSON.parse(manifest),rootHTMLURLReuse:'Network only; independent public offline shell grants no server proof; personal copies require local phrase'};
if(optionalAssets.length)Object.assign(bundle,{optionalAssets,optionalMediaPolicy:'NETWORK ONLY / NO SW INSTALL / NO EXPLICIT OFFLINE DOWNLOAD'});
Object.assign(bundle,{lazyAssets,lazyAssetPolicy:'Exact public Piper weights; verify and persist on demand, excluded from SW install readiness'});
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(bundle,null,2)+'\n');console.log(JSON.stringify({out,files:records.length,version:config.version,prefix,serviceWorker:true,optionalAssets:optionalAssets.length}));
