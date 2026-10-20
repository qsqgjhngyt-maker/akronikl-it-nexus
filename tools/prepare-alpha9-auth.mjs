import {readFile,writeFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url),old='0.1.7-alpha.2.4.6-ui1a.8',version='0.1.7-alpha.2.4.6-ui1a.9';
const generation='ui1a-alpha9-20261020-yandex-return',previous='ui1a-alpha8-20261020-auth-entry';
try{await stat(new URL('releases/'+generation,root));throw Error('Immutable generation already exists')}catch(e){if(e.code!=='ENOENT')throw e}
const read=p=>readFile(new URL(p,root),'utf8'),write=(p,text)=>writeFile(new URL(p,root),text);
const rc=JSON.parse(await read('release-candidate.json'));if(rc.version!==old||rc.assetGeneration!==previous)throw Error('Unexpected Alpha8 baseline');
for(const p of ['core/app.js','nexus-shell.html','project.json'])await write(p,(await read(p)).replaceAll(old,version).replaceAll(previous,generation));
for(const p of ['index.html','server-access/public/entry.html'])await write(p,(await read(p)).replaceAll(previous,generation));
const metadata=JSON.parse(await read('version.json'));
Object.assign(metadata,{version,build:'ui1a-alpha9-yandex-return',date:'2026-10-20',notes:'Alpha9: явный выбор аккаунта Яндекса; возврат после привязки в Безопасность через проверку серверной сессии. Исправленный Cookie transport сохранён; Passkey и обычный вход Яндекс подтверждены владельцем на Alpha8. Новый сценарий привязки ожидает личной приёмки.'});
Object.assign(metadata.releaseCandidate,{assetGeneration:generation,baseline:'8bc59f6361b2ba28e9e326267588fb7a7c1dcb31',ownerPublicationAuthorized:true,releaseReady:false});
Object.assign(rc,{version,assetGeneration:generation,baseCommit:metadata.releaseCandidate.baseline,status:'OWNER AUTHORIZED CONTROLLED PUBLICATION / PERSONAL ACCEPTANCE PENDING',ownerPublicationAuthorized:true,description:metadata.notes});
await write('version.json',JSON.stringify(metadata,null,2)+'\n');await write('release-candidate.json',JSON.stringify(rc,null,2)+'\n');
console.log(JSON.stringify({version,generation}));
