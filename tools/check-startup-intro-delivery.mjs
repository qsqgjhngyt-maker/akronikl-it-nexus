import {introV6Scope,ROOT} from './intro-v6-scope.mjs';
import {appendFile,mkdtemp,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const scope=await introV6Scope();
if(!scope)await import('./check-startup-intro-delivery-legacy.mjs');
else{
 if(process.env.NEXUS_M5_ACCEPTANCE_EVIDENCE)await mkdir(path.dirname(path.resolve(process.env.NEXUS_M5_ACCEPTANCE_EVIDENCE)),{recursive:true});
 if(process.argv.includes('--build')){
  const target=process.argv[process.argv.indexOf('--build')+1];if(!target)throw Error('Нужен новый build path');
  execFileSync(process.execPath,['tools/build-ui1a-release.mjs','--out',target],{cwd:ROOT,stdio:'inherit'});
 }else{
  let legacyRoot=ROOT;
  if(process.argv.includes('--prepare-legacy')){
   const {BASE}=await import('./startup-intro-contract.mjs');
   legacyRoot=path.join(await mkdtemp(path.join(tmpdir(),'nexus-v6-historical-')),'source');
   execFileSync('git',['worktree','add','--quiet','--detach',legacyRoot,BASE],{cwd:ROOT,stdio:'inherit'});
   execFileSync('npm',['ci','--prefix',path.join(legacyRoot,'server-access'),'--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});
  }
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'legacy_root='+legacyRoot+'\n');
  console.log('PASS: проверенная доставка Intro V6; исторический source receipt:',legacyRoot);
 }
}
