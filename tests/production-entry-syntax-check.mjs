import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'core','app.js');
const source=fs.readFileSync(app,'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};
assert(!source.includes('function placeholderfunction placeholder'),'duplicate placeholder function token detected');
const check=spawnSync(process.execPath,['--check',app],{encoding:'utf8'});
assert(check.status===0,`core/app.js syntax check failed:
${check.stderr||check.stdout}`);
console.log('PRODUCTION_ENTRY_SYNTAX_PASS');
