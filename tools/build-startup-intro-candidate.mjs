// Только локальный кандидат. Не меняет release-candidate.json или production.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
try{await readFile(new URL('../startup-intro-smooth.json',import.meta.url));const r=spawnSync(process.execPath,[fileURLToPath(new URL('./build-startup-smooth.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});process.exit(r.status??1)}catch(error){if(error.code!=='ENOENT')throw error}
try{await readFile(new URL('../startup-intro-first-paint.json',import.meta.url));const r=spawnSync(process.execPath,[fileURLToPath(new URL('./build-startup-first-paint.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});process.exit(r.status??1)}catch(error){if(error.code!=='ENOENT')throw error}
try{await readFile(new URL('../startup-intro-launch-fix.json',import.meta.url));const r=spawnSync(process.execPath,[fileURLToPath(new URL('./build-startup-intro-launch-fix.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});process.exit(r.status??1)}catch(error){if(error.code!=='ENOENT')throw error}
const i=process.argv.indexOf('--out');if(i<0||!process.argv[i+1])throw Error('Укажите новый каталог --out');
const config=JSON.parse(await readFile(new URL('../release-candidate.json',import.meta.url)));
const r=spawnSync(process.execPath,[fileURLToPath(new URL('./build-ui1a-release.mjs',import.meta.url)),'--out',process.argv[i+1],'--generation','ui1a-startup-cinematic-candidate-20261028','--version',config.version,'--retain-active'],{stdio:'inherit',windowsHide:true});
process.exitCode=r.status??1;
