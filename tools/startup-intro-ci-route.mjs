// Отсутствие контракта оставляет все старые jobs; повреждение контракта — FAIL.
import {access,appendFile} from 'node:fs/promises';
import {ROOT,CONTRACT,verifyStartupIntroContract} from './startup-intro-contract.mjs';
import path from 'node:path';
let enabled=false;
try{await access(path.join(ROOT,CONTRACT));enabled=true}catch(error){if(error.code!=='ENOENT')throw error}
if(enabled)await verifyStartupIntroContract();
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled='+enabled+'\n');
console.log(enabled?'PASS: отдельный Intro-кандидат; исторический M5 проверяется на принятой базе':'Исторические Content jobs выполняются без изменений');
