// Новое immutable поколение; прежняя опубликованная поставка сохраняется.
import {spawnSync} from 'node:child_process';import {readFile} from 'node:fs/promises';
try{await readFile(new URL('../startup-intro-opening.json',import.meta.url));const r=spawnSync(process.execPath,['tools/build-intro-opening.mjs',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});process.exit(r.status??1)}catch(e){if(e.code!=='ENOENT')throw e}
const i=process.argv.indexOf('--out');if(i<0||!process.argv[i+1])throw Error('Нужен новый каталог --out');
const config=JSON.parse(await readFile(new URL('../release-candidate.json',import.meta.url)));
const r=spawnSync(process.execPath,['tools/build-ui1a-release.mjs','--out',process.argv[i+1],'--generation','ui1a-startup-mobile-restore-20261029','--version',config.version,'--retain-active','--retain-generation','ui1a-startup-cinematic-candidate-20261028','--startup-launch','--startup-smooth','--startup-fast','--startup-mobile-restore'],{stdio:'inherit',windowsHide:true});process.exitCode=r.status??1;
