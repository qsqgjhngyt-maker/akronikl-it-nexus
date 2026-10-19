import {readFile,writeFile,mkdir,readdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const value=flag=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:null},source=path.resolve(value('--source')||fileURLToPath(new URL('../',import.meta.url))),out=path.resolve(value('--out')||path.join(source,'dist-ui1a'));
if(out===source||source.startsWith(out+path.sep))throw Error('Нельзя писать build поверх исходников');
try{await stat(out);throw Error('Каталог build уже существует: выберите новый путь')}catch(e){if(e.code!=='ENOENT')throw e}
const config=value('--generation')&&value('--version')?{assetGeneration:value('--generation'),version:value('--version')}:JSON.parse(await readFile(path.join(source,'release-candidate.json')));if(!/^ui1a-[a-z0-9-]+$/.test(config.assetGeneration))throw Error('Неверный generation ID');
const folders=['core','effects','styles','locales','courses','assets','sandbox','project-studio','sync','collaboration','akronikl'];
const files=[];async function walk(dir,prefix=''){for(const e of await readdir(path.join(source,dir,prefix),{withFileTypes:true})){const f=path.posix.join(dir,prefix,e.name);if(e.isDirectory())await walk(dir,path.posix.join(prefix,e.name));else if(e.isFile())files.push(f);else throw Error('Недопустимый source entry')}}for(const dir of folders)await walk(dir);files.push('feedback/client.js','feedback/ui.js','version.json');files.sort();
const manifest=await readFile(path.join(source,'manifest.webmanifest')),prefix='releases/'+config.assetGeneration+'/',records=[],hash=b=>createHash('sha256').update(b).digest('hex');
async function output(file,b,origin){const target=path.join(out,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,b);records.push({file,bytes:b.length,sha256:hash(b),source:origin})}
for(const file of files){const b=await readFile(path.join(source,file));await output(prefix+file,b,file)}
const renderHTML=html=>{let result=html.replaceAll(/\.\/releases\/ui1a-[a-z0-9-]+\//g,'./');for(const ref of ['styles/app.css','core/app.js','core/bootstrap.js','assets/icons/apple-touch-icon.png'])result=result.replaceAll('./'+ref,'./'+prefix+ref);return result};
let index=renderHTML(await readFile(path.join(source,'index.html'),'utf8'));
index=index.replace('href="./manifest.webmanifest"','href="./manifest.webmanifest?v='+config.version+'"');
await output('index.html',Buffer.from(index),'index.html: generation path rendering');await output('manifest.webmanifest',manifest,'manifest.webmanifest: identity preserved');await output('version.json',await readFile(path.join(source,'version.json')),'version.json');
try{
 const shell=renderHTML(await readFile(path.join(source,'nexus-shell.html'),'utf8'));
 await output('nexus-shell.html',Buffer.from(shell),'nexus-shell.html: Account bootstrap');
 for(const name of ['entry.css','entry.js','galaxy.js','oauth-client.js'])await output('entry-assets/'+config.assetGeneration+'/'+name,await readFile(path.join(source,'server-access/public',name)),'server-access/public/'+name);
}catch(error){if(error.code!=='ENOENT')throw error;if(index.includes('entry-assets/'))throw Error('Auth gate build requires shell and public entry assets')}
// Stable manifest icon aliases содержат прежние bytes; не меняют id/start_url/scope.
for(const file of ['assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'])await output(file,await readFile(path.join(source,file)),file);
const bundle={version:config.version,assetGeneration:config.assetGeneration,prefix,files:records.sort((a,b)=>a.file.localeCompare(b.file)),publicAuthority:'OWNER REVIEW REQUIRED',legacyWorkerIncluded:false,manifestIdentity:JSON.parse(manifest),rootHTMLURLReuse:'Неизбежный stable launch URL; old-controller transition gate остаётся BLOCKED'};
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(bundle,null,2)+'\n');console.log(JSON.stringify({out,files:records.length,version:config.version,prefix,serviceWorker:false}));
