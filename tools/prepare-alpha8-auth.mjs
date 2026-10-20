import {readFile,writeFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url),old='0.1.7-alpha.2.4.6-ui1a.7',version='0.1.7-alpha.2.4.6-ui1a.8';
const generation='ui1a-alpha8-20261020-auth-entry',previous='ui1a-alpha7-20261019-session-startup';
try{await stat(new URL('releases/'+generation,root));throw Error('Immutable generation already exists')}catch(e){if(e.code!=='ENOENT')throw e}
const read=path=>readFile(new URL(path,root),'utf8'),write=(path,text)=>writeFile(new URL(path,root),text);
const rc=JSON.parse(await read('release-candidate.json'));if(rc.version!==old||rc.assetGeneration!==previous)throw Error('Unexpected Alpha7 baseline');
for(const path of ['core/app.js','nexus-shell.html','project.json'])await write(path,(await read(path)).replaceAll(old,version).replaceAll(previous,generation));
for(const path of ['index.html','server-access/public/entry.html'])await write(path,(await read(path)).replaceAll(previous,generation).replaceAll('Войти в Nexus</span>','Войти ключом доступа</span>'));
const metadata=JSON.parse(await read('version.json'));Object.assign(metadata,{version,build:'ui1a-alpha8-auth-entry-candidate',date:'2026-10-20',notes:'Alpha8 candidate: проверка серверной сессии после Passkey и OAuth, отдельные этапы ожидания, защита от повторных запусков. Реальный Cookie transport и вход владельца не подтверждены.'});
Object.assign(metadata.releaseCandidate,{assetGeneration:generation,baseline:'1da420500076c9d764984a098d5699229be0a0f4',ownerPublicationAuthorized:false,releaseReady:false});
Object.assign(rc,{version,assetGeneration:generation,baseCommit:'1da420500076c9d764984a098d5699229be0a0f4',status:'LOCAL CANDIDATE / PRODUCTION PUBLICATION NOT AUTHORIZED',ownerPublicationAuthorized:false,description:metadata.notes});
await write('version.json',JSON.stringify(metadata,null,2)+'\n');await write('release-candidate.json',JSON.stringify(rc,null,2)+'\n');
console.log(JSON.stringify({version,generation,publicationAuthorized:false}));
