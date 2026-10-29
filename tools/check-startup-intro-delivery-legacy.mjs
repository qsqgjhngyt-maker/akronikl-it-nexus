// Fail-closed доставка и изолированные исторические receipts; без cloud writes.
import {access,appendFile,mkdtemp,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ROOT,BASE,CONTRACT,verifyStartupIntroContract} from './startup-intro-contract.mjs';
import {courseCompletionScope} from './cpp-course-completion-scope.mjs';
const completion=await courseCompletionScope();
let enabled=false;try{await access(path.join(ROOT,CONTRACT));enabled=true}catch(e){if(e.code!=='ENOENT')throw e}
if(enabled&&!completion)await verifyStartupIntroContract();
// Source receipt пишет в BASE worktree; родитель browser evidence нужен и
// в текущем checkout. Вложенный каталог suite создаёт сам строгий fixture.
if(process.env.NEXUS_M5_ACCEPTANCE_EVIDENCE)await mkdir(path.dirname(path.resolve(process.env.NEXUS_M5_ACCEPTANCE_EVIDENCE)),{recursive:true});
if(process.argv.includes('--build')){
 const target=process.argv[process.argv.indexOf('--build')+1];if(!target)throw Error('Нужен новый build path');
 execFileSync(process.execPath,[enabled&&!completion?'tools/build-startup-intro-candidate.mjs':'tools/build-ui1a-release.mjs','--out',target],{cwd:ROOT,stdio:'inherit'});
}else{
 let legacyRoot=ROOT;
 if(enabled&&process.argv.includes('--prepare-legacy')){
  legacyRoot=path.join(await mkdtemp(path.join(tmpdir(),'nexus-intro-historical-')),'source');
  execFileSync('git',['worktree','add','--quiet','--detach',legacyRoot,BASE],{cwd:ROOT,stdio:'inherit'});
  const args=['ci','--prefix',path.join(legacyRoot,'server-access'),'--ignore-scripts','--no-audit','--no-fund'];
  if(process.platform==='win32')execFileSync(process.execPath,[path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),...args],{stdio:'inherit'});
  else execFileSync('npm',args,{stdio:'inherit'});
 }
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'legacy_root='+legacyRoot+'\n');
 console.log('PASS: точные файлы доставки и неизменные исходники; historical source: '+legacyRoot);
}
