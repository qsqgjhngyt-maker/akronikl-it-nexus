// Отсутствие нового допуска сохраняет все исторические проверки; ошибка — FAIL.
import {access,appendFile} from 'node:fs/promises';
import {ROOT,CONTRACT,verifyStartupIntroContract} from './startup-intro-contract.mjs';
import path from 'node:path';
import {courseCompletionScope} from './cpp-course-completion-scope.mjs';
import {introV6Scope} from './intro-v6-scope.mjs';
const video=await introV6Scope();
if(video){if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled=true\nkind=startup-video-v6\n');console.log('PASS: точный Intro V6 поверх принятого C++ 1.0',JSON.stringify(video));process.exit(0)}
const completion=await courseCompletionScope();
if(completion){if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled=true\nkind=cpp-course-completion\n');console.log('PASS: точный CPP-COURSE-COMPLETION; исторические Intro/M5 receipts сохранены');process.exit(0)}
let enabled=false;
try{await access(path.join(ROOT,CONTRACT));enabled=true}catch(error){if(error.code!=='ENOENT')throw error}
if(enabled)await verifyStartupIntroContract();
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled='+enabled+'\n');
console.log(enabled?'PASS: отдельный Intro-кандидат; исторический M5 проверяется на принятой базе':'Исторические Content jobs выполняются без изменений');
