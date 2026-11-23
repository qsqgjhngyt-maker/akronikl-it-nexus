import {cp,mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {auditGuestPresentation} from './nexus-audit-guest.mjs';
import {withEarlyIntro} from '../core/startup-intro-early-html.js';
const out=path.resolve(process.env.NEXUS_FRONTEND_DIR||'cpp-clarity-evidence/frontend'),stage=await mkdtemp(path.join(tmpdir(),'cpp-clarity-build-'));
const dirs=['core','effects','styles','locales','courses','assets','sandbox','project-studio','course-final','sync','collaboration','akronikl','feedback','pwa','intro-media'];
// Редакторские источники входят в Git/Release, но не дублируют готовые уроки
// в обязательной загрузке и offline-кэше ученика. Runtime читает lessons/*.json.
for(const dir of dirs)await cp(dir,path.join(stage,dir),{recursive:true,filter:source=>{
 const relative=path.relative(process.cwd(),path.resolve(source)).split(path.sep).join('/');
 return !source.split(path.sep).includes('node_modules')&&relative!=='courses/reference/authoring'&&!relative.startsWith('courses/reference/authoring/');
}});
for(const file of ['index.html','offline.html','nexus-shell.html','manifest.webmanifest','version.json','startup-intro.json'])await cp(file,path.join(stage,file));
await mkdir(path.join(stage,'server-access'),{recursive:true});await cp('server-access/public',path.join(stage,'server-access/public'),{recursive:true});
const config=JSON.parse(await readFile('release-candidate.json'));config.retainedPublicGenerations=[];config.publication={module:'cpp-clarity-01',production:false};config.ownerPublicationAuthorized=false;
await writeFile(path.join(stage,'release-candidate.json'),JSON.stringify(config,null,2)+'\n');
const sourceCommit=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('CANDIDATE_SHA_REQUIRED');
const generation='ui1a-cpp-clarity-'+sourceCommit.slice(0,12),entryOptions={generation,version:config.version};
const rootEntry=path.join(stage,'index.html');
await writeFile(rootEntry,auditGuestPresentation(await readFile(rootEntry,'utf8'),entryOptions));
const r=spawnSync(process.execPath,['tools/build-ui1a-release.mjs','--source',stage,'--out',out,'--generation',generation,'--version',config.version],{encoding:'utf8',timeout:180000,maxBuffer:4e6});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.status!==0)process.exit(r.status||1);
const built=JSON.parse(await readFile(path.join(out,'BUILD_MANIFEST.json')));
if(built.files.some(f=>f.file.split('/').includes('node_modules')))throw Error('CANDIDATE_DEVELOPMENT_DEPENDENCIES_EXPOSED');
// The gateway presentation artifact is public HTML. It is supplied separately from
// its existing login endpoints and is intentionally excluded from the offline cache.
const guestPath='account/entry/index.html';
const guest=Buffer.from(withEarlyIntro(auditGuestPresentation(await readFile('server-access/public/entry.html','utf8'),entryOptions),generation));
await mkdir(path.join(out,'account/entry'),{recursive:true});
await writeFile(path.join(out,guestPath),guest);
const guestEntry={file:guestPath,bytes:guest.length,sha256:createHash('sha256').update(guest).digest('hex'),source:'server-access/public/entry.html: candidate guest presentation'};
built.files.push(guestEntry);
await writeFile(path.join(out,'BUILD_MANIFEST.json'),JSON.stringify(built,null,2)+'\n');
await writeFile(path.join(out,'CLARITY_BUILD_SCOPE.json'),JSON.stringify({sourceCommit,localCandidateOnly:true,production:false,retainedHistoricalGenerationsExcluded:true,sourceReleaseMetadataChanged:false,buildOnlySourcesExcluded:['courses/reference/authoring'],guestEntry},null,2)+'\n');
