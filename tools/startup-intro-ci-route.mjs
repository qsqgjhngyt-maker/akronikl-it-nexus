// Отсутствие контракта оставляет все старые jobs; повреждение контракта — FAIL.
import {access,appendFile} from 'node:fs/promises';
import {ROOT,CONTRACT,verifyStartupIntroContract} from './startup-intro-contract.mjs';
import path from 'node:path';
import {courseCompletionScope} from './cpp-course-completion-scope.mjs';
const completion=await courseCompletionScope();
if(completion){if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled=true\nkind=cpp-course-completion\n');console.log(completion.currentP4QScopeVerified?'PASS: точный P4Q_TESTER_RELEASE; исторические CPP/Intro/M5 receipts отдельно сохранены':'PASS: точный CPP-COURSE-COMPLETION; исторические Intro/M5 receipts сохранены');process.exit(0)}
let enabled=false;
try{await access(path.join(ROOT,CONTRACT));enabled=true}catch(error){if(error.code!=='ENOENT')throw error}
if(enabled)await verifyStartupIntroContract();
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'enabled='+enabled+'\n');
console.log(enabled?'PASS: отдельный Intro-кандидат; исторический M5 проверяется на принятой базе':'Исторические Content jobs выполняются без изменений');
