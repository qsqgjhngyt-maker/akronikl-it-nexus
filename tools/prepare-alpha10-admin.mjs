import {readFile,writeFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url),old='0.1.7-alpha.2.4.6-ui1a.9',version='0.1.7-alpha.2.4.6-ui1a.10';
const generation='ui1a-alpha10-20261020-admin-access',previous='ui1a-alpha9-20261020-yandex-return';
try{await stat(new URL('releases/'+generation,root));throw Error('Immutable generation already exists')}catch(e){if(e.code!=='ENOENT')throw e}
const read=p=>readFile(new URL(p,root),'utf8'),write=(p,text)=>writeFile(new URL(p,root),text);
const rc=JSON.parse(await read('release-candidate.json'));if(rc.version!==old||rc.assetGeneration!==previous)throw Error('Unexpected Alpha9 baseline');
for(const p of ['core/app.js','nexus-shell.html','project.json'])await write(p,(await read(p)).replaceAll(old,version).replaceAll(previous,generation));
for(const p of ['index.html','server-access/public/entry.html'])await write(p,(await read(p)).replaceAll(previous,generation));
const metadata=JSON.parse(await read('version.json'));
Object.assign(metadata,{version,build:'ui1a-alpha10-admin-access-candidate',date:'2026-10-20',notes:'Локальный кандидат: администрирование тестировщиков, лимит мест, одноразовые приглашения, уникальный логин и фото профиля. Применение схемы, назначение администратора и production cutover ожидают отдельного согласования.'});
Object.assign(metadata.releaseCandidate,{assetGeneration:generation,baseline:'5d56f8adc69ec65c13d94b49da1b292c57c27b85',ownerPublicationAuthorized:false,releaseReady:false});
Object.assign(rc,{version,assetGeneration:generation,baseCommit:metadata.releaseCandidate.baseline,status:'LOCAL CANDIDATE / DATABASE AND CLOUD ADMISSION REQUIRED',ownerPublicationAuthorized:false,description:metadata.notes});
await write('version.json',JSON.stringify(metadata,null,2)+'\n');await write('release-candidate.json',JSON.stringify(rc,null,2)+'\n');
console.log(JSON.stringify({version,generation,publicationAuthorized:false}));
