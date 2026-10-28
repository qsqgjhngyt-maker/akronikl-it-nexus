// Только локальный кандидат. Не меняет release-candidate.json или production.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const i=process.argv.indexOf('--out');if(i<0||!process.argv[i+1])throw Error('Укажите новый каталог --out');
const config=JSON.parse(await readFile(new URL('../release-candidate.json',import.meta.url)));
const r=spawnSync(process.execPath,[fileURLToPath(new URL('./build-ui1a-release.mjs',import.meta.url)),'--out',process.argv[i+1],'--generation','ui1a-startup-cinematic-candidate-20261028','--version',config.version],{stdio:'inherit',windowsHide:true});
process.exitCode=r.status??1;
