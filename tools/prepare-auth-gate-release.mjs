// Подготовка новой generation только в отдельном кандидате; historical releases не меняются.
import {readFile,writeFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url),version='0.1.7-alpha.2.4.6-ui1a.4',assetGeneration='ui1a-alpha4-20261019-unified-account';
const file=name=>new URL(name,root),json=async name=>JSON.parse(await readFile(file(name),'utf8'));
try{await stat(file('nexus-shell.html'));throw Error('Кандидат уже подготовлен; повторная генерация запрещена')}catch(error){if(error.code!=='ENOENT')throw error}
let shell=await readFile(file('index.html'),'utf8');
if(!shell.includes('core/app.js?v=0.1.7-alpha.2.4.6-ui1a.3'))throw Error('Неожиданный исходный shell');
shell=shell.replaceAll('0.1.7-alpha.2.4.6-ui1a.3',version).replaceAll('ui1a-alpha3-20261019-access-recovery',assetGeneration).replace('core/app.js?v=','core/bootstrap.js?v=');
await writeFile(file('nexus-shell.html'),shell);
let landing=await readFile(file('server-access/public/entry.html'),'utf8');
landing=landing.replaceAll('/account/entry/entry.css','./entry-assets/'+assetGeneration+'/entry.css').replaceAll('/account/entry/entry.js','./entry-assets/'+assetGeneration+'/entry.js');
await writeFile(file('index.html'),landing);
const metadata=await json('version.json');metadata.version=version;metadata.build='ui1a-owner-alpha4-unified-account';metadata.notes='Alpha4 candidate: обязательный серверный вход, публичная галактика, отдельные данные аккаунтов и единая сессия Nexus Cloud. Внешние OAuth приложения и подтверждение owner email ожидают настройки.';metadata.releaseCandidate.assetGeneration=assetGeneration;metadata.serverAccess.unifiedCloud='candidate-session-bound';metadata.serverAccess.externalProviders='awaiting-provider-applications';metadata.serverAccess.ownerEmailPolicy='pending-real-provider-proof';await writeFile(file('version.json'),JSON.stringify(metadata,null,2)+'\n');
const rc=await json('release-candidate.json');Object.assign(rc,{version,assetGeneration,description:'Кандидат единого аккаунта Nexus и Cloud; OAuth не объявляется рабочим без credentials и реального входа.'});await writeFile(file('release-candidate.json'),JSON.stringify(rc,null,2)+'\n');
let app=await readFile(file('core/app.js'),'utf8');app=app.replaceAll('0.1.7-alpha.2.4.6-ui1a.3',version);await writeFile(file('core/app.js'),app);
console.log(JSON.stringify({version,assetGeneration,productionChanged:false}));
